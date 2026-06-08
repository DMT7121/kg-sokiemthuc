/**
 * DataService.gs
 * Core logic for monthly quality log data generation, retrieval, and editing.
 */

var DataService = (function() {
  var SHEET_NAME = "03_DU_LIEU_KIEM_THUC";
  var HEADERS = [
    "ID", "Tháng", "Ngày", "Thứ", "TT", "Ca bữa ăn", "Tên món ăn", "Số suất", 
    "Thời gian chia món xong", "Thời gian bắt đầu ăn", "Dụng cụ bảo quản", 
    "Cảm quan đạt", "Cảm quan không đạt", "Ghi chú", "Nguyên liệu chính", 
    "Nhân viên chế biến", "Trang thiết bị", "Khu vực"
  ];

  var DAY_NAMES = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

  /**
   * Helper to get the number of days in a month.
   */
  function getDaysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Helper to shuffle an array.
   */
  function shuffleArray(array) {
    var arr = array.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  /**
   * Generates weight details for a list of ingredients.
   * Format: "Thịt bò (120g); Trứng muối (75g)"
   */
  function generateIngredientWeights(dishName, menuId, mappingsMap) {
    var mapping = mappingsMap[menuId];
    var ingredientsList = [];
    var min = 50;
    var max = 200;
    var unit = "gram";

    if (mapping) {
      if (mapping["Nguyên liệu chính"]) {
        ingredientsList = mapping["Nguyên liệu chính"].split(";").map(function(s) { return s.trim(); });
      }
      min = parseInt(mapping.Min, 10) || 50;
      max = parseInt(mapping.Max, 10) || 200;
      unit = mapping["Đơn vị random"] || "gram";
    } else {
      ingredientsList = IngredientService.suggestIngredientsForDish(dishName);
    }

    var resultList = ingredientsList.map(function(ing) {
      if (!ing) return "";
      var weight = Math.floor(Math.random() * (max - min + 1)) + min;
      var unitStr = unit === "gram" ? "g" : (" " + unit);
      return ing + " (" + weight + unitStr + ")";
    }).filter(Boolean);

    return resultList.join("; ");
  }

  /**
   * Generates the randomized monthly data.
   * @param {number} month - Month (1-12)
   * @param {number} year - Year (e.g. 2026)
   * @return {object} Result object with stats
   */
  function generateMonthlyData(month, year) {
    // 1. Get configs
    var configs = ConfigService.getConfigMap();
    var restaurantName = configs.RESTAURANT_NAME || "KING'S GRILL";
    var defaultSession = configs.DEFAULT_MEAL_SESSION || "Tối";
    var defaultFinish = configs.DEFAULT_FINISH_TIME || "17:00";
    var defaultStart = configs.DEFAULT_START_TIME || "18:00";
    var defaultResult = configs.DEFAULT_RESULT || "Đạt";
    var defaultStorage = configs.DEFAULT_KITCHEN_EQUIPMENT ? "Dụng cụ inox, đậy kín" : "Dụng cụ inox";
    var defaultEquipment = configs.DEFAULT_KITCHEN_EQUIPMENT || "Mũ bếp; găng tay";
    var defaultArea = configs.DEFAULT_KITCHEN_AREA || "Bếp chính";

    var wdayMinItems = parseInt(configs.WEEKDAY_MIN_ITEMS, 10) || 12;
    var wdayMaxItems = parseInt(configs.WEEKDAY_MAX_ITEMS, 10) || 15;
    var wendMinItems = parseInt(configs.WEEKEND_MIN_ITEMS, 10) || 14;
    var wendMaxItems = parseInt(configs.WEEKEND_MAX_ITEMS, 10) || 20;

    var wdayMinServing = parseInt(configs.WEEKDAY_MIN_SERVING, 10) || 10;
    var wdayMaxServing = parseInt(configs.WEEKDAY_MAX_SERVING, 10) || 24;
    var wendMinServing = parseInt(configs.WEEKEND_MIN_SERVING, 10) || 15;
    var wendMaxServing = parseInt(configs.WEEKEND_MAX_SERVING, 10) || 30;
    var lowProbMaxServing = parseInt(configs.LOW_PROBABILITY_MAX_SERVING, 10) || 30;

    // 2. Load menu items, kitchen staff, ingredients
    var menuItems = MenuService.getMenu().filter(function(item) {
      return item["Trạng thái"] === "Active" && !MenuService.isBanned(item["Tên món"]);
    });

    if (menuItems.length === 0) {
      throw new Error("Không có món ăn nào ở trạng thái Active trong Thực đơn. Hãy thêm món ăn trước.");
    }

    var staffList = KitchenStaffService.getKitchenStaff().filter(function(s) {
      return s["Trạng thái"] === "Active";
    });

    if (staffList.length === 0) {
      throw new Error("Không có nhân viên bếp nào ở trạng thái Active. Hãy thêm nhân viên trước.");
    }

    var ingredients = IngredientService.getIngredients();
    var mappingsMap = {};
    ingredients.forEach(function(ing) {
      mappingsMap[ing["Menu ID"]] = ing;
    });

    var monthStr = String(month).padStart(2, '0') + "/" + year;
    var numDays = getDaysInMonth(month, year);
    var newRows = [];

    // 3. Loop through each day
    for (var d = 1; d <= numDays; d++) {
      var dateObj = new Date(year, month - 1, d);
      var dayOfWeekVal = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
      var dayOfWeekName = DAY_NAMES[dayOfWeekVal];
      var dateStr = String(d).padStart(2, '0') + "/" + String(month).padStart(2, '0') + "/" + year;
      var dateIdStr = String(year) + String(month).padStart(2, '0') + String(d).padStart(2, '0');

      var isWeekend = (dayOfWeekVal === 0 || dayOfWeekVal === 5 || dayOfWeekVal === 6); // Friday, Saturday, Sunday
      
      var minItems = isWeekend ? wendMinItems : wdayMinItems;
      var maxItems = isWeekend ? wendMaxItems : wdayMaxItems;
      var numDishes = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;

      var minServing = isWeekend ? wendMinServing : wdayMinServing;
      var maxServing = isWeekend ? wendMaxServing : wdayMaxServing;

      // Shuffle menus for variety
      var shuffledDishes = shuffleArray(menuItems);
      
      // Select chefs and distribute
      var shuffledChefs = shuffleArray(staffList);
      var chefIndex = 0;

      for (var i = 0; i < numDishes; i++) {
        var dish = shuffledDishes[i % shuffledDishes.length];
        var tt = i + 1;
        var id = dateIdStr + "_" + String(tt).padStart(2, '0');
        
        // Calculate serving size
        var servings = 0;
        if (isWeekend) {
          // 10% chance of hitting the LOW_PROBABILITY_MAX_SERVING (default 30)
          var randVal = Math.random();
          if (randVal < 0.1) {
            servings = lowProbMaxServing;
          } else {
            // Pick between weekend min and weekend max - 1
            var highLimit = Math.max(minServing, maxServing - 1);
            servings = Math.floor(Math.random() * (highLimit - minServing + 1)) + minServing;
          }
        } else {
          servings = Math.floor(Math.random() * (maxServing - minServing + 1)) + minServing;
        }

        // Get chef
        var chef = shuffledChefs[chefIndex % shuffledChefs.length]["Tên nhân viên"];
        chefIndex++;

        // Generate ingredient text with randomized weights
        var ingText = generateIngredientWeights(dish["Tên món"], dish.ID, mappingsMap);

        var row = {
          "ID": id,
          "Tháng": monthStr,
          "Ngày": dateStr,
          "Thứ": dayOfWeekName,
          "TT": tt,
          "Ca bữa ăn": defaultSession,
          "Tên món ăn": dish["Tên món"],
          "Số suất": servings,
          "Thời gian chia món xong": defaultFinish,
          "Thời gian bắt đầu ăn": defaultStart,
          "Dụng cụ bảo quản": defaultStorage,
          "Cảm quan đạt": defaultResult === "Đạt" ? "✓" : "",
          "Cảm quan không đạt": defaultResult !== "Đạt" ? "✓" : "",
          "Ghi chú": "",
          "Nguyên liệu chính": ingText,
          "Nhân viên chế biến": chef,
          "Trang thiết bị": defaultEquipment,
          "Khu vực": defaultArea
        };

        newRows.push(row);
      }
    }

    // 4. Overwrite in sheet (Merge with other months)
    var allData = SheetService.getSheetDataAsObjects(SHEET_NAME);
    var filtered = allData.filter(function(row) {
      return row["Tháng"] !== monthStr;
    });

    var finalData = filtered.concat(newRows);
    
    // Sort finalData by date ID to keep sheet neat
    finalData.sort(function(a, b) {
      return a.ID.localeCompare(b.ID);
    });

    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, finalData);

    return {
      success: true,
      month: monthStr,
      totalDays: numDays,
      totalRows: newRows.length
    };
  }

  /**
   * Gets monthly data filtered by month and year.
   */
  function getMonthlyData(month, year) {
    var monthStr = String(month).padStart(2, '0') + "/" + year;
    var allData = SheetService.getSheetDataAsObjects(SHEET_NAME);
    var filtered = allData.filter(function(row) {
      return row["Tháng"] === monthStr;
    });
    
    // Sort by ID to ensure sequence
    filtered.sort(function(a, b) {
      return a.ID.localeCompare(b.ID);
    });

    return filtered;
  }

  /**
   * Saves monthly data rows.
   */
  function saveMonthlyData(month, year, rows) {
    var monthStr = String(month).padStart(2, '0') + "/" + year;
    var allData = SheetService.getSheetDataAsObjects(SHEET_NAME);
    
    // Remove current month's rows
    var filtered = allData.filter(function(row) {
      return row["Tháng"] !== monthStr;
    });

    // Merge & Sort
    var finalData = filtered.concat(rows);
    finalData.sort(function(a, b) {
      return a.ID.localeCompare(b.ID);
    });

    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, finalData);
  }

  /**
   * Regenerates data for a specific date.
   * @param {string} dateStr - DD/MM/YYYY
   */
  function regenerateDayData(dateStr) {
    if (!dateStr) return;
    
    var parts = dateStr.split("/");
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var year = parseInt(parts[2], 10);
    
    var monthStr = String(month).padStart(2, '0') + "/" + year;
    var dateIdPrefix = String(year) + String(month).padStart(2, '0') + String(day).padStart(2, '0');

    // Load configs
    var configs = ConfigService.getConfigMap();
    var defaultSession = configs.DEFAULT_MEAL_SESSION || "Tối";
    var defaultFinish = configs.DEFAULT_FINISH_TIME || "17:00";
    var defaultStart = configs.DEFAULT_START_TIME || "18:00";
    var defaultResult = configs.DEFAULT_RESULT || "Đạt";
    var defaultStorage = configs.DEFAULT_KITCHEN_EQUIPMENT ? "Dụng cụ inox, đậy kín" : "Dụng cụ inox";
    var defaultEquipment = configs.DEFAULT_KITCHEN_EQUIPMENT || "Mũ bếp; găng tay";
    var defaultArea = configs.DEFAULT_KITCHEN_AREA || "Bếp chính";

    var wdayMinItems = parseInt(configs.WEEKDAY_MIN_ITEMS, 10) || 12;
    var wdayMaxItems = parseInt(configs.WEEKDAY_MAX_ITEMS, 10) || 15;
    var wendMinItems = parseInt(configs.WEEKEND_MIN_ITEMS, 10) || 14;
    var wendMaxItems = parseInt(configs.WEEKEND_MAX_ITEMS, 10) || 20;

    var wdayMinServing = parseInt(configs.WEEKDAY_MIN_SERVING, 10) || 10;
    var wdayMaxServing = parseInt(configs.WEEKDAY_MAX_SERVING, 10) || 24;
    var wendMinServing = parseInt(configs.WEEKEND_MIN_SERVING, 10) || 15;
    var wendMaxServing = parseInt(configs.WEEKEND_MAX_SERVING, 10) || 30;
    var lowProbMaxServing = parseInt(configs.LOW_PROBABILITY_MAX_SERVING, 10) || 30;

    var menuItems = MenuService.getMenu().filter(function(item) {
      return item["Trạng thái"] === "Active" && !MenuService.isBanned(item["Tên món"]);
    });
    
    var staffList = KitchenStaffService.getKitchenStaff().filter(function(s) {
      return s["Trạng thái"] === "Active";
    });

    var ingredients = IngredientService.getIngredients();
    var mappingsMap = {};
    ingredients.forEach(function(ing) {
      mappingsMap[ing["Menu ID"]] = ing;
    });

    var dateObj = new Date(year, month - 1, day);
    var dayOfWeekVal = dateObj.getDay();
    var dayOfWeekName = DAY_NAMES[dayOfWeekVal];
    var isWeekend = (dayOfWeekVal === 0 || dayOfWeekVal === 5 || dayOfWeekVal === 6);

    var minItems = isWeekend ? wendMinItems : wdayMinItems;
    var maxItems = isWeekend ? wendMaxItems : wdayMaxItems;
    var numDishes = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;

    var minServing = isWeekend ? wendMinServing : wdayMinServing;
    var maxServing = isWeekend ? wendMaxServing : wdayMaxServing;

    var shuffledDishes = shuffleArray(menuItems);
    var shuffledChefs = shuffleArray(staffList);
    var chefIndex = 0;

    var dayRows = [];
    for (var i = 0; i < numDishes; i++) {
      var dish = shuffledDishes[i % shuffledDishes.length];
      var tt = i + 1;
      var id = dateIdPrefix + "_" + String(tt).padStart(2, '0');
      
      var servings = 0;
      if (isWeekend) {
        if (Math.random() < 0.1) {
          servings = lowProbMaxServing;
        } else {
          var highLimit = Math.max(minServing, maxServing - 1);
          servings = Math.floor(Math.random() * (highLimit - minServing + 1)) + minServing;
        }
      } else {
        servings = Math.floor(Math.random() * (maxServing - minServing + 1)) + minServing;
      }

      var chef = shuffledChefs[chefIndex % shuffledChefs.length]["Tên nhân viên"];
      chefIndex++;

      var ingText = generateIngredientWeights(dish["Tên món"], dish.ID, mappingsMap);

      dayRows.push({
        "ID": id,
        "Tháng": monthStr,
        "Ngày": dateStr,
        "Thứ": dayOfWeekName,
        "TT": tt,
        "Ca bữa ăn": defaultSession,
        "Tên món ăn": dish["Tên món"],
        "Số suất": servings,
        "Thời gian chia món xong": defaultFinish,
        "Thời gian bắt đầu ăn": defaultStart,
        "Dụng cụ bảo quản": defaultStorage,
        "Cảm quan đạt": defaultResult === "Đạt" ? "✓" : "",
        "Cảm quan không đạt": defaultResult !== "Đạt" ? "✓" : "",
        "Ghi chú": "",
        "Nguyên liệu chính": ingText,
        "Nhân viên chế biến": chef,
        "Trang thiết bị": defaultEquipment,
        "Khu vực": defaultArea
      });
    }

    // Load all monthly data, filter out this date, add new dayRows, and save
    var allData = SheetService.getSheetDataAsObjects(SHEET_NAME);
    var filtered = allData.filter(function(row) {
      return row["Ngày"] !== dateStr;
    });

    var finalData = filtered.concat(dayRows);
    finalData.sort(function(a, b) {
      return a.ID.localeCompare(b.ID);
    });

    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, finalData);
    return dayRows;
  }

  /**
   * Deletes monthly data for a given month and year.
   */
  function deleteMonthlyData(month, year) {
    var monthStr = String(month).padStart(2, '0') + "/" + year;
    var allData = SheetService.getSheetDataAsObjects(SHEET_NAME);
    var filtered = allData.filter(function(row) {
      return row["Tháng"] !== monthStr;
    });

    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, filtered);
  }

  return {
    generateMonthlyData: generateMonthlyData,
    getMonthlyData: getMonthlyData,
    saveMonthlyData: saveMonthlyData,
    regenerateDayData: regenerateDayData,
    deleteMonthlyData: deleteMonthlyData
  };
})();
