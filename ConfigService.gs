/**
 * ConfigService.gs
 * Manages configuration keys and values in the CONFIG sheet.
 */

var ConfigService = (function() {
  var SHEET_NAME = "01_CAU_HINH";
  var HEADERS = ["Key", "Value", "Ghi chú"];

  var DEFAULT_CONFIGS = [
    { Key: "RESTAURANT_NAME", Value: "KING'S GRILL", "Ghi chú": "Tên nhà hàng" },
    { Key: "DEFAULT_MEAL_SESSION", Value: "Tối", "Ghi chú": "Bữa ăn mặc định" },
    { Key: "DEFAULT_FINISH_TIME", Value: "17:00", "Ghi chú": "Thời gian chia món ăn xong" },
    { Key: "DEFAULT_START_TIME", Value: "18:00", "Ghi chú": "Thời gian bắt đầu ăn" },
    { Key: "DEFAULT_RESULT", Value: "Đạt", "Ghi chú": "Kết quả cảm quan mặc định" },
    { Key: "DEFAULT_KITCHEN_EQUIPMENT", Value: "Mũ bếp; găng tay", "Ghi chú": "Trang thiết bị bảo hộ" },
    { Key: "DEFAULT_KITCHEN_AREA", Value: "Bếp chính", "Ghi chú": "Khu vực chế biến mặc định" },
    { Key: "OUTPUT_FOLDER_ID", Value: "", "Ghi chú": "Google Drive Folder ID để lưu PDF" },
    { Key: "WEEKDAY_MIN_ITEMS", Value: "12", "Ghi chú": "Số lượng món tối thiểu ngày thường (T2-T5)" },
    { Key: "WEEKDAY_MAX_ITEMS", Value: "15", "Ghi chú": "Số lượng món tối đa ngày thường (T2-T5)" },
    { Key: "WEEKEND_MIN_ITEMS", Value: "14", "Ghi chú": "Số lượng món tối thiểu cuối tuần (T6-CN)" },
    { Key: "WEEKEND_MAX_ITEMS", Value: "20", "Ghi chú": "Số lượng món tối đa cuối tuần (T6-CN)" },
    { Key: "WEEKDAY_MIN_SERVING", Value: "10", "Ghi chú": "Số suất ăn tối thiểu ngày thường" },
    { Key: "WEEKDAY_MAX_SERVING", Value: "24", "Ghi chú": "Số suất ăn tối đa ngày thường" },
    { Key: "WEEKEND_MIN_SERVING", Value: "15", "Ghi chú": "Số suất ăn tối thiểu cuối tuần" },
    { Key: "WEEKEND_MAX_SERVING", Value: "30", "Ghi chú": "Số suất ăn tối đa cuối tuần" },
    { Key: "LOW_PROBABILITY_MAX_SERVING", Value: "30", "Ghi chú": "Xác suất xuất hiện tối đa suất ăn (xác suất thấp)" }
  ];

  /**
   * Initializes default configurations if they don't exist.
   */
  function initDefaults() {
    var sheet = SheetService.getOrCreateSheet(SHEET_NAME, HEADERS);
    var existing = getConfigMap();
    var toAppend = [];
    
    DEFAULT_CONFIGS.forEach(function(item) {
      if (!existing.hasOwnProperty(item.Key)) {
        toAppend.push(item);
      }
    });

    if (toAppend.length > 0) {
      toAppend.forEach(function(item) {
        SheetService.appendRowFromObject(SHEET_NAME, HEADERS, item);
      });
    }
  }

  /**
   * Gets all configurations as a key-value object map.
   * @return {object} Config map e.g. { RESTAURANT_NAME: "KING'S GRILL", ... }
   */
  function getConfigMap() {
    var data = SheetService.getSheetDataAsObjects(SHEET_NAME);
    var map = {};
    data.forEach(function(row) {
      if (row.Key) {
        map[row.Key] = row.Value;
      }
    });
    // Add defaults in memory if missing
    DEFAULT_CONFIGS.forEach(function(item) {
      if (!map.hasOwnProperty(item.Key)) {
        map[item.Key] = item.Value;
      }
    });
    return map;
  }

  /**
   * Saves a configuration object back to the CONFIG sheet.
   * @param {object} newConfigs - Config map
   */
  function saveConfigs(newConfigs) {
    var sheet = SheetService.getOrCreateSheet(SHEET_NAME, HEADERS);
    var currentData = SheetService.getSheetDataAsObjects(SHEET_NAME);
    
    var dataMap = {};
    currentData.forEach(function(row) {
      dataMap[row.Key] = row;
    });

    // Update values
    for (var key in newConfigs) {
      if (newConfigs.hasOwnProperty(key)) {
        if (dataMap[key]) {
          dataMap[key].Value = newConfigs[key];
        } else {
          dataMap[key] = { Key: key, Value: newConfigs[key], "Ghi chú": "" };
        }
      }
    }

    var objectsToWrite = Object.keys(dataMap).map(function(k) {
      return dataMap[k];
    });

    SheetService.setSheetDataFromObjects(SHEET_NAME, HEADERS, objectsToWrite);
  }

  return {
    initDefaults: initDefaults,
    getConfigMap: getConfigMap,
    saveConfigs: saveConfigs
  };
})();
