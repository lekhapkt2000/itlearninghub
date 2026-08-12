/**
 * IT Learning Hub - tao cau truc thu muc Google Drive tu dong.
 *
 * Cach dung:
 * 1. Extensions > Apps Script (dung chung project voi access-control.gs,
 *    hoac mot standalone script rieng - deu duoc, vi day la ham chay tay).
 * 2. Dan file nay vao lam mot file .gs moi trong project.
 * 3. Chon ham createFolderStructure() tu dropdown, bam Run.
 * 4. Lan dau se hoi quyen truy cap Google Drive - bam Allow.
 * 5. Kiem tra Execution log (Ctrl+Enter) de xem danh sach thu muc da tao.
 *
 * An toan chay lai nhieu lan: neu thu muc da ton tai (trung ten, cung
 * thu muc cha) thi khong tao trung, chi tai su dung.
 */

var ROOT_FOLDER_ID = '1eT1pgx_p4YE5KhxsGiM_uV-5EyTiQxMi';

// Ma mon -> so tuan da co noi dung tren site (server/courses/<ma-mon>/week-N.html).
// Mon nao chua co week-N.html thi de mang rong - se chi tao thu muc mon, khong tao Tuan con.
var COURSES = {
  IT004: 6,
  IS355: 6,
  IS201: 0,
  IS208: 0,
  IS210: 0,
  IS336: 0
};

function createFolderStructure() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);

  var backendFolder = getOrCreateFolder(root, 'Apps Script Backend');
  Logger.log('OK: ' + backendFolder.getName());

  for (var code in COURSES) {
    var courseFolder = getOrCreateFolder(root, code);
    Logger.log('OK: ' + code);

    var weekCount = COURSES[code];
    for (var w = 1; w <= weekCount; w++) {
      var weekFolder = getOrCreateFolder(courseFolder, 'Tuan ' + w);
      Logger.log('OK: ' + code + ' / ' + weekFolder.getName());
    }

    if (code === 'IS355') {
      getOrCreateFolder(courseFolder, 'Project Lab');
      Logger.log('OK: ' + code + ' / Project Lab');
    }
  }

  Logger.log('Hoan tat.');
}

function getOrCreateFolder(parent, name) {
  var existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}
