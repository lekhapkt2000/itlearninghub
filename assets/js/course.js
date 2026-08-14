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

// Nested sub-TOC: for each top-level .lesson-toc link, auto-build a
// collapsed list of that section's H3 headings (using existing ids or
// assigning one), open it whenever the parent link is the active one
// (course.js's own scroll-spy above already toggles that class), and
// run a lightweight scroll-spy scoped to just the open group's H3s.
safeRun(function () {
  var tocLinks = document.querySelectorAll('.lesson-toc a[data-toc]');
  if (!tocLinks.length) return;

  var groups = [];
  tocLinks.forEach(function (link) {
    var section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    var h3s = section.querySelectorAll('h3');
    if (!h3s.length) return;

    var ul = document.createElement('ul');
    ul.className = 'toc-sub';
    h3s.forEach(function (h3, i) {
      if (!h3.id) h3.id = section.id + '-s' + (i + 1);
      var a = document.createElement('a');
      a.href = '#' + h3.id;
      a.textContent = h3.textContent;
      var li = document.createElement('li');
      li.appendChild(a);
      ul.appendChild(li);
    });
    link.insertAdjacentElement('afterend', ul);
    groups.push({ link: link, ul: ul, h3s: Array.prototype.slice.call(h3s) });
  });
  if (!groups.length) return;

  function syncExpanded() {
    groups.forEach(function (g) {
      g.ul.classList.toggle('is-open', g.link.classList.contains('active'));
    });
  }
  var observer = new MutationObserver(syncExpanded);
  tocLinks.forEach(function (link) {
    observer.observe(link, { attributes: true, attributeFilter: ['class'] });
  });
  syncExpanded();

  function updateSubActive() {
    var triggerY = window.innerHeight * 0.35;
    groups.forEach(function (g) {
      var links = g.ul.querySelectorAll('a');
      if (!g.ul.classList.contains('is-open')) {
        links.forEach(function (a) { a.classList.remove('active'); });
        return;
      }
      var activeH3 = null;
      g.h3s.forEach(function (h3) {
        if (h3.getBoundingClientRect().top <= triggerY) activeH3 = h3;
      });
      links.forEach(function (a) {
        a.classList.toggle('active', !!activeH3 && a.getAttribute('href') === '#' + activeH3.id);
      });
    });
  }

  var subTicking = false;
  window.addEventListener('scroll', function () {
    if (subTicking) return;
    subTicking = true;
    requestAnimationFrame(function () { updateSubActive(); subTicking = false; });
  }, { passive: true });
  updateSubActive();
});

// Constraint/category picker pills: clicking one scrolls to and
// briefly flashes the matching heading below (opt-in via markup, only
// present on pages that use it).
safeRun(function () {
  var picker = document.querySelector('.constraint-picker');
  if (!picker) return;
  picker.addEventListener('click', function (e) {
    var btn = e.target.closest('.constraint-pill');
    if (!btn) return;
    var target = document.getElementById(btn.dataset.target);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.remove('is-jumped');
    void target.offsetWidth;
    target.classList.add('is-jumped');
  });
});

// Floating color-key button - only on pages that actually use the
// colored callout boxes (lesson/exercise/schema pages), so it stays out
// of the way on overview/index pages. Built entirely from JS rather than
// duplicated per-page markup, so the wording only lives in one place.
safeRun(function () {
  if (!document.querySelector('.lesson-content')) return;

  var LEGEND = IS_EN
    ? {
        aria: 'Color key',
        title: 'COLOR KEY',
        close: 'Close',
        items: [
          ['is-blue', 'Blue - Definition, concept'],
          ['is-green', 'Green - Recommended approach'],
          ['is-yellow', 'Yellow - Heads up, common mistake'],
          ['is-red', 'Red - Warning, cannot be undone'],
          ['is-black', 'Black - SQL code to run']
        ]
      }
    : {
        aria: 'Chú thích màu',
        title: 'CHÚ THÍCH MÀU',
        close: 'Đóng',
        items: [
          ['is-blue', 'Xanh dương - Định nghĩa, khái niệm'],
          ['is-green', 'Xanh lá - Khuyến nghị, cách làm đúng'],
          ['is-yellow', 'Vàng - Lưu ý, lỗi dễ gặp'],
          ['is-red', 'Đỏ - Cảnh báo, không thể hoàn tác'],
          ['is-black', 'Đen - Code SQL để chạy']
        ]
      };

  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'color-legend-fab';
  fab.setAttribute('aria-label', LEGEND.aria);
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.3"/><circle cx="7.4" cy="7.8" r="1" fill="currentColor" stroke="none"/><circle cx="10.6" cy="6.3" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="8.8" r="1" fill="currentColor" stroke="none"/><circle cx="8.2" cy="12.4" r="1" fill="currentColor" stroke="none"/></svg>';

  var itemsHtml = LEGEND.items.map(function (item) {
    return '<li><span class="color-legend-dot ' + item[0] + '"></span> ' + item[1] + '</li>';
  }).join('');

  var popup = document.createElement('div');
  popup.className = 'color-legend-popup';
  popup.hidden = true;
  popup.innerHTML =
    '<div class="color-legend-popup-head"><span>' + LEGEND.title + '</span>' +
    '<button type="button" class="color-legend-close" aria-label="' + LEGEND.close + '">✕</button></div>' +
    '<ul class="color-legend-list">' + itemsHtml + '</ul>';

  document.body.appendChild(fab);
  document.body.appendChild(popup);

  function closeLegend() {
    popup.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
  }
  function openLegend() {
    popup.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
  }

  fab.addEventListener('click', function () {
    if (popup.hidden) openLegend(); else closeLegend();
  });
  popup.querySelector('.color-legend-close').addEventListener('click', closeLegend);
  document.addEventListener('click', function (e) {
    if (!popup.hidden && e.target !== fab && !popup.contains(e.target) && !fab.contains(e.target)) closeLegend();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLegend();
  });
});
