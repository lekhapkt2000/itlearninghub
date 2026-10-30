/**
 * IT Learning Hub - Access Code backend (pilot: IT004 Tuần 1).
 *
 * Setup:
 * 1. Create a blank Google Sheet (any name). Copy its ID from the URL:
 *    https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
 * 2. Extensions > Apps Script, paste this file as Code.gs.
 * 3. Paste the ID into SPREADSHEET_ID below.
 * 4. Run setup() once (Run button, pick "setup" from the dropdown) -
 *    it creates the ACCESS_CODES and ACCESS_LOG tabs with the right
 *    headers if they don't already exist. Safe to run again later.
 * 5. Run seedTestCode() once to create a test code - check the
 *    Execution log (View > Logs, or Ctrl+Enter) for the generated code.
 * 6. Deploy > New deployment > Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 *    Copy the /exec URL into assets/js/access-gate.js (APPS_SCRIPT_URL).
 * 7. To revoke a code later, just edit its `status` cell in ACCESS_CODES
 *    to "Revoked" - no code change needed.
 * 8. To issue a new code, run generateCode('IT004', 'note here') from
 *    the Apps Script editor and read the code from the Execution log, OR
 *    use the web form at admin/index.html.
 * 9. For the web form to work, set an admin password: Project Settings
 *    (gear icon, left sidebar) > Script Properties > Add script property.
 *    Name: ADMIN_KEY. Value: any secret string you choose. This keeps the
 *    password out of the source file (and out of git). Whoever knows this
 *    value can mint codes from admin/index.html, so treat it like
 *    a real password - don't post it publicly, rotate it (just change the
 *    Script Property, no redeploy needed) if it ever leaks.
 * 10. Codes can be scoped to one week (column `week` in ACCESS_CODES). A
 *     code generated for week 3 only unlocks week-3's answer page; leaving
 *     week blank when generating makes a code valid for every week of that
 *     course. Run setup() again after updating this file so the `week`
 *     column gets added to an existing sheet - safe to re-run, it only
 *     adds missing columns/tabs, never touches existing rows.
 * 11. IS355 topic registration (courses/is355/dang-ky-de-tai.html) posts
 *     to doPost() below and writes to the IS355_DANG_KY tab. After pasting
 *     a new version of this file: run setup() once, then Deploy > Manage
 *     deployments > Edit (pencil) > Version: New version > Deploy, so the
 *     /exec URL stays the same. Close registration with Script Property
 *     IS355_REG_CLOSED = 1. Import each class roster (MSSV + họ tên) at
 *     admin/index.html first - the form only accepts listed MSSVs.
 * 12. Topic review (dashboard > Đăng ký đề tài > Xét duyệt) writes to the
 *     IS355_XET_DUYET tab and emails the group; reminders to students
 *     without a group and every dashboard email are logged in
 *     IS355_EMAIL_LOG. The registration deadline lives in Script Property
 *     IS355_REG_DEADLINE (set it from the dashboard). Run setup() after
 *     updating so the new tabs exist.
 *
 * Gotcha this file avoids: SpreadsheetApp.getActiveSpreadsheet() returns
 * null when a Web App's doGet/doPost actually runs (no active UI in
 * that context), even for a container-bound script. Every function
 * below opens the sheet explicitly by ID instead.
 */

var SPREADSHEET_ID = '1yGco2Xf0SfFASmlxwFj2ZdoqtvDPCfvQsrypv04vsDM';

var CODES_SHEET = 'ACCESS_CODES';
var CODES_HEADERS = ['code', 'course', 'status', 'created_at', 'created_by', 'note', 'week'];
var LOG_SHEET = 'ACCESS_LOG';
var LOG_HEADERS = ['timestamp', 'course', 'resource', 'code_hash', 'name', 'class', 'result'];

// IS355 project registration (form: courses/is355/dang-ky-de-tai.html).
// One row per student, same layout as the paper registration sheet: title,
// description and references only on the group's first (leader) row.
// To close registration without redeploying: Script Properties >
// IS355_REG_CLOSED = 1 (delete the property, or set it to 0, to reopen).
var REG_SHEET = 'IS355_DANG_KY';
var REG_CLASSES = ['IS355.R11.CTTT.1', 'IS355.R11.CTTT.2'];
var REG_TRACKS = ['A', 'B', 'C', 'D', 'E'];
var REG_REF_TYPES = ['Dataset', 'Method', 'Related Survey', 'Other'];
var REG_MAX_MEMBERS = 6;
var REG_MAX_REFS = 5;
var REG_HEADERS = (function () {
  var h = ['timestamp', 'submission_id', 'class', 'group_code', 'group_name', 'no', 'student_id',
    'full_name', 'email', 'role', 'topic_track', 'project_level', 'project_title', 'short_description', 'short_description_en'];
  for (var i = 1; i <= REG_MAX_REFS; i++) h.push('ref_' + i + '_type', 'ref_' + i + '_citation');
  return h;
})();
// Class roster imported from admin/index.html. The registration
// form fills names/classes from here and only accepts MSSVs listed here.
var ROSTER_SHEET = 'IS355_DANH_SACH_LOP';
var ROSTER_HEADERS = ['student_id', 'full_name', 'class', 'imported_at'];
// Teacher's review of each topic: one row per review, newest last.
var REVIEW_SHEET = 'IS355_XET_DUYET';
var REVIEW_HEADERS = ['timestamp', 'group_code', 'group_name', 'project_title', 'status', 'comment',
  'clarify_items', 'revise_deadline', 'emailed_to'];
var REVIEW_STATUSES = { approved: 'Đã duyệt', revise: 'Cần chỉnh sửa', rejected: 'Không duyệt' };
// Every email the dashboard sends (reviews, reminders), for the record.
var MAIL_LOG_SHEET = 'IS355_EMAIL_LOG';
var MAIL_LOG_HEADERS = ['timestamp', 'type', 'group_code', 'student_ids', 'recipients', 'subject', 'result'];
// Student emails are always <MSSV>@gm.uit.edu.vn (form fills it, server enforces it).
var STUDENT_EMAIL_DOMAIN = 'gm.uit.edu.vn';

function studentEmail(studentId) {
  return String(studentId).trim() + '@' + STUDENT_EMAIL_DOMAIN;
}

function doGet(e) {
  var result;
  try {
    var action = e.parameter.action;
    if (action === 'validate') {
      result = handleValidate(e.parameter);
    } else if (action === 'generate') {
      result = handleGenerate(e.parameter);
    } else if (action === 'list') {
      result = handleList(e.parameter);
    } else if (action === 'revoke') {
      result = handleRevoke(e.parameter);
    } else if (action === 'restore') {
      result = handleRestore(e.parameter);
    } else if (action === 'delete') {
      result = handleDelete(e.parameter);
    } else {
      result = { ok: false, message: 'Unknown action' };
    }
  } catch (err) {
    // Without this catch, any thrown error (sheet not found, no access to
    // the spreadsheet, etc.) makes Apps Script return its own HTML error
    // page instead of our JS callback - the <script> tag on the client
    // then never fires, and the caller just sees "timeout" with zero
    // information about what actually broke. Catching it here turns that
    // silent failure into a real ok:false message the admin panel/gate
    // can display.
    result = { ok: false, message: 'Lỗi máy chủ: ' + err.message };
  }
  return respond(result, e.parameter.callback);
}

/** Returns an error message string if the admin key is missing/wrong, otherwise null. */
function checkAdminKey(params) {
  var adminKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!adminKey) return 'Chưa cấu hình ADMIN_KEY - xem hướng dẫn ở đầu file.';
  if (String(params.key || '') !== adminKey) return 'Sai mật khẩu quản trị.';
  return null;
}

function handleGenerate(params) {
  var keyError = checkAdminKey(params);
  if (keyError) return { ok: false, message: keyError };

  var course = String(params.course || '').trim().toUpperCase();
  if (!course) {
    return { ok: false, message: 'Thiếu mã môn học.' };
  }

  var week = String(params.week || '').trim();
  var code = generateCode(course, String(params.note || ''), week);
  return { ok: true, code: code };
}

