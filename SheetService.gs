/**
 * SheetService.gs
 * Core utility services for Google Sheets database interactions.
 */

var SheetService = (function() {
  /**
   * Gets the active spreadsheet.
   * If not bound, tries to find or create one (though webapps are usually bound to a sheet).
   */
  function getSpreadsheet() {
    try {
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch(e) {
      Logger.log("Error getting active spreadsheet: " + e.toString());
      throw new Error("Không thể truy cập Google Sheets. Hãy đảm bảo Script được liên kết với một Google Sheet.");
    }
  }

  /**
   * Gets a sheet by name or creates it with headers if it doesn't exist.
   * @param {string} name - The sheet name
   * @param {string[]} headers - The headers for the sheet
   * @return {Sheet} The Google Sheet object
   */
  function getOrCreateSheet(name, headers) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (headers && headers.length > 0) {
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#eaf3ff");
      }
    }
    return sheet;
  }

  /**
   * Reads a sheet and converts its content into an array of objects based on headers.
   * @param {string} name - The sheet name
   * @return {object[]} Array of objects
   */
  function getSheetDataAsObjects(name) {
    var sheet = getOrCreateSheet(name);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return [];

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    return data.map(function(row) {
      var obj = {};
      headers.forEach(function(header, idx) {
        if (header) {
          obj[header] = row[idx];
        }
      });
      return obj;
    });
  }

  /**
   * Overwrites a sheet's data with an array of objects.
   * @param {string} name - The sheet name
   * @param {string[]} headers - Header columns in desired order
   * @param {object[]} objects - Data rows as objects
   */
  function setSheetDataFromObjects(name, headers, objects) {
    var sheet = getOrCreateSheet(name, headers);
    
    // Clear existing data (keep headers)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    
    if (!objects || objects.length === 0) return;

    var values = objects.map(function(obj) {
      return headers.map(function(header) {
        return obj.hasOwnProperty(header) ? obj[header] : "";
      });
    });

    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  /**
   * Appends a single object as a row.
   * @param {string} name - The sheet name
   * @param {string[]} headers - Header columns
   * @param {object} obj - Object data to write
   */
  function appendRowFromObject(name, headers, obj) {
    var sheet = getOrCreateSheet(name, headers);
    var rowValues = headers.map(function(header) {
      return obj.hasOwnProperty(header) ? obj[header] : "";
    });
    sheet.appendRow(rowValues);
  }

  return {
    getSpreadsheet: getSpreadsheet,
    getOrCreateSheet: getOrCreateSheet,
    getSheetDataAsObjects: getSheetDataAsObjects,
    setSheetDataFromObjects: setSheetDataFromObjects,
    appendRowFromObject: appendRowFromObject
  };
})();
