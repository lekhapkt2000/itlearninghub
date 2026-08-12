function safeRun(fn) {
  try {
    fn();
  } catch (e) {
    if (window.console && console.error) console.error(e);
  }
}

var IS_EN = document.documentElement.lang === 'en';

// Answer code (inside .qa-block, ie. the gated đáp án on *-bai-tap.html pages)
// is meant to be typed out by hand, not copy-pasted - the copy button stays
// visible but just teases the student instead of actually copying.
var COPY_TEASE_MESSAGES = IS_EN ? [
  'Type it out yourself - copy-paste memory lasts about 5 minutes.',
  'No copying here, just typing practice.',
  'This one is for reading and remembering, not copying.',
  'Nice try. Retype it and it might actually stick this time.',
  'Copy is disabled on purpose - your fingers need the practice, not your clipboard.'
] : [
  'Gõ tay lại đi bạn ơi, copy vô là quên liền đó!',
  'Đáp án này để đọc và ngẫm, không phải để chép nha.',
  'Chép code thì nhớ được 5 phút, tự gõ thì nhớ tới ngày thi.',
  'Bấm nhiều cũng không copy được đâu, gõ lại cho chắc kiến thức nhé.',
  'Không có copy ở đây đâu, chỉ có luyện tay thôi.'
];

function getCopyGuard() {
  var guard = document.getElementById('copy-guard');
  if (guard) return guard;

  guard = document.createElement('div');
  guard.id = 'copy-guard';
  guard.className = 'copy-guard';
  guard.innerHTML =
    '<div class="copy-guard-card">' +
    '<div class="copy-guard-icon"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="9" height="9" rx="1.5"/><path d="M7 13v1.5A1.5 1.5 0 0 0 8.5 16H15a1.5 1.5 0 0 0 1.5-1.5V8A1.5 1.5 0 0 0 15 6.5h-1.5"/><path d="M3 3l14 14" stroke="currentColor"/></svg></div>' +
    '<p></p>' +
    '</div>';
  document.body.appendChild(guard);

  guard.addEventListener('click', function () {
    hideCopyGuard();
  });

  return guard;
}

function hideCopyGuard() {
  var guard = document.getElementById('copy-guard');
  if (guard) guard.classList.remove('show');
  clearTimeout(hideCopyGuard._t);
}

function showCopyGuard(message) {
  var guard = getCopyGuard();
  guard.querySelector('p').textContent = message;
  guard.classList.remove('show');
  void guard.offsetWidth;
  guard.classList.add('show');
  clearTimeout(hideCopyGuard._t);
  hideCopyGuard._t = setTimeout(hideCopyGuard, 2400);
}

function randomTeaseMessage() {
  return COPY_TEASE_MESSAGES[Math.floor(Math.random() * COPY_TEASE_MESSAGES.length)];
}

safeRun(function () {
  document.querySelectorAll('.code-block .copy-btn').forEach((btn) => {
    var isAnswerCode = !!btn.closest('.qa-block');

    btn.addEventListener('click', async () => {
      if (isAnswerCode) {
        showCopyGuard(randomTeaseMessage());
        return;
      }

      const code = btn.parentElement.querySelector('pre').textContent;
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const area = document.createElement('textarea');
        area.value = code;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      const original = btn.textContent;
      btn.textContent = IS_EN ? 'Copied ✓' : 'Đã chép ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1600);
    });
  });
});

// Selecting the answer code by hand and copying it (Ctrl+C, right-click
// Copy, mobile long-press) is blocked too, not just the Copy button -
// .qa-block code has user-select:none in CSS, and this catches any copy
// attempt that still slips through (eg. Ctrl+A then Ctrl+C).
safeRun(function () {
  document.addEventListener('copy', function (e) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    var node = sel.anchorNode;
    var el = node && node.nodeType === 3 ? node.parentElement : node;
    if (!el || !el.closest || !el.closest('.qa-block .code-block')) return;

    e.preventDefault();
    if (e.clipboardData) e.clipboardData.setData('text/plain', '');
    showCopyGuard(randomTeaseMessage());
  });
});

