/**
 * KitchenStaffService.gs
 * Manages kitchen staff registry.
 */

var KitchenStaffService = (function() {
  var SHEET_NAME = "06_NHAN_VIEN_BEP";
  var HEADERS = ["ID", "Tên nhân viên", "Trạng thái"];

  var DEFAULT_STAFF = [
    { ID: "NV001", "Tên nhân viên": "Đào Minh Trí", "Trạng thái": "Active" },
    { ID: "NV002", "Tên nhân viên": "Nguyễn Hoàng Ân", "Trạng thái": "Active" },
    { ID: "NV003", "Tên nhân viên": "Phan Thanh An", "Trạng thái": "Active" },
    { ID: "NV004", "Tên nhân viên": "Lê Minh Sang", "Trạng thái": "Active" },
    { ID: "NV005", "Tên nhân viên": "Nguyễn Ngọc Tiến", "Trạng thái": "Active" },
    { ID: "NV006", "Tên nhân viên": "Cao Trí Cường", "Trạng thái": "Active" },
    { ID: "NV007", "Tên nhân viên": "Nông Văn Hào", "Trạng thái": "Active" },
    { ID: "NV008", "Tên nhân viên": "Nguyễn Lưu Kiều Vy", "Trạng thái": "Active" }
  ];

  /**
   * Initializes default kitchen staff if the sheet is empty.
   */
  function initDefaults() {
    var sheet = SheetService.getOrCreateSheet(SHEET_NAME, HEADERS);
    var data = SheetService.getSheetDataAsObjects(SHEET_NAME);
    if (data.length === 0) {
      SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, DEFAULT_STAFF);
    }
  }

  /**
   * Gets all kitchen staff.
   */
  function getKitchenStaff() {
    initDefaults();
    return SheetService.getSheetDataAsObjects(SHEET_NAME);
  }

  /**
   * Saves kitchen staff list.
   */
  function saveKitchenStaff(staffList) {
    // Generate IDs if missing
    var maxId = 0;
    var rawStaff = SheetService.getSheetDataAsObjects(SHEET_NAME);
    rawStaff.forEach(function(item) {
      if (item.ID && item.ID.indexOf("NV") === 0) {
        var num = parseInt(item.ID.substring(2), 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    });

    staffList.forEach(function(item) {
      if (!item.ID) {
        maxId++;
        item.ID = "NV" + String(maxId).padStart(3, '0');
      }
    });

    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, staffList);
  }

  return {
    getKitchenStaff: getKitchenStaff,
    saveKitchenStaff: saveKitchenStaff,
    initDefaults: initDefaults
  };
})();
