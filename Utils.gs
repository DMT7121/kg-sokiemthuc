/**
 * Utils.gs
 * Generic utilities.
 */

var Utils = (function() {
  /**
   * Helper to format Date objects.
   */
  function formatDate(date, format) {
    return Utilities.formatDate(date, Session.getScriptTimeZone() || "GMT+7", format);
  }

  /**
   * Safe JSON parse.
   */
  function safeParse(str, fallback) {
    try {
      return JSON.parse(str);
    } catch(e) {
      return fallback;
    }
  }

  return {
    formatDate: formatDate,
    safeParse: safeParse
  };
})();
