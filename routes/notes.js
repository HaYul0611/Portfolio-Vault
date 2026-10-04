/* === routes/notes.js — 비공개 메모 CRUD (인증 필수) === */

var express = require('express');
var router = express.Router();
var { requireAuth } = require('../middleware/auth');
var { createClient } = require('@supabase/supabase-js');

var db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/* 모든 라우트에 인증 필수 (C16, C17) */
router.use(requireAuth);

/* 목록 조회 — 본인 것만 (C40) */
router.get('/', async function(req, res) {
  var result = await db.from('vault_notes')
    .select('*')
    .eq('user_id', req.session.userId)
    .order('created_at', { ascending: true });
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
