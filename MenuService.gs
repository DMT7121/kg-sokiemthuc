/**
 * MenuService.gs
 * Handles menu item CRUD operations and filtering logic.
 */

var MenuService = (function() {
  var SHEET_NAME = "02_DANH_SACH_THUC_DON";
  var HEADERS = ["ID", "Tên món", "Nhóm món", "Trạng thái", "Ghi chú"];
  
  var BANNED_KEYWORDS = ["tôm hùm", "cá bống mú", "cua", "ghẹ"];

  var DEFAULT_MENU = [
    { ID: "M001", "Tên món": "Bò nướng sốt trứng muối", "Nhóm món": "Món nướng", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M002", "Tên món": "Cơm chiên cá mặn chà bông ớt hiểm", "Nhóm món": "Cơm/Mì", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M003", "Tên món": "Sò điệp măng tây sốt XO", "Nhóm món": "Hải sản", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M004", "Tên món": "Salad cá hồi sốt chanh dây", "Nhóm món": "Salad", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M005", "Tên món": "Gà nướng mật ong rừng", "Nhóm món": "Món nướng", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M006", "Tên món": "Mì xào hải sản sốt X.O", "Nhóm món": "Mì/Spaghetti", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M007", "Tên món": "Sườn nướng tảng sốt BBQ", "Nhóm món": "Món nướng", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M008", "Tên món": "Lẩu nấm gà đông trùng", "Nhóm món": "Lẩu", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M009", "Tên món": "Cá hồi áp chảo sốt bơ tỏi", "Nhóm món": "Hải sản", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M010", "Tên món": "Bò áp chảo sốt tiêu đen", "Nhóm món": "Món xào/Áp chảo", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M011", "Tên món": "Salad ức gà sốt mè rang", "Nhóm món": "Salad", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M012", "Tên món": "Cơm chiên hải sản hoàng kim", "Nhóm món": "Cơm/Mì", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M013", "Tên món": "Mì Ý sốt bò bằm nấm", "Nhóm món": "Mì/Spaghetti", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M014", "Tên món": "Nấm đùi gà xào tỏi", "Nhóm món": "Rau/Nấm", "Trạng thái": "Active", "Ghi chú": "" },
    { ID: "M015", "Tên món": "Rau củ luộc kho quẹt", "Nhóm món": "Rau/Nấm", "Trạng thái": "Active", "Ghi chú": "" }
  ];

  /**
   * Checks if a dish contains banned keywords.
   * @param {string} dishName - Name of the dish
   * @return {boolean} True if banned
   */
  function isBanned(dishName) {
    if (!dishName) return false;
    var nameLower = dishName.toLowerCase();
    return BANNED_KEYWORDS.some(function(keyword) {
      return nameLower.indexOf(keyword) !== -1;
    });
  }

  /**
   * Initializes default menu items if the sheet is empty.
   */
  function initDefaults() {
    var sheet = SheetService.getOrCreateSheet(SHEET_NAME, HEADERS);
    var data = SheetService.getSheetDataAsObjects(SHEET_NAME);
    if (data.length === 0) {
      SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, DEFAULT_MENU);
    }
  }

  /**
   * Gets all active or all menu items.
   * @return {object[]} Menu items
   */
  function getMenu() {
    initDefaults();
    return SheetService.getSheetDataAsObjects(SHEET_NAME);
  }

  /**
   * Saves or updates the menu items.
   * Filters out banned items automatically.
   * @param {object[]} menuItems - Array of menu items
   */
  function saveMenu(menuItems) {
    var validItems = menuItems.filter(function(item) {
      return !isBanned(item["Tên món"]);
    });

    // Generate IDs if missing
    var maxId = 0;
    var rawMenu = SheetService.getSheetDataAsObjects(SHEET_NAME);
    rawMenu.forEach(function(item) {
      if (item.ID && item.ID.indexOf("M") === 0) {
        var num = parseInt(item.ID.substring(1), 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    });

    validItems.forEach(function(item) {
      if (!item.ID) {
        maxId++;
        item.ID = "M" + String(maxId).padStart(3, '0');
      }
    });

    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, validItems);
  }

  /**
   * Imports multiple menu items from a raw text input.
   * Each line represents a dish. Format: "Dish name, Group (optional)"
   * @param {string} menuText - Bulk input string
   */
  function importMenu(menuText) {
    if (!menuText) return;
    var lines = menuText.split("\n");
    var currentMenu = getMenu();
    var existingNames = currentMenu.map(function(item) {
      return item["Tên món"].toLowerCase().trim();
    });

    var maxId = 0;
    currentMenu.forEach(function(item) {
      if (item.ID && item.ID.indexOf("M") === 0) {
        var num = parseInt(item.ID.substring(1), 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    });

    var toAdd = [];
    lines.forEach(function(line) {
      line = line.trim();
      if (!line) return;

      var parts = line.split(/[,\t]/);
      var name = parts[0].trim();
      var group = parts[1] ? parts[1].trim() : "Khác";

      if (name && !isBanned(name) && existingNames.indexOf(name.toLowerCase()) === -1) {
        maxId++;
        toAdd.push({
          ID: "M" + String(maxId).padStart(3, '0'),
          "Tên món": name,
          "Nhóm món": group,
          "Trạng thái": "Active",
          "Ghi chú": ""
        });
        existingNames.push(name.toLowerCase());
      }
    });

    if (toAdd.length > 0) {
      var updatedMenu = currentMenu.concat(toAdd);
      SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, updatedMenu);
    }
  }

  return {
    getMenu: getMenu,
    saveMenu: saveMenu,
    importMenu: importMenu,
    isBanned: isBanned,
    initDefaults: initDefaults
  };
})();
