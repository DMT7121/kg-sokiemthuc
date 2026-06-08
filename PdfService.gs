/**
 * PdfService.gs
 * Generates quality log PDFs in A4 landscape using HTML templates.
 */

var PdfService = (function() {
  
  /**
   * Resolves the Google Drive folder for saving PDFs.
   */
  function getOutputFolder() {
    var configs = ConfigService.getConfigMap();
    var folderId = configs.OUTPUT_FOLDER_ID;
    var folder = null;
    
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch(e) {
        Logger.log("Configured folder ID not found: " + e.toString());
      }
    }
    
    if (!folder) {
      var root = DriveApp.getRootFolder();
      var folders = root.getFoldersByName("King's Grill - Sổ Kiểm Thực");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = root.createFolder("King's Grill - Sổ Kiểm Thực");
      }
      // Save ID back to config
      ConfigService.saveConfigs({ OUTPUT_FOLDER_ID: folder.getId() });
    }
    return folder;
  }

  /**
   * Helper to group flat month rows by date.
   */
  function groupRowsByDate(rows) {
    var grouped = {};
    rows.forEach(function(row) {
      var date = row["Ngày"];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(row);
    });
    // Sort keys chronologically
    var sortedDates = Object.keys(grouped).sort(function(a, b) {
      // a, b are in format DD/MM/YYYY
      var ap = a.split("/");
      var bp = b.split("/");
      var ad = new Date(ap[2], ap[1]-1, ap[0]);
      var bd = new Date(bp[2], bp[1]-1, bp[0]);
      return ad.getTime() - bd.getTime();
    });
    
    var result = [];
    sortedDates.forEach(function(date) {
      result.push({
        date: date,
        dayOfWeek: grouped[date][0]["Thứ"] || "",
        rows: grouped[date]
      });
    });
    return result;
  }

  /**
   * Generates the CSS styles based on rows size to fit nicely.
   */
  function getTableStyle(numRows) {
    var fontSize = "7.5px";
    var padding = "4.5px 4px";
    if (numRows >= 17) {
      fontSize = "6.2px";
      padding = "2px 2px";
    } else if (numRows >= 14) {
      fontSize = "7.0px";
      padding = "3.5px 3px";
    }
    return "font-size: " + fontSize + "; padding: " + padding + ";";
  }

  /**
   * Builds the HTML string for the PDF cover page.
   */
  function buildCoverPageHtml(restaurantName, monthStr, bookTitle) {
    return [
      '<div class="cover-page">',
      '  <div class="cover-border">',
      '    <div class="crown">♛</div>',
      '    <div class="rest-name">' + restaurantName.toUpperCase() + '</div>',
      '    <div class="rest-sub">NHÀ HÀNG ẨM THỰC - DỊCH VỤ TIỆC</div>',
      '    <hr class="divider" />',
      '    <div class="book-title">SỔ KIỂM THỰC BA BƯỚC</div>',
      '    <div class="book-subtitle">' + bookTitle.toUpperCase() + '</div>',
      '    <div class="book-month">THÁNG ' + monthStr + '</div>',
      '    <hr class="divider-short" />',
      '    <div class="footer-note">' + restaurantName.toUpperCase() + ' - KIỂM SOÁT AN TOÀN THỰC PHẨM</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  /**
   * Builds the HTML for the "Trước khi ăn" (Before eating) log page.
   */
  function buildBeforeEatPageHtml(dayData, configs, index) {
    var restaurantName = configs.RESTAURANT_NAME || "KING'S GRILL";
    var numRows = dayData.rows.length;
    var rowStyle = getTableStyle(numRows);
    
    var html = [
      '<div class="page-container">',
      '  <div class="page-header">',
      '    <table class="header-table">',
      '      <tr>',
      '        <td class="header-left">',
      '          <span class="restaurant-title">' + restaurantName.toUpperCase() + '</span><br/>',
      '          <span class="restaurant-subtitle">NHÀ HÀNG ẨM THỰC - DỊCH VỤ TIỆC</span>',
      '        </td>',
      '        <td class="header-center">',
      '          <span class="sheet-title">SỔ KIỂM THỰC BA BƯỚC</span><br/>',
      '          <span class="sheet-subtitle">BƯỚC 3: KIỂM TRA TRƯỚC KHI ĂN</span>',
      '        </td>',
      '        <td class="header-right">',
      '          <span>Ngày: <strong>' + dayData.date + '</strong></span><br/>',
      '          <span>Thứ: <strong>' + dayData.dayOfWeek + '</strong></span>',
      '        </td>',
      '      </tr>',
      '    </table>',
      '  </div>',
      '  ',
      '  <table class="log-table">',
      '    <thead>',
      '      <tr>',
      '        <th rowspan="2" style="width: 3%">TT</th>',
      '        <th rowspan="2" style="width: 8%">Bữa ăn</th>',
      '        <th rowspan="2" style="width: 25%">Tên món ăn</th>',
      '        <th rowspan="2" style="width: 7%">Số lượng/<br/>Số suất</th>',
      '        <th rowspan="2" style="width: 12%">Thời gian chia<br/>món xong</th>',
      '        <th rowspan="2" style="width: 12%">Thời gian bắt đầu<br/>cho ăn</th>',
      '        <th rowspan="2" style="width: 18%">Dụng cụ chia chứa đựng,<br/>che đậy, bảo quản thức ăn</th>',
      '        <th colspan="2" style="width: 10%">Cảm quan thức ăn</th>',
      '        <th rowspan="2" style="width: 10%">Biện pháp xử lý/<br/>Ghi chú</th>',
      '      </tr>',
      '      <tr>',
      '        <th class="sub-header">Đạt</th>',
      '        <th class="sub-header">Không đạt</th>',
      '      </tr>',
      '      <tr class="num-row">',
      '        <td>(1)</td>',
      '        <td>(2)</td>',
      '        <td>(3)</td>',
      '        <td>(4)</td>',
      '        <td>(5)</td>',
      '        <td>(6)</td>',
      '        <td>(7)</td>',
      '        <td>(8)</td>',
      '        <td>(9)</td>',
      '        <td>(10)</td>',
      '      </tr>',
      '    </thead>',
      '    <tbody>'
    ].join('\n');

    dayData.rows.forEach(function(r, idx) {
      html += [
        '      <tr>',
        '        <td style="' + rowStyle + '">' + (idx + 1) + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Ca bữa ăn"] || "") + '</td>',
        '        <td style="' + rowStyle + ' text-align: left; font-weight: bold;">' + (r["Tên món ăn"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Số suất"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Thời gian chia món xong"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Thời gian bắt đầu ăn"] || "") + '</td>',
        '        <td style="' + rowStyle + ' text-align: left;">' + (r["Dụng cụ bảo quản"] || "") + '</td>',
        '        <td style="' + rowStyle + ' font-weight: bold; color: green;">' + (r["Cảm quan đạt"] || "") + '</td>',
        '        <td style="' + rowStyle + ' font-weight: bold; color: red;">' + (r["Cảm quan không đạt"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Ghi chú"] || "") + '</td>',
        '      </tr>'
      ].join('\n');
    });

    html += [
      '    </tbody>',
      '  </table>',
      '  ',
      '  <table class="signature-table">',
      '    <tr>',
      '      <td style="width: 50%">',
      '        <strong>NGƯỜI KIỂM TRA</strong><br/>',
      '        <span class="sign-note">(Ký và ghi rõ họ tên)</span>',
      '        <div class="sign-space"></div>',
      '      </td>',
      '      <td style="width: 50%">',
      '        <strong>NGƯỜI QUẢN LÝ</strong><br/>',
      '        <span class="sign-note">(Ký và ghi rõ họ tên)</span>',
      '        <div class="sign-space"></div>',
      '      </td>',
      '    </tr>',
      '  </table>',
      '</div>'
    ].join('\n');

    return html;
  }

  /**
   * Builds the HTML for the "Khi chế biến" (During processing) log page.
   */
  function buildProcessingPageHtml(dayData, configs, index) {
    var restaurantName = configs.RESTAURANT_NAME || "KING'S GRILL";
    var numRows = dayData.rows.length;
    var rowStyle = getTableStyle(numRows);
    
    var html = [
      '<div class="page-container">',
      '  <div class="page-header">',
      '    <table class="header-table">',
      '      <tr>',
      '        <td class="header-left">',
      '          <span class="restaurant-title">' + restaurantName.toUpperCase() + '</span><br/>',
      '          <span class="restaurant-subtitle">NHÀ HÀNG ẨM THỰC - DỊCH VỤ TIỆC</span>',
      '        </td>',
      '        <td class="header-center">',
      '          <span class="sheet-title">SỔ KIỂM THỰC BA BƯỚC</span><br/>',
      '          <span class="sheet-subtitle">BƯỚC 2: KIỂM TRA KHI CHẾ BIẾN THỨC ĂN</span>',
      '        </td>',
      '        <td class="header-right">',
      '          <span>Ngày: <strong>' + dayData.date + '</strong></span><br/>',
      '          <span>Thứ: <strong>' + dayData.dayOfWeek + '</strong></span>',
      '        </td>',
      '      </tr>',
      '    </table>',
      '  </div>',
      '  ',
      '  <table class="log-table">',
      '    <thead>',
      '      <tr>',
      '        <th rowspan="2" style="width: 2.5%">TT</th>',
      '        <th rowspan="2" style="width: 5%">Ca</th>',
      '        <th rowspan="2" style="width: 15%">Tên món</th>',
      '        <th rowspan="2" style="width: 22%">Nguyên vật liệu chính để chế biến</th>',
      '        <th rowspan="2" style="width: 4.5%">Suất</th>',
      '        <th rowspan="2" style="width: 7.5%">Sơ chế<br/>xong</th>',
      '        <th rowspan="2" style="width: 7.5%">Chế biến<br/>xong</th>',
      '        <th colspan="3" style="width: 22%">Điều kiện vệ sinh</th>',
      '        <th colspan="2" style="width: 8%">Cảm quan</th>',
      '        <th rowspan="2" style="width: 6%">Ghi chú</th>',
      '      </tr>',
      '      <tr>',
      '        <th class="sub-header" style="width: 9%">Người chế biến</th>',
      '        <th class="sub-header" style="width: 7%">Trang thiết bị</th>',
      '        <th class="sub-header" style="width: 6%">Khu vực</th>',
      '        <th class="sub-header">Đạt</th>',
      '        <th class="sub-header">K.đạt</th>',
      '      </tr>',
      '      <tr class="num-row">',
      '        <td>(1)</td>',
      '        <td>(2)</td>',
      '        <td>(3)</td>',
      '        <td>(4)</td>',
      '        <td>(5)</td>',
      '        <td>(6)</td>',
      '        <td>(7)</td>',
      '        <td>(8)</td>',
      '        <td>(9)</td>',
      '        <td>(10)</td>',
      '        <td>(11)</td>',
      '        <td>(12)</td>',
      '        <td>(13)</td>',
      '      </tr>',
      '    </thead>',
      '    <tbody>'
    ].join('\n');

    dayData.rows.forEach(function(r, idx) {
      html += [
        '      <tr>',
        '        <td style="' + rowStyle + '">' + (idx + 1) + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Ca bữa ăn"] || "") + '</td>',
        '        <td style="' + rowStyle + ' text-align: left; font-weight: bold;">' + (r["Tên món ăn"] || "") + '</td>',
        '        <td style="' + rowStyle + ' text-align: left;">' + (r["Nguyên liệu chính"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Số suất"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Thời gian chia món xong"] || "") + '</td>', // Sơ chế xong = Chia món xong
        '        <td style="' + rowStyle + '">' + (r["Thời gian bắt đầu ăn"] || "") + '</td>',  // Chế biến xong = Bắt đầu ăn
        '        <td style="' + rowStyle + ' text-align: left;">' + (r["Nhân viên chế biến"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Trang thiết bị"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Khu vực"] || "") + '</td>',
        '        <td style="' + rowStyle + ' font-weight: bold; color: green;">' + (r["Cảm quan đạt"] || "") + '</td>',
        '        <td style="' + rowStyle + ' font-weight: bold; color: red;">' + (r["Cảm quan không đạt"] || "") + '</td>',
        '        <td style="' + rowStyle + '">' + (r["Ghi chú"] || "") + '</td>',
        '      </tr>'
      ].join('\n');
    });

    html += [
      '    </tbody>',
      '  </table>',
      '  ',
      '  <table class="signature-table">',
      '    <tr>',
      '      <td style="width: 50%">',
      '        <strong>NGƯỜI KIỂM TRA</strong><br/>',
      '        <span class="sign-note">(Ký và ghi rõ họ tên)</span>',
      '        <div class="sign-space"></div>',
      '      </td>',
      '      <td style="width: 50%">',
      '        <strong>NGƯỜI QUẢN LÝ</strong><br/>',
      '        <span class="sign-note">(Ký và ghi rõ họ tên)</span>',
      '        <div class="sign-space"></div>',
      '      </td>',
      '    </tr>',
      '  </table>',
      '</div>'
    ].join('\n');

    return html;
  }

  /**
   * Main CSS styling for the A4 landscape PDF layout.
   */
  function getPdfCss() {
    return [
      '<style>',
      '  @page {',
      '    size: A4 landscape;',
      '    margin: 10mm 12mm;',
      '  }',
      '  body {',
      '    font-family: Arial, Helvetica, sans-serif;',
      '    margin: 0;',
      '    padding: 0;',
      '    color: #000;',
      '    background-color: #fff;',
      '  }',
      '  ',
      '  /* Cover Page Styles */',
      '  .cover-page {',
      '    height: 100vh;',
      '    display: flex;',
      '    align-items: center;',
      '    justify-content: center;',
      '    box-sizing: border-box;',
      '    page-break-after: always;',
      '  }',
      '  .cover-border {',
      '    border: 5px double #c78000;',
      '    border-radius: 15px;',
      '    padding: 50px 80px;',
      '    text-align: center;',
      '    width: 80%;',
      '    margin: 0 auto;',
      '    box-sizing: border-box;',
      '  }',
      '  .crown {',
      '    color: #c78000;',
      '    font-size: 48px;',
      '    line-height: 1;',
      '    margin-bottom: 15px;',
      '  }',
      '  .rest-name {',
      '    font-size: 32px;',
      '    font-weight: bold;',
      '    letter-spacing: 2px;',
      '    color: #071a3d;',
      '  }',
      '  .rest-sub {',
      '    font-size: 14px;',
      '    color: #555;',
      '    margin-top: 5px;',
      '    letter-spacing: 1px;',
      '  }',
      '  .divider {',
      '    border: 0;',
      '    border-top: 1px solid #ccc;',
      '    margin: 20px 0;',
      '  }',
      '  .divider-short {',
      '    border: 0;',
      '    border-top: 1px solid #ccc;',
      '    margin: 20px auto;',
      '    width: 40%;',
      '  }',
      '  .book-title {',
      '    font-size: 26px;',
      '    font-weight: bold;',
      '    color: #071a3d;',
      '    margin-bottom: 8px;',
      '  }',
      '  .book-subtitle {',
      '    font-size: 20px;',
      '    color: #d91c1c;',
      '    font-weight: bold;',
      '    margin-bottom: 25px;',
      '  }',
      '  .book-month {',
      '    font-size: 18px;',
      '    font-weight: bold;',
      '    color: #333;',
      '  }',
      '  .footer-note {',
      '    font-size: 11px;',
      '    font-weight: bold;',
      '    color: #666;',
      '    margin-top: 15px;',
      '    letter-spacing: 1px;',
      '  }',
      '  ',
      '  /* Page Container & Layout */',
      '  .page-container {',
      '    page-break-after: always;',
      '    position: relative;',
      '    box-sizing: border-box;',
      '    min-height: 100%;',
      '  }',
      '  .page-container:last-child {',
      '    page-break-after: avoid;',
      '  }',
      '  ',
      '  /* Header Layout */',
      '  .header-table {',
      '    width: 100%;',
      '    border-collapse: collapse;',
      '    margin-bottom: 12px;',
      '  }',
      '  .header-table td {',
      '    border: 0 !important;',
      '    padding: 0 !important;',
      '    vertical-align: middle;',
      '  }',
      '  .header-left {',
      '    width: 30%;',
      '    text-align: left;',
      '  }',
      '  .restaurant-title {',
      '    font-weight: bold;',
      '    font-size: 11px;',
      '    color: #071a3d;',
      '  }',
      '  .restaurant-subtitle {',
      '    font-size: 8px;',
      '    color: #555;',
      '  }',
      '  .header-center {',
      '    width: 40%;',
      '    text-align: center;',
      '  }',
      '  .sheet-title {',
      '    font-weight: bold;',
      '    font-size: 14px;',
      '    color: #071a3d;',
      '  }',
      '  .sheet-subtitle {',
      '    font-weight: bold;',
      '    font-size: 10px;',
      '    color: #d91c1c;',
      '  }',
      '  .header-right {',
      '    width: 30%;',
      '    text-align: right;',
      '    font-size: 10px;',
      '  }',
      '  ',
      '  /* Log Table Structure */',
      '  .log-table {',
      '    width: 100%;',
      '    border-collapse: collapse;',
      '    margin-bottom: 10px;',
      '  }',
      '  .log-table th, .log-table td {',
      '    border: 1px solid #000;',
      '    text-align: center;',
      '    vertical-align: middle;',
      '    line-height: 1.25;',
      '    box-sizing: border-box;',
      '  }',
      '  .log-table th {',
      '    background-color: #eaf3fb;',
      '    font-weight: bold;',
      '    font-size: 8px;',
      '    padding: 4px 2px;',
      '  }',
      '  .log-table th.sub-header {',
      '    font-size: 7.5px;',
      '    padding: 3px 2px;',
      '  }',
      '  .log-table tr.num-row td {',
      '    font-size: 7px;',
      '    background-color: #f5f5f5;',
      '    padding: 2px 0;',
      '  }',
      '  ',
      '  /* Signature Table */',
      '  .signature-table {',
      '    width: 100%;',
      '    margin-top: 15px;',
      '    border-collapse: collapse;',
      '  }',
      '  .signature-table td {',
      '    border: 0 !important;',
      '    padding: 0 !important;',
      '    text-align: center;',
      '    vertical-align: top;',
      '    font-size: 9px;',
      '  }',
      '  .sign-note {',
      '    font-style: italic;',
      '    font-size: 8px;',
      '    color: #444;',
      '  }',
      '  .sign-space {',
      '    height: 48px;',
      '  }',
      '</style>'
    ].join('\n');
  }

  /**
   * Generates a PDF file in Google Drive.
   * @param {string} monthStr - Month in "MM/YYYY" format
   * @param {string} bookType - "before_eat" or "processing"
   * @return {string} Link to the created PDF file
   */
  function createPdf(monthStr, bookType) {
    var parts = monthStr.split("/");
    var month = parseInt(parts[0], 10);
    var year = parseInt(parts[1], 10);

    var rows = DataService.getMonthlyData(month, year);
    if (rows.length === 0) {
      throw new Error("Không có dữ liệu kiểm thực cho tháng " + monthStr + ". Hãy tạo dữ liệu trước.");
    }

    var configs = ConfigService.getConfigMap();
    var restaurantName = configs.RESTAURANT_NAME || "KING'S GRILL";
    var daysGrouped = groupRowsByDate(rows);

    // Build overall HTML
    var html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n' + getPdfCss() + '\n</head>\n<body>\n';

    if (bookType === "before_eat") {
      // 1. Cover
      html += buildCoverPageHtml(restaurantName, monthStr, "Kiểm tra trước khi ăn");
      // 2. Pages
      daysGrouped.forEach(function(dayData, idx) {
        html += buildBeforeEatPageHtml(dayData, configs, idx);
      });
    } else {
      // 1. Cover
      html += buildCoverPageHtml(restaurantName, monthStr, "Kiểm tra khi chế biến thức ăn");
      // 2. Pages
      daysGrouped.forEach(function(dayData, idx) {
        html += buildProcessingPageHtml(dayData, configs, idx);
      });
    }

    html += '\n</body>\n</html>';

    // Convert to PDF Blob
    var htmlBlob = HtmlService.createHtmlOutput(html);
    // Use the name for the file
    var suffix = bookType === "before_eat" ? "Trước khi ăn" : "Chế biến";
    var fileName = restaurantName + " - Sổ kiểm thực - " + suffix + " - Tháng " + monthStr.replace("/", ".") + ".pdf";
    
    var pdfBlob = htmlBlob.getAs('application/pdf').setName(fileName);
    
    // Save to Google Drive
    var folder = getOutputFolder();
    var file = folder.createFile(pdfBlob);
    
    // Share file so it can be viewed by whoever has the link
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {
      Logger.log("Error setting sharing permission: " + e.toString());
    }

    var fileUrl = file.getUrl();

    // Log to PDF history
    HistoryService.logPdf(monthStr, suffix, fileName, fileUrl);

    return fileUrl;
  }

  /**
   * Helper to return HTML preview directly to the frontend.
   */
  function getPreviewHtml(month, year, bookType, dateStr) {
    var rows = DataService.getMonthlyData(month, year);
    if (rows.length === 0) {
      return '<div style="padding: 20px; text-align: center; color: red; font-weight: bold;">Không có dữ liệu cho tháng ' + month + '/' + year + '</div>';
    }

    var configs = ConfigService.getConfigMap();
    var daysGrouped = groupRowsByDate(rows);
    var targetDay = daysGrouped.filter(function(d) {
      return d.date === dateStr;
    })[0];

    if (!targetDay) {
      return '<div style="padding: 20px; text-align: center; color: red; font-weight: bold;">Không có dữ liệu cho ngày ' + dateStr + '</div>';
    }

    var contentHtml = "";
    if (bookType === "before_eat") {
      contentHtml = buildBeforeEatPageHtml(targetDay, configs, 0);
    } else {
      contentHtml = buildProcessingPageHtml(targetDay, configs, 0);
    }

    // Embed inline styling wrapper to simulate PDF page styling in iframe
    var previewCss = [
      '<style>',
      '  body { font-family: Arial, sans-serif; background: #e0e0e0; margin: 0; padding: 20px; display: flex; justify-content: center; }',
      '  .page-container {',
      '    background: #fff;',
      '    width: 297mm;',
      '    height: 210mm;',
      '    padding: 10mm 15mm;',
      '    box-shadow: 0 4px 10px rgba(0,0,0,0.15);',
      '    box-sizing: border-box;',
      '    display: flex;',
      '    flex-direction: column;',
      '    justify-content: space-between;',
      '    border-radius: 4px;',
      '  }',
      '  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }',
      '  .header-table td { border: 0 !important; padding: 0 !important; vertical-align: middle; }',
      '  .header-left { width: 30%; text-align: left; }',
      '  .restaurant-title { font-weight: bold; font-size: 11px; color: #071a3d; }',
      '  .restaurant-subtitle { font-size: 8px; color: #555; }',
      '  .header-center { width: 40%; text-align: center; }',
      '  .sheet-title { font-weight: bold; font-size: 14px; color: #071a3d; }',
      '  .sheet-subtitle { font-weight: bold; font-size: 10px; color: #d91c1c; }',
      '  .header-right { width: 30%; text-align: right; font-size: 10px; }',
      '  .log-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }',
      '  .log-table th, .log-table td { border: 1px solid #000; text-align: center; vertical-align: middle; line-height: 1.3; }',
      '  .log-table th { background-color: #eaf3fb; font-weight: bold; font-size: 9px; padding: 5px 2px; }',
      '  .log-table th.sub-header { font-size: 8.5px; padding: 4px 2px; }',
      '  .log-table tr.num-row td { font-size: 8px; background-color: #f5f5f5; padding: 2px 0; }',
      '  .signature-table { width: 100%; margin-top: 15px; border-collapse: collapse; }',
      '  .signature-table td { border: 0 !important; padding: 0 !important; text-align: center; vertical-align: top; font-size: 10px; }',
      '  .sign-note { font-style: italic; font-size: 8.5px; color: #444; }',
      '  .sign-space { height: 48px; }',
      '</style>'
    ].join('\n');

    return previewCss + "\n" + contentHtml;
  }

  return {
    createPdf: createPdf,
    getPreviewHtml: getPreviewHtml,
    getOutputFolder: getOutputFolder
  };
})();
