/**
 * IngredientService.gs
 * Manages item ingredients and suggestions.
 */

var IngredientService = (function() {
  var SHEET_NAME = "07_DANH_SACH_NGUYEN_LIEU";
  var HEADERS = ["Menu ID", "Tên món", "Nguyên liệu chính", "Đơn vị random", "Min", "Max", "Ghi chú"];

  var DEFAULT_INGREDIENTS = [
    { "Menu ID": "M001", "Tên món": "Bò nướng sốt trứng muối", "Nguyên liệu chính": "Thịt bò; Trứng muối; Sốt chế biến; Gia vị nướng", "Đơn vị random": "gram", "Min": 50, "Max": 200, "Ghi chú": "" },
    { "Menu ID": "M002", "Tên món": "Cơm chiên cá mặn chà bông ớt hiểm", "Nguyên liệu chính": "Gạo; Cá mặn; Chà bông; Ớt hiểm; Sốt chế biến", "Đơn vị random": "gram", "Min": 50, "Max": 200, "Ghi chú": "" },
    { "Menu ID": "M003", "Tên món": "Sò điệp măng tây sốt XO", "Nguyên liệu chính": "Sò điệp; Măng tây; Sốt XO; Gia vị chế biến", "Đơn vị random": "gram", "Min": 50, "Max": 200, "Ghi chú": "" },
    { "Menu ID": "M004", "Tên món": "Salad cá hồi sốt chanh dây", "Nguyên liệu chính": "Cá hồi; Chanh dây; Xà lách; Sốt salad; Gia vị chế biến", "Đơn vị random": "gram", "Min": 30, "Max": 150, "Ghi chú": "" },
    { "Menu ID": "M005", "Tên món": "Gà nướng mật ong rừng", "Nguyên liệu chính": "Thịt gà; Mật ong; Tỏi; Sốt nướng; Gia vị nướng", "Đơn vị random": "gram", "Min": 50, "Max": 200, "Ghi chú": "" },
    { "Menu ID": "M006", "Tên món": "Mì xào hải sản sốt X.O", "Nguyên liệu chính": "Mì sợi; Mực; Tôm (đã bóc vỏ); Sốt XO; Gia vị chế biến", "Đơn vị random": "gram", "Min": 50, "Max": 200, "Ghi chú": "" },
    { "Menu ID": "M007", "Tên món": "Sườn nướng tảng sốt BBQ", "Nguyên liệu chính": "Sườn heo; Sốt BBQ; Gia vị nướng; Sốt ướp", "Đơn vị random": "gram", "Min": 100, "Max": 300, "Ghi chú": "" },
    { "Menu ID": "M008", "Tên món": "Lẩu nấm gà đông trùng", "Nguyên liệu chính": "Thịt gà; Nấm các loại; Đông trùng hạ thảo; Nước dùng lẩu; Rau ăn lẩu", "Đơn vị random": "gram", "Min": 50, "Max": 250, "Ghi chú": "" },
    { "Menu ID": "M009", "Tên món": "Cá hồi áp chảo sốt bơ tỏi", "Nguyên liệu chính": "Cá hồi; Bơ lạt; Tỏi; Sốt áp chảo; Gia vị chế biến", "Đơn vị random": "gram", "Min": 50, "Max": 180, "Ghi chú": "" },
    { "Menu ID": "M010", "Tên món": "Bò áp chảo sốt tiêu đen", "Nguyên liệu chính": "Thịt bò; Tiêu đen; Sốt tiêu; Gia vị chế biến", "Đơn vị random": "gram", "Min": 50, "Max": 200, "Ghi chú": "" }
  ];

  /**
   * Auto suggests ingredients based on dish name keywords.
   * @param {string} dishName - Name of the dish
   * @return {string[]} Array of suggested ingredients
   */
  function suggestIngredientsForDish(dishName) {
    if (!dishName) return ["Nguyên liệu chính", "Gia vị chế biến"];
    var name = dishName.trim();
    var nameLower = name.toLowerCase();
    
    var ingredients = [];

    // 1. Detect base proteins / main ingredients
    if (nameLower.indexOf("bò") !== -1) ingredients.push("Thịt bò");
    else if (nameLower.indexOf("gà") !== -1) ingredients.push("Thịt gà");
    else if (nameLower.indexOf("sườn") !== -1) ingredients.push("Sườn heo");
    else if (nameLower.indexOf("heo") !== -1 || nameLower.indexOf("lợn") !== -1) ingredients.push("Thịt heo");
    
    if (nameLower.indexOf("cá hồi") !== -1) ingredients.push("Cá hồi");
    else if (nameLower.indexOf("cá mặn") !== -1) ingredients.push("Cá mặn");
    else if (nameLower.indexOf("cá") !== -1 && ingredients.indexOf("Cá hồi") === -1 && ingredients.indexOf("Cá mặn") === -1) ingredients.push("Thịt cá");
    
    if (nameLower.indexOf("sò điệp") !== -1) ingredients.push("Sò điệp");
    if (nameLower.indexOf("tôm") !== -1) ingredients.push("Thịt tôm");
    if (nameLower.indexOf("mực") !== -1) ingredients.push("Mực tươi");
    if (nameLower.indexOf("hải sản") !== -1) {
      if (ingredients.indexOf("Thịt tôm") === -1) ingredients.push("Tôm (bóc vỏ)");
      if (ingredients.indexOf("Mực tươi") === -1) ingredients.push("Mực tươi");
    }

    if (nameLower.indexOf("nấm") !== -1) ingredients.push("Nấm tươi");
    if (nameLower.indexOf("gạo") !== -1 || nameLower.indexOf("cơm") !== -1) ingredients.push("Gạo");
    if (nameLower.indexOf("mì") !== -1) ingredients.push("Mì sợi");
    if (nameLower.indexOf("chà bông") !== -1) ingredients.push("Chà bông");
    if (nameLower.indexOf("ớt hiểm") !== -1) ingredients.push("Ớt hiểm");
    if (nameLower.indexOf("măng tây") !== -1) ingredients.push("Măng tây");
    if (nameLower.indexOf("trứng muối") !== -1) ingredients.push("Trứng muối");
    if (nameLower.indexOf("phô mai") !== -1) ingredients.push("Phô mai");
    if (nameLower.indexOf("mật ong") !== -1) ingredients.push("Mật ong");
    if (nameLower.indexOf("salad") !== -1 || nameLower.indexOf("xà lách") !== -1) {
      ingredients.push("Xà lách");
      ingredients.push("Sốt salad");
    }

    // 2. Detect cooking style & sauces
    if (nameLower.indexOf("nướng") !== -1) {
      ingredients.push("Sốt chế biến");
      ingredients.push("Gia vị nướng");
    } else if (nameLower.indexOf("áp chảo") !== -1) {
      if (nameLower.indexOf("măng tây") !== -1 && nameLower.indexOf("sò điệp") !== -1) {
        ingredients.push("Sốt xào");
        ingredients.push("Gia vị chế biến");
      } else {
        ingredients.push("Sốt áp chảo");
        ingredients.push("Gia vị chế biến");
      }
    } else if (nameLower.indexOf("xào") !== -1) {
      ingredients.push("Sốt xào");
      ingredients.push("Gia vị chế biến");
    } else if (nameLower.indexOf("chiên") !== -1) {
      ingredients.push("Sốt chế biến");
    } else if (nameLower.indexOf("hấp") !== -1) {
      ingredients.push("Sốt hấp");
      ingredients.push("Gia vị chế biến");
    } else if (nameLower.indexOf("lẩu") !== -1) {
      ingredients.push("Nước lẩu");
      ingredients.push("Gia vị chế biến");
    } else if (nameLower.indexOf("om") !== -1) {
      ingredients.push("Sốt om");
      ingredients.push("Gia vị chế biến");
    } else if (nameLower.indexOf("sashimi") !== -1) {
      ingredients.push("Nước tương");
      ingredients.push("Wasabi");
    }

    // Specially handle XO, Trứng Muối, Tiêu Đen, Bơ tỏi
    if (nameLower.indexOf("xo") !== -1) {
      // replace "Sốt xào" or similar with "Sốt XO" if present, else add
      var idx = ingredients.indexOf("Sốt xào");
      if (idx !== -1) ingredients[idx] = "Sốt XO";
      else if (ingredients.indexOf("Sốt XO") === -1) ingredients.push("Sốt XO");
    }
    
    if (nameLower.indexOf("trứng muối") !== -1 && ingredients.indexOf("Trứng muối") === -1) {
      ingredients.push("Trứng muối");
    }

    if (nameLower.indexOf("tiêu đen") !== -1) {
      ingredients.push("Tiêu đen");
      ingredients.push("Sốt tiêu");
    }

    if (nameLower.indexOf("bơ tỏi") !== -1) {
      ingredients.push("Bơ lạt");
      ingredients.push("Tỏi");
    }

    // Default fallbacks if empty
    if (ingredients.length === 0) {
      ingredients.push("Nguyên liệu chính");
      ingredients.push("Gia vị chế biến");
    } else {
      // Ensure "Gia vị chế biến" or "Sốt chế biến" exists
      var hasSauce = ingredients.some(function(item) {
        return item.toLowerCase().indexOf("sốt") !== -1 || item.toLowerCase().indexOf("gia vị") !== -1;
      });
      if (!hasSauce) {
        ingredients.push("Gia vị chế biến");
      }
    }

    // Unique filter and limit to 5
    var unique = [];
    ingredients.forEach(function(item) {
      if (unique.indexOf(item) === -1) {
        unique.push(item);
      }
    });

    return unique.slice(0, 5);
  }

  /**
   * Initializes default ingredients mapping.
   */
  function initDefaults() {
    var sheet = SheetService.getOrCreateSheet(SHEET_NAME, HEADERS);
    var data = SheetService.getSheetDataAsObjects(SHEET_NAME);
    if (data.length === 0) {
      SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, DEFAULT_INGREDIENTS);
    }
  }

  /**
   * Gets all ingredient mappings.
   */
  function getIngredients() {
    initDefaults();
    return SheetService.getSheetDataAsObjects(SHEET_NAME);
  }

  /**
   * Saves new ingredients mappings.
   */
  function saveIngredients(mappings) {
    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, mappings);
  }

  /**
   * Suggests and applies ingredients for all dishes that do not have config yet.
   */
  function applySuggestionsToAll() {
    var menu = MenuService.getMenu();
    var currentMappings = getIngredients();
    
    var mappingMap = {};
    currentMappings.forEach(function(m) {
      mappingMap[m["Menu ID"]] = m;
    });

    var toAdd = [];
    menu.forEach(function(dish) {
      if (!mappingMap[dish.ID]) {
        var suggested = suggestIngredientsForDish(dish["Tên món"]);
        toAdd.push({
          "Menu ID": dish.ID,
          "Tên món": dish["Tên món"],
          "Nguyên liệu chính": suggested.join("; "),
          "Đơn vị random": "gram",
          "Min": 50,
          "Max": 200,
          "Ghi chú": "Auto suggested"
        });
      }
    });

    if (toAdd.length > 0) {
      var updated = currentMappings.concat(toAdd);
      saveIngredients(updated);
    }
  }

  return {
    getIngredients: getIngredients,
    saveIngredients: saveIngredients,
    suggestIngredientsForDish: suggestIngredientsForDish,
    applySuggestionsToAll: applySuggestionsToAll,
    initDefaults: initDefaults
  };
})();