function handleList(params) {
  var keyError = checkAdminKey(params);
  if (keyError) return { ok: false, message: keyError };

  var sheet = getSheet(CODES_SHEET);
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxCode = header.indexOf('code');
  var idxCourse = header.indexOf('course');
  var idxStatus = header.indexOf('status');
  var idxCreatedAt = header.indexOf('created_at');
  var idxNote = header.indexOf('note');
  var idxWeek = header.indexOf('week');

  var codes = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    var row = rows[i];
    var createdAt = row[idxCreatedAt];
    codes.push({
      code: row[idxCode],
      course: row[idxCourse],
      status: row[idxStatus],
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
      note: row[idxNote],
      week: idxWeek === -1 ? '' : String(row[idxWeek] || '')
    });
  }
  return { ok: true, codes: codes };
}

function handleRevoke(params) {
  return setCodeStatus(params, 'Revoked', 'Thiếu mã cần vô hiệu hóa.');
}

function handleRestore(params) {
  return setCodeStatus(params, 'Active', 'Thiếu mã cần khôi phục.');
}

function setCodeStatus(params, status, missingCodeMessage) {
  var keyError = checkAdminKey(params);
  if (keyError) return { ok: false, message: keyError };

  var code = String(params.code || '').trim().toUpperCase();
  if (!code) return { ok: false, message: missingCodeMessage };

  var sheet = getSheet(CODES_SHEET);
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxCode = header.indexOf('code');
  var idxStatus = header.indexOf('status');

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idxCode]).trim().toUpperCase() === code) {
      sheet.getRange(i + 1, idxStatus + 1).setValue(status);
      return { ok: true };
    }
  }
  return { ok: false, message: 'Không tìm thấy mã.' };
}

function handleDelete(params) {
  var keyError = checkAdminKey(params);
  if (keyError) return { ok: false, message: keyError };

  var code = String(params.code || '').trim().toUpperCase();
  if (!code) return { ok: false, message: 'Thiếu mã cần xóa.' };

  var sheet = getSheet(CODES_SHEET);
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxCode = header.indexOf('code');

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idxCode]).trim().toUpperCase() === code) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, message: 'Không tìm thấy mã.' };
}

function handleValidate(params) {
  var code = String(params.code || '').trim().toUpperCase();
  var course = String(params.course || '').trim().toUpperCase();
  var resource = String(params.resource || '');
  var week = String(params.week || '').trim();

  if (!code || !course) {
    return { ok: false, message: 'Thiếu mã truy cập hoặc môn học.' };
  }

  var sheet = getSheet(CODES_SHEET);
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxCode = header.indexOf('code');
  var idxCourse = header.indexOf('course');
  var idxStatus = header.indexOf('status');
  var idxWeek = header.indexOf('week');

  var ok = false;
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (String(row[idxCode]).trim().toUpperCase() === code) {
      var statusOk = String(row[idxStatus]).trim().toLowerCase() === 'active';
      var courseOk = String(row[idxCourse]).trim().toUpperCase() === course;
      // A blank week on the code means "valid for every week" of the course.
      var codeWeek = idxWeek === -1 ? '' : String(row[idxWeek] || '').trim();
      var weekOk = !codeWeek || codeWeek === week;
      ok = statusOk && courseOk && weekOk;
      break;
    }
  }

  logAccess(course, resource, code, params.name || '', params['class'] || '', ok ? 'allowed' : 'denied');

  return ok
    ? { ok: true, message: 'Xác thực thành công' }
    : { ok: false, message: 'Mã truy cập không hợp lệ hoặc không đúng phạm vi.' };
}

function logAccess(course, resource, code, name, className, result) {
  getSheet(LOG_SHEET).appendRow([new Date(), course, resource, hashCode(code), name, className, result]);
}

function hashCode(code) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, code);
  return bytes.map(function (b) {
    return ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0');
  }).join('').slice(0, 12);
}

function respond(obj, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(obj) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  var sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" not found - run setup() first.');
  return sheet;
}

/** Run once from the editor after setting SPREADSHEET_ID. Safe to re-run. */
function setup() {
  var ss = getSpreadsheet();
  ensureSheetWithHeaders(ss, CODES_SHEET, CODES_HEADERS);
  ensureSheetWithHeaders(ss, LOG_SHEET, LOG_HEADERS);
  ensureSheetWithHeaders(ss, REG_SHEET, REG_HEADERS);
  ensureSheetWithHeaders(ss, ROSTER_SHEET, ROSTER_HEADERS);
  ensureSheetWithHeaders(ss, REVIEW_SHEET, REVIEW_HEADERS);
  ensureSheetWithHeaders(ss, MAIL_LOG_SHEET, MAIL_LOG_HEADERS);
  Logger.log('Setup complete.');
}

function ensureSheetWithHeaders(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getRange(1, 1, 1, headers.length).getValues()[0].join('|') !== headers.join('|')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * Run manually from the editor to issue a new code. Reads back from the log.
 * week: '1'..'6' to scope the code to one week, or '' for a code valid on
 * every week of the course (e.g. for a final-exam or all-weeks pass).
 */
function generateCode(course, note, week) {
  var weekPart = week ? ('W' + week + '-') : '';
  var code = String(course).toUpperCase() + '-' + weekPart + randomSegment() + '-' + randomSegment();
  getSheet(CODES_SHEET).appendRow([code, String(course).toUpperCase(), 'Active', new Date(), 'Admin', note || '', week || '']);
  Logger.log(code);
  return code;
}

/** Run manually once after setup to create a code for testing the pilot. */
function seedTestCode() {
  return generateCode('IT004', 'Pilot test code - Tuần 1', '1');
}

/** 6-char random group code (no 0/O/1/I), unique among existing groups. */
function newGroupCode(rows, iSub) {
  var used = {};
  for (var i = 1; i < rows.length; i++) used[String(rows[i][iSub]).toUpperCase()] = true;
  var code;
  do { code = randomSegment() + randomSegment().slice(0, 2); } while (used[code]);
  return code;
}

function randomSegment() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, less error-prone to type
  var s = '';
  for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

/* ------------------------------------------------------------------ */
/* IS355 project registration                                          */
/* ------------------------------------------------------------------ */

/**
 * The registration form and admin/index.html POST JSON as
 * text/plain (a "simple" request, so no CORS preflight). Apps Script's
 * redirected response is readable cross-origin, and POST avoids the
 * URL-length limit a long description or a whole class roster would hit
 * with JSONP/GET.
 */
function doPost(e) {
  var result;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    // Admin access-code actions are also reachable by POST: the dashboard
    // uses fetch() instead of JSONP <script> tags, which ad-blockers and
    // strict tracking prevention often block.
    var codeActions = { list: handleList, generate: handleGenerate, revoke: handleRevoke, restore: handleRestore, 'delete': handleDelete };
    if (codeActions[body.action]) {
      result = codeActions[body.action](body);
    } else if (body.action === 'ping') {
      result = { ok: true };
    } else if (body.action === 'registerProject') {
      result = handleRegisterProject(body);
    } else if (body.action === 'requestOtp') {
      result = handleRequestOtp(body);
    } else if (body.action === 'lookupStudents') {
      result = handleLookupStudents(body);
    } else if (body.action === 'publicTopics') {
      result = handlePublicTopics();
    } else if (body.action === 'importRoster') {
      result = handleImportRoster(body);
    } else if (body.action === 'rosterAdmin') {
      result = handleRosterAdmin(body);
    } else if (body.action === 'setRegistrationOpen') {
      result = handleSetRegistrationOpen(body);
    } else if (body.action === 'setDeadline') {
      result = handleSetDeadline(body);
    } else if (body.action === 'formInfo') {
      result = handleFormInfo();
    } else if (body.action === 'reviewGroup') {
      result = handleReviewGroup(body);
    } else if (body.action === 'sendReminders') {
      result = handleSendReminders(body);
    } else {
      result = { ok: false, message: 'Unknown action' };
    }
  } catch (err) {
    result = { ok: false, message: 'Lỗi máy chủ: ' + err.message };
  }
  return respond(result);
}

