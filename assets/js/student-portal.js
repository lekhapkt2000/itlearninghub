/*
 * IS355 student portal: progress (tien-do), find-a-group (tim-nhom) and
 * defense schedule (lich-bao-ve). One OTP sign-in (school email) gives a
 * 6h session token kept in localStorage; public parts work without it.
 */
(function () {
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzl_MDfTRkxNExa--NscWG4HPI7ioAN0QImDGLDyk66UFuXaUo1Zrwi_qvwoIjrS5Vu/exec';
  var root = document.getElementById('portal');
  if (!root) return;
  var PAGE = root.dataset.portal; // progress | findgroup | defense
  var EN = document.documentElement.lang === 'en';
  var SESSION_KEY = 'is355:portal-session';
  var TRACKS = { A: 'A - Green Finance', B: 'B - DeFi & Banking', C: 'C - Analytics & AML', D: 'D - RWA & Tokenization', E: 'E - AI + Blockchain' };

  var T = EN ? {
    signInTitle: 'Sign in with your student ID',
    signInHint: 'We send a 6-digit code to your school email (studentID@gm.uit.edu.vn). The session lasts 6 hours on this browser.',
    sid: 'Student ID', otp: 'OTP code', sendOtp: 'Send OTP', verify: 'Sign in', sending: 'Sending...', checking: 'Checking...',
    otpSent: 'Code sent to ', notOnRoster: 'Not on the IS355 class list', resend: function (s) { return 'Resend in ' + s + 's'; },
    hello: 'Signed in as', signOut: 'Sign out', group: 'Group', noGroup: 'You are not in a registered group yet.',
    loading: 'Loading...', netErr: 'Could not reach the server. If your internet works, try turning off your ad-blocker or use a private window.',
    review: { pending: 'Pending review', resubmitted: 'Re-review pending', revise: 'Needs revision', approved: 'Approved', rejected: 'Not approved' },
    // progress
    pgNeedGroup: 'Register your group first, then come back to submit progress.', register: 'Register a topic',
    deadline: 'Deadline', lastSub: 'Last submitted', notYet: 'Not submitted yet', github: 'GitHub repository', contracts: 'Smart contract address(es) on Sepolia',
    contractsHint: 'One per line or comma-separated, e.g. 0xAbC...', demo: 'Demo link (video / deployed DApp)', docs: 'Report / slides link', note: 'Note for the instructor',
    submit: 'Submit', submitted: 'Submitted. Automatic check results are below.', resubmitHint: 'Submitting again replaces this milestone\'s links.',
    deployed: 'Deployed on Sepolia', notDeployed: 'No contract at this address on Sepolia', verified: 'Source verified', unverifiedSrc: 'Source not verified on Etherscan',
    txs: 'transactions', wallets: 'wallets', commits: 'commits', lastCommit: 'last commit', checkedAt: 'Checked',
    // find group
    fgBoard: 'Looking for a group', fgTeams: 'Groups looking for members', fgPeople: 'Students looking for a group', fgPost: 'Your post',
    fgPostHint: 'Your name, class, school email and what you write here are shown publicly on this page. Your post disappears automatically once you join a group (or your group is full).',
    fgTracks: 'Topics you are interested in', fgSkills: 'Your skills', fgNeeded: 'How many more members do you need?', fgNote: 'A few lines about you / your group',
    fgSave: 'Save post', fgRemove: 'Remove my post', fgSaved: 'Post saved.', fgRemoved: 'Post removed.', fgEmpty: 'No posts yet.',
    fgUngrouped: function (n) { return n + ' students on the class list have no group yet.'; }, fgContact: 'Contact', fgNeeds: function (n, m) { return 'Needs ' + n + ' more (' + m + '/6 members)'; },
    fgMatch: 'Good match', fgFilter: 'All topics', fgSearch: 'Search name, skill, note...', fgSignInToPost: 'Sign in to post or update your own listing.',
    // defense
    dfClosed: 'Booking is not open yet. The schedule below is for reference.', dfOpenHint: 'Only groups with an approved topic can book. Choosing another slot moves your booking.',
    dfNotApproved: 'Your topic is not approved yet, so you cannot book a slot.', dfBook: 'Choose this slot', dfYours: 'Your group', dfFree: 'Available', dfTaken: 'Taken',
    dfBooked: 'Booked. A confirmation email was sent to your group.', dfEmpty: 'The instructor has not published the schedule yet.', dfMine: 'Your defense slot:'
  } : {
    signInTitle: 'Đăng nhập bằng MSSV',
    signInHint: 'Hệ thống gửi mã 6 số tới email trường (MSSV@gm.uit.edu.vn). Phiên đăng nhập giữ 6 giờ trên trình duyệt này.',
    sid: 'MSSV', otp: 'Mã OTP', sendOtp: 'Gửi mã OTP', verify: 'Đăng nhập', sending: 'Đang gửi...', checking: 'Đang kiểm tra...',
    otpSent: 'Đã gửi mã tới ', notOnRoster: 'Không có trong danh sách lớp IS355', resend: function (s) { return 'Gửi lại sau ' + s + 's'; },
    hello: 'Đang đăng nhập:', signOut: 'Đăng xuất', group: 'Nhóm', noGroup: 'Bạn chưa thuộc nhóm nào đã đăng ký.',
    loading: 'Đang tải...', netErr: 'Không thể kết nối máy chủ. Nếu mạng vẫn bình thường, thử tắt trình chặn quảng cáo (ad-blocker) hoặc mở bằng cửa sổ ẩn danh.',
    review: { pending: 'Chờ duyệt', resubmitted: 'Chờ duyệt lại', revise: 'Cần chỉnh sửa', approved: 'Đã duyệt', rejected: 'Không duyệt' },
    pgNeedGroup: 'Nhóm cần đăng ký đề tài trước, sau đó quay lại đây để nộp tiến độ.', register: 'Đăng ký đề tài',
    deadline: 'Hạn', lastSub: 'Nộp gần nhất', notYet: 'Chưa nộp', github: 'Repo GitHub', contracts: 'Địa chỉ smart contract trên Sepolia',
    contractsHint: 'Mỗi địa chỉ một dòng hoặc cách nhau bằng dấu phẩy, ví dụ 0xAbC...', demo: 'Link demo (video / DApp đã deploy)', docs: 'Link báo cáo / slide', note: 'Ghi chú cho giảng viên',
    submit: 'Nộp', submitted: 'Đã nộp. Kết quả kiểm tra tự động ở bên dưới.', resubmitHint: 'Nộp lại sẽ thay các link của mốc này.',
    deployed: 'Đã deploy trên Sepolia', notDeployed: 'Không có contract ở địa chỉ này trên Sepolia', verified: 'Đã verify source', unverifiedSrc: 'Chưa verify source trên Etherscan',
    txs: 'giao dịch', wallets: 'ví', commits: 'commit', lastCommit: 'commit gần nhất', checkedAt: 'Kiểm tra lúc',
    fgBoard: 'Tìm nhóm', fgTeams: 'Nhóm đang tìm thêm thành viên', fgPeople: 'Sinh viên đang tìm nhóm', fgPost: 'Tin của bạn',
    fgPostHint: 'Họ tên, lớp, email trường và nội dung bạn viết sẽ hiện công khai trên trang này. Tin tự ẩn khi bạn đã vào nhóm (hoặc nhóm đã đủ người).',
    fgTracks: 'Chủ đề quan tâm', fgSkills: 'Kỹ năng của bạn', fgNeeded: 'Nhóm cần thêm mấy người?', fgNote: 'Vài dòng giới thiệu bạn / nhóm',
    fgSave: 'Lưu tin', fgRemove: 'Gỡ tin', fgSaved: 'Đã lưu tin.', fgRemoved: 'Đã gỡ tin.', fgEmpty: 'Chưa có tin nào.',
    fgUngrouped: function (n) { return 'Còn ' + n + ' sinh viên trong danh sách lớp chưa có nhóm.'; }, fgContact: 'Liên hệ', fgNeeds: function (n, m) { return 'Cần thêm ' + n + ' người (' + m + '/6 thành viên)'; },
    fgMatch: 'Phù hợp với bạn', fgFilter: 'Mọi chủ đề', fgSearch: 'Tìm tên, kỹ năng, ghi chú...', fgSignInToPost: 'Đăng nhập để đăng hoặc sửa tin của bạn.',
    dfClosed: 'Chưa mở đăng ký lịch bảo vệ. Lịch bên dưới để tham khảo.', dfOpenHint: 'Chỉ nhóm có đề tài đã duyệt mới chọn được lịch. Chọn khung giờ khác sẽ đổi lịch của nhóm.',
    dfNotApproved: 'Đề tài của nhóm chưa được duyệt nên chưa chọn lịch được.', dfBook: 'Chọn khung này', dfYours: 'Nhóm bạn', dfFree: 'Còn trống', dfTaken: 'Đã có nhóm',
    dfBooked: 'Đã chọn lịch. Email xác nhận đã gửi tới cả nhóm.', dfEmpty: 'Giảng viên chưa công bố lịch bảo vệ.', dfMine: 'Lịch bảo vệ của nhóm:'
  };

  var authEl = document.getElementById('pt-auth');
  var mainEl = document.getElementById('pt-main');
  var session = null, me = null, board = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(iso, opts) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString(EN ? 'en-GB' : 'vi-VN', opts || { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function post(data) {
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data), redirect: 'follow', cache: 'no-store'
    }).then(function (r) { return r.json(); });
  }
  function msg(el, text, ok) {
    el.textContent = text || '';
    el.className = 'pt-msg' + (text ? (ok ? ' ok' : ' bad') : '');
  }

  /* ---------- Session ---------- */

  function loadSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.exp > Date.now()) return s;
    } catch (e) { /* ignore */ }
    return null;
  }
  function saveSession(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
  function clearSession() { session = null; me = null; try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } }

  function renderLogin() {
    authEl.innerHTML =
      '<section class="reg-card pt-login"><div class="reg-card-head"><h2>' + T.signInTitle + '</h2></div>' +
      '<p class="reg-card-hint">' + T.signInHint + '</p>' +
      '<div class="pt-login-row">' +
      '<label class="reg-field"><span>' + T.sid + '</span><input type="text" id="pt-sid" inputmode="numeric" maxlength="8" placeholder="23520000" autocomplete="username"><small class="reg-member-status" id="pt-name"></small></label>' +
      '<button type="button" class="outline-button" id="pt-send">' + T.sendOtp + '</button>' +
      '<label class="reg-field"><span>' + T.otp + '</span><input type="text" id="pt-otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" class="reg-otp-input"></label>' +
      '<button type="button" class="primary-button" id="pt-verify">' + T.verify + ' <span>›</span></button>' +
      '</div><p class="pt-msg" id="pt-login-msg"></p></section>';
    var sidEl = document.getElementById('pt-sid'), nameEl = document.getElementById('pt-name');
    var sendBtn = document.getElementById('pt-send'), lm = document.getElementById('pt-login-msg');
    sidEl.addEventListener('input', function () {
      sidEl.value = sidEl.value.replace(/\D/g, '').slice(0, 8);
      nameEl.textContent = '';
      nameEl.className = 'reg-member-status';
      if (sidEl.value.length !== 8) return;
      var id = sidEl.value;
      post({ action: 'lookupStudents', ids: [id] }).then(function (r) {
        if (sidEl.value !== id) return;
        var s = r && r.students && r.students[id];
        nameEl.textContent = s ? s.fullName + ' · ' + s['class'] : T.notOnRoster;
        nameEl.className = 'reg-member-status ' + (s ? 'is-ok' : 'is-bad');
      }).catch(function () {});
    });
    var timer;
    sendBtn.addEventListener('click', function () {
      if (!/^\d{8}$/.test(sidEl.value)) { msg(lm, T.sid + '?', false); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = T.sending;
      post({ action: 'requestOtp', studentId: sidEl.value, purpose: 'portal' }).then(function (r) {
        if (!r.ok) { msg(lm, r.message, false); sendBtn.disabled = false; sendBtn.textContent = T.sendOtp; return; }
        msg(lm, T.otpSent + sidEl.value + '@gm.uit.edu.vn', true);
        document.getElementById('pt-otp').focus();
        var left = 60;
        clearInterval(timer);
        timer = setInterval(function () {
          left--;
          sendBtn.textContent = left > 0 ? T.resend(left) : T.sendOtp;
          if (left <= 0) { clearInterval(timer); sendBtn.disabled = false; }
        }, 1000);
      }).catch(function () { msg(lm, T.netErr, false); sendBtn.disabled = false; sendBtn.textContent = T.sendOtp; });
    });
    document.getElementById('pt-otp').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
    document.getElementById('pt-verify').addEventListener('click', function () {
      var otp = document.getElementById('pt-otp').value;
      var btn = this;
      btn.disabled = true;
      btn.textContent = T.checking;
      post({ action: 'verifyOtp', studentId: sidEl.value, otp: otp }).then(function (r) {
        if (!r.ok) { msg(lm, r.message, false); return; }
        session = { token: r.token, exp: Date.now() + (r.expiresIn - 60) * 1000 };
        saveSession(session);
        loadMe();
      }).catch(function () { msg(lm, T.netErr, false); })
        .finally(function () { btn.disabled = false; btn.innerHTML = T.verify + ' <span>›</span>'; });
    });
  }

  function renderUserBar() {
    var s = me.student, g = me.group;
    authEl.innerHTML = '<div class="pt-userbar"><div><span class="pt-muted">' + T.hello + '</span> <b>' + esc(s.fullName) + '</b> · ' + esc(s.studentId) + ' · ' + esc(s['class']) +
      (g ? '<br><span class="pt-muted">' + T.group + ':</span> <b>' + esc(g.groupName) + '</b> <code>' + esc(g.groupCode) + '</code> <span class="tl-review tl-review-' + esc(g.reviewStatus) + '">' + esc(T.review[g.reviewStatus] || '') + '</span>' : '<br><span class="pt-muted">' + T.noGroup + '</span>') +
      '</div><button type="button" class="outline-button" id="pt-logout">' + T.signOut + '</button></div>';
    document.getElementById('pt-logout').addEventListener('click', function () { clearSession(); boot(); });
  }

  function loadMe() {
    authEl.innerHTML = '<div class="pt-userbar"><span class="pt-muted">' + T.loading + '</span></div>';
    return post({ action: 'portalState', token: session.token }).then(function (r) {
      if (!r.ok) { clearSession(); renderLogin(); if (PAGE !== 'progress') renderPage(); return; }
      me = r;
      renderUserBar();
      renderPage();
    }).catch(function () { authEl.innerHTML = '<div class="inline-warning">' + T.netErr + '</div>'; });
  }

  /* ---------- Progress ---------- */

  function checkHtml(check) {
    if (!check) return '';
    var out = '';
    if (check.github) {
      var gh = check.github;
      out += gh.ok
        ? '<li class="ok">GitHub <b>' + esc(gh.repo) + '</b>: ' + esc(gh.commits) + ' ' + T.commits + (gh.lastCommit ? ', ' + T.lastCommit + ' ' + esc(fmt(gh.lastCommit)) : '') + '</li>'
        : '<li class="miss">GitHub: ' + esc(gh.error) + '</li>';
    }
    (check.contracts || []).forEach(function (c) {
      var a = '<a href="' + esc(c.explorer) + '" target="_blank" rel="noopener">' + esc(c.address.slice(0, 10)) + '...' + esc(c.address.slice(-6)) + '</a>';
      if (!c.deployed) { out += '<li class="miss">' + a + ': ' + T.notDeployed + '</li>'; return; }
      out += '<li class="ok">' + a + ': ' + T.deployed + '</li>';
      if (c.verified === true) out += '<li class="ok">' + a + ': ' + T.verified + (c.name ? ' (' + esc(c.name) + ')' : '') + '</li>';
      if (c.verified === false) out += '<li class="miss">' + a + ': ' + T.unverifiedSrc + '</li>';
      if (typeof c.txCount === 'number') out += '<li class="' + (c.txCount ? 'ok' : 'miss') + '">' + a + ': ' + esc(c.txCount) + ' ' + T.txs + ', ' + esc(c.callers) + ' ' + T.wallets + '</li>';
    });
    return out ? '<ul class="q-list pt-checks">' + out + '</ul><p class="pt-muted pt-small">' + T.checkedAt + ' ' + esc(fmt(check.checkedAt)) + '</p>' : '';
  }

  function renderProgress() {
    if (!me) { mainEl.innerHTML = ''; return; }
    if (!me.group) {
      mainEl.innerHTML = '<div class="inline-warning">' + T.pgNeedGroup + ' <a href="dang-ky-de-tai.html"><b>' + T.register + ' ›</b></a></div>';
      return;
    }
    mainEl.innerHTML = me.milestones.map(function (m) {
      var s = me.progress[m.id];
      var late = m.deadline && Date.now() > new Date(m.deadline).getTime();
      return '<section class="reg-card" data-ms="' + esc(m.id) + '"><div class="reg-card-head"><b>' + esc(m.id) + '</b><h2>' + esc(m.name) + '</h2></div>' +
        '<p class="reg-card-hint">' + esc(m.desc) + (m.deadline ? ' · ' + T.deadline + ': <b' + (late && !s ? ' class="pt-late"' : '') + '>' + esc(fmt(m.deadline)) + '</b>' : '') + '</p>' +
        '<p class="pt-status">' + (s ? T.lastSub + ': <b>' + esc(fmt(s.timestamp)) + '</b>. ' + T.resubmitHint : '<b>' + T.notYet + '</b>') + '</p>' +
        '<div class="reg-grid">' +
        '<label class="reg-field reg-span"><span>' + T.github + '</span><input type="url" data-f="github" placeholder="https://github.com/user/repo" value="' + esc(s ? s.github : '') + '"></label>' +
        '<label class="reg-field reg-span"><span>' + T.contracts + '</span><textarea data-f="contracts" rows="2" placeholder="0x..." class="pt-mono">' + esc(s ? s.contracts.join('\n') : '') + '</textarea><small class="reg-count" style="align-self:flex-start">' + T.contractsHint + '</small></label>' +
        '<label class="reg-field"><span>' + T.demo + '</span><input type="url" data-f="demo" placeholder="https://" value="' + esc(s ? s.demo : '') + '"></label>' +
        '<label class="reg-field"><span>' + T.docs + '</span><input type="url" data-f="docs" placeholder="https://" value="' + esc(s ? s.docs : '') + '"></label>' +
        '<label class="reg-field reg-span"><span>' + T.note + '</span><input type="text" data-f="note" maxlength="1000" value="' + esc(s ? s.note : '') + '"></label>' +
        '</div><div class="reg-actions" style="margin-top:14px"><button type="button" class="primary-button" data-submit="' + esc(m.id) + '">' + T.submit + ' <span>›</span></button><p class="pt-msg" data-msg></p></div>' +
        '<div data-check>' + (s ? checkHtml(s.check) : '') + '</div></section>';
    }).join('');
  }

  function bindProgress() {
    mainEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-submit]');
      if (!b || PAGE !== 'progress') return;
      var card = b.closest('[data-ms]');
      var v = function (f) { return card.querySelector('[data-f="' + f + '"]').value.trim(); };
      var m = card.querySelector('[data-msg]');
      b.disabled = true;
      b.textContent = T.checking;
      post({ action: 'submitProgress', token: session.token, milestone: b.dataset.submit, github: v('github'), contracts: v('contracts'), demo: v('demo'), docs: v('docs'), note: v('note') })
        .then(function (r) {
          if (!r.ok) { msg(m, r.message, false); if (r.code === 'session') { clearSession(); boot(); } return; }
          me.progress = r.progress;
          renderProgress();
          var c = mainEl.querySelector('[data-ms="' + b.dataset.submit + '"] [data-msg]');
          if (c) msg(c, T.submitted, true);
        }).catch(function () { msg(m, T.netErr, false); })
        .finally(function () { b.disabled = false; b.innerHTML = T.submit + ' <span>›</span>'; });
    });
  }

  /* ---------- Find a group ---------- */

  function matchScore(item) {
    var p = me && me.profile;
    if (!p) return 0;
    var shared = item.tracks.filter(function (t) { return p.tracks.indexOf(t) !== -1; }).length;
    var newSkills = item.skills.filter(function (s) { return p.skills.indexOf(s) === -1; }).length;
    return shared * 2 + newSkills;
  }

  function renderFindGroup(listOnly) {
    var b = board;
    var skills = (b && b.skills) || (me && me.skills) || [];
    var p = me && me.profile;
    var form = '';
    if (me) {
      var inGroup = !!me.group;
      form = '<section class="reg-card"><div class="reg-card-head"><h2>' + T.fgPost + '</h2></div><p class="reg-card-hint">' + T.fgPostHint + '</p>' +
        '<div class="pt-checks-grid"><div><span class="pt-label">' + T.fgTracks + '</span>' + Object.keys(TRACKS).map(function (k) {
          return '<label class="pt-chip"><input type="checkbox" data-track value="' + k + '"' + (p && p.tracks.indexOf(k) !== -1 ? ' checked' : '') + '> ' + esc(TRACKS[k]) + '</label>';
        }).join('') + '</div><div><span class="pt-label">' + T.fgSkills + '</span>' + skills.map(function (s) {
          return '<label class="pt-chip"><input type="checkbox" data-skill value="' + esc(s) + '"' + (p && p.skills.indexOf(s) !== -1 ? ' checked' : '') + '> ' + esc(s) + '</label>';
        }).join('') + '</div></div>' +
        (inGroup ? '<label class="reg-field" style="max-width:240px;margin-top:12px"><span>' + T.fgNeeded + '</span><input type="number" id="fg-needed" min="1" max="5" value="' + esc(p ? p.needed || 1 : 1) + '"></label>' : '') +
        '<label class="reg-field" style="margin-top:12px"><span>' + T.fgNote + '</span><textarea id="fg-note" rows="3" maxlength="500">' + esc(p ? p.note : '') + '</textarea></label>' +
        '<div class="reg-actions" style="margin-top:14px"><button type="button" class="primary-button" id="fg-save">' + T.fgSave + ' <span>›</span></button>' +
        (p ? '<button type="button" class="outline-button" id="fg-remove">' + T.fgRemove + '</button>' : '') + '<p class="pt-msg" id="fg-msg"></p></div></section>';
    } else {
      form = '<p class="pt-muted" style="margin:0 0 16px">' + T.fgSignInToPost + '</p>';
    }
    var list = '';
    if (!b) list = '<p class="tl-status">' + T.loading + '</p>';
    else {
      var q = (document.getElementById('fg-q') || {}).value || '';
      var tf = (document.getElementById('fg-track') || {}).value || '';
      var filt = function (x) {
        if (tf && x.tracks.indexOf(tf) === -1) return false;
        if (!q) return true;
        return [x.fullName, x.groupName, x.title, x.note, x.skills.join(' ')].join(' ').toLowerCase().indexOf(q.toLowerCase()) !== -1;
      };
      var sortFn = function (a, c) { return matchScore(c) - matchScore(a) || String(c.updatedAt).localeCompare(String(a.updatedAt)); };
      var card = function (x, isTeam) {
        var good = me && me.profile && matchScore(x) >= 3;
        return '<article class="tl-card pt-post">' +
          '<div class="tl-card-head"><div class="tl-card-group"><b>' + esc(isTeam ? x.groupName : x.fullName) + '</b><span>' + esc(isTeam ? T.fgNeeds(x.needed, x.members) : x['class']) + '</span></div>' +
          (good ? '<span class="ref-badge ok">' + T.fgMatch + '</span>' : '') + '</div>' +
          (isTeam && x.title ? '<p class="pt-title">' + esc(x.title) + '</p>' : '') +
          '<div class="group-tags">' + x.tracks.map(function (t) { return '<span class="tl-tag tl-track-' + esc(t) + '">' + esc(TRACKS[t] || t) + '</span>'; }).join(' ') +
          x.skills.map(function (s) { return ' <span class="tl-tag tl-level">' + esc(s) + '</span>'; }).join('') + '</div>' +
          (x.note ? '<p class="pt-note">' + esc(x.note) + '</p>' : '') +
          '<p class="pt-small"><span class="pt-muted">' + T.fgContact + ':</span> ' + (isTeam ? esc(x.contactName) + ' · ' : '') + '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a> · <span class="pt-muted">' + esc(fmt(x.updatedAt)) + '</span></p></article>';
      };
      var teams = b.teams.filter(filt).sort(sortFn), people = b.people.filter(filt).sort(sortFn);
      list = '<div class="tl-toolbar pt-toolbar"><input type="search" id="fg-q" placeholder="' + T.fgSearch + '" value="' + esc(q) + '"><select id="fg-track"><option value="">' + T.fgFilter + '</option>' +
        Object.keys(TRACKS).map(function (k) { return '<option value="' + k + '"' + (tf === k ? ' selected' : '') + '>' + esc(TRACKS[k]) + '</option>'; }).join('') + '</select></div>' +
        '<p class="tl-count">' + T.fgUngrouped(b.ungrouped) + '</p>' +
        '<h2 class="pt-h2">' + T.fgTeams + ' <span class="chip">' + teams.length + '</span></h2>' + (teams.length ? '<div class="tl-list">' + teams.map(function (x) { return card(x, true); }).join('') + '</div>' : '<p class="tl-empty">' + T.fgEmpty + '</p>') +
        '<h2 class="pt-h2">' + T.fgPeople + ' <span class="chip">' + people.length + '</span></h2>' + (people.length ? '<div class="tl-list">' + people.map(function (x) { return card(x, false); }).join('') + '</div>' : '<p class="tl-empty">' + T.fgEmpty + '</p>');
    }
    var focused = document.activeElement && document.activeElement.id;
    // Form and list live in separate boxes so typing in the search box
    // never wipes an unsaved post.
    if (!document.getElementById('fg-form')) mainEl.innerHTML = '<div id="fg-form"></div><div id="fg-list"></div>';
    if (!listOnly) document.getElementById('fg-form').innerHTML = form;
    document.getElementById('fg-list').innerHTML = list;
    if (focused === 'fg-q') { var el = document.getElementById('fg-q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }

  function loadBoard() {
    return post({ action: 'findGroupBoard' }).then(function (r) { if (r.ok) { board = r; renderPage(); } }).catch(function () {});
  }

  function bindFindGroup() {
    mainEl.addEventListener('input', function (e) {
      if (PAGE === 'findgroup' && (e.target.id === 'fg-q' || e.target.id === 'fg-track')) renderFindGroup(true);
    });
    mainEl.addEventListener('click', function (e) {
      if (PAGE !== 'findgroup') return;
      var m = document.getElementById('fg-msg');
      if (e.target.closest('#fg-save')) {
        var tracks = Array.prototype.map.call(mainEl.querySelectorAll('[data-track]:checked'), function (i) { return i.value; });
        var skills = Array.prototype.map.call(mainEl.querySelectorAll('[data-skill]:checked'), function (i) { return i.value; });
        var neededEl = document.getElementById('fg-needed');
        post({ action: 'saveProfile', token: session.token, tracks: tracks, skills: skills, note: document.getElementById('fg-note').value, needed: neededEl ? neededEl.value : 0 })
          .then(function (r) {
            if (!r.ok) { msg(m, r.message, false); return; }
            me.profile = { tracks: tracks, skills: skills, note: document.getElementById('fg-note').value, needed: neededEl ? Number(neededEl.value) : 0 };
            return loadBoard().then(function () { msg(document.getElementById('fg-msg'), T.fgSaved, true); });
          }).catch(function () { msg(m, T.netErr, false); });
      }
      if (e.target.closest('#fg-remove')) {
        post({ action: 'saveProfile', token: session.token, remove: true }).then(function (r) {
          if (!r.ok) { msg(m, r.message, false); return; }
          me.profile = null;
          return loadBoard().then(function () { msg(document.getElementById('fg-msg'), T.fgRemoved, true); });
        }).catch(function () { msg(m, T.netErr, false); });
      }
    });
  }

  /* ---------- Defense ---------- */

  var defense = null;

  function renderDefense() {
    if (!defense) { mainEl.innerHTML = '<p class="tl-status">' + T.loading + '</p>'; return; }
    var myCode = me && me.group ? me.group.groupCode : '';
    var canBook = defense.open && me && me.group && me.group.reviewStatus === 'approved';
    var head = !defense.open ? '<div class="inline-warning">' + T.dfClosed + '</div>'
      : '<div class="inline-warning">' + T.dfOpenHint + (me && me.group && me.group.reviewStatus !== 'approved' ? ' <b>' + T.dfNotApproved + '</b>' : '') + '</div>';
    var mine = defense.slots.filter(function (s) { return myCode && s.groupCode === myCode; })[0];
    if (mine) head += '<div class="pt-mine">' + T.dfMine + ' <b>' + esc(fmt(mine.start, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })) + ', ' + esc(fmt(mine.start, { hour: '2-digit', minute: '2-digit' })) + ' - ' + esc(fmt(mine.end, { hour: '2-digit', minute: '2-digit' })) + '</b>' + (mine.room ? ' · ' + esc(mine.room) : '') + '</div>';
    if (!defense.slots.length) { mainEl.innerHTML = head + '<p class="tl-empty">' + T.dfEmpty + '</p>'; return; }
    var days = {}, order = [];
    defense.slots.forEach(function (s) {
      var d = fmt(s.start, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!days[d]) { days[d] = []; order.push(d); }
      days[d].push(s);
    });
    mainEl.innerHTML = head + order.map(function (d) {
      return '<h2 class="pt-h2">' + esc(d) + '</h2><div class="pt-slots">' + days[d].map(function (s) {
        var isMine = myCode && s.groupCode === myCode;
        var past = new Date(s.start).getTime() < Date.now();
        return '<div class="pt-slot' + (isMine ? ' mine' : s.groupCode ? ' taken' : '') + '">' +
          '<div class="pt-slot-time">' + esc(fmt(s.start, { hour: '2-digit', minute: '2-digit' })) + ' - ' + esc(fmt(s.end, { hour: '2-digit', minute: '2-digit' })) + '</div>' +
          (s.room ? '<div class="pt-muted pt-small">' + esc(s.room) + '</div>' : '') +
          (s.groupCode ? '<div class="pt-slot-group"><b>' + esc(isMine ? T.dfYours + ': ' : '') + esc(s.groupName) + '</b><span>' + esc(s.title) + '</span></div>'
            : '<div class="pt-muted">' + T.dfFree + '</div>') +
          (canBook && !s.groupCode && !past ? '<button type="button" class="outline-button btn-sm" data-book="' + esc(s.id) + '">' + T.dfBook + '</button>' : '') +
          '</div>';
      }).join('') + '</div>';
    }).join('') + '<p class="pt-msg" id="df-msg"></p>';
  }

  function loadDefense() {
    return post({ action: 'defenseBoard' }).then(function (r) { if (r.ok) { defense = r; renderPage(); } }).catch(function () {
      mainEl.innerHTML = '<div class="inline-warning">' + T.netErr + '</div>';
    });
  }

  function bindDefense() {
    mainEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-book]');
      if (!b || PAGE !== 'defense') return;
      b.disabled = true;
      b.textContent = T.checking;
      post({ action: 'bookSlot', token: session.token, slotId: b.dataset.book }).then(function (r) {
        if (!r.ok) { msg(document.getElementById('df-msg'), r.message, false); b.disabled = false; b.textContent = T.dfBook; return; }
        return loadDefense().then(function () {
          msg(document.getElementById('df-msg'), T.dfBooked, true);
          var mine = mainEl.querySelector('.pt-mine');
          if (mine) mine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }).catch(function () { msg(document.getElementById('df-msg'), T.netErr, false); });
    });
  }

  /* ---------- Boot ---------- */

  function renderPage() {
    if (PAGE === 'progress') renderProgress();
    else if (PAGE === 'findgroup') renderFindGroup();
    else renderDefense();
  }

  function boot() {
    session = loadSession();
    if (session) loadMe(); else { renderLogin(); renderPage(); }
    if (PAGE === 'findgroup') loadBoard();
    if (PAGE === 'defense') loadDefense();
  }

  if (PAGE === 'progress') bindProgress();
  if (PAGE === 'findgroup') bindFindGroup();
  if (PAGE === 'defense') bindDefense();
  boot();
})();
