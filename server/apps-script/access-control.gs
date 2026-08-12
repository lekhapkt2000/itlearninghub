/**
 * IT Learning Hub - Access Code backend (pilot: IT004 Tuần 1).
 *
 * Setup:
 * 1. Create a Google Sheet with two tabs:
 *
 *    ACCESS_CODES  columns (row 1 headers, exact names):
 *      code | course | status | created_at | created_by | note
 *
 *    ACCESS_LOG  columns (row 1 headers, exact names):
 *      timestamp | course | resource | code_hash | name | class | result
 *
 * 2. Extensions > Apps Script, paste this file as Code.gs.
 * 3. Run seedTestCode() once (Run button, pick the function) to create
 *    a test code - check the Execution log for the generated code.
 * 4. Deploy > New deployment > Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 *    Copy the /exec URL into assets/js/access-gate.js (APPS_SCRIPT_URL).
 * 5. To revoke a code later, just edit its `status` cell in ACCESS_CODES
 *    to "Revoked" - no code change needed.
 * 6. To issue a new code, run generateCode('IT004', 'note here') from
 *    the Apps Script editor and read the code from the Execution log.
 *
 * This intentionally has no web-based admin UI yet (out of scope for
 * the pilot) - code issuing/revoking happens directly in the Sheet or
 * via the Apps Script editor's Run button.
 */

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'validate') {
    return respond(handleValidate(e.parameter));
  }
  return respond({ ok: false, message: 'Unknown action' });
}

function handleValidate(params) {
  var code = String(params.code || '').trim().toUpperCase();
  var course = String(params.course || '').trim().toUpperCase();
  var resource = String(params.resource || '');

  if (!code || !course) {
    return { ok: false, message: 'Thiếu mã truy cập hoặc môn học.' };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACCESS_CODES');
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACCESS_LOG');
  sheet.appendRow([new Date(), course, resource, hashCode(code), name, className, result]);
}

function hashCode(code) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, code);
  return bytes.map(function (b) {
    return ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0');
  }).join('').slice(0, 12);
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run manually from the editor to issue a new code. Reads back from the log. */
function generateCode(course, note) {
  var code = String(course).toUpperCase() + '-' + randomSegment() + '-' + randomSegment();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACCESS_CODES');
  sheet.appendRow([code, String(course).toUpperCase(), 'Active', new Date(), 'Admin', note || '']);
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
