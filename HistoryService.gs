/**
 * HistoryService.gs
 * Logs and retrieves generated PDF records.
 */

var HistoryService = (function() {
  var SHEET_NAME = "05_LICH_SU_FILE_DOCS";
  var HEADERS = ["Thời gian tạo", "Tháng", "Loại sổ", "Tên file", "Link PDF", "Người tạo", "Ghi chú"];

  /**
   * Logs a generated PDF link.
   * @param {string} monthStr - e.g. "05/2026"
   * @param {string} bookType - "Trước khi ăn" or "Chế biến"
   * @param {string} filename - Name of the PDF file
   * @param {string} url - Google Drive file URL
   */
  function logPdf(monthStr, bookType, filename, url) {
    var email = "";
    try {
      email = Session.getActiveUser().getEmail() || "admin@kingsgrill.vn";
    } catch(e) {
      email = "admin@kingsgrill.vn";
    }

    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "dd/MM/yyyy HH:mm:ss");
    var row = {
      "Thời gian tạo": now,
      "Tháng": monthStr,
      "Loại sổ": bookType,
      "Tên file": filename,
      "Link PDF": url,
      "Người tạo": email,
      "Ghi chú": "Tạo tự động từ WebApp"
    };

    SheetService.appendRowFromObject(SHEET_NAME, HEADERS, row);
  }

  /**
   * Retrieves all logged PDFs.
   */
  function getPdfHistory() {
    SheetService.getOrCreateSheet(SHEET_NAME, HEADERS);
    var data = SheetService.getSheetDataAsObjects(SHEET_NAME);
    
    // Sort reverse chronological
    data.reverse();
    return data;
  }

  return {
    logPdf: logPdf,
    getPdfHistory: getPdfHistory
  };
})();