function regClean(value, maxLen) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function getOrCreateSheet(name, headers) {
  var ss = getSpreadsheet();
  ensureSheetWithHeaders(ss, name, headers);
  return ss.getSheetByName(name);
}

/** Roster as { studentId: { fullName, class } }. */
function readRoster() {
  var rows = getOrCreateSheet(ROSTER_SHEET, ROSTER_HEADERS).getDataRange().getValues();
  var map = {};
  for (var i = 1; i < rows.length; i++) {
    var sid = String(rows[i][0]).trim();
    if (sid) map[sid] = { fullName: String(rows[i][1]), 'class': String(rows[i][2]) };
  }
  return map;
}

/** Public: name + class for up to REG_MAX_MEMBERS student IDs. */
function handleLookupStudents(body) {
  var ids = Array.isArray(body.ids) ? body.ids.slice(0, REG_MAX_MEMBERS) : [];
  var roster = readRoster();
  var found = {};
  ids.forEach(function (id) {
    id = regClean(id, 12);
    if (roster[id]) found[id] = roster[id];
  });
  return { ok: true, students: found };
}

/** Admin: replace the roster of one class. */
function handleImportRoster(body) {
  var keyError = checkAdminKey(body);
  if (keyError) return { ok: false, message: keyError };

  var className = regClean(body['class'], 40);
  if (REG_CLASSES.indexOf(className) === -1) return { ok: false, message: 'Lớp không hợp lệ.' };

  var list = Array.isArray(body.students) ? body.students : [];
  var students = [];
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var sid = regClean(list[i] && list[i].studentId, 12);
    var name = regClean(list[i] && list[i].fullName, 80);
    if (!/^\d{8}$/.test(sid) || !name) return { ok: false, message: 'Dòng ' + (i + 1) + ' không hợp lệ (MSSV 8 chữ số và họ tên).' };
    if (seen[sid]) continue;
    seen[sid] = true;
    students.push([sid, name, className, new Date()]);
  }
  if (!students.length) return { ok: false, message: 'Danh sách trống.' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getOrCreateSheet(ROSTER_SHEET, ROSTER_HEADERS);
    var rows = sheet.getDataRange().getValues();
    // Drop this class's old rows, plus any student being (re)imported
    // here from the other class, so each MSSV appears exactly once.
    for (var d = rows.length - 1; d >= 1; d--) {
      if (String(rows[d][2]) === className || seen[String(rows[d][0]).trim()]) sheet.deleteRow(d + 1);
    }
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, students.length, 1).setNumberFormat('@');
    sheet.getRange(startRow, 1, students.length, ROSTER_HEADERS.length).setValues(students);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, count: students.length };
}

/**
 * Admin: whole roster (with each student's group, if any) plus every
 * registered group, for the dashboard at admin/index.html.
 */
function handleRosterAdmin(body) {
  var keyError = checkAdminKey(body);
  if (keyError) return { ok: false, message: keyError };

  var roster = readRoster();
  var data = readGroups();
  var lastReminded = readLastReminded();
  var students = Object.keys(roster).map(function (sid) {
    return {
      studentId: sid, fullName: roster[sid].fullName, 'class': roster[sid]['class'],
      group: data.groupOf[sid] || '', lastReminded: lastReminded[sid] || ''
    };
  });
  var state = registrationState();
  var quota = -1;
  try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { /* no mail permission yet */ }
  return {
    ok: true,
    students: students,
    groups: data.groups,
    registrationOpen: state.open,
    manualClosed: state.manualClosed,
    deadline: state.deadline,
    mailQuota: quota
  };
}

/**
 * Registration is open unless the teacher closed it by hand
 * (IS355_REG_CLOSED) or the deadline (IS355_REG_DEADLINE, ISO time) passed.
 */
function registrationState() {
  var props = PropertiesService.getScriptProperties();
  var closed = props.getProperty('IS355_REG_CLOSED');
  var manualClosed = !!(closed && closed !== '0');
  var deadline = props.getProperty('IS355_REG_DEADLINE') || '';
  var pastDeadline = !!deadline && Date.now() > new Date(deadline).getTime();
  return { open: !manualClosed && !pastDeadline, manualClosed: manualClosed, deadline: deadline, pastDeadline: pastDeadline };
}

function isRegistrationOpen() {
  return registrationState().open;
}

function closedMessage() {
  var st = registrationState();
  if (st.pastDeadline) {
    return 'Đã hết hạn đăng ký đề tài (' + formatVnTime(st.deadline) + '). Vui lòng liên hệ giảng viên.';
  }
  return 'Đăng ký đề tài đang tạm khóa. Vui lòng liên hệ giảng viên.';
}

function formatVnTime(iso) {
  var d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'HH:mm, dd/MM/yyyy');
}

/** Public: what the registration form needs to know before showing itself. */
function handleFormInfo() {
  var st = registrationState();
  return { ok: true, open: st.open, deadline: st.deadline, message: st.open ? '' : closedMessage() };
}

/** Admin: set (ISO time) or clear ('') the registration deadline. */
function handleSetDeadline(body) {
  var keyError = checkAdminKey(body);
  if (keyError) return { ok: false, message: keyError };
  var props = PropertiesService.getScriptProperties();
  var value = String(body.deadline || '').trim();
  if (!value) {
    props.deleteProperty('IS355_REG_DEADLINE');
  } else {
    var d = new Date(value);
    if (isNaN(d.getTime())) return { ok: false, message: 'Hạn đăng ký không hợp lệ.' };
    props.setProperty('IS355_REG_DEADLINE', d.toISOString());
  }
  CacheService.getScriptCache().remove('public_topics');
  var st = registrationState();
  return { ok: true, deadline: st.deadline, registrationOpen: st.open, manualClosed: st.manualClosed };
}

/**
 * Public: topic list for courses/is355/danh-sach-de-tai.html. Members are
 * reduced to name + class (no email, no MSSV) since the link is shared
 * with the whole class. Cached for 60s so a class opening it at once
 * doesn't hammer the sheet.
 */
function handlePublicTopics() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('public_topics');
  if (hit) return JSON.parse(hit);

  var groups = readGroups().groups.map(function (g) {
    return {
      groupName: g.groupName,
      groupCode: g.groupCode,
      submittedAt: g.submittedAt,
      track: g.track || '',
      level: g.level || '',
      title: g.title || '',
      description: g.description || '',
      descriptionEn: g.descriptionEn || '',
      refs: g.refs,
      // Status only - the teacher's comments stay private to the group.
      reviewStatus: g.reviewStatus,
      members: g.members.map(function (m) {
        return { fullName: m.fullName, 'class': m['class'], leader: m.role === 'Leader' };
      })
    };
  });
  var st = registrationState();
  var result = { ok: true, groups: groups, registrationOpen: st.open, deadline: st.deadline, updatedAt: new Date().toISOString() };
  try { cache.put('public_topics', JSON.stringify(result), 60); } catch (e) { /* >100KB: skip caching */ }
  return result;
}

