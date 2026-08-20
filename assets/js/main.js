(() => {
  const main = document.querySelector('main');
  if (!main) return;
  if (!main.id) main.id = 'main-content';
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');

  const skipLink = document.createElement('a');
  skipLink.href = '#' + main.id;
  skipLink.className = 'skip-link';
  skipLink.textContent = document.documentElement.lang === 'en' ? 'Skip to main content' : 'Bỏ qua, đến nội dung chính';
  document.body.insertBefore(skipLink, document.body.firstChild);
})();

(() => {
  // Swap the compact icon + "IT Learning Hub" text for the full theme-aware
  // logo lockup (wordmark baked into the image), and keep it in sync with
  // the theme toggle - no separate text needed once the image carries it.
  const brandMarks = document.querySelectorAll('.brand-mark');
  if (!brandMarks.length) return;

  function effectiveTheme() {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  brandMarks.forEach((img) => {
    const prefix = img.getAttribute('src').replace(/assets\/img\/logo-(light|dark)\.png.*$/, '');
    img.dataset.light = prefix + 'assets/img/logo-light.png?v=1';
    img.dataset.dark = prefix + 'assets/img/logo-dark.png?v=1';
    img.alt = 'IT Learning Hub';
  });

  function syncBrandLogo() {
    const isDark = effectiveTheme() === 'dark';
    brandMarks.forEach((img) => {
      img.src = isDark ? img.dataset.dark : img.dataset.light;
    });
  }
  syncBrandLogo();

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!localStorage.getItem('theme')) syncBrandLogo();
    });
  }

  new MutationObserver(syncBrandLogo).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
})();

(() => {
  const THEME_KEY = 'theme';
  const isEnPage = document.documentElement.lang === 'en';

  function effectiveTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', storedTheme);
  }

  const topbarActions = document.querySelector('.topbar-actions');
  if (!topbarActions) return;

  const SUN = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M15.2 4.8l-1.4 1.4M6.2 13.8l-1.4 1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 12.3A6.8 6.8 0 1 1 7.7 3.5a5.3 5.3 0 0 0 8.8 8.8Z"/></svg>';

  const themeToggle = document.createElement('button');
  themeToggle.type = 'button';
  themeToggle.className = 'theme-toggle';

  function syncThemeToggle() {
    const isDark = effectiveTheme() === 'dark';
    themeToggle.innerHTML = isDark ? SUN : MOON;
    themeToggle.setAttribute(
      'aria-label',
      isDark ? (isEnPage ? 'Switch to light mode' : 'Chuyển sang giao diện sáng') : (isEnPage ? 'Switch to dark mode' : 'Chuyển sang giao diện tối')
    );
  }
  syncThemeToggle();

  themeToggle.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    syncThemeToggle();
  });

  topbarActions.insertBefore(themeToggle, topbarActions.firstChild);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!localStorage.getItem(THEME_KEY)) syncThemeToggle();
    });
  }
})();

(() => {
  const isEnPage = document.documentElement.lang === 'en';
  const topbarActions = document.querySelector('.topbar-actions');
  if (!topbarActions) return;

  const cssLink = document.querySelector('link[href*="base.css"]');
  const rootPrefix = cssLink ? cssLink.getAttribute('href').replace(/assets\/css\/base\.css.*$/, '') : '';
  const indexUrl = rootPrefix + 'data/search-index.json?v=1';

  const T = isEnPage
    ? { label: 'Search', placeholder: 'Search lessons, functions, topics…', loading: 'Loading…', empty: 'No results for “' }
    : { label: 'Tìm kiếm', placeholder: 'Tìm bài học, hàm, chủ đề…', loading: 'Đang tải…', empty: 'Không tìm thấy kết quả cho “' };

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'search-trigger';
  searchBtn.setAttribute('aria-label', T.label);
  searchBtn.innerHTML =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M17 17l-4.5-4.5"/></svg>' +
    '<span class="search-trigger-label">' + T.label + '</span><kbd>Ctrl K</kbd>';
  topbarActions.insertBefore(searchBtn, topbarActions.firstChild);

  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="search-panel" role="dialog" aria-modal="true" aria-label="' + T.label + '">' +
    '<div class="search-input-row">' +
    '<svg class="search-input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M17 17l-4.5-4.5"/></svg>' +
    '<input type="text" class="search-input" placeholder="' + T.placeholder + '" autocomplete="off" spellcheck="false">' +
    '<kbd class="search-esc-hint">ESC</kbd>' +
    '</div>' +
    '<div class="search-results"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.search-panel');
  const input = overlay.querySelector('.search-input');
  const resultsEl = overlay.querySelector('.search-results');

  let searchData = null;
  let searchDataPromise = null;
  function loadSearchData() {
    if (!searchDataPromise) {
      searchDataPromise = fetch(indexUrl)
        .then((r) => r.json())
        .then((data) => {
          searchData = data.filter((e) => e.lang === (isEnPage ? 'en' : 'vi'));
          return searchData;
        })
        .catch(() => {
          searchData = [];
          return searchData;
        });
    }
    return searchDataPromise;
  }

  function stripDiacritics(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }
  function normalize(s) {
    return stripDiacritics(s).toLowerCase();
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderResults(query) {
    const q = normalize(query.trim());
    if (!q) {
      resultsEl.innerHTML = '';
      return;
    }
    if (!searchData) {
      resultsEl.innerHTML = '<p class="search-empty">' + T.loading + '</p>';
      return;
    }

    const scored = [];
    for (const entry of searchData) {
      const main = entry.heading || entry.title;
      const hay = normalize(main + ' ' + (entry.course || '') + ' ' + (entry.label || ''));
      const idx = hay.indexOf(q);
      if (idx === -1) continue;
      let score = idx;
      if (entry.heading) score -= 500;
      scored.push({ entry, score });
    }
    scored.sort((a, b) => a.score - b.score);
    const top = scored.slice(0, 30);

    if (!top.length) {
      resultsEl.innerHTML = '<p class="search-empty">' + T.empty + escapeHtml(query) + '”</p>';
      return;
    }

    resultsEl.innerHTML = top
      .map(({ entry }) => {
        const href = rootPrefix + entry.url + (entry.id ? '#' + entry.id : '');
        const main = entry.heading || entry.title;
        const sub = [entry.course, entry.label || (entry.heading ? entry.title : '')].filter(Boolean).join(' · ');
        return (
          '<a class="search-result" href="' + href + '">' +
          '<span class="search-result-main">' + escapeHtml(main) + '</span>' +
          (sub ? '<span class="search-result-sub">' + escapeHtml(sub) + '</span>' : '') +
          '</a>'
        );
      })
      .join('');
  }

  function openSearch() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    loadSearchData().then(() => renderResults(input.value));
    input.focus();
  }
  function closeSearch() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    searchBtn.focus();
  }

  searchBtn.addEventListener('click', openSearch);
  overlay.addEventListener('mousedown', (e) => {
    if (!panel.contains(e.target)) closeSearch();
  });

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => renderResults(input.value), 80);
  });

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && !overlay.hidden) {
      closeSearch();
    }
  });

  // Keep Tab/Shift+Tab cycling within the panel while it's open, instead of
  // escaping to the page content sitting behind the overlay.
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = panel.querySelectorAll('input, a[href]');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
})();

