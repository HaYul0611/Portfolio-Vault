/* === main.js — 테마 토글, 모달 === */
(function() {
  /* 모달 */
  var modal = document.getElementById('modal');
  document.getElementById('modalClose').addEventListener('click', function() { modal.hidden = true; });
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.hidden = true; });

  window.openModal = function(title, html) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = html;
    modal.hidden = false;
  };
  window.closeModal = function() { modal.hidden = true; };
})();
