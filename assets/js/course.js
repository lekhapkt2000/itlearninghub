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

  // Scroll-position based spy: whichever section's top has crossed the
  // trigger line closest to (but not past) it is the active one. Plain
  // scroll + getBoundingClientRect math instead of IntersectionObserver,
  // so behaviour doesn't depend on rootMargin/threshold edge cases.
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
})();
</content>
