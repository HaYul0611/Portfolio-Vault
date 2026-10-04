/* === routes/notes.js — 비공개 메모 CRUD (인증 필수) === */

var express = require('express');
var router = express.Router();
var { requireAuth } = require('../middleware/auth');
var { createClient } = require('@supabase/supabase-js');

var db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/* 모든 라우트에 인증 필수 (C16, C17) */
router.use(requireAuth);

/* 목록 조회 — 본인 것만 (C40, T08-C14) */
router.get('/', async function(req, res) {
  var result = await db.from('vault_notes')
    .select('*')
    .eq('user_id', req.session.userId)
    .order('created_at', { ascending: true });

  /* 비공개 항목이 아직 하나도 없으면 과제 기준에 맞춰 3개 기본 생성 */
  if (result.data && result.data.length === 0) {
    var defaults = [
      {
        user_id: req.session.userId,
        category: '프로젝트',
        title: '차세대 인프라 보안 파이프라인 PoC',
        content: 'AI 기반 네트워크 실시간 이상 징후 탐지 및 자동 격리 룰셋 설계'
      },
      {
        user_id: req.session.userId,
        category: '취업/이력서',
        title: '목표 기업 및 직무 타겟 리스트',
        content: '클라우드 인프라 엔지니어 / 정보보안 관제 / DevSecOps 포지션 리서치'
      },
      {
        user_id: req.session.userId,
        category: '회고',
        title: '행정직에서 보안 엔지니어로의 전환 회고',
        content: '비전공자 출신의 한계를 실천과 끊임없는 검증으로 극복하는 성장 기록'
      }
    ];
    await db.from('vault_notes').insert(defaults);
    var updated = await db.from('vault_notes')
      .select('*')
      .eq('user_id', req.session.userId)
      .order('created_at', { ascending: true });
    return res.json(updated.data || []);
  }

  res.json(result.data || []);
});

/* 생성 */
router.post('/', async function(req, res) {
  var result = await db.from('vault_notes').insert({
    user_id: req.session.userId,
    category: req.body.category || '메모',
    title: req.body.title || '',
    content: req.body.content || ''
  }).select().single();
  res.json(result.data);
});

/* 수정 — 본인 것만 */
router.patch('/:id', async function(req, res) {
  var result = await db.from('vault_notes').update({
    title: req.body.title,
    content: req.body.content,
    category: req.body.category
  }).eq('id', req.params.id).eq('user_id', req.session.userId).select().single();
  if (!result.data) return res.status(403).json({ error: '접근 권한이 없습니다.' });
  res.json(result.data);
});

/* 삭제 — 본인 것만 */
router.delete('/:id', async function(req, res) {
  await db.from('vault_notes').delete()
    .eq('id', req.params.id).eq('user_id', req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
