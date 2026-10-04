/* === routes/auth.js — 패스키 등록/로그인/로그아웃 === */

var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
var { createClient } = require('@supabase/supabase-js');

var db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* RP 설정 */
function rpID() { return process.env.RP_ID || 'localhost'; }
function rpOrigin() { return process.env.RP_ORIGIN || 'http://localhost:3000'; }
var rpName = 'Portfolio-Vault';

/* === 회원가입 (사용자 생성) === */
router.post('/signup', async function(req, res) {
  try {
    var username = (req.body.username || '').trim();
    if (!username || username.length < 2) {
      return res.status(400).json({ error: '사용자 이름은 2자 이상이어야 합니다.' });
    }

    /* 중복 확인 */
    var existing = await db.from('vault_users').select('id').eq('username', username).maybeSingle();
    if (existing.data) {
      /* 등록 도중 취소되어 패스키가 아직 없는 미완료 계정이면 이어서 등록 허용 */
      var creds = await db.from('vault_credentials').select('id').eq('user_id', existing.data.id);
      if (!creds.data || creds.data.length === 0) {
        return res.json({ userId: existing.data.id, username: username });
      }
      return res.status(409).json({ error: '이미 사용 중인 이름입니다.' });
    }

    var result = await db.from('vault_users').insert({
      username: username,
      display_name: username
    }).select().single();

    res.json({ userId: result.data.id, username: username });
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + e.message });
  }
});

/* === 패스키 등록 — 옵션 생성 === */
router.post('/register/options', async function(req, res) {
  try {
    var userId = req.body.userId || (req.session && req.session.userId);
    if (!userId) return res.status(400).json({ error: '사용자 ID가 필요합니다.' });

    /* 기존 크레덴셜 조회 (제외 목록) */
    var creds = await db.from('vault_credentials').select('id').eq('user_id', userId);
    var excludeCredentials = (creds.data || []).map(function(c) {
      return { id: c.id, type: 'public-key' };
    });

    var user = await db.from('vault_users').select('*').eq('id', userId).single();
    if (!user.data) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

    var options = await generateRegistrationOptions({
      rpName: rpName,
      rpID: rpID(),
      userID: new TextEncoder().encode(userId),
      userName: user.data.username,
      userDisplayName: user.data.display_name || user.data.username,
      attestationType: 'none',
      excludeCredentials: excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    /* 챌린지 저장 (일회용) */
    await db.from('vault_challenges').insert({
      user_id: userId,
      challenge: options.challenge,
      type: 'register'
    });

    /* 세션에 임시 저장 */
    req.session.regUserId = userId;

    res.json(options);
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + e.message });
  }
});

/* === 패스키 등록 — 검증 === */
router.post('/register/verify', async function(req, res) {
  try {
    var userId = req.session.regUserId;
    if (!userId) return res.status(400).json({ error: '등록 세션이 만료되었습니다.' });

    /* 챌린지 확인 */
    var chResult = await db.from('vault_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'register')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!chResult.data) return res.status(400).json({ error: '유효한 챌린지가 없습니다.' });

    var verification = await verifyRegistrationResponse({
      response: req.body.credential,
      expectedChallenge: chResult.data.challenge,
      expectedOrigin: rpOrigin(),
      expectedRPID: rpID()
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: '등록 검증에 실패했습니다.' });
    }

    var info = verification.registrationInfo;

    /* 공개키 저장 */
    await db.from('vault_credentials').insert({
      id: Buffer.from(info.credential.id).toString('base64url'),
      user_id: userId,
      public_key: Buffer.from(info.credential.publicKey).toString('base64'),
      counter: info.credential.counter,
      device_name: req.body.deviceName || '내 기기',
      transports: JSON.stringify(info.credential.transports || [])
    });

    /* 챌린지 사용 처리 */
    await db.from('vault_challenges').update({ used: true }).eq('id', chResult.data.id);

    /* 세션 설정 */
    req.session.userId = userId;
    delete req.session.regUserId;

    res.json({ verified: true });
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + e.message });
  }
});

