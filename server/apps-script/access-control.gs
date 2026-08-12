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
 *    use the web form at admin/generate-code.html.
 * 9. For the web form to work, set an admin password: Project Settings
 *    (gear icon, left sidebar) > Script Properties > Add script property.
 *    Name: ADMIN_KEY. Value: any secret string you choose. This keeps the
 *    password out of the source file (and out of git). Whoever knows this
 *    value can mint codes from admin/generate-code.html, so treat it like
 *    a real password - don't post it publicly, rotate it (just change the
 *    Script Property, no redeploy needed) if it ever leaks.
 *
 * Gotcha this file avoids: SpreadsheetApp.getActiveSpreadsheet() returns
 * null when a Web App's doGet/doPost actually runs (no active UI in
 * that context), even for a container-bound script. Every function
 * below opens the sheet explicitly by ID instead.
 */

var SPREADSHEET_ID = '1yGco2Xf0SfFASmlxwFj2ZdoqtvDPCfvQsrypv04vsDM';

var CODES_SHEET = 'ACCESS_CODES';
var CODES_HEADERS = ['code', 'course', 'status', 'created_at', 'created_by', 'note'];
var LOG_SHEET = 'ACCESS_LOG';
var LOG_HEADERS = ['timestamp', 'course', 'resource', 'code_hash', 'name', 'class', 'result'];

function doGet(e) {
  var action = e.parameter.action;
  var result;
  if (action === 'validate') {
    result = handleValidate(e.parameter);
  } else if (action === 'generate') {
    result = handleGenerate(e.parameter);
  } else if (action === 'list') {
    result = handleList(e.parameter);
  } else if (action === 'revoke') {
    result = handleRevoke(e.parameter);
  } else {
    result = { ok: false, message: 'Unknown action' };
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

  var code = generateCode(course, String(params.note || ''));
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

  var codes = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    var row = rows[i];
    var createdAt = row[idxCreatedAt];
    codes.push({
      code: row[idxCode],
      course: row[idxCourse],
      status: row[idxStatus],
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
      note: row[idxNote]
    });
  }
  return { ok: true, codes: codes };
}

function handleRevoke(params) {
  var keyError = checkAdminKey(params);
  if (keyError) return { ok: false, message: keyError };

  var code = String(params.code || '').trim().toUpperCase();
  if (!code) return { ok: false, message: 'Thiếu mã cần thu hồi.' };

  var sheet = getSheet(CODES_SHEET);
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxCode = header.indexOf('code');
  var idxStatus = header.indexOf('status');

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idxCode]).trim().toUpperCase() === code) {
      sheet.getRange(i + 1, idxStatus + 1).setValue('Revoked');
      return { ok: true };
    }
  }
  return { ok: false, message: 'Không tìm thấy mã.' };
}

function handleValidate(params) {
  var code = String(params.code || '').trim().toUpperCase();
  var course = String(params.course || '').trim().toUpperCase();
  var resource = String(params.resource || '');

  if (!code || !course) {
    return { ok: false, message: 'Thiếu mã truy cập hoặc môn học.' };
  }

  var sheet = getSheet(CODES_SHEET);
  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var idxCode = header.indexOf('code');
  var idxCourse = header.indexOf('course');
  var idxStatus = header.indexOf('status');

  var ok = false;
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (String(row[idxCode]).trim().toUpperCase() === code) {
      ok = String(row[idxStatus]).trim().toLowerCase() === 'active' &&
           String(row[idxCourse]).trim().toUpperCase() === course;
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
  Logger.log('Setup complete.');
}

function ensureSheetWithHeaders(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getRange(1, 1, 1, headers.length).getValues()[0].join('|') !== headers.join('|')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/** Run manually from the editor to issue a new code. Reads back from the log. */
function generateCode(course, note) {
  var code = String(course).toUpperCase() + '-' + randomSegment() + '-' + randomSegment();
  getSheet(CODES_SHEET).appendRow([code, String(course).toUpperCase(), 'Active', new Date(), 'Admin', note || '']);
  Logger.log(code);
  return code;
}

/** Run manually once after setup to create a code for testing the pilot. */
function seedTestCode() {
  return generateCode('IT004', 'Pilot test code - Tuần 1');
}

function randomSegment() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, less error-prone to type
  var s = '';
  for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
