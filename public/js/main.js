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

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !modal.hidden) {
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


/* ===========================
   Vision Interactive Pipeline (비전 아키텍처 인터랙션)
   =========================== */
(function initVisionPipeline() {
  var nodes = document.querySelectorAll('.vision-node');
  var badge = document.getElementById('visionStepBadge');
  var title = document.getElementById('visionStepTitle');
  var desc = document.getElementById('visionStepDesc');
  var tags = document.getElementById('visionStepTags');

  if (!nodes.length || !badge || !title || !desc || !tags) return;

  var stepData = [
    {
      badge: 'STEP 01 · 수집 및 센싱',
      title: '네트워크 모니터링 (Network Traffic Sensing)',
      desc: '서버 및 엔드포인트 전반의 인프라 트래픽을 저지연 커널 레벨(eBPF / Suricata)에서 실시간 캡처하여 프로토콜 흐름, 패킷 메타데이터, 비정상 세션 징후를 센싱합니다.',
      tags: ['eBPF', 'Packet Analysis', 'Network Sensing', 'Traffic Flow']
    },
    {
      badge: 'STEP 02 · 핵심 머신러닝 분석',
      title: 'AI 실시간 분석 (Real-time Anomaly Detection)',
      desc: '수집된 로그와 네트워크 벡터를 사전 학습된 비지도 학습 머신러닝 모델(Isolation Forest / AutoEncoder)로 실시간 추론하여 기존 시그니처로 잡히지 않는 제로데이 위협 패턴을 식별합니다.',
      tags: ['Machine Learning', 'Anomaly Detection', 'AutoEncoder', 'Real-time Inference']
    },
    {
      badge: 'STEP 03 · 자동화된 방어',
      title: '위협 탐지 · 대응 (Automated SOAR Defense)',
      desc: '식별된 이상 지표를 위협 인텔리전스와 대조하고, 침해 위험도가 높은 세션이나 IP를 방화벽 룰셋에 즉시 자동 반영하여 세션을 격리하고 보안 담당자에게 실시간 경보를 전송합니다.',
      tags: ['SOAR Automation', 'Threat Response', 'Session Isolation', 'Firewall Policy']
    },
    {
      badge: 'STEP 04 · 인프라 통합 배포',
      title: '기업 맞춤 배포 (Enterprise Cloud Delivery)',
      desc: '온프레미스 레거시 서버부터 Kubernetes, AWS/클라우드 환경까지 경량 컨테이너(Docker) 기반 에이전트로 패키징하여 고객사 인프라에 최소 리소스로 즉시 배포할 수 있도록 최적화합니다.',
      tags: ['Docker', 'Kubernetes', 'Cloud Infrastructure', 'Production Ready']
    }
  ];

  function setActiveStep(idx) {
    nodes.forEach(function (n, i) {
      if (i === idx) {
        n.classList.add('active');
        n.setAttribute('aria-selected', 'true');
      } else {
        n.classList.remove('active');
        n.setAttribute('aria-selected', 'false');
      }
    });

    var data = stepData[idx];
    if (!data) return;

    var card = document.getElementById('visionDetailCard');
    if (card) {
      card.style.opacity = '0.4';
      card.style.transform = 'translateY(3px)';
      setTimeout(function () {
        badge.textContent = data.badge;
        title.textContent = data.title;
        desc.textContent = data.desc;
        tags.innerHTML = data.tags.map(function (t) {
          return '<span class="detail-tag">' + t + '</span>';
        }).join('');
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 120);
    }
  }

  nodes.forEach(function (node) {
    node.addEventListener('click', function () {
      var step = parseInt(this.getAttribute('data-step'), 10);
      if (!isNaN(step)) {
        setActiveStep(step);
      }
    });
  });
})();
