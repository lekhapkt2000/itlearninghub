(function () {
  // Same Apps Script deployment as access-gate.js. doPost handles
  // lookupStudents / requestOtp / registerProject for this form.
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzl_MDfTRkxNExa--NscWG4HPI7ioAN0QImDGLDyk66UFuXaUo1Zrwi_qvwoIjrS5Vu/exec';

  var form = document.getElementById('reg-form');
  if (!form) return;

  var EN = document.documentElement.lang === 'en';
  var MAX_MEMBERS = 6;
  var MAX_REFS = 5;
  var DRAFT_KEY = 'is355:reg-draft-v2';
  // Every student's email is their school address; the server derives it
  // the same way and ignores whatever email the browser sends.
  var EMAIL_DOMAIN = 'gm.uit.edu.vn';
  function emailFor(id) {
    id = String(id || '').trim();
    return /^\d{8}$/.test(id) ? id + '@' + EMAIL_DOMAIN : '';
  }
  var OTP_COOLDOWN = 60;

  var T = EN ? {
    leader: 'Leader',
    groupCode: 'Group code',
    member: 'Member',
    sid: 'Student ID',
    name: 'Full name',
    namePlaceholder: 'Filled from student ID',
    email: 'Email',
    remove: 'Remove member',
    looking: 'Looking up...',
    notFound: 'Not on the IS355 class list',
    lookupFail: 'Could not look up, will check on submit',
    refType: 'Type',
    refCite: 'Citation / Link',
    refPlaceholder: 'Author, title, venue, year - or a URL / DOI',
    choose: '- Choose -',
    other: 'Other',
    otpChoose: '- Enter member emails first -',
    otpSend: 'Send OTP',
    otpResend: function (s) { return 'Resend in ' + s + 's'; },
    otpSending: 'Sending...',
    otpSent: function (e) { return 'Code sent to ' + e + '. Check your inbox (and spam folder); it is valid for 10 minutes.'; },
    sending: 'Submitting...',
    submit: 'Submit registration',
    errGroupName: 'Please enter your group name.',
    errSid: function (n) { return 'Member ' + n + ': student ID must be 8 digits.'; },
    errNotFound: function (id) { return 'Student ID ' + id + ' is not on the IS355.R11.CTTT.1/.2 class list.'; },
    errEmail: function (n) { return 'Member ' + n + ': email is not valid.'; },
    errDupSid: function (id) { return 'Student ID ' + id + ' is entered twice.'; },
    errTrack: 'Please choose a topic group.',
    errLevel: 'Please choose a project level.',
    errTitle: 'Please enter the project title.',
    errDesc: 'The Vietnamese short description needs at least 50 characters.',
    errDescEn: 'The English short description needs at least 50 characters.',
    errRefType: function (n) { return 'Reference ' + n + ': please choose a type.'; },
    errRefs: 'References need at least 1 Dataset, 1 Method and 1 Related Survey.',
    errOtpEmail: 'Choose the email that receives the OTP.',
    errOtp: 'Enter the 6-digit OTP sent to your email.',
    errNetwork: 'Could not reach the server. If your internet works, try turning off your ad-blocker or use a private window, then try again.',
    okNew: 'Registration received. The instructor will review your topic.',
    okUpdated: 'Registration updated. The new version replaces your earlier submission.',
    mailOk: 'A confirmation email has been sent to every member.',
    mailFail: 'The registration is saved, but the confirmation email could not be sent. Take a screenshot of this page to keep.',
    chars: 'characters',
    refChecking: 'Checking reference...',
    refCheckFail: 'Could not check right now, it will be checked on submit.',
    copy: 'Copy',
    copied: 'Copied',
    simTitle: 'Similar to topics already registered:',
    simWith: 'similar to',
    sameDataset: 'same dataset',
    simHint: 'You can still register, but make your topic clearly different (problem, data or method) or the instructor may ask you to revise.',
    simConfirm: function (g, p) { return 'Your topic is ' + p + '% similar to group ' + g + '. Submit anyway?'; },
    qPassed: 'checks passed. Missing items are what the instructor usually asks you to clarify.',
    deadline: function (t) { return 'Registration deadline: <b>' + t + '</b>. The form closes automatically after this time.'; },
    closed: 'Registration is closed.'
  } : {
    leader: 'Trưởng nhóm',
    groupCode: 'Mã nhóm',
    member: 'Thành viên',
    sid: 'MSSV',
    name: 'Họ và tên',
    namePlaceholder: 'Tự điền theo MSSV',
    email: 'Email',
    remove: 'Xóa thành viên',
    looking: 'Đang tra cứu...',
    notFound: 'Không có trong danh sách lớp IS355',
    lookupFail: 'Chưa tra cứu được, sẽ kiểm tra khi gửi',
    refType: 'Loại',
    refCite: 'Trích dẫn / Link',
    refPlaceholder: 'Tác giả, tên bài, nơi công bố, năm - hoặc URL / DOI',
    choose: '- Chọn -',
    other: 'Khác',
    otpChoose: '- Nhập email thành viên trước -',
    otpSend: 'Gửi mã OTP',
    otpResend: function (s) { return 'Gửi lại sau ' + s + 's'; },
    otpSending: 'Đang gửi...',
    otpSent: function (e) { return 'Đã gửi mã tới ' + e + '. Kiểm tra hộp thư (cả mục Spam), mã có hiệu lực 10 phút.'; },
    sending: 'Đang gửi...',
    submit: 'Gửi đăng ký',
    errGroupName: 'Vui lòng nhập tên nhóm.',
    errSid: function (n) { return 'Thành viên ' + n + ': MSSV phải gồm 8 chữ số.'; },
    errNotFound: function (id) { return 'MSSV ' + id + ' không có trong danh sách lớp IS355.R11.CTTT.1/.2.'; },
    errEmail: function (n) { return 'Thành viên ' + n + ': Email không hợp lệ.'; },
    errDupSid: function (id) { return 'MSSV ' + id + ' bị nhập trùng.'; },
    errTrack: 'Vui lòng chọn nhóm chủ đề.',
    errLevel: 'Vui lòng chọn mức độ đồ án.',
    errTitle: 'Vui lòng nhập tên đề tài.',
    errDesc: 'Mô tả ngắn tiếng Việt cần tối thiểu 50 ký tự.',
    errDescEn: 'Mô tả ngắn tiếng Anh cần tối thiểu 50 ký tự.',
    errRefType: function (n) { return 'Tài liệu ' + n + ': Vui lòng chọn loại.'; },
    errRefs: 'Tài liệu tham khảo cần có ít nhất 1 Dataset, 1 Method và 1 Related Survey.',
    errOtpEmail: 'Vui lòng chọn email nhận mã OTP.',
    errOtp: 'Vui lòng nhập mã OTP 6 số đã gửi tới email.',
    errNetwork: 'Không thể kết nối máy chủ. Nếu mạng vẫn hoạt động bình thường, thử tắt trình chặn quảng cáo (ad-blocker) hoặc mở bằng cửa sổ ẩn danh rồi thử lại.',
    okNew: 'Đã nhận đăng ký. Giảng viên sẽ xem xét và phản hồi đề tài của nhóm.',
    okUpdated: 'Đã cập nhật đăng ký. Bản mới thay thế bản nhóm đã gửi trước đó.',
    mailOk: 'Email xác nhận đã được gửi tới tất cả thành viên trong nhóm.',
    mailFail: 'Đăng ký đã được lưu nhưng chưa gửi được email xác nhận. Hãy chụp lại màn hình này để lưu.',
    chars: 'ký tự',
    refChecking: 'Đang kiểm tra tài liệu...',
    refCheckFail: 'Chưa kiểm tra được lúc này, hệ thống sẽ kiểm tra lại khi gửi.',
    copy: 'Sao chép',
    copied: 'Đã chép',
    simTitle: 'Đề tài đang giống với đề tài đã đăng ký:',
    simWith: 'giống nhóm',
    sameDataset: 'cùng dataset',
    simHint: 'Nhóm vẫn có thể đăng ký, nhưng nên làm khác biệt rõ (bài toán, dữ liệu hoặc phương pháp) để tránh bị yêu cầu chỉnh sửa.',
    simConfirm: function (g, p) { return 'Đề tài giống ' + p + '% với nhóm ' + g + '. Vẫn gửi đăng ký?'; },
    qPassed: 'mục đạt. Các mục còn thiếu thường là điểm giảng viên yêu cầu làm rõ.',
    deadline: function (t) { return 'Hạn đăng ký đề tài: <b>' + t + '</b>. Sau thời điểm này form sẽ tự khóa.'; },
    closed: 'Đăng ký đề tài đã đóng.'
  };

  var membersEl = document.getElementById('reg-members');
  var addMemberBtn = document.getElementById('reg-add-member');
  var refsEl = document.getElementById('reg-refs');
  var descEl = form.elements.description;
  var descCount = document.getElementById('reg-desc-count');
  var descEnEl = form.elements.descriptionEn;
  var descEnCount = document.getElementById('reg-desc-en-count');
  var otpEmailEl = form.elements.otpEmail;
  var otpEl = form.elements.otp;
  var otpBtn = document.getElementById('reg-otp-send');
  var otpMsg = document.getElementById('reg-otp-msg');
  var errorEl = document.getElementById('reg-error');
  var submitBtn = document.getElementById('reg-submit');
  var successEl = document.getElementById('reg-success');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function post(data) {
    // text/plain keeps this a "simple" request (no CORS preflight, which
    // Apps Script can't answer). The JSON is still parsed server-side.
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow'
    }).then(function (res) { return res.json(); });
  }

  /* ---------- Deadline / closed state ---------- */

  function fmtDeadline(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString(EN ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function loadFormInfo() {
    post({ action: 'formInfo' }).then(function (info) {
      if (!info || !info.ok) return;
      var box = document.createElement('div');
      if (!info.open) {
        box.className = 'inline-warning';
        box.innerHTML = '<b>' + T.closed + '</b> ' + esc(info.message || '');
        form.querySelectorAll('button, input, select, textarea').forEach(function (el) { el.disabled = true; });
      } else if (info.deadline) {
        box.className = 'inline-warning';
        box.innerHTML = T.deadline(esc(fmtDeadline(info.deadline)));
      } else {
        return;
      }
      form.parentNode.insertBefore(box, form);
    }).catch(function () { /* the server re-checks on submit anyway */ });
  }

  /* ---------- Roster lookup (MSSV -> name + class) ---------- */

  // studentId -> { fullName, class } | false (not on roster)
  var roster = {};
  var pending = {};

  function lookup(ids) {
    ids = ids.filter(function (id) { return /^\d{8}$/.test(id) && !(id in roster) && !pending[id]; });
    if (!ids.length) return Promise.resolve();
    ids.forEach(function (id) { pending[id] = true; });
    refreshMemberInfo();
    return post({ action: 'lookupStudents', ids: ids })
      .then(function (res) {
        ids.forEach(function (id) { roster[id] = (res && res.students && res.students[id]) || false; });
      })
      .catch(function () { /* leave unknown; the server re-checks on submit */ })
      .then(function () {
        ids.forEach(function (id) { delete pending[id]; });
        refreshMemberInfo();
      });
  }

  /* ---------- Members ---------- */

  function memberRowHtml(i, m) {
    m = m || {};
    var leader = i === 0;
    return '<div class="reg-member' + (leader ? ' is-leader' : '') + '">' +
      '<span class="reg-member-no">' + (i + 1) + '<small>' + (leader ? T.leader : T.member) + '</small></span>' +
      '<label class="reg-field"><span>' + T.sid + '</span><input type="text" inputmode="numeric" maxlength="8" data-m="studentId" value="' + esc(m.studentId) + '" placeholder="23520000" autocomplete="off"></label>' +
      '<label class="reg-field"><span>' + T.name + '</span><input type="text" class="reg-name" data-name readonly tabindex="-1" placeholder="' + T.namePlaceholder + '"><small class="reg-member-status" data-status></small></label>' +
      '<label class="reg-field"><span>' + T.email + '</span><input type="email" class="reg-name" data-m="email" value="' + esc(emailFor(m.studentId)) + '" readonly tabindex="-1" placeholder="' + T.namePlaceholder + '"></label>' +
      (leader ? '<span class="reg-member-remove-spacer"></span>' :
        '<button type="button" class="reg-member-remove" aria-label="' + T.remove + '" title="' + T.remove + '">×</button>') +
      '</div>';
  }

  function readMembers() {
    return Array.prototype.map.call(membersEl.querySelectorAll('.reg-member'), function (row) {
      var m = {};
      row.querySelectorAll('[data-m]').forEach(function (inp) { m[inp.dataset.m] = inp.value.trim(); });
      return m;
    });
  }

  function refreshMemberInfo() {
    membersEl.querySelectorAll('.reg-member').forEach(function (row) {
      var id = row.querySelector('[data-m="studentId"]').value.trim();
      var nameEl = row.querySelector('[data-name]');
      var status = row.querySelector('[data-status]');
      var info = roster[id];
      nameEl.value = info ? info.fullName : '';
      row.querySelector('[data-m="email"]').value = emailFor(id);
      status.className = 'reg-member-status';
      if (!/^\d{8}$/.test(id)) status.textContent = '';
      else if (pending[id]) status.textContent = T.looking;
      else if (info) { status.textContent = info['class']; status.classList.add('is-ok'); }
      else if (info === false) { status.textContent = T.notFound; status.classList.add('is-bad'); }
      else status.textContent = T.lookupFail;
    });
    refreshOtpEmails();
  }

  function renderMembers(list) {
    membersEl.innerHTML = list.map(function (m, i) { return memberRowHtml(i, m); }).join('');
    addMemberBtn.hidden = list.length >= MAX_MEMBERS;
    refreshMemberInfo();
  }

  membersEl.addEventListener('input', function (e) {
    if (e.target.dataset.m !== 'studentId') return;
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    // Look up as soon as all 8 digits are in (one request per MSSV).
    if (e.target.value.length === 8) lookup([e.target.value]);
    refreshMemberInfo();
  });

  addMemberBtn.addEventListener('click', function () {
    var list = readMembers();
    if (list.length >= MAX_MEMBERS) return;
    list.push({});
    renderMembers(list);
    var rows = membersEl.querySelectorAll('.reg-member');
    rows[rows.length - 1].querySelector('input').focus();
    saveDraft();
  });

  membersEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.reg-member-remove');
    if (!btn) return;
    var rows = Array.prototype.slice.call(membersEl.querySelectorAll('.reg-member'));
    var list = readMembers();
    list.splice(rows.indexOf(btn.closest('.reg-member')), 1);
    renderMembers(list);
    saveDraft();
  });

  /* ---------- References ---------- */

  var REF_TYPES = [['Dataset', 'Dataset'], ['Method', 'Method'], ['Related Survey', 'Related Survey'], ['Other', T.other]];
  var DEFAULT_REF_TYPES = ['Dataset', 'Method', 'Related Survey', '', ''];

  function renderRefs(list) {
    var html = '';
    for (var i = 0; i < MAX_REFS; i++) {
      var r = list[i] || { type: DEFAULT_REF_TYPES[i], citation: '' };
      var opts = '<option value="">' + T.choose + '</option>' + REF_TYPES.map(function (t) {
        return '<option value="' + t[0] + '"' + (r.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
      }).join('');
      html += '<div class="reg-ref">' +
        '<span class="reg-ref-no">' + (i + 1) + '</span>' +
        '<label class="reg-field"><span>' + T.refType + '</span><select data-r="type">' + opts + '</select></label>' +
        '<label class="reg-field"><span>' + T.refCite + '</span><input type="text" maxlength="500" data-r="citation" value="' + esc(r.citation) + '" placeholder="' + T.refPlaceholder + '"></label>' +
        '<div class="reg-ref-meta" data-r="meta"></div>' +
        '</div>';
    }
    refsEl.innerHTML = html;
    refsEl.querySelectorAll('[data-r="citation"]').forEach(function (inp) { if (inp.value.trim()) resolveRef(inp.value.trim()); });
    paintRefMeta();
  }

  /* ---------- Reference check + IEEE (server resolves DOI / arXiv / links) ---------- */

  var refMeta = {};      // citation text -> meta | 'loading' | 'error'
  var refTimers = {};

  function resolveRef(input) {
    if (!input || input.length < 4 || refMeta[input]) return;
    refMeta[input] = 'loading';
    paintRefMeta();
    post({ action: 'resolveRef', input: input })
      .then(function (res) { refMeta[input] = res && res.ok ? res.ref : 'error'; })
      .catch(function () { refMeta[input] = 'error'; })
      .then(function () { paintRefMeta(); scheduleChecks(); });
  }

  function paintRefMeta() {
    refsEl.querySelectorAll('.reg-ref').forEach(function (row) {
      var input = row.querySelector('[data-r="citation"]').value.trim();
      var box = row.querySelector('[data-r="meta"]');
      var m = refMeta[input];
      if (!input || !m) { box.innerHTML = ''; return; }
      if (m === 'loading') { box.innerHTML = '<span class="ref-badge muted">' + T.refChecking + '</span>'; return; }
      if (m === 'error') { box.innerHTML = '<span class="ref-badge muted">' + T.refCheckFail + '</span>'; return; }
      var b = window.IS355Tools ? IS355Tools.refBadge(m, EN ? 'en' : 'vi') : { cls: 'muted', label: m.status };
      box.innerHTML = '<span class="ref-badge ' + b.cls + '">' + esc(b.label) + '</span>' +
        (m.ieeeHtml && m.status !== 'suggested' ? '<div class="ref-ieee"><span class="ref-ieee-label">IEEE</span> ' + m.ieeeHtml +
          ' <button type="button" class="link-copy" data-copy="' + esc(m.ieee) + '">' + T.copy + '</button></div>' : '') +
        (m.note ? '<div class="ref-note">' + esc(m.note) + '</div>' : '');
    });
  }

  refsEl.addEventListener('input', function (e) {
    if (e.target.dataset.r !== 'citation') return;
    var row = e.target.closest('.reg-ref');
    var input = e.target.value.trim();
    paintRefMeta();
    clearTimeout(refTimers[row.querySelector('.reg-ref-no').textContent]);
    refTimers[row.querySelector('.reg-ref-no').textContent] = setTimeout(function () { resolveRef(input); }, 900);
  });
  refsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copy) : Promise.reject()).then(function () {
      b.textContent = T.copied;
      setTimeout(function () { b.textContent = T.copy; }, 1500);
    }).catch(function () {});
  });

  /* ---------- Similar topics + self-check ---------- */

  var otherGroups = [];
  var simEl = document.getElementById('reg-similar');
  var qualityEl = document.getElementById('reg-quality');
  var lastSimilar = [];

  function loadOtherTopics() {
    post({ action: 'publicTopics' }).then(function (res) {
      if (res && res.ok) { otherGroups = res.groups || []; scheduleChecks(); }
    }).catch(function () { /* similarity is a hint only */ });
  }

  function currentTopic() {
    var refs = readRefs().map(function (r) {
      var m = refMeta[r.citation];
      return { type: r.type, citation: r.citation, meta: m && typeof m === 'object' ? m : null };
    });
    return {
      groupName: form.elements.groupName.value.trim(),
      title: form.elements.title.value.trim(),
      description: descEl.value.trim(),
      descriptionEn: descEnEl.value.trim(),
      track: form.elements.track.value,
      level: form.elements.level.value,
      refs: refs
    };
  }

  var checkTimer;
  function scheduleChecks() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(runChecks, 500);
  }

  function runChecks() {
    if (!window.IS355Tools) return;
    var t = currentTopic();
    // Similar topics
    lastSimilar = t.title.length > 8 ? IS355Tools.similar(t, otherGroups, 0.25) : [];
    simEl.hidden = !lastSimilar.length;
    simEl.innerHTML = lastSimilar.length
      ? '<b>' + T.simTitle + '</b><ul>' + lastSimilar.slice(0, 3).map(function (h) {
          return '<li><b>' + Math.round(h.score * 100) + '%</b> ' + T.simWith + ' <b>' + esc(h.group.groupName) + '</b>: ' + esc(h.group.title) +
            (h.sameDataset ? ' <span class="ref-badge warn">' + T.sameDataset + '</span>' : '') + '</li>';
        }).join('') + '</ul><span>' + T.simHint + '</span>'
      : '';
    // Self-check
    var q = IS355Tools.quality(t, EN ? 'en' : 'vi');
    qualityEl.innerHTML = '<div class="q-score"><b>' + q.passed + '/' + q.total + '</b> ' + T.qPassed + '</div><ul class="q-list">' +
      q.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'miss') + '">' + esc(c.label) + '</li>'; }).join('') + '</ul>';
  }

  ['title', 'description', 'descriptionEn', 'track', 'level', 'groupName'].forEach(function (n) {
    form.elements[n].addEventListener('input', scheduleChecks);
    form.elements[n].addEventListener('change', scheduleChecks);
  });
  refsEl.addEventListener('change', scheduleChecks);

  function readRefs() {
    return Array.prototype.map.call(refsEl.querySelectorAll('.reg-ref'), function (row) {
      return {
        type: row.querySelector('[data-r="type"]').value,
        citation: row.querySelector('[data-r="citation"]').value.trim()
      };
    });
  }

  /* ---------- Description counter ---------- */

  function updateCount() {
    descCount.textContent = descEl.value.trim().length + ' / ' + descEl.maxLength + ' ' + T.chars;
    descEnCount.textContent = descEnEl.value.trim().length + ' / ' + descEnEl.maxLength + ' ' + T.chars;
  }
  descEl.addEventListener('input', updateCount);
  descEnEl.addEventListener('input', updateCount);

  /* ---------- OTP ---------- */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Only emails of members already entered can receive the OTP.
  function refreshOtpEmails() {
    var current = otpEmailEl.value || otpEmailEl.dataset.wanted || '';
    var opts = readMembers().filter(function (m) { return EMAIL_RE.test(m.email) && /^\d{8}$/.test(m.studentId); });
    var seen = {};
    var html = opts.filter(function (m) {
      var k = m.email.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    }).map(function (m) {
      var info = roster[m.studentId];
      var label = m.email + (info ? ' - ' + info.fullName : ' - ' + m.studentId);
      return '<option value="' + esc(m.email.toLowerCase()) + '" data-sid="' + esc(m.studentId) + '">' + esc(label) + '</option>';
    }).join('');
    otpEmailEl.innerHTML = html || '<option value="">' + T.otpChoose + '</option>';
    if (current && otpEmailEl.querySelector('option[value="' + current.replace(/"/g, '') + '"]')) {
      otpEmailEl.value = current;
      delete otpEmailEl.dataset.wanted;
    }
  }

  var cooldownTimer;
  function startCooldown(seconds) {
    clearInterval(cooldownTimer);
    var left = seconds;
    otpBtn.disabled = true;
    otpBtn.textContent = T.otpResend(left);
    cooldownTimer = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(cooldownTimer);
        otpBtn.disabled = false;
        otpBtn.textContent = T.otpSend;
      } else {
        otpBtn.textContent = T.otpResend(left);
      }
    }, 1000);
  }

  function setOtpMsg(text, ok) {
    otpMsg.textContent = text;
    otpMsg.className = 'reg-otp-msg' + (text ? (ok ? ' is-ok' : ' is-bad') : '');
  }

  otpBtn.addEventListener('click', function () {
    var opt = otpEmailEl.selectedOptions[0];
    if (!otpEmailEl.value || !opt) { setOtpMsg(T.errOtpEmail, false); return; }
    otpBtn.disabled = true;
    otpBtn.textContent = T.otpSending;
    setOtpMsg('', true);
    post({ action: 'requestOtp', email: otpEmailEl.value, studentId: opt.dataset.sid })
      .then(function (res) {
        if (res && res.ok) {
          setOtpMsg(T.otpSent(otpEmailEl.value), true);
          startCooldown(OTP_COOLDOWN);
          otpEl.focus();
        } else {
          setOtpMsg((res && res.message) || T.errNetwork, false);
          otpBtn.disabled = false;
          otpBtn.textContent = T.otpSend;
        }
      })
      .catch(function () {
        setOtpMsg(T.errNetwork, false);
        otpBtn.disabled = false;
        otpBtn.textContent = T.otpSend;
      });
  });

  otpEl.addEventListener('input', function () {
    otpEl.value = otpEl.value.replace(/\D/g, '').slice(0, 6);
  });

  /* ---------- Draft (per-browser convenience only) ---------- */

  function collect() {
    return {
      action: 'registerProject',
      groupName: form.elements.groupName.value.trim(),
      track: form.elements.track.value,
      level: form.elements.level.value,
      title: form.elements.title.value.trim(),
      description: descEl.value.trim(),
      descriptionEn: descEnEl.value.trim(),
      members: readMembers(),
      refs: readRefs(),
      otpEmail: otpEmailEl.value,
      otp: otpEl.value.trim()
    };
  }

  var saveTimer;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var d = collect();
      delete d.otp; // never keep the code around
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
    }, 300);
  }

  function loadDraft() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) {}
    if (!d) {
      renderMembers([{}, {}, {}, {}, {}]);
      renderRefs([]);
      return;
    }
    form.elements.groupName.value = d.groupName || '';
    form.elements.track.value = d.track || '';
    form.elements.level.value = d.level || '';
    form.elements.title.value = d.title || '';
    descEl.value = d.description || '';
    descEnEl.value = d.descriptionEn || '';
    if (d.otpEmail) otpEmailEl.dataset.wanted = d.otpEmail;
    var members = d.members && d.members.length ? d.members.slice(0, MAX_MEMBERS) : [{}];
    renderMembers(members);
    renderRefs(d.refs || []);
    lookup(members.map(function (m) { return m.studentId || ''; }));
  }

  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  /* ---------- Validation ---------- */

  function validate(data) {
    if (!data.groupName) return T.errGroupName;

    // Blank member rows (apart from the leader) are simply skipped.
    data.members = data.members.filter(function (m, i) {
      return i === 0 || m.studentId || m.email;
    });
    var seen = {};
    for (var i = 0; i < data.members.length; i++) {
      var m = data.members[i];
      if (!/^\d{8}$/.test(m.studentId)) return T.errSid(i + 1);
      if (roster[m.studentId] === false) return T.errNotFound(m.studentId);
      if (!EMAIL_RE.test(m.email)) return T.errEmail(i + 1);
      if (seen[m.studentId]) return T.errDupSid(m.studentId);
      seen[m.studentId] = true;
    }

    if (!data.track) return T.errTrack;
    if (!data.level) return T.errLevel;
    if (!data.title) return T.errTitle;
    if (data.description.length < 50) return T.errDesc;
    if (data.descriptionEn.length < 50) return T.errDescEn;

    var types = {};
    for (var r = 0; r < data.refs.length; r++) {
      var ref = data.refs[r];
      if (!ref.citation) continue;
      if (!ref.type) return T.errRefType(r + 1);
      types[ref.type] = true;
    }
    if (!types['Dataset'] || !types['Method'] || !types['Related Survey']) return T.errRefs;
    data.refs = data.refs.filter(function (ref) { return ref.citation; });

    if (!data.otpEmail) return T.errOtpEmail;
    if (!/^\d{6}$/.test(data.otp)) return T.errOtp;
    return '';
  }

  /* ---------- Submit ---------- */

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
    if (msg) errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showSuccess(data, res) {
    var list = (res.members || data.members).map(function (m, i) {
      var info = m.fullName ? m : (roster[m.studentId] || {});
      return '<li><b>' + esc(m.studentId) + '</b> ' + esc(info.fullName || '') +
        (info['class'] ? ' <span class="reg-class-tag">' + esc(info['class']) + '</span>' : '') +
        (i === 0 ? ' <em>(' + T.leader + ')</em>' : '') + '</li>';
    }).join('');
    successEl.querySelector('.reg-success-msg').textContent =
      (res.updated ? T.okUpdated : T.okNew) + ' ' + (res.emailSent ? T.mailOk : T.mailFail);
    successEl.querySelector('.reg-success-summary').innerHTML =
      '<p><strong>' + esc(data.title) + '</strong></p>' +
      '<p>' + esc(data.groupName) +
      (res.submissionId ? ' · ' + T.groupCode + ' <code>' + esc(String(res.submissionId).toUpperCase()) + '</code>' : '') + '</p>' +
      '<ul>' + list + '</ul>';
    form.hidden = true;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = collect();
    var err = validate(data);
    if (err) {
      showError(err);
      if (err === T.errOtp) otpEl.focus();
      return;
    }
    showError('');
    var top = lastSimilar[0];
    if (top && top.score >= 0.4 && !window.confirm(T.simConfirm(top.group.groupName, Math.round(top.score * 100)))) return;

    submitBtn.disabled = true;
    submitBtn.textContent = T.sending;

    post(data)
      .then(function (res) {
        if (res && res.ok) {
          otpEl.value = '';
          setOtpMsg('', true);
          showSuccess(data, res);
        } else {
          showError((res && res.message) || T.errNetwork);
          if (res && res.code === 'otp') otpEl.focus();
        }
      })
      .catch(function () { showError(T.errNetwork); })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = T.submit + ' <span>›</span>';
      });
  });

  document.getElementById('reg-edit-again').addEventListener('click', function () {
    successEl.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  loadDraft();
  loadFormInfo();
  loadOtherTopics();
  refreshOtpEmails();
  updateCount();
  scheduleChecks();
})();
