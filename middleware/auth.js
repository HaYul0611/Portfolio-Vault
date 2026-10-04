/* === middleware/auth.js — 인증 확인 미들웨어 === */

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  next();
}

module.exports = { requireAuth: requireAuth };
