/**
 * Code.gs
 * Main entry point and API route dispatcher for King's Grill Quality Logs Web App.
 */

function doGet(e) {
  // Automatically initialize sheets and defaults on first load
  try {
    ConfigService.initDefaults();
    MenuService.initDefaults();
    IngredientService.initDefaults();
    KitchenStaffService.initDefaults();
  } catch(err) {
    Logger.log("Initialization error: " + err.toString());
  }

  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle("King's Grill - Sổ Kiểm Thực")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Embeds code from sub-html files directly into Index.html.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Standard utility wrapper for API endpoints to format response uniformly.
 */
function runApi(serviceFn, args) {
  try {
    var data = serviceFn.apply(null, args || []);
    return {
      success: true,
      data: data,
      message: "Thao tác thành công!"
    };
  } catch(e) {
    Logger.log("API Error: " + e.toString() + "\nStack: " + e.stack);
    return {
      success: false,
      error: e.message || "Đã xảy ra lỗi không xác định trên hệ thống.",
      details: e.toString()
    };
  }
}

// ==========================================
// PUBLIC BACKEND API ENDPOINTS
// ==========================================

function getAppInitData() {
  return runApi(function() {
    return {
      configs: ConfigService.getConfigMap(),
      menu: MenuService.getMenu(),
      staff: KitchenStaffService.getKitchenStaff(),
      ingredients: IngredientService.getIngredients(),
      pdfHistory: HistoryService.getPdfHistory()
    };
  });
}

function saveConfig(configMap) {
  return runApi(function() {
    ConfigService.saveConfigs(configMap);
    return ConfigService.getConfigMap();
  }, [configMap]);
}

function getMenu() {
  return runApi(MenuService.getMenu);
}

function saveMenu(menuItems) {
  return runApi(function() {
    MenuService.saveMenu(menuItems);
    return MenuService.getMenu();
  }, [menuItems]);
}

function importMenu(menuText) {
  return runApi(function() {
    MenuService.importMenu(menuText);
    return MenuService.getMenu();
  }, [menuText]);
}

function getIngredients() {
  return runApi(IngredientService.getIngredients);
}

function saveIngredients(mappings) {
  return runApi(function() {
    IngredientService.saveIngredients(mappings);
    return IngredientService.getIngredients();
  }, [mappings]);
}

function suggestIngredientsForDish(dishName) {
  return runApi(IngredientService.suggestIngredientsForDish, [dishName]);
}

function applySuggestionsToAllDishes() {
  return runApi(function() {
    IngredientService.applySuggestionsToAll();
    return IngredientService.getIngredients();
  });
}

function getKitchenStaff() {
  return runApi(KitchenStaffService.getKitchenStaff);
}

function saveKitchenStaff(staffList) {
  return runApi(function() {
    KitchenStaffService.saveKitchenStaff(staffList);
    return KitchenStaffService.getKitchenStaff();
  }, [staffList]);
}

function generateMonthlyData(month, year) {
  return runApi(function() {
    return DataService.generateMonthlyData(month, year);
  }, [month, year]);
}

function getMonthlyData(month, year) {
  return runApi(function() {
    return DataService.getMonthlyData(month, year);
  }, [month, year]);
}

function saveMonthlyData(month, year, rows) {
  return runApi(function() {
    DataService.saveMonthlyData(month, year, rows);
    return DataService.getMonthlyData(month, year);
  }, [month, year, rows]);
}

function regenerateDayData(dateStr) {
  return runApi(function() {
    return DataService.regenerateDayData(dateStr);
  }, [dateStr]);
}

function deleteMonthlyData(month, year) {
  return runApi(function() {
    DataService.deleteMonthlyData(month, year);
    return [];
  }, [month, year]);
}

function getPreviewData(month, year, bookType, dateStr) {
  return runApi(function() {
    return PdfService.getPreviewHtml(month, year, bookType, dateStr);
  }, [month, year, bookType, dateStr]);
}

function createBeforeEatPdf(month, year) {
  return runApi(function() {
    var monthStr = String(month).padStart(2, '0') + "/" + year;
    return PdfService.createPdf(monthStr, "before_eat");
  }, [month, year]);
}

function createProcessingPdf(month, year) {
  return runApi(function() {
    var monthStr = String(month).padStart(2, '0') + "/" + year;
    return PdfService.createPdf(monthStr, "processing");
  }, [month, year]);
}

function createBothPdfs(month, year) {
  return runApi(function() {
    var monthStr = String(month).padStart(2, '0') + "/" + year;
    var beforeEatUrl = PdfService.createPdf(monthStr, "before_eat");
    var processingUrl = PdfService.createPdf(monthStr, "processing");
    return {
      beforeEatUrl: beforeEatUrl,
      processingUrl: processingUrl
    };
  }, [month, year]);
}

function getPdfHistory() {
  return runApi(HistoryService.getPdfHistory);
}

/**
 * Handles incoming POST requests (API endpoints) when hosted on external platforms like Cloudflare Pages.
 */
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var methodName = requestData.method;
    var args = requestData.args || [];
    
    // Whitelist allowed API methods for security
    var allowedMethods = [
      "getAppInitData", "getMonthlyData", "saveMonthlyData", 
      "getPreviewData", "createBeforeEatPdf", "createProcessingPdf", 
      "createBothPdfs", "getPdfHistory", "saveConfig", "saveMenu", "importMenu", 
      "getIngredients", "saveIngredients", "getKitchenStaff", "saveStaff", 
      "regenerateDayData"
    ];

    if (allowedMethods.indexOf(methodName) === -1) {
      throw new Error("Method not allowed: " + methodName);
    }

    // Resolve the service function
    var func = this[methodName];
    if (typeof func !== "function") {
      throw new Error("Method not found: " + methodName);
    }

    // Execute using the function
    var result = func.apply(null, args);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errorResult = {
      success: false,
      error: err.message || err.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
