(function () {
  // Public topic list (courses/is355/danh-sach-de-tai.html). The backend's
  // publicTopics action only returns names + classes, never emails/MSSV.
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzl_MDfTRkxNExa--NscWG4HPI7ioAN0QImDGLDyk66UFuXaUo1Zrwi_qvwoIjrS5Vu/exec';

  var root = document.getElementById('topic-list');
  if (!root) return;

  var EN = document.documentElement.lang === 'en';
  var T = EN ? {
    tracks: { A: 'A - Green Finance', B: 'B - DeFi & Banking', C: 'C - Analytics & AML', D: 'D - RWA & Tokenization', E: 'E - AI + Blockchain' },
    levels: { '1': 'Level 1 - Basic', '2': 'Level 2 - Intermediate', '3': 'Level 3 - Advanced', '4': 'Level 4 - Research' },
    groups: function (n) { return n + (n === 1 ? ' group' : ' groups'); },
    students: function (n) { return n + ' students'; },
    open: 'Registration open',
    closed: 'Registration closed',
    updated: function (t) { return 'Updated ' + t; },
    group: 'Code',
    leader: 'Leader',
    review: { pending: 'Pending review', resubmitted: 'Re-review pending', revise: 'Needs revision', approved: 'Approved', rejected: 'Not approved' },
    descVi: 'Vietnamese:',
    descEn: 'English:',
    members: function (n) { return n + ' members'; },
    details: function (n) { return 'Description & ' + n + ' references'; },
    loading: 'Loading the topic list...',
    empty: 'No group has registered yet.',
    noMatch: 'No topic matches your filters.',
    error: 'Could not load the topic list. If your internet works, try turning off your ad-blocker or use a private window, then reload.',
    retry: 'Try again',
    showing: function (a, b) { return 'Showing ' + a + ' / ' + b + ' topics'; }
  } : {
    tracks: { A: 'A - Green Finance', B: 'B - DeFi & Banking', C: 'C - Analytics & AML', D: 'D - RWA & Tokenization', E: 'E - AI + Blockchain' },
    levels: { '1': 'Mức 1 - Basic', '2': 'Mức 2 - Intermediate', '3': 'Mức 3 - Advanced', '4': 'Mức 4 - Research' },
    groups: function (n) { return n + ' nhóm'; },
    students: function (n) { return n + ' sinh viên'; },
    open: 'Đang mở đăng ký',
    closed: 'Đã khóa đăng ký',
    updated: function (t) { return 'Cập nhật ' + t; },
    group: 'Mã',
    leader: 'Trưởng nhóm',
    review: { pending: 'Chờ duyệt', resubmitted: 'Chờ duyệt lại', revise: 'Cần chỉnh sửa', approved: 'Đã duyệt', rejected: 'Không duyệt' },
    descVi: 'Tiếng Việt:',
    descEn: 'Tiếng Anh:',
    members: function (n) { return n + ' thành viên'; },
    details: function (n) { return 'Mô tả & ' + n + ' tài liệu tham khảo'; },
    loading: 'Đang tải danh sách đề tài...',
    empty: 'Chưa có nhóm nào đăng ký.',
    noMatch: 'Không có đề tài nào khớp bộ lọc.',
    error: 'Không tải được danh sách đề tài. Nếu mạng vẫn bình thường, thử tắt trình chặn quảng cáo (ad-blocker) hoặc mở bằng cửa sổ ẩn danh rồi tải lại trang.',
    retry: 'Thử lại',
    showing: function (a, b) { return 'Hiển thị ' + a + ' / ' + b + ' đề tài'; }
  };

  var listEl = document.getElementById('tl-list');
  var statusEl = document.getElementById('tl-status');
  var metaEl = document.getElementById('tl-meta');
  var summaryEl = document.getElementById('tl-summary');
  var countEl = document.getElementById('tl-count');
  var searchEl = document.getElementById('tl-search');
  var trackEl = document.getElementById('tl-track');
  var levelEl = document.getElementById('tl-level');
  var classEl = document.getElementById('tl-class');
  var groups = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString(EN ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function shortClass(c) { return String(c || '').replace('IS355.R11.', ''); }

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  }

  function setStatus(html) {
    statusEl.innerHTML = html;
    statusEl.hidden = !html;
  }

  function load() {
    setStatus('<span class="tl-spinner" aria-hidden="true"></span>' + T.loading);
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'publicTopics' }),
      redirect: 'follow',
      cache: 'no-store'
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.message) || 'error');
        // First come, first listed - also what the # number means.
        groups = (data.groups || []).slice().sort(function (a, b) {
          return String(a.submittedAt).localeCompare(String(b.submittedAt));
        });
        groups.forEach(function (g, i) { g.order = i + 1; });
        renderMeta(data);
        renderSummary();
        render();
        setStatus('');
      })
      .catch(function () {
        setStatus(T.error + ' <button type="button" class="outline-button tl-retry">' + T.retry + '</button>');
        statusEl.querySelector('.tl-retry').addEventListener('click', load);
      });
  }

  function renderMeta(data) {
    var students = groups.reduce(function (n, g) { return n + g.members.length; }, 0);
    metaEl.innerHTML =
      '<span>' + T.groups(groups.length) + '</span>' +
      '<span>' + T.students(students) + '</span>' +
      '<span class="' + (data.registrationOpen ? 'tl-open' : 'tl-closed') + '">' + (data.registrationOpen ? T.open : T.closed) + '</span>' +
      '<span>' + T.updated(fmtTime(data.updatedAt)) + '</span>';
  }

  function renderSummary() {
    summaryEl.innerHTML = Object.keys(T.tracks).map(function (k) {
      var n = groups.filter(function (g) { return g.track === k; }).length;
      return '<button type="button" class="tl-sum' + (trackEl.value === k ? ' is-active' : '') + '" data-track="' + k + '">' +
        '<b>' + n + '</b><span>' + esc(T.tracks[k]) + '</span></button>';
    }).join('');
  }

  summaryEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-track]');
    if (!btn) return;
    trackEl.value = trackEl.value === btn.dataset.track ? '' : btn.dataset.track;
    renderSummary();
    render();
  });

  function render() {
    var q = norm(searchEl.value.trim());
    var tr = trackEl.value;
    var lv = levelEl.value;
    var cls = classEl.value;
    var list = groups.filter(function (g) {
      if (tr && g.track !== tr) return false;
      if (lv && g.level !== lv) return false;
      if (cls && !g.members.some(function (m) { return m['class'] === cls; })) return false;
      if (!q) return true;
      var hay = [g.groupName, g.groupCode, g.title, g.description, g.descriptionEn].concat(g.members.map(function (m) { return m.fullName; })).join(' ');
      return norm(hay).indexOf(q) !== -1;
    });

    countEl.textContent = groups.length ? T.showing(list.length, groups.length) : '';
    if (!groups.length) { listEl.innerHTML = '<p class="tl-empty">' + T.empty + '</p>'; return; }
    if (!list.length) { listEl.innerHTML = '<p class="tl-empty">' + T.noMatch + '</p>'; return; }

    listEl.innerHTML = list.map(function (g) {
      var members = g.members.map(function (m) {
        return '<li' + (m.leader ? ' class="is-leader"' : '') + '><span>' + esc(m.fullName) + '</span>' +
          '<small>' + esc(shortClass(m['class'])) + (m.leader ? ' · ' + T.leader : '') + '</small></li>';
      }).join('');
      var refs = g.refs.map(function (r) {
        // IEEE string comes pre-escaped from the server (journal in <i>).
        var m = r.meta;
        var cite = m && m.ieeeHtml && m.status !== 'suggested'
          ? m.ieeeHtml
          : esc(r.citation).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener nofollow">$1</a>');
        var b = window.IS355Tools ? IS355Tools.refBadge(m, EN ? 'en' : 'vi') : null;
        return '<li><b>' + esc(r.type) + ':</b> ' + cite + (b ? ' <span class="ref-badge ' + b.cls + '">' + esc(b.label) + '</span>' : '') + '</li>';
      }).join('');
      return '<article class="tl-card">' +
        '<div class="tl-card-head">' +
        '<span class="tl-no">#' + g.order + '</span>' +
        '<div class="tl-card-group"><b>' + esc(g.groupName) + '</b>' + (g.groupCode ? '<span>' + T.group + ' <code>' + esc(g.groupCode) + '</code></span>' : '') + '</div>' +
        '<span class="tl-tag tl-track-' + esc(g.track) + '">' + esc(T.tracks[g.track] || g.track) + '</span>' +
        '<span class="tl-tag tl-level">' + esc(T.levels[g.level] || g.level) + '</span>' +
        '<span class="tl-review tl-review-' + esc(g.reviewStatus || 'pending') + '">' + esc(T.review[g.reviewStatus] || T.review.pending) + '</span>' +
        '</div>' +
        '<h3 class="tl-title">' + esc(g.title) + '</h3>' +
        '<ul class="tl-members" aria-label="' + T.members(g.members.length) + '">' + members + '</ul>' +
        '<details class="tl-details"><summary>' + T.details(g.refs.length) + '</summary>' +
        '<p class="tl-desc"><b>' + T.descVi + '</b> ' + esc(g.description) + '</p>' +
        (g.descriptionEn ? '<p class="tl-desc"><b>' + T.descEn + '</b> ' + esc(g.descriptionEn) + '</p>' : '') +
        '<ol>' + refs + '</ol></details>' +
        '</article>';
    }).join('');
  }

  [searchEl, trackEl, levelEl, classEl].forEach(function (el) {
    el.addEventListener('input', function () {
      if (el === trackEl) renderSummary();
      render();
    });
  });

  load();
})();