/** All registered groups (in submission order) plus MSSV -> group name. */
function readGroups() {
  var regRows = getOrCreateSheet(REG_SHEET, REG_HEADERS).getDataRange().getValues();
  var h = regRows[0];
  var col = function (name) { return h.indexOf(name); };
  var groupOf = {};
  var groupsById = {};
  var order = [];
  for (var i = 1; i < regRows.length; i++) {
    var row = regRows[i];
    var subId = String(row[col('submission_id')]);
    var sid = String(row[col('student_id')]);
    groupOf[sid] = String(row[col('group_name')]);
    var g = groupsById[subId];
    if (!g) {
      var ts = row[col('timestamp')];
      g = groupsById[subId] = {
        submissionId: subId,
        groupName: String(row[col('group_name')]),
        groupCode: String(row[col('group_code')] || subId).toUpperCase(),
        submittedAt: ts instanceof Date ? ts.toISOString() : String(ts),
        members: [], refs: []
      };
      order.push(subId);
    }
    g.members.push({
      studentId: sid, fullName: String(row[col('full_name')]), 'class': String(row[col('class')]),
      email: String(row[col('email')]), role: String(row[col('role')])
    });
    if (String(row[col('role')]) === 'Leader') {
      g.track = String(row[col('topic_track')]);
      g.level = String(row[col('project_level')]);
      g.title = String(row[col('project_title')]);
      g.description = String(row[col('short_description')]);
      g.descriptionEn = col('short_description_en') === -1 ? '' : String(row[col('short_description_en')] || '');
      for (var r = 1; r <= REG_MAX_REFS; r++) {
        var c = String(row[col('ref_' + r + '_citation')] || '');
        if (c) g.refs.push({ type: String(row[col('ref_' + r + '_type')]), citation: c });
      }
    }
  }
  var groups = order.map(function (id) { return groupsById[id]; });

  // Attach review state. A group that resubmitted after its latest review
  // goes back to "resubmitted" so the teacher knows to look again.
  var reviews = readReviews();
  groups.forEach(function (g) {
    var list = reviews[g.groupCode] || [];
    var last = list.length ? list[list.length - 1] : null;
    g.reviews = list;
    if (!last) g.reviewStatus = 'pending';
    else if (new Date(last.timestamp).getTime() < new Date(g.submittedAt).getTime()) g.reviewStatus = 'resubmitted';
    else g.reviewStatus = last.status;
  });
  return { groups: groups, groupOf: groupOf };
}

/** Admin: open/close topic registration (same flag as the Script Property). */
function handleSetRegistrationOpen(body) {
  var keyError = checkAdminKey(body);
  if (keyError) return { ok: false, message: keyError };
  var props = PropertiesService.getScriptProperties();
  if (body.open) props.deleteProperty('IS355_REG_CLOSED');
  else props.setProperty('IS355_REG_CLOSED', '1');
  CacheService.getScriptCache().remove('public_topics');
  var st = registrationState();
  return { ok: true, registrationOpen: st.open, manualClosed: st.manualClosed, deadline: st.deadline };
}

function handleRegisterProject(body) {
  if (!isRegistrationOpen()) {
    return { ok: false, code: 'closed', message: closedMessage() };
  }

  var groupName = regClean(body.groupName, 80);
  var track = regClean(body.track, 2).toUpperCase();
  var level = regClean(body.level, 2);
  var title = regClean(body.title, 300);
  var description = String(body.description || '').trim().slice(0, 1500);
  var descriptionEn = String(body.descriptionEn || '').trim().slice(0, 1500);

  if (!groupName) return { ok: false, message: 'Thiếu tên nhóm.' };
  if (REG_TRACKS.indexOf(track) === -1) return { ok: false, message: 'Nhóm chủ đề không hợp lệ.' };
  if (['1', '2', '3', '4'].indexOf(level) === -1) return { ok: false, message: 'Mức độ đồ án không hợp lệ.' };
  if (!title) return { ok: false, message: 'Thiếu tên đề tài.' };
  if (description.length < 50) return { ok: false, message: 'Mô tả ngắn tiếng Việt quá ngắn (tối thiểu 50 ký tự).' };
  if (descriptionEn.length < 50) return { ok: false, message: 'Mô tả ngắn tiếng Anh quá ngắn (tối thiểu 50 ký tự).' };

  var roster = readRoster();
  if (!Object.keys(roster).length) {
    return { ok: false, message: 'Giảng viên chưa nhập danh sách lớp. Vui lòng thử lại sau.' };
  }

  // Members: the first one is the leader. Name and class always come from
  // the roster, so a group can mix students from both classes.
  var rawMembers = Array.isArray(body.members) ? body.members : [];
  if (rawMembers.length > REG_MAX_MEMBERS) return { ok: false, message: 'Nhóm tối đa ' + REG_MAX_MEMBERS + ' thành viên.' };
  var members = [];
  var seenIds = {};
  for (var i = 0; i < rawMembers.length; i++) {
    var m = rawMembers[i] || {};
    var sid = regClean(m.studentId, 12);
    if (!/^\d{8}$/.test(sid)) return { ok: false, message: 'MSSV không hợp lệ ở thành viên ' + (i + 1) + ' (cần 8 chữ số).' };
    if (!roster[sid]) return { ok: false, message: 'MSSV ' + sid + ' không có trong danh sách lớp IS355.R11.CTTT.1/.2.' };
    var email = studentEmail(sid); // never trust an email typed in the browser
    if (seenIds[sid]) return { ok: false, message: 'MSSV ' + sid + ' bị nhập trùng trong nhóm.' };
    seenIds[sid] = true;
    members.push({ studentId: sid, fullName: roster[sid].fullName, 'class': roster[sid]['class'], email: email });
  }
  if (!members.length) return { ok: false, message: 'Nhóm cần ít nhất 1 thành viên.' };

  // References: at least one Dataset, one Method and one Related Survey.
  var rawRefs = Array.isArray(body.refs) ? body.refs.slice(0, REG_MAX_REFS) : [];
  var refs = [];
  var typesSeen = {};
  for (var r = 0; r < rawRefs.length; r++) {
    var ref = rawRefs[r] || {};
    var rType = regClean(ref.type, 20);
    var citation = regClean(ref.citation, 500);
    if (!citation) continue;
    if (REG_REF_TYPES.indexOf(rType) === -1) return { ok: false, message: 'Loại tài liệu tham khảo không hợp lệ.' };
    typesSeen[rType] = true;
    refs.push({ type: rType, citation: citation });
  }
  if (!typesSeen['Dataset'] || !typesSeen['Method'] || !typesSeen['Related Survey']) {
    return { ok: false, message: 'Tài liệu tham khảo cần có ít nhất 1 Dataset, 1 Method và 1 Related Survey.' };
  }

  // The person submitting proves they own one member's email via OTP.
  var verifyEmail = regClean(body.otpEmail, 120).toLowerCase();
  var isMemberEmail = members.some(function (mem) { return mem.email === verifyEmail; });
  if (!verifyEmail || !isMemberEmail) {
    return { ok: false, code: 'otp', message: 'Email xác thực OTP phải là email của một thành viên trong nhóm.' };
  }
  var otpError = checkOtp(verifyEmail, body.otp);
  if (otpError) return { ok: false, code: 'otp', message: otpError };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getOrCreateSheet(REG_SHEET, REG_HEADERS);
    var rows = sheet.getDataRange().getValues();
    var header = rows[0];
    var iSub = header.indexOf('submission_id');
    var iSid = header.indexOf('student_id');
    var iEmail = header.indexOf('email');
    var iRole = header.indexOf('role');

    // Resubmission = same leader MSSV. Only someone whose OTP-verified
    // email is already in that group may overwrite it.
    var leader = members[0];
    var existingSubId = '';
    for (var k = 1; k < rows.length; k++) {
      if (String(rows[k][iSid]) === leader.studentId && String(rows[k][iRole]) === 'Leader') {
        existingSubId = String(rows[k][iSub]);
        break;
      }
    }
    if (existingSubId) {
      var allowed = false;
      for (var a = 1; a < rows.length; a++) {
        if (String(rows[a][iSub]) === existingSubId && String(rows[a][iEmail]).toLowerCase() === verifyEmail) allowed = true;
      }
      if (!allowed) {
        return { ok: false, message: 'Nhóm của trưởng nhóm ' + leader.studentId + ' đã đăng ký. Muốn cập nhật, hãy xác thực OTP bằng email của một thành viên đã có trong bản đăng ký trước.' };
      }
    }

    // A student can only be in one group.
    var taken = [];
    for (var t = 1; t < rows.length; t++) {
      var rowSid = String(rows[t][iSid]);
      if (seenIds[rowSid] && String(rows[t][iSub]) !== existingSubId) taken.push(rowSid);
    }
    if (taken.length) {
      return { ok: false, message: 'MSSV đã thuộc nhóm khác: ' + taken.join(', ') + '. Liên hệ giảng viên nếu cần chuyển nhóm.' };
    }

    // Replace the group's old rows (delete bottom-up so row numbers stay valid).
    if (existingSubId) {
      for (var d = rows.length - 1; d >= 1; d--) {
        if (String(rows[d][iSub]) === existingSubId) sheet.deleteRow(d + 1);
      }
    }

    // Random group code (not sequential), kept when the group resubmits.
    var subId = existingSubId || newGroupCode(rows, iSub);
    var now = new Date();
    var out = members.map(function (mem, n) {
      var first = n === 0;
      var row = [now, subId, mem['class'], subId, groupName, n + 1, mem.studentId, mem.fullName, mem.email,
        first ? 'Leader' : 'Member', first ? track : '', first ? level : '', first ? title : '', first ? description : '', first ? descriptionEn : ''];
      for (var q = 0; q < REG_MAX_REFS; q++) {
        var rf = first ? refs[q] : null;
        row.push(rf ? rf.type : '', rf ? rf.citation : '');
      }
      return row;
    });
    // Keep student IDs as text so the sheet doesn't turn them into numbers.
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, iSid + 1, out.length, 1).setNumberFormat('@');
    sheet.getRange(startRow, 1, out.length, out[0].length).setValues(out);
  } finally {
    lock.releaseLock();
  }

  consumeOtp(verifyEmail);
  CacheService.getScriptCache().remove('public_topics');

  var emailSent = false;
  try {
    sendConfirmationEmail({
      submissionId: subId, updated: !!existingSubId, submittedAt: now, verifiedBy: verifyEmail,
      groupName: groupName, track: track, level: level, title: title,
      description: description, descriptionEn: descriptionEn, members: members, refs: refs, formUrl: REG_FORM_URL
    });
    emailSent = true;
  } catch (mailErr) {
    // Registration is already saved - a mail quota/permission problem
    // shouldn't turn it into an error for the student.
    Logger.log('Confirmation email failed: ' + mailErr.message);
  }

  return {
    ok: true,
    updated: !!existingSubId,
    submissionId: subId,
    emailSent: emailSent,
    members: members.map(function (mem) { return { studentId: mem.studentId, fullName: mem.fullName, 'class': mem['class'] }; })
  };
}

