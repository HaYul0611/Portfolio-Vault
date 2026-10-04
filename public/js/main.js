/* ===========================
   Theme Toggle (다크/라이트 모드)
   =========================== */
(function initTheme() {
  var toggle = document.getElementById('themeToggle');
  var icon = document.getElementById('themeIcon');
  var stored = localStorage.getItem('theme');

  if (stored === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      if (current === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  }
})();

/* ===========================
   SAR Toggle (강점 펼치기/접기)
   =========================== */
(function initSarToggles() {
  var toggles = document.querySelectorAll('.sar-toggle');

  toggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      var targetId = btn.getAttribute('aria-controls');
      var target = document.getElementById(targetId);
      if (!target) return;

      if (expanded) {
        btn.setAttribute('aria-expanded', 'false');
        target.hidden = true;
      } else {
        btn.setAttribute('aria-expanded', 'true');
        target.hidden = false;
      }
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();

/* ===========================
   Certificate Modal (수료증 모달)
   =========================== */
(function initCertModal() {
  var openBtn = document.getElementById('certBtn');
  var modal = document.getElementById('certModal');
  var closeBtn = document.getElementById('certClose');
  var lastFocused = null;

  if (!openBtn || !modal || !closeBtn) return;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) {
      lastFocused.focus();
    }
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });
})();

/* ===========================
   Vault Modal (메모 작성 및 수정 모달)
   =========================== */
(function initVaultModal() {
  var modal = document.getElementById('vaultModal');
  var closeBtn = document.getElementById('vaultModalClose');

  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      if (modal) modal.hidden = true;
      document.body.style.overflow = '';
    });
  }

  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.hidden = true;
        document.body.style.overflow = '';
      }
    });
  }

  window.openModal = function(title, html) {
    if (!modal) return;
    document.getElementById('vaultModalTitle').textContent = title;
    document.getElementById('vaultModalBody').innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };
})();

/* ===========================
   Reduced Motion
   =========================== */
(function initReducedMotion() {
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) {
    document.documentElement.style.setProperty('--transition', '0.01ms');
  }
})();
