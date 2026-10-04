/* === server.js — Express 메인 서버 === */

var express = require('express');
var session = require('express-session');
var path = require('path');

var authRoutes = require('./routes/auth');
var notesRoutes = require('./routes/notes');

var app = express();
var PORT = process.env.PORT || 3000;

/* 프록시 환경(Render.com 등)에서 secure 쿠키 지원 */
app.set('trust proxy', 1);

/* JSON 파싱 */
app.use(express.json());

/* 세션 설정 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, /* 24시간 */
    sameSite: 'lax'
  }
}));

/* 정적 파일 */
app.use(express.static(path.join(__dirname, 'public')));

/* API 라우트 */
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

/* SPA 폴백 */
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function() {
  console.log('Portfolio-Vault running on port ' + PORT);
});