/* ---------- OTP ---------- */

var OTP_TTL_SECONDS = 600;     // code valid for 10 minutes
var OTP_RESEND_SECONDS = 60;   // min gap between two codes to the same email
var OTP_MAX_TRIES = 5;
var OTP_MAX_PER_DAY = 8;       // per email, keeps MailApp quota safe

function otpCacheKey(prefix, email) {
  return prefix + hashCode(email);
}

/** Public: send a 6-digit code to the email of a student on the roster. */
function handleRequestOtp(body) {
  if (!isRegistrationOpen()) {
    return { ok: false, code: 'closed', message: closedMessage() };
  }
  var sid = regClean(body.studentId, 12);
  var roster = readRoster();
  if (!roster[sid]) return { ok: false, message: 'MSSV của người nhận OTP không có trong danh sách lớp.' };
  // The code only ever goes to that student's school mailbox, so the form
  // can't be used to send mail to arbitrary addresses.
  var email = studentEmail(sid);

  var cache = CacheService.getScriptCache();
  if (cache.get(otpCacheKey('otp_rl_', email))) {
    return { ok: false, message: 'Mã OTP vừa được gửi. Vui lòng đợi 60 giây rồi thử lại.' };
  }
  var sentToday = Number(cache.get(otpCacheKey('otp_n_', email)) || 0);
  if (sentToday >= OTP_MAX_PER_DAY) {
    return { ok: false, message: 'Email này đã nhận quá nhiều mã OTP hôm nay. Vui lòng thử lại vào ngày mai hoặc liên hệ giảng viên.' };
  }

  var code = String(Math.floor(100000 + Math.random() * 900000));
  var record = { code: code, tries: 0, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 };
  try {
    sendOtpEmail(email, roster[sid].fullName, code);
  } catch (mailErr) {
    Logger.log('OTP email failed: ' + mailErr.message);
    return { ok: false, message: mailErrorMessage(mailErr) };
  }
  cache.put(otpCacheKey('otp_', email), JSON.stringify(record), OTP_TTL_SECONDS);
  cache.put(otpCacheKey('otp_rl_', email), '1', OTP_RESEND_SECONDS);
  cache.put(otpCacheKey('otp_n_', email), String(sentToday + 1), 21600);
  return { ok: true, ttl: OTP_TTL_SECONDS };
}

/** Returns an error message, or null if the code is right (not consumed yet). */
function checkOtp(email, otp) {
  var cache = CacheService.getScriptCache();
  var key = otpCacheKey('otp_', email);
  var raw = cache.get(key);
  if (!raw) return 'Mã OTP đã hết hạn hoặc chưa được gửi. Bấm "Gửi mã OTP" để nhận mã mới.';
  var rec = JSON.parse(raw);
  if (rec.tries >= OTP_MAX_TRIES) {
    cache.remove(key);
    return 'Nhập sai OTP quá ' + OTP_MAX_TRIES + ' lần. Vui lòng gửi lại mã mới.';
  }
  if (String(otp || '').trim() !== rec.code) {
    rec.tries++;
    var remaining = Math.floor((rec.expiresAt - Date.now()) / 1000);
    if (remaining > 1) cache.put(key, JSON.stringify(rec), remaining);
    return 'Mã OTP không đúng.';
  }
  return null;
}

function consumeOtp(email) {
  CacheService.getScriptCache().remove(otpCacheKey('otp_', email));
}

/* ---------- Emails ---------- */

var MAIL_SENDER_NAME = 'IS355 Công nghệ Blockchain';
var REG_FORM_URL = 'https://itlearninghub.io.vn/courses/is355/dang-ky-de-tai.html';
// Instructor is CC'd on every confirmation (not on OTP codes).
var REG_CC_EMAIL = 'khalvd@uit.edu.vn';
var TRACK_LABELS = { A: 'A - Green Finance', B: 'B - DeFi & Banking', C: 'C - Blockchain Analytics & AML', D: 'D - RWA & Tokenization', E: 'E - AI + Blockchain' };
var LEVEL_LABELS = { '1': 'Mức 1 - Basic', '2': 'Mức 2 - Intermediate', '3': 'Mức 3 - Advanced', '4': 'Mức 4 - Research' };

function htmlEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Shared email layout: table-based with inline styles so it renders in Gmail/Outlook. */
function emailShell(preheader, heading, innerHtml) {
  return '<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">' +
    '<span style="display:none;max-height:0;overflow:hidden;opacity:0">' + htmlEsc(preheader) + '</span>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">' +
    '<tr><td style="background:#1d4ed8;background-image:linear-gradient(135deg,#2563eb,#1e3a8a);padding:22px 28px">' +
    '<div style="color:#bfdbfe;font-size:11px;font-weight:700;letter-spacing:.12em">IS355 · CÔNG NGHỆ BLOCKCHAIN</div>' +
    '<div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:6px">' + htmlEsc(heading) + '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:26px 28px;font-size:14px;line-height:1.7;color:#334155">' + innerHtml + '</td></tr>' +
    '<tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6">' +
    'Email tự động từ hệ thống đăng ký đề tài IS355 - IT Learning Hub. Vui lòng không trả lời email này.' +
    '</td></tr></table></td></tr></table></body></html>';
}

/** Turns a MailApp exception into a message the student/teacher can act on. */
function mailErrorMessage(err) {
  var msg = String(err && err.message || err);
  if (/permission|authoriz|quyền/i.test(msg)) {
    return 'Máy chủ chưa được cấp quyền gửi email. Giảng viên cần mở Apps Script, chạy hàm authorizeMail() và bấm Allow.';
  }
  if (/quota|limit|too many|service invoked too many/i.test(msg)) {
    return 'Hệ thống đã hết hạn mức gửi email hôm nay. Vui lòng thử lại vào ngày mai hoặc liên hệ giảng viên.';
  }
  return 'Không gửi được email: ' + msg;
}

/**
 * Run once from the Apps Script editor (pick authorizeMail, press Run):
 * it triggers the "send email" permission prompt and mails a test message
 * to the script owner, then logs how many emails are left today.
 * Needed whenever a new version adds MailApp and OTP sending fails.
 */