safeRun(function () {
  document.querySelectorAll('.quick-check').forEach((qc) => {
    const feedback = qc.querySelector('.qc-feedback');
    const correctHtml = feedback ? feedback.innerHTML : '';
    const options = qc.querySelectorAll('.qc-option');
    let solved = false;

    options.forEach((opt) => {
      opt.addEventListener('click', () => {
        if (solved) return;
        const isCorrect = opt.dataset.correct === 'true';
        options.forEach((o) => o.classList.remove('correct', 'wrong', 'is-shaking'));

        if (isCorrect) {
          opt.classList.add('correct');
          solved = true;
          options.forEach((o) => { o.disabled = true; });
          if (feedback) {
            feedback.innerHTML = correctHtml;
            feedback.classList.remove('wrong');
            feedback.classList.add('show', 'correct');
          }
        } else {
          opt.classList.add('wrong');
          void opt.offsetWidth;
          opt.classList.add('is-shaking');
          if (feedback) {
            feedback.textContent = IS_EN ? 'Not quite, try again!' : 'Chưa đúng, thử lại nhé!';
            feedback.classList.remove('correct');
            feedback.classList.add('show', 'wrong');
          }
        }
      });
    });
  });
});

safeRun(function () {
  document.querySelectorAll('.lesson-checklist').forEach((list, listIndex) => {
    var items = list.querySelectorAll('li');
    if (!items.length) return;

    var storageKey = 'checklist:' + location.pathname + (listIndex > 0 ? ':' + listIndex : '');
    var saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (e) {
      saved = {};
    }

    var bar = document.createElement('div');
    bar.className = 'checklist-progress';
    bar.innerHTML = '<div class="checklist-progress-bar"><b></b></div><span class="checklist-progress-label"></span>';
    list.parentNode.insertBefore(bar, list);
    var barFill = bar.querySelector('b');
    var barLabel = bar.querySelector('.checklist-progress-label');

    function updateProgress() {
      var total = items.length;
      var done = list.querySelectorAll('li.is-checked').length;
      var pct = total ? Math.round((done / total) * 100) : 0;
      barFill.style.width = pct + '%';
      barLabel.textContent = IS_EN
        ? 'Progress: ' + done + '/' + total + ' items (' + pct + '%)'
        : 'Tiến độ: ' + done + '/' + total + ' mục (' + pct + '%)';
    }

    items.forEach(function (li, i) {
      li.setAttribute('role', 'checkbox');
      li.setAttribute('tabindex', '0');
      if (saved[i]) {
        li.classList.add('is-checked');
        li.setAttribute('aria-checked', 'true');
      } else {
        li.setAttribute('aria-checked', 'false');
      }

      function toggle() {
        var checked = li.classList.toggle('is-checked');
        li.setAttribute('aria-checked', checked ? 'true' : 'false');
        saved[i] = checked;
        try {
          localStorage.setItem(storageKey, JSON.stringify(saved));
        } catch (e) {}
        updateProgress();
      }

      li.addEventListener('click', toggle);
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });

    updateProgress();
  });
});

