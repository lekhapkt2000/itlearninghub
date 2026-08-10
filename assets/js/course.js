document.querySelectorAll('.code-block .copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
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
    btn.textContent = 'Đã chép ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1600);
  });
});

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
          feedback.textContent = 'Chưa đúng, thử lại nhé!';
          feedback.classList.remove('correct');
          feedback.classList.add('show', 'wrong');
        }
      }
    });
  });
});

document.querySelectorAll('.lesson-checklist').forEach((list) => {
  var items = list.querySelectorAll('li');
  if (!items.length) return;

  var storageKey = 'checklist:' + location.pathname;
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
    barLabel.textContent = 'Tiến độ: ' + done + '/' + total + ' mục (' + pct + '%)';
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
      localStorage.setItem(storageKey, JSON.stringify(saved));
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

document.querySelectorAll('.trigger-demo').forEach((demo) => {
  const scenarios = {
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
  const buttons = demo.querySelectorAll('[data-demo]');
  const deletedBox = demo.querySelector('[data-table="deleted"]');
  const insertedBox = demo.querySelector('[data-table="inserted"]');
  const deletedRow = deletedBox.querySelector('.trigger-demo-row');
  const insertedRow = insertedBox.querySelector('.trigger-demo-row');
  const sqlCode = demo.querySelector('[data-demo-sql]');

  function render(key) {
    const s = scenarios[key];
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.demo === key));
    deletedRow.textContent = s.old || '(trống)';
    insertedRow.textContent = s.new || '(trống)';
    deletedBox.classList.toggle('is-active', !!s.old);
    insertedBox.classList.toggle('is-active', !!s.new);
    if (sqlCode) sqlCode.textContent = s.sql;
  }

  buttons.forEach((b) => b.addEventListener('click', () => render(b.dataset.demo)));
  render('insert');
});

(function () {
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

  setActive(sectionIds[0]);

  if ('IntersectionObserver' in window) {
    // Track which sections are currently inside the top "activation band"
    // (top 35% of the viewport) and always activate the FIRST one in
    // document order among those. Picking by document order - not by
    // whichever entry the browser happened to report last in a batch -
    // is what keeps this stable when two sections intersect at once;
    // that ordering bug is the likely cause of an earlier IntersectionObserver
    // attempt misbehaving.
    var visible = {};
    function activateFromVisible() {
      for (var i = 0; i < sectionIds.length; i++) {
        if (visible[sectionIds[i]]) {
          setActive(sectionIds[i]);
          return;
        }
      }
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible[entry.target.id] = entry.isIntersecting;
        });
        activateFromVisible();
      },
      { root: null, rootMargin: '0px 0px -65% 0px', threshold: 0 }
    );
    sections.forEach(function (s) { observer.observe(s); });
  } else {
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
  }
})();
</content>