function authorizeMail() {
  var me = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: me,
    subject: '[IS355] Thử gửi email - OK',
    name: MAIL_SENDER_NAME,
    htmlBody: emailShell('Email thử', 'Gửi email hoạt động bình thường', '<p style="margin:0">Apps Script đã được cấp quyền gửi email. Form đăng ký đề tài có thể gửi OTP và email xác nhận.</p>')
  });
  Logger.log('Đã gửi email thử tới ' + me + '. Hạn mức còn lại hôm nay: ' + MailApp.getRemainingDailyQuota());
}

function sendOtpEmail(email, fullName, code) {
  var inner =
    '<p style="margin:0 0 14px">Chào <b>' + htmlEsc(fullName) + '</b>,</p>' +
    '<p style="margin:0 0 18px">Mã xác thực để gửi đăng ký đề tài đồ án IS355 của bạn là:</p>' +
    '<div style="margin:0 0 18px;padding:16px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center">' +
    '<span style="font-family:Consolas,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:.35em;color:#1d4ed8">' + code + '</span></div>' +
    '<p style="margin:0 0 8px">Mã có hiệu lực trong <b>10 phút</b> và chỉ dùng được một lần.</p>' +
    '<p style="margin:0;color:#64748b;font-size:13px">Nếu bạn không yêu cầu mã này, có thể bỏ qua email. Không chia sẻ mã cho người khác.</p>';
  MailApp.sendEmail({
    to: email,
    subject: '[IS355] Mã xác thực đăng ký đề tài: ' + code,
    name: MAIL_SENDER_NAME,
    htmlBody: emailShell('Mã OTP của bạn: ' + code, 'Mã xác thực đăng ký đề tài', inner),
    body: 'Mã xác thực đăng ký đề tài IS355 của bạn: ' + code + ' (hiệu lực 10 phút).'
  });
}

function sendConfirmationEmail(g) {
  var tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  var when = Utilities.formatDate(g.submittedAt, tz, 'HH:mm, dd/MM/yyyy');
  var row = function (label, value) {
    return '<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:150px;vertical-align:top">' + label + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a">' + value + '</td></tr>';
  };
  var th = 'padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em';
  var td = 'padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px';

  var memberRows = g.members.map(function (m, i) {
    return '<tr><td style="' + td + '">' + (i + 1) + '</td>' +
      '<td style="' + td + ';font-family:Consolas,Menlo,monospace">' + htmlEsc(m.studentId) + '</td>' +
      '<td style="' + td + '">' + htmlEsc(m.fullName) + (i === 0 ? ' <span style="color:#1d4ed8;font-weight:700">(Trưởng nhóm)</span>' : '') + '</td>' +
      '<td style="' + td + '">' + htmlEsc(m['class']) + '</td></tr>';
  }).join('');
  var refItems = g.refs.map(function (r) {
    return '<li style="margin-bottom:6px"><b>' + htmlEsc(r.type) + ':</b> ' + htmlEsc(r.citation) + '</li>';
  }).join('');

  var inner =
    '<p style="margin:0 0 14px">Chào nhóm <b>' + htmlEsc(g.groupName) + '</b>,</p>' +
    '<p style="margin:0 0 18px">' + (g.updated
      ? 'Bản đăng ký đề tài của nhóm đã được <b>cập nhật</b>. Thông tin dưới đây thay thế hoàn toàn bản trước.'
      : 'Hệ thống đã ghi nhận đăng ký đề tài đồ án cuối kỳ của nhóm. Giảng viên sẽ xem xét và gửi kết quả xét duyệt (đồng ý, cần chỉnh sửa hoặc góp ý) tới email của cả nhóm.') + '</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;overflow:hidden;margin-bottom:22px">' +
    row('Mã nhóm', '<span style="font-family:Consolas,Menlo,monospace;font-weight:700">' + htmlEsc(g.submissionId.toUpperCase()) + '</span>') +
    row('Thời gian', htmlEsc(when)) +
    row('Tên nhóm', htmlEsc(g.groupName)) +
    row('Tên đề tài', '<b>' + htmlEsc(g.title) + '</b>') +
    row('Nhóm chủ đề', htmlEsc(TRACK_LABELS[g.track] || g.track)) +
    row('Mức độ', htmlEsc(LEVEL_LABELS[g.level] || g.level)) +
    row('Xác thực bởi', htmlEsc(g.verifiedBy)) +
    '</table>' +
    '<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#1d4ed8;margin-bottom:8px">THÀNH VIÊN</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-collapse:collapse;margin-bottom:22px">' +
    '<tr><th style="' + th + '">#</th><th style="' + th + '">MSSV</th><th style="' + th + '">Họ và tên</th><th style="' + th + '">Lớp</th></tr>' +
    memberRows + '</table>' +
    '<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#1d4ed8;margin-bottom:8px">MÔ TẢ NGẮN</div>' +
    '<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b">TIẾNG VIỆT</p>' +
    '<p style="margin:0 0 14px;white-space:pre-line">' + htmlEsc(g.description) + '</p>' +
    '<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b">ENGLISH</p>' +
    '<p style="margin:0 0 22px;white-space:pre-line">' + htmlEsc(g.descriptionEn) + '</p>' +
    '<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#1d4ed8;margin-bottom:8px">TÀI LIỆU THAM KHẢO</div>' +
    '<ol style="margin:0 0 22px;padding-left:20px;font-size:13px">' + refItems + '</ol>' +
    '<div style="padding:12px 14px;border-radius:8px;background:#f0fdf4;border-left:3px solid #22c55e;color:#166534;font-size:13px">' +
    'Cần chỉnh sửa? Gửi lại form với cùng MSSV trưởng nhóm và xác thực OTP bằng email của một thành viên trong nhóm. Bản mới sẽ thay thế bản này.' +
    '</div>' +
    (g.formUrl ? '<p style="margin:22px 0 0;text-align:center"><a href="' + htmlEsc(g.formUrl) + '" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px">Mở form đăng ký</a></p>' : '');

  var emails = g.members.map(function (m) { return m.email; });
  MailApp.sendEmail({
    to: emails[0],
    cc: emails.slice(1).concat(REG_CC_EMAIL).join(','),
    subject: '[IS355] ' + (g.updated ? 'Cập nhật' : 'Xác nhận') + ' đăng ký đề tài - Nhóm ' + g.groupName,
    name: MAIL_SENDER_NAME,
    htmlBody: emailShell('Đề tài: ' + g.title, g.updated ? 'Đã cập nhật đăng ký đề tài' : 'Xác nhận đăng ký đề tài', inner),
    body: 'Nhóm ' + g.groupName + ' đã ' + (g.updated ? 'cập nhật' : 'đăng ký') + ' đề tài: ' + g.title + '. Mã nhóm: ' + g.submissionId.toUpperCase() + '.'
  });
}

/* ------------------------------------------------------------------ */
/* IS355 topic review + reminders                                      */
/* ------------------------------------------------------------------ */

var SITE_URL = 'https://itlearninghub.io.vn/courses/is355/';
var REVIEW_MAX_ITEMS = 15;
var REMINDER_MAX_PER_RUN = 150;

/** { GROUPCODE: [review, ...] } oldest first. */
function readReviews() {
  var rows = getOrCreateSheet(REVIEW_SHEET, REVIEW_HEADERS).getDataRange().getValues();
  var h = rows[0];
  var col = function (name) { return h.indexOf(name); };
  var map = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var code = String(r[col('group_code')]).toUpperCase();
    if (!code) continue;
    var ts = r[col('timestamp')];
    var dl = r[col('revise_deadline')];
    (map[code] = map[code] || []).push({
      timestamp: ts instanceof Date ? ts.toISOString() : String(ts),
      status: String(r[col('status')]),
      comment: String(r[col('comment')] || ''),
      items: String(r[col('clarify_items')] || '').split('\n').filter(function (x) { return x.trim(); }),
      deadline: dl instanceof Date ? Utilities.formatDate(dl, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(dl || ''),
      emailedTo: String(r[col('emailed_to')] || '')
    });
  }
  Object.keys(map).forEach(function (k) {
    map[k].sort(function (a, b) { return String(a.timestamp).localeCompare(String(b.timestamp)); });
  });
  return map;
}