(() => {
  // The old "Liên hệ"/"Contact" nav item (topbar + footer) now opens a
  // schedule notice instead of jumping to the footer - there's no contact
  // form/section on this site. Once real per-class schedules exist, swap
  // the CLASSES array below for real entries and this same modal renders
  // them instead of the empty-state message.
  const links = document.querySelectorAll('a[href$="#lien-he"], a[href$="#contact"]');
  if (!links.length) return;

  const isEnPage = document.documentElement.lang === 'en';
  const CLASSES = []; // e.g. { code: 'IT004.O21', day: 'Thứ 3', time: '13:00 - 15:30', room: 'B4-403' }

  const T = isEnPage
    ? {
        nav: 'Class Schedule', title: 'Class Schedule',
        empty: 'The official schedule (class codes and session times) for each class hasn’t been finalized yet. It will be published here as soon as it’s available.',
        close: 'Got it'
      }
    : {
        nav: 'Lịch học', title: 'Lịch học',
        empty: 'Lịch học chính thức (mã lớp và giờ học) từng lớp hiện chưa có - Sẽ được cập nhật đầy đủ tại đây ngay khi có lịch.',
        close: 'Đã hiểu'
      };

  links.forEach((a) => {
    a.textContent = T.nav;
    a.removeAttribute('href');
    a.classList.add('schedule-trigger');
    a.setAttribute('role', 'button');
    a.tabIndex = 0;
  });

  const bodyHtml = CLASSES.length
    ? '<ul class="schedule-list">' + CLASSES.map((c) =>
        '<li><span class="schedule-code">' + c.code + '</span><span class="schedule-time">' + c.day + ' · ' + c.time + (c.room ? ' · ' + c.room : '') + '</span></li>'
      ).join('') + '</ul>'
    : '<p>' + T.empty + '</p>';

  const overlay = document.createElement('div');
  overlay.className = 'schedule-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="schedule-panel" role="dialog" aria-modal="true" aria-label="' + T.title + '">' +
    '<div class="schedule-icon"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4" width="13" height="13" rx="1.4"/><path d="M3.5 8h13"/><path d="M7 2.5v3M13 2.5v3"/></svg></div>' +
    '<h3>' + T.title + '</h3>' +
    bodyHtml +
    '<button type="button" class="ghost-button schedule-close">' + T.close + '</button>' +
    '</div>';
  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.schedule-panel');
  const closeBtn = overlay.querySelector('.schedule-close');
  let lastFocused = null;

  function openSchedule(trigger) {
    lastFocused = trigger || document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function closeSchedule() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openSchedule(a);
    });
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSchedule(a);
      }
    });
  });

  closeBtn.addEventListener('click', closeSchedule);
  overlay.addEventListener('mousedown', (e) => {
    if (!panel.contains(e.target)) closeSchedule();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeSchedule();
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    closeBtn.focus();
  });
})();

const toggle = document.querySelector('.mobile-toggle');
const nav = document.querySelector('.main-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}
