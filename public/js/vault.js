/* === vault.js — 비공개 메모 UI + 패스키 관리 === */
var Vault = (function() {
  var authEl = document.getElementById('vaultAuth');
  var contentEl = document.getElementById('vaultContent');
  var userEl = document.getElementById('vaultUser');
  var notesEl = document.getElementById('notesList');
  var keysEl = document.getElementById('keysList');
  var keysPanel = document.getElementById('keysPanel');

  function esc(str) { var d = document.createElement('div'); d.textContent = String(str || ''); return d.innerHTML; }

  async function api(url, opts) {
    var res = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts || {}));
    if (res.status === 401 || res.status === 403) { onLogout(); throw new Error('인증 필요'); }
    return res.json();
  }

  /* 로그인 성공 시 */
  async function onLogin() {
    var me = await Auth.checkAuth();
    if (!me.authenticated) return;
    authEl.hidden = true;
    contentEl.hidden = false;
    userEl.textContent = me.user.username + '님의 Vault';
    loadNotes();
  }

  /* 로그아웃 시 */
  function onLogout() {
    authEl.hidden = false;
    contentEl.hidden = true;
    keysPanel.hidden = true;
    notesEl.innerHTML = '';
  }

  /* 비공개 메모 목록 */
  async function loadNotes() {
    var notes = await api('/api/notes');
    if (notes.length === 0) {
      notesEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:24px">아직 메모가 없습니다.</p>';
      return;
    }
    notesEl.innerHTML = notes.map(function(n) {
      return '<div class="note-card">' +
        '<div class="note-cat">' + esc(n.category) + '</div>' +
        '<div class="note-title">' + esc(n.title) + '</div>' +
        '<div class="note-content">' + esc(n.content) + '</div>' +
        '<div class="note-actions">' +
          '<button class="v-btn outline sm" onclick="Vault.editNote(\'' + n.id + '\',\'' + esc(n.category) + '\',\'' + esc(n.title).replace(/'/g, "\\'") + '\')">수정</button>' +
          '<button class="v-btn danger sm" onclick="Vault.deleteNote(\'' + n.id + '\')">삭제</button>' +
        '</div></div>';
    }).join('');
  }

  /* 메모 추가 */
  function showAddNote() {
    openModal('메모 추가', '<form id="noteForm">' +
      '<div class="form-group"><label>카테고리</label><select class="v-input" name="category">' +
        '<option value="면접 대비 노트">면접 대비 노트</option>' +
        '<option value="포트폴리오 개선 TODO">포트폴리오 개선 TODO</option>' +
        '<option value="학습 로드맵">학습 로드맵</option>' +
      '</select></div>' +
      '<div class="form-group"><label>제목</label><input class="v-input" name="title" required></div>' +
      '<div class="form-group"><label>내용</label><textarea class="v-input" name="content" rows="4" style="resize:vertical"></textarea></div>' +
      '<button type="submit" class="v-btn primary" style="width:100%;margin-top:8px">저장</button></form>');

    document.getElementById('noteForm').onsubmit = async function(e) {
      e.preventDefault();
      var fd = new FormData(this);
      await api('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fd))
      });
      closeModal();
      loadNotes();
    };
  }

  /* 메모 수정 */
  async function editNote(id) {
    var notes = await api('/api/notes');
    var note = notes.find(function(n) { return n.id === id; });
    if (!note) return;

    openModal('메모 수정', '<form id="noteForm">' +
      '<div class="form-group"><label>카테고리</label><select class="v-input" name="category">' +
        ['면접 대비 노트','포트폴리오 개선 TODO','학습 로드맵'].map(function(c) {
          return '<option value="' + c + '"' + (note.category === c ? ' selected' : '') + '>' + c + '</option>';
        }).join('') +
      '</select></div>' +
      '<div class="form-group"><label>제목</label><input class="v-input" name="title" value="' + esc(note.title) + '" required></div>' +
      '<div class="form-group"><label>내용</label><textarea class="v-input" name="content" rows="4" style="resize:vertical">' + esc(note.content) + '</textarea></div>' +
      '<button type="submit" class="v-btn primary" style="width:100%;margin-top:8px">수정</button></form>');

    document.getElementById('noteForm').onsubmit = async function(e) {
      e.preventDefault();
      var fd = new FormData(this);
      await api('/api/notes/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fd))
      });
      closeModal();
      loadNotes();
    };
  }

  /* 메모 삭제 */
  async function deleteNote(id) {
    if (!confirm('이 메모를 삭제할까요?')) return;
    await api('/api/notes/' + id, { method: 'DELETE' });
    loadNotes();
  }

  /* 패스키 목록 */
  async function loadKeys() {
    keysPanel.hidden = false;
    var creds = await Auth.getCredentials();
    if (creds.length === 0) {
      keysEl.innerHTML = '<p style="color:var(--text-muted)">등록된 패스키가 없습니다.</p>';
      return;
    }
    keysEl.innerHTML = creds.map(function(c) {
      var date = new Date(c.created_at).toLocaleDateString('ko-KR');
      return '<div class="key-item">' +
        '<span class="key-name">' + esc(c.device_name) + '</span>' +
        '<span class="key-date">' + date + '</span>' +
        '<div class="key-actions">' +
          '<button class="v-btn outline sm" onclick="Vault.renameKey(\'' + c.id + '\',\'' + esc(c.device_name).replace(/'/g, "\\'") + '\')">이름변경</button>' +
          '<button class="v-btn danger sm" onclick="Vault.deleteKey(\'' + c.id + '\')">삭제</button>' +
        '</div></div>';
    }).join('');
  }

  async function renameKey(id, currentName) {
    var name = prompt('새 이름을 입력하세요', currentName);
    if (!name) return;
    await Auth.renameCredential(id, name);
    loadKeys();
  }

  async function deleteKey(id) {
    var creds = await Auth.getCredentials();
    if (creds.length <= 1) {
      alert('마지막 패스키는 삭제할 수 없습니다. 패스키가 모두 삭제되면 계정에 접근할 수 없게 됩니다.');
      return;
    }
    if (!confirm('이 패스키를 삭제할까요? 삭제 후에는 이 기기로 로그인할 수 없습니다.')) return;
    await Auth.deleteCredential(id);
    loadKeys();
  }

  /* 이벤트 */
  document.getElementById('addNoteBtn').addEventListener('click', showAddNote);
  document.getElementById('manageKeysBtn').addEventListener('click', function() {
    keysPanel.hidden = !keysPanel.hidden;
    if (!keysPanel.hidden) loadKeys();
  });

  /* 초기화: 이미 로그인 상태인지 확인 */
  Auth.checkAuth().then(function(me) {
    if (me.authenticated) onLogin();
  });

  return {
    onLogin: onLogin,
    onLogout: onLogout,
    loadKeys: loadKeys,
    editNote: editNote,
    deleteNote: deleteNote,
    renameKey: renameKey,
    deleteKey: deleteKey
  };
})();