/** { MSSV: ISO time of the last reminder sent to that student }. */
function readLastReminded() {
  var rows = getOrCreateSheet(MAIL_LOG_SHEET, MAIL_LOG_HEADERS).getDataRange().getValues();
  var h = rows[0];
  var iType = h.indexOf('type'), iIds = h.indexOf('student_ids'), iTs = h.indexOf('timestamp'), iRes = h.indexOf('result');
  var last = {};
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][iType]) !== 'reminder' || String(rows[i][iRes]) !== 'sent') continue;
    var ts = rows[i][iTs];
    var iso = ts instanceof Date ? ts.toISOString() : String(ts);
    String(rows[i][iIds]).split(',').forEach(function (sid) {
      sid = sid.trim();
      if (sid && (!last[sid] || last[sid] < iso)) last[sid] = iso;
    });
  }
  return last;
}

function logMail(type, groupCode, studentIds, recipients, subject, result) {
  getOrCreateSheet(MAIL_LOG_SHEET, MAIL_LOG_HEADERS)
    .appendRow([new Date(), type, groupCode || '', studentIds.join(','), recipients.join(','), subject, result]);
}

function cleanItems(list) {
  return (Array.isArray(list) ? list : [])
    .map(function (x) { return String(x || '').replace(/\s+/g, ' ').trim().slice(0, 300); })
    .filter(function (x) { return x; })
    .slice(0, REVIEW_MAX_ITEMS);
}

/**
 * Admin: review a group's topic. With preview:true only builds the email
 * (subject + html) so the dashboard can show it; otherwise saves the
 * review and, unless sendEmail is false, emails the whole group (CC teacher).
 */
function handleReviewGroup(body) {
  var keyError = checkAdminKey(body);
  if (keyError) return { ok: false, message: keyError };

  var code = regClean(body.groupCode, 12).toUpperCase();
  var status = String(body.status || '');
  if (!REVIEW_STATUSES[status]) return { ok: false, message: 'Kết quả xét duyệt không hợp lệ.' };
  var comment = String(body.comment || '').trim().slice(0, 3000);
  var items = cleanItems(body.items);
  var deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(body.deadline || '')) ? String(body.deadline) : '';
  if (status !== 'approved' && !comment && !items.length) {
    return { ok: false, message: 'Cần nhập nhận xét hoặc ít nhất một nội dung cần làm rõ.' };
  }

  var group = null;
  readGroups().groups.forEach(function (g) { if (g.groupCode === code) group = g; });
  if (!group) return { ok: false, message: 'Không tìm thấy nhóm ' + code + '.' };

  var review = { status: status, comment: comment, items: items, deadline: deadline };
  var mail = buildReviewEmail(group, review);
  var recipients = group.members.map(function (m) { return m.email; });
  if (body.preview) {
    return { ok: true, subject: mail.subject, html: mail.html, recipients: recipients.concat(REG_CC_EMAIL) };
  }

  var sendEmail = body.sendEmail !== false;
  var emailSent = false, mailError = '';
  if (sendEmail) {
    try {
      MailApp.sendEmail({
        to: recipients[0],
        cc: recipients.slice(1).concat(REG_CC_EMAIL).join(','),
        subject: mail.subject,
        name: MAIL_SENDER_NAME,
        htmlBody: mail.html,
        body: mail.text
      });
      emailSent = true;
    } catch (err) {
      mailError = mailErrorMessage(err);
    }
    logMail('review', code, group.members.map(function (m) { return m.studentId; }), recipients, mail.subject, emailSent ? 'sent' : 'failed: ' + mailError);
  }

  // Save the review even if the email failed - the teacher can resend.
  getOrCreateSheet(REVIEW_SHEET, REVIEW_HEADERS).appendRow([
    new Date(), code, group.groupName, group.title, status, comment, items.join('\n'), deadline,
    emailSent ? recipients.join(',') : ''
  ]);
  CacheService.getScriptCache().remove('public_topics');

  return { ok: true, emailSent: emailSent, message: mailError };
}

/**
 * Admin: email students who still have no group. The server re-checks
 * who is ungrouped, so a stale dashboard can't remind someone who just
 * registered. preview:true returns the email for the first student.
 */
function handleSendReminders(body) {
  var keyError = checkAdminKey(body);
  if (keyError) return { ok: false, message: keyError };

  var message = String(body.message || '').trim().slice(0, 3000);
  var subject = regClean(body.subject, 150) || '[IS355] Nhắc nhở: Bạn chưa đăng ký nhóm đồ án cuối kỳ';
  var roster = readRoster();
  var groupOf = readGroups().groupOf;
  var wanted = Array.isArray(body.studentIds) ? body.studentIds.map(function (x) { return String(x).trim(); }) : [];
  var targets = wanted.filter(function (sid, i) {
    return roster[sid] && !groupOf[sid] && wanted.indexOf(sid) === i;
  });
  if (!targets.length) return { ok: false, message: 'Không có sinh viên nào cần nhắc (tất cả đã có nhóm hoặc không có trong danh sách lớp).' };
  if (targets.length > REMINDER_MAX_PER_RUN) return { ok: false, message: 'Mỗi lần gửi tối đa ' + REMINDER_MAX_PER_RUN + ' sinh viên. Hãy lọc theo lớp rồi gửi từng đợt.' };

  var deadline = registrationState().deadline;
  if (body.preview) {
    var sample = targets[0];
    var m = buildReminderEmail({ studentId: sample, fullName: roster[sample].fullName }, message, deadline, subject);
    return { ok: true, subject: m.subject, html: m.html, count: targets.length, skipped: wanted.length - targets.length };
  }

  var quota = MailApp.getRemainingDailyQuota();
  if (targets.length > quota) {
    return { ok: false, message: 'Hạn mức email hôm nay chỉ còn ' + quota + ', không đủ gửi cho ' + targets.length + ' sinh viên. Hãy gửi ít hơn hoặc đợi ngày mai.' };
  }

  var sent = [], failed = [], lastError = '';
  targets.forEach(function (sid) {
    var mail = buildReminderEmail({ studentId: sid, fullName: roster[sid].fullName }, message, deadline, subject);
    try {
      MailApp.sendEmail({ to: studentEmail(sid), subject: mail.subject, name: MAIL_SENDER_NAME, htmlBody: mail.html, body: mail.text });
      sent.push(sid);
    } catch (err) {
      failed.push(sid);
      lastError = mailErrorMessage(err);
    }
  });
  if (sent.length) logMail('reminder', '', sent, sent.map(studentEmail), subject, 'sent');
  if (failed.length) logMail('reminder', '', failed, failed.map(studentEmail), subject, 'failed: ' + lastError);

  return {
    ok: true, sent: sent.length, failed: failed.length,
    skipped: wanted.length - targets.length, message: lastError,
    sentAt: new Date().toISOString(), sentIds: sent
  };
}

/* ---------- Review / reminder emails ---------- */

