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
  qc.querySelectorAll('.qc-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const isCorrect = opt.dataset.correct === 'true';
      qc.querySelectorAll('.qc-option').forEach((o) => o.classList.remove('correct', 'wrong'));
      opt.classList.add(isCorrect ? 'correct' : 'wrong');
      if (feedback) feedback.classList.add('show');
    });
  });
});

document.querySelectorAll('.trigger-demo').forEach((demo) => {
  const scenarios = {
    insert: { old: null, new: "HOTEN = 'Nguyễn Văn A' (bản ghi mới)" },
    update: { old: "HOTEN = 'Nguyễn Văn A'", new: "HOTEN = 'Nguyễn Văn B'" },
    delete: { old: "HOTEN = 'Nguyễn Văn A' (đã xóa)", new: null },
  };
  const buttons = demo.querySelectorAll('[data-demo]');
  const deletedBox = demo.querySelector('[data-table="deleted"]');
  const insertedBox = demo.querySelector('[data-table="inserted"]');
  const deletedRow = deletedBox.querySelector('.trigger-demo-row');
  const insertedRow = insertedBox.querySelector('.trigger-demo-row');

  function render(key) {
    const s = scenarios[key];
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.demo === key));
    deletedRow.textContent = s.old || '(trống)';
    insertedRow.textContent = s.new || '(trống)';
    deletedBox.classList.toggle('is-active', !!s.old);
    insertedBox.classList.toggle('is-active', !!s.new);
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
