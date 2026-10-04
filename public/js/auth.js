/* === auth.js — 패스키 등록/로그인 클라이언트 === */
var Auth = (function() {
  var SWA = window.SimpleWebAuthnBrowser;

  function showMsg(msg, type) {
    var el = document.getElementById('authMsg');
    el.textContent = msg;
    el.className = 'auth-msg ' + (type || 'error');
    el.hidden = false;
  }

  async function api(url, body) {
    var res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || '요청 실패');
    return data;
  }

  /* 회원가입 + 패스키 등록 */
  async function signup() {
    var username = document.getElementById('signupUsername').value.trim();
    if (!username || username.length < 2) { showMsg('사용자 이름은 2자 이상이어야 합니다.'); return; }

    try {
      /* 1. 사용자 생성 */
      var user = await api('/api/auth/signup', { username: username });

      /* 2. 등록 옵션 요청 */
      var options = await api('/api/auth/register/options', { userId: user.userId });

      /* 3. 패스키 생성 (브라우저 프롬프트) */
      var credential;
      try {
        credential = await SWA.startRegistration({ optionsJSON: options });
      } catch (e) {
        showMsg('패스키 등록이 취소되었습니다.', 'error');
        return;
      }

      /* 4. 서버 검증 */
      var deviceName = prompt('이 패스키의 이름을 정해주세요 (예: 내 노트북)', '내 기기') || '내 기기';
      await api('/api/auth/register/verify', { credential: credential, deviceName: deviceName });

      showMsg('등록 완료! 환영합니다.', 'success');
      Vault.onLogin();
    } catch (e) {
      showMsg(e.message);
    }
  }

  /* 패스키 로그인 */
  async function login() {
    var username = document.getElementById('loginUsername').value.trim();
    if (!username) { showMsg('사용자 이름을 입력해주세요.'); return; }

    try {
      /* 1. 로그인 옵션 요청 */
      var options = await api('/api/auth/login/options', { username: username });

      /* 2. 패스키 서명 (브라우저 프롬프트) */
      var credential;
      try {
        credential = await SWA.startAuthentication({ optionsJSON: options });
      } catch (e) {
        showMsg('패스키 인증이 취소되었습니다.', 'error');
        return;
      }

      /* 3. 서버 검증 */
      await api('/api/auth/login/verify', { credential: credential });

      showMsg('로그인 성공!', 'success');
      Vault.onLogin();
    } catch (e) {
      showMsg(e.message);
    }
  }

  /* 로그아웃 */
  async function logout() {
    await api('/api/auth/logout', {});
    Vault.onLogout();
  }

  /* 추가 패스키 등록 */
  async function addPasskey() {
    try {
      var me = await api('/api/auth/me');
      if (!me.authenticated) return;

      var options = await api('/api/auth/register/options', { userId: me.user.id });
      var credential;
      try {
        credential = await SWA.startRegistration({ optionsJSON: options });
      } catch (e) {
        alert('패스키 등록이 취소되었습니다.');
        return;
      }

      var deviceName = prompt('이 패스키의 이름을 정해주세요', '두 번째 기기') || '두 번째 기기';
      await api('/api/auth/register/verify', { credential: credential, deviceName: deviceName });

      alert('패스키가 추가되었습니다.');
      Vault.loadKeys();
    } catch (e) {
      alert(e.message);
    }
  }

  /* 현재 사용자 확인 */
  async function checkAuth() {
    try {
      return await api('/api/auth/me');
    } catch (e) {
      return { authenticated: false };
    }
  }

  /* 패스키 목록 */
  async function getCredentials() {
    return await api('/api/auth/credentials');
  }

  /* 패스키 삭제 */
  async function deleteCredential(id) {
    await fetch('/api/auth/credentials/' + encodeURIComponent(id), {
      method: 'DELETE', credentials: 'same-origin'
    });
  }

  /* 패스키 이름 변경 */
  async function renameCredential(id, name) {
    await fetch('/api/auth/credentials/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_name: name }),
      credentials: 'same-origin'
    });
  }

  /* 이벤트 바인딩 */
  document.getElementById('signupBtn').addEventListener('click', signup);
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('addPasskeyBtn').addEventListener('click', addPasskey);

  /* Enter 키 지원 */
  document.getElementById('loginUsername').addEventListener('keydown', function(e) { if (e.key === 'Enter') login(); });
  document.getElementById('signupUsername').addEventListener('keydown', function(e) { if (e.key === 'Enter') signup(); });

  return {
    checkAuth: checkAuth,
    getCredentials: getCredentials,
    deleteCredential: deleteCredential,
    renameCredential: renameCredential
  };
})();
