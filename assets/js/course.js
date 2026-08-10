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

const tocLinks = document.querySelectorAll('.lesson-toc a[data-toc]');
if (tocLinks.length) {
  const sections = Array.from(tocLinks)
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  const sectionIds = sections.map((s) => s.id);
  const panelItems = document.querySelectorAll('.learning-panel .checklist li[data-section]');

  const setActive = (id) => {
    tocLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + id));

    if (panelItems.length) {
      const activeIndex = sectionIds.indexOf(id);
      panelItems.forEach((li) => {
        const itemIndex = sectionIds.indexOf(li.dataset.section);
        const marker = li.querySelector('b');
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
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-30% 0px -60% 0px' }
  );
  sections.forEach((section) => observer.observe(section));

  if (sectionIds[0]) setActive(sectionIds[0]);
}
</content>
