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