var REVIEW_THEME = {
  approved: { color: '#15803d', bg: '#f0fdf4', border: '#86efac', label: 'ĐÃ DUYỆT', icon: '&#10003;' },
  revise: { color: '#b45309', bg: '#fffbeb', border: '#fcd34d', label: 'CẦN CHỈNH SỬA', icon: '&#9998;' },
  rejected: { color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', label: 'KHÔNG DUYỆT', icon: '&#10007;' }
};

function sectionTitle(text) {
  return '<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#1d4ed8;margin:0 0 8px">' + text + '</div>';
}

function emailButton(href, label, color) {
  return '<p style="margin:24px 0 0;text-align:center"><a href="' + htmlEsc(href) + '" style="display:inline-block;padding:12px 22px;border-radius:8px;background:' +
    (color || '#2563eb') + ';color:#ffffff;text-decoration:none;font-weight:700;font-size:13px">' + label + '</a></p>';
}

function formatVnDate(ymd) {
  var p = String(ymd || '').split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
}

function buildReviewEmail(g, r) {
  var theme = REVIEW_THEME[r.status];
  var intro = {
    approved: 'Giảng viên đã xem xét và <b>đồng ý</b> đề tài của nhóm. Nhóm có thể bắt đầu triển khai theo kế hoạch đã đăng ký.',
    revise: 'Giảng viên đã xem xét đề tài của nhóm. Đề tài <b>cần chỉnh sửa hoặc làm rõ thêm</b> trước khi được duyệt. Nhóm vui lòng xem góp ý bên dưới và cập nhật lại bản đăng ký.',
    rejected: 'Giảng viên đã xem xét đề tài của nhóm. Đề tài <b>chưa phù hợp</b> với yêu cầu đồ án. Nhóm vui lòng xem nhận xét bên dưới, chọn hướng khác và đăng ký lại.'
  }[r.status];
  var row = function (label, value) {
    return '<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:130px;vertical-align:top">' + label + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a">' + value + '</td></tr>';
  };

  var html =
    '<p style="margin:0 0 14px">Chào nhóm <b>' + htmlEsc(g.groupName) + '</b>,</p>' +
    '<p style="margin:0 0 18px">' + intro + '</p>' +
    '<div style="margin:0 0 22px;padding:14px 18px;border-radius:10px;background:' + theme.bg + ';border:1px solid ' + theme.border + '">' +
    '<span style="display:inline-block;margin-right:8px;font-size:18px;color:' + theme.color + '">' + theme.icon + '</span>' +
    '<span style="font-size:15px;font-weight:800;letter-spacing:.06em;color:' + theme.color + '">' + theme.label + '</span>' +
    (r.status === 'revise' && r.deadline ? '<div style="margin-top:6px;font-size:13px;color:' + theme.color + '">Hạn cập nhật: <b>' + formatVnDate(r.deadline) + '</b></div>' : '') +
    '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;overflow:hidden;margin-bottom:22px">' +
    row('Mã nhóm', '<span style="font-family:Consolas,Menlo,monospace;font-weight:700">' + htmlEsc(g.groupCode) + '</span>') +
    row('Tên đề tài', '<b>' + htmlEsc(g.title) + '</b>') +
    row('Nhóm chủ đề', htmlEsc(TRACK_LABELS[g.track] || g.track)) +
    row('Mức độ', htmlEsc(LEVEL_LABELS[g.level] || g.level)) +
    row('Thành viên', g.members.map(function (m) { return htmlEsc(m.fullName); }).join(', ')) +
    '</table>';

  if (r.comment) {
    html += sectionTitle('NHẬN XÉT CỦA GIẢNG VIÊN') +
      '<div style="margin:0 0 22px;padding:14px 16px;border-left:3px solid #2563eb;background:#f8fafc;border-radius:0 8px 8px 0;white-space:pre-line;font-size:14px;color:#0f172a">' +
      htmlEsc(r.comment) + '</div>';
  }
  if (r.items.length) {
    html += sectionTitle(r.status === 'approved' ? 'GÓP Ý THÊM KHI TRIỂN KHAI' : 'NỘI DUNG CẦN LÀM RÕ / BỔ SUNG') +
      '<ol style="margin:0 0 22px;padding-left:22px;font-size:14px;line-height:1.75">' +
      r.items.map(function (x) { return '<li style="margin-bottom:6px">' + htmlEsc(x) + '</li>'; }).join('') + '</ol>';
  }

  var next = {
    approved: 'Bước tiếp theo: Nhóm bám theo 5 thành phần bắt buộc trong Project Lab và chuẩn bị báo cáo tiến độ. Nếu cần thay đổi lớn về đề tài, hãy trao đổi với giảng viên trước.',
    revise: 'Cách cập nhật: Mở form đăng ký, nhập cùng MSSV trưởng nhóm, chỉnh sửa theo góp ý rồi xác thực OTP và gửi lại. Bản mới sẽ thay thế bản cũ và được xét duyệt lại.',
    rejected: 'Cách đăng ký lại: Mở form đăng ký, nhập cùng MSSV trưởng nhóm, chọn đề tài mới rồi xác thực OTP và gửi lại.'
  }[r.status];
  html += '<div style="padding:12px 14px;border-radius:8px;background:#eff6ff;border-left:3px solid #2563eb;color:#1e3a8a;font-size:13px">' + next + '</div>';
  html += r.status === 'approved'
    ? emailButton(SITE_URL + 'project-lab.html', 'Xem yêu cầu đồ án (Project Lab)')
    : emailButton(REG_FORM_URL, r.status === 'revise' ? 'Cập nhật đăng ký đề tài' : 'Đăng ký lại đề tài', theme.color);

  var subject = '[IS355] Kết quả xét duyệt đề tài - Nhóm ' + g.groupName + ': ' + REVIEW_STATUSES[r.status];
  var text = 'Nhóm ' + g.groupName + ' (' + g.groupCode + ') - ' + REVIEW_STATUSES[r.status] + '.\n' +
    (r.comment ? '\nNhận xét: ' + r.comment + '\n' : '') +
    (r.items.length ? '\nCần làm rõ:\n' + r.items.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') + '\n' : '') +
    (r.status === 'revise' && r.deadline ? '\nHạn cập nhật: ' + formatVnDate(r.deadline) + '\n' : '');
  return {
    subject: subject,
    html: emailShell(REVIEW_STATUSES[r.status] + ' - ' + g.title, 'Kết quả xét duyệt đề tài', html),
    text: text
  };
}

function buildReminderEmail(student, message, deadline, subject) {
  var html =
    '<p style="margin:0 0 14px">Chào <b>' + htmlEsc(student.fullName) + '</b> (MSSV ' + htmlEsc(student.studentId) + '),</p>' +
    (message
      ? '<div style="margin:0 0 18px;white-space:pre-line;font-size:14px;color:#0f172a">' + htmlEsc(message) + '</div>'
      : '<p style="margin:0 0 18px">Hệ thống ghi nhận bạn <b>chưa có tên trong nhóm đồ án nào</b> của học phần IS355 Công nghệ Blockchain.</p>') +
    (deadline
      ? '<div style="margin:0 0 20px;padding:14px 18px;border-radius:10px;background:#fffbeb;border:1px solid #fcd34d;color:#92400e;font-size:14px">' +
        'Hạn đăng ký đề tài: <b>' + htmlEsc(formatVnTime(deadline)) + '</b></div>'
      : '') +
    sectionTitle('CÁCH ĐĂNG KÝ') +
    '<ol style="margin:0 0 6px;padding-left:22px;font-size:14px;line-height:1.8">' +
    '<li>Lập nhóm tối đa 6 thành viên. Nhóm có thể ghép sinh viên của cả 2 lớp IS355.R11.CTTT.1 và .2.</li>' +
    '<li>Xem <a href="' + SITE_URL + 'danh-sach-de-tai.html" style="color:#2563eb">danh sách đề tài đã đăng ký</a> để tránh chọn trùng hướng.</li>' +
    '<li>Một thành viên điền form đăng ký (chỉ cần nhập MSSV), xác thực OTP qua email trường và gửi.</li>' +
    '</ol>' +
    emailButton(REG_FORM_URL, 'Đăng ký đề tài ngay') +
    '<p style="margin:18px 0 0;color:#64748b;font-size:12.5px">Nếu bạn đã thống nhất nhóm với các bạn khác nhưng nhóm chưa gửi form, hãy nhắc trưởng nhóm đăng ký sớm. Nếu có khó khăn khi tìm nhóm, hãy liên hệ giảng viên.</p>';
  return {
    subject: subject,
    html: emailShell('Bạn chưa đăng ký nhóm đồ án IS355', 'Nhắc nhở đăng ký nhóm đồ án', html),
    text: 'Chào ' + student.fullName + ', bạn chưa đăng ký nhóm đồ án IS355. ' + (message ? message + ' ' : '') +
      (deadline ? 'Hạn đăng ký: ' + formatVnTime(deadline) + '. ' : '') + 'Đăng ký tại: ' + REG_FORM_URL
  };
}