/* === 패스키 로그인 — 옵션 생성 === */
router.post('/login/options', async function(req, res) {
  try {
    var username = (req.body.username || '').trim();
    if (!username) return res.status(400).json({ error: '사용자 이름이 필요합니다.' });

    var user = await db.from('vault_users').select('*').eq('username', username).single();
    if (!user.data) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

    var creds = await db.from('vault_credentials').select('id, transports').eq('user_id', user.data.id);
    var allowCredentials = (creds.data || []).map(function(c) {
      return {
        id: c.id,
        type: 'public-key',
        transports: c.transports ? JSON.parse(c.transports) : undefined
      };
    });

    if (allowCredentials.length === 0) {
      return res.status(400).json({ error: '등록된 패스키가 없습니다.' });
    }

    var options = await generateAuthenticationOptions({
      rpID: rpID(),
      allowCredentials: allowCredentials,
      userVerification: 'preferred'
    });

    /* 챌린지 저장 */
    await db.from('vault_challenges').insert({
      user_id: user.data.id,
      challenge: options.challenge,
      type: 'login'
    });

    req.session.loginUserId = user.data.id;

    res.json(options);
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + e.message });
  }
});

/* === 패스키 로그인 — 검증 === */
router.post('/login/verify', async function(req, res) {
  try {
    var userId = req.session.loginUserId;
    if (!userId) return res.status(400).json({ error: '로그인 세션이 만료되었습니다.' });

    /* 챌린지 확인 */
    var chResult = await db.from('vault_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'login')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!chResult.data) return res.status(400).json({ error: '유효한 챌린지가 없습니다.' });

    /* 크레덴셜 조회 */
    var credId = req.body.credential.id;
    var cred = await db.from('vault_credentials')
      .select('*')
      .eq('id', credId)
      .eq('user_id', userId)
      .single();

    if (!cred.data) return res.status(403).json({ error: '등록되지 않은 패스키입니다.' });

    var verification = await verifyAuthenticationResponse({
      response: req.body.credential,
      expectedChallenge: chResult.data.challenge,
      expectedOrigin: rpOrigin(),
      expectedRPID: rpID(),
      credential: {
        id: cred.data.id,
        publicKey: Buffer.from(cred.data.public_key, 'base64'),
        counter: cred.data.counter,
        transports: cred.data.transports ? JSON.parse(cred.data.transports) : undefined
      }
    });

    if (!verification.verified) {
      return res.status(403).json({ error: '서명 검증에 실패했습니다.' });
    }

    /* 카운터 업데이트 */
    await db.from('vault_credentials').update({
      counter: verification.authenticationInfo.newCounter
    }).eq('id', credId);

    /* 챌린지 사용 처리 */
    await db.from('vault_challenges').update({ used: true }).eq('id', chResult.data.id);

    /* 세션 설정 */
    req.session.userId = userId;
    delete req.session.loginUserId;

    res.json({ verified: true });
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + e.message });
  }
});

/* === 로그아웃 === */
router.post('/logout', function(req, res) {
  req.session.destroy(function() {
    res.json({ ok: true });
  });
});

/* === 현재 사용자 확인 === */
router.get('/me', async function(req, res) {
  if (!req.session || !req.session.userId) {
    return res.json({ authenticated: false });
  }
  var user = await db.from('vault_users').select('id, username, display_name').eq('id', req.session.userId).single();
  res.json({ authenticated: true, user: user.data });
});

/* === 패스키 목록 === */
router.get('/credentials', async function(req, res) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: '인증 필요' });
  var creds = await db.from('vault_credentials')
    .select('id, device_name, created_at')
    .eq('user_id', req.session.userId)
    .order('created_at', { ascending: true });
  res.json(creds.data || []);
});

/* === 패스키 이름 변경 === */
router.patch('/credentials/:id', async function(req, res) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: '인증 필요' });
  await db.from('vault_credentials').update({ device_name: req.body.device_name })
    .eq('id', req.params.id).eq('user_id', req.session.userId);
  res.json({ ok: true });
});

/* === 패스키 삭제 === */
router.delete('/credentials/:id', async function(req, res) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: '인증 필요' });
  await db.from('vault_credentials').delete()
    .eq('id', req.params.id).eq('user_id', req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
