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

  var cachedNotes = [];
  var activeCategory = 'ALL';

  function getAllCategories() {
    var defaultCats = ['프로젝트', '취업/이력서', '회고', '학습/연구'];
    var set = new Set(defaultCats);
    cachedNotes.forEach(function(n) {
      if (n.category && n.category.trim()) set.add(n.category.trim());
    });
    return Array.from(set);
  }

  /* 카테고리 필터 바 렌더링 */
  function renderFilterBar() {
    var filterEl = document.getElementById('categoryFilter');
    if (!filterEl) return;
    var cats = ['ALL'].concat(getAllCategories());
    var chipsHtml = cats.map(function(c) {
      var isAct = (c === activeCategory) ? ' active' : '';
      var label = (c === 'ALL') ? '전체 보기' : esc(c);
      return '<button type="button" class="cat-chip' + isAct + '" onclick="Vault.setFilter(\'' + esc(c).replace(/'/g, "\\'") + '\')">' + label + '</button>';
    }).join('');

    chipsHtml += '<button type="button" class="cat-chip" style="margin-left:auto;border-style:dashed;color:var(--text)" onclick="Vault.showManageCategories()">⚙ 카테고리 관리</button>';

    filterEl.innerHTML = chipsHtml;
  }

  function setFilter(cat) {
    activeCategory = cat;
    renderFilterBar();
    renderNotesList();
  }

  /* 카테고리 관리 모달 (조회, 이름변경, 삭제, 새 카테고리 추가) */
  function showManageCategories() {
    var cats = getAllCategories();
    var listHtml = cats.map(function(c) {
      var count = cachedNotes.filter(function(n) { return (n.category || '').trim() === c; }).length;
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:0.5px solid var(--border)">' +
        '<div><strong>' + esc(c) + '</strong> <span style="font-size:12px;color:var(--text-light)">(' + count + '개 메모)</span></div>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="v-btn outline sm" onclick="Vault.renameCategory(\'' + esc(c).replace(/'/g, "\\'") + '\')">이름변경</button>' +
          '<button class="v-btn danger sm" onclick="Vault.deleteCategory(\'' + esc(c).replace(/'/g, "\\'") + '\')">삭제</button>' +
        '</div></div>';
    }).join('');

    var modalHtml = '<div style="margin-bottom:20px">' +
      '<p style="font-size:13px;color:var(--text-mid);margin-bottom:14px">카테고리 이름을 변경하면 해당 메모들이 일괄 업데이트되며, 카테고리를 삭제하면 속한 메모는 \'일반\' 카테고리로 안전 이동됩니다.</p>' +
      '<div style="max-height:220px;overflow-y:auto;margin-bottom:20px">' + listHtml + '</div>' +
      '<div style="border-top:0.5px solid var(--border);padding-top:16px">' +
        '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px">새 카테고리 생성</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="text" id="newCategoryInputName" class="v-input" placeholder="새 카테고리 이름">' +
          '<button type="button" class="v-btn primary sm" onclick="Vault.createNewCategory()" style="white-space:nowrap">생성</button>' +
        '</div>' +
      '</div></div>';

    openModal('카테고리 관리', modalHtml);
  }

  async function renameCategory(oldCat) {
    var newCat = prompt('카테고리 새 이름을 입력하세요:', oldCat);
    if (!newCat || newCat.trim() === '' || newCat.trim() === oldCat) return;
    await api('/api/notes/categories/rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldCategory: oldCat, newCategory: newCat.trim() })
    });
    closeModal();
    await loadNotes();
    showManageCategories();
  }

  async function deleteCategory(catName) {
    if (!confirm('정말 \'' + catName + '\' 카테고리를 삭제할까요?\n(속한 메모는 \'일반\' 카테고리로 안전 이동됩니다)')) return;
    await api('/api/notes/categories/' + encodeURIComponent(catName), {
      method: 'DELETE'
    });
    closeModal();
    await loadNotes();
    showManageCategories();
  }

  async function createNewCategory() {
    var input = document.getElementById('newCategoryInputName');
    if (!input || !input.value.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }
    var newCat = input.value.trim();
    /* 해당 카테고리로 기본 안내 메모 생성하여 즉시 DB CRUD 반영 */
    await api('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newCat,
        title: newCat + ' 시작하기',
        content: '새로 생성된 ' + newCat + ' 카테고리의 첫 번째 비공개 메모입니다.'
      })
    });
    closeModal();
    await loadNotes();
    alert('\'' + newCat + '\' 카테고리가 성공적으로 생성되었습니다!');
  }

  /* 비공개 메모 화면 렌더링 */
  function renderNotesList() {
    var filtered = cachedNotes;
    if (activeCategory !== 'ALL') {
      filtered = cachedNotes.filter(function(n) { return (n.category || '').trim() === activeCategory; });
    }

    if (filtered.length === 0) {
      notesEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px 16px;grid-column:1/-1">' +
        (activeCategory === 'ALL' ? '아직 등록된 메모가 없습니다.' : '선택한 카테고리에 해당하는 메모가 없습니다.') + '</p>';
      return;
    }

    notesEl.innerHTML = filtered.map(function(n) {
      return '<div class="note-card">' +
        '<div class="note-cat">' + esc(n.category) + '</div>' +
        '<div class="note-title">' + esc(n.title) + '</div>' +
        '<div class="note-content">' + esc(n.content) + '</div>' +
        '<div class="note-actions">' +
          '<button class="v-btn outline sm" onclick="Vault.editNote(\'' + n.id + '\')">수정</button>' +
          '<button class="v-btn danger sm" onclick="Vault.deleteNote(\'' + n.id + '\')">삭제</button>' +
        '</div></div>';
    }).join('');
  }

  /* 비공개 메모 목록 조회 */
  async function loadNotes() {
    var notes = await api('/api/notes');
    cachedNotes = notes || [];
    renderFilterBar();
    renderNotesList();
  }

  /* 모달 내 카테고리 HTML 빌더 */
  function buildCategorySelectHtml(currentCat) {
    var cats = getAllCategories();
    var isCustom = currentCat && !cats.includes(currentCat);
    if (isCustom) cats.push(currentCat);

    var optionsHtml = cats.map(function(c) {
      var selected = (c === currentCat) ? ' selected' : '';
      return '<option value="' + esc(c) + '"' + selected + '>' + esc(c) + '</option>';
    }).join('');

    optionsHtml += '<option value="__NEW__">➕ 새 카테고리 직접 입력...</option>';

    var showInput = (currentCat === '__NEW__' || isCustom) ? 'block' : 'none';
    var customVal = isCustom ? esc(currentCat) : '';

    return '<div class="form-group">' +
      '<label>카테고리</label>' +
      '<select id="catSelect" class="v-input" onchange="Vault.onCatSelectChange(this)" style="margin-bottom:8px">' +
        optionsHtml +
      '</select>' +
      '<input type="text" id="customCatInput" class="v-input" placeholder="새로운 카테고리 이름을 입력하세요" value="' + customVal + '" style="display:' + showInput + '">' +
    '</div>';
  }

  function onCatSelectChange(sel) {
    var customInput = document.getElementById('customCatInput');
    if (sel.value === '__NEW__') {
      customInput.style.display = 'block';
      customInput.required = true;
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      customInput.required = false;
    }
  }

  /* 메모 추가 */
  function showAddNote() {
    openModal('새 메모 추가', '<form id="noteForm">' +
      buildCategorySelectHtml('프로젝트') +
      '<div class="form-group"><label>제목</label><input class="v-input" name="title" placeholder="메모 제목을 입력하세요" required></div>' +
      '<div class="form-group"><label>내용</label><textarea class="v-input" name="content" rows="4" placeholder="비공개 메모 내용을 입력하세요" style="resize:vertical"></textarea></div>' +
      '<button type="submit" class="v-btn primary" style="width:100%;margin-top:8px">저장하기</button></form>');

    document.getElementById('noteForm').onsubmit = async function(e) {
      e.preventDefault();
      var sel = document.getElementById('catSelect');
      var customInput = document.getElementById('customCatInput');
      var category = (sel.value === '__NEW__') ? customInput.value.trim() : sel.value.trim();
      if (!category) {
        alert('카테고리를 입력하거나 선택해주세요.');
        return;
      }

      var fd = new FormData(this);
      var payload = {
        category: category,
        title: fd.get('title'),
        content: fd.get('content')
      };

      await api('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      closeModal();
      loadNotes();
    };
  }

  /* 메모 수정 */
  async function editNote(id) {
    var note = cachedNotes.find(function(n) { return n.id === id; });
    if (!note) {
      var notes = await api('/api/notes');
      cachedNotes = notes || [];
      note = cachedNotes.find(function(n) { return n.id === id; });
    }
    if (!note) return;

    openModal('메모 수정', '<form id="noteForm">' +
      buildCategorySelectHtml(note.category) +
      '<div class="form-group"><label>제목</label><input class="v-input" name="title" value="' + esc(note.title) + '" required></div>' +
      '<div class="form-group"><label>내용</label><textarea class="v-input" name="content" rows="4" style="resize:vertical">' + esc(note.content) + '</textarea></div>' +
      '<button type="submit" class="v-btn primary" style="width:100%;margin-top:8px">수정 저장</button></form>');

    document.getElementById('noteForm').onsubmit = async function(e) {
      e.preventDefault();
      var sel = document.getElementById('catSelect');
      var customInput = document.getElementById('customCatInput');
      var category = (sel.value === '__NEW__') ? customInput.value.trim() : sel.value.trim();
      if (!category) {
        alert('카테고리를 입력하거나 선택해주세요.');
        return;
      }

      var fd = new FormData(this);
      var payload = {
        category: category,
        title: fd.get('title'),
        content: fd.get('content')
      };

      await api('/api/notes/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    deleteKey: deleteKey,
    setFilter: setFilter,
    onCatSelectChange: onCatSelectChange,
    showManageCategories: showManageCategories,
    renameCategory: renameCategory,
    deleteCategory: deleteCategory,
    createNewCategory: createNewCategory
  };
})();