safeRun(function () {
  document.querySelectorAll('.trigger-demo').forEach((demo) => {
    const scenarios = IS_EN ? {
      insert: {
        old: null,
        new: "HOTEN = 'Nguyễn Văn A' (new record)",
        sql: "INSERT INTO KHACHHANG (MAKH, HOTEN)\nVALUES ('KH01', N'Nguyễn Văn A');",
      },
      update: {
        old: "HOTEN = 'Nguyễn Văn A'",
        new: "HOTEN = 'Nguyễn Văn B'",
        sql: "UPDATE KHACHHANG\nSET HOTEN = N'Nguyễn Văn B'\nWHERE MAKH = 'KH01';",
      },
      delete: {
        old: "HOTEN = 'Nguyễn Văn A' (deleted)",
        new: null,
        sql: "DELETE FROM KHACHHANG\nWHERE MAKH = 'KH01';",
      },
    } : {
      insert: {
        old: null,
        new: "HOTEN = 'Nguyễn Văn A' (bản ghi mới)",
        sql: "INSERT INTO KHACHHANG (MAKH, HOTEN)\nVALUES ('KH01', N'Nguyễn Văn A');",
      },
      update: {
        old: "HOTEN = 'Nguyễn Văn A'",
        new: "HOTEN = 'Nguyễn Văn B'",
        sql: "UPDATE KHACHHANG\nSET HOTEN = N'Nguyễn Văn B'\nWHERE MAKH = 'KH01';",
      },
      delete: {
        old: "HOTEN = 'Nguyễn Văn A' (đã xóa)",
        new: null,
        sql: "DELETE FROM KHACHHANG\nWHERE MAKH = 'KH01';",
      },
    };
    const emptyLabel = IS_EN ? '(empty)' : '(trống)';
    const buttons = demo.querySelectorAll('[data-demo]');
    const deletedBox = demo.querySelector('[data-table="deleted"]');
    const insertedBox = demo.querySelector('[data-table="inserted"]');
    const deletedRow = deletedBox.querySelector('.trigger-demo-row');
    const insertedRow = insertedBox.querySelector('.trigger-demo-row');
    const sqlCode = demo.querySelector('[data-demo-sql]');

    function render(key) {
      const s = scenarios[key];
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.demo === key));
      deletedRow.textContent = s.old || emptyLabel;
      insertedRow.textContent = s.new || emptyLabel;
      deletedBox.classList.toggle('is-active', !!s.old);
      insertedBox.classList.toggle('is-active', !!s.new);
      if (sqlCode) sqlCode.textContent = s.sql;
    }

    buttons.forEach((b) => b.addEventListener('click', () => render(b.dataset.demo)));
  });
});

safeRun(function () {
  var tocLinks = document.querySelectorAll('.lesson-toc a[data-toc]');
  if (!tocLinks.length) return;

  var sections = [];
  var sectionIds = [];
  tocLinks.forEach(function (link) {
    var target = document.querySelector(link.getAttribute('href'));
    if (target) {
      sections.push(target);
      sectionIds.push(target.id);
    }
  });
  if (!sections.length) return;

  var panelItems = document.querySelectorAll('.learning-panel .checklist li[data-section]');

  function setActive(id) {
    var activeIndex = sectionIds.indexOf(id);

    tocLinks.forEach(function (link) {
      var isActive = link.getAttribute('href') === '#' + id;
      link.classList.toggle('active', isActive);
    });

    panelItems.forEach(function (li) {
      var itemIndex = sectionIds.indexOf(li.dataset.section);
      var marker = li.querySelector('b');
      li.classList.remove('done', 'current');
      if (itemIndex === -1) return;
      if (itemIndex < activeIndex) {
        li.classList.add('done');
        if (marker) marker.textContent = '✓';
      } else if (itemIndex === activeIndex) {
        li.classList.add('current');
        if (marker) marker.textContent = '→';
      } else if (marker) {
        marker.textContent = '○';
      }
    });
  }

  // Plain scroll-position based spy: whichever section's top has crossed
  // the trigger line closest to (but not past) it is the active one.
  // Deliberately not using IntersectionObserver here - two attempts at
  // that approach on this project did not reliably update the UI for
  // the same viewer, while this simpler scroll+rAF approach has a track
  // record of working. Simplicity over "modern" here.
  function updateActiveSection() {
    var triggerY = window.innerHeight * 0.35;
    var activeId = sectionIds[0];
    for (var i = 0; i < sections.length; i++) {
      var rect = sections[i].getBoundingClientRect();
      if (rect.top <= triggerY) {
        activeId = sectionIds[i];
      }
    }
    setActive(activeId);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateActiveSection();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateActiveSection();
});
