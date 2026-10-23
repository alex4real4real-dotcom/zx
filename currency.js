(function () {
  'use strict';
  // All persisted amounts and transaction requests use SAR.
  // Official SAMA parity: 1 USD = 3.75 SAR, verified 2026-10-23.
  // https://www.sama.gov.sa/en-US/Currency/FinExc/pages/currency.aspx
  var SAR_PER_USD = 3.75;
  function english() { return document.documentElement.lang === 'en'; }
  function format(amount) {
    var sar = Number(amount);
    if (!Number.isFinite(sar)) sar = 0;
    var value = english() ? sar / SAR_PER_USD : sar;
    return new Intl.NumberFormat(english() ? 'en-US' : 'ar-SA-u-nu-latn', {
      style: 'currency', currency: english() ? 'USD' : 'SAR',
      currencyDisplay: english() ? 'symbol' : 'code',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(value);
  }
  function refresh() {
    document.querySelectorAll('[data-currency-amount]').forEach(function (node) {
      node.textContent = format(node.dataset.currencyAmount);
    });
  }
  window.CurrencySystem = Object.freeze({format: format, refresh: refresh, sarPerUsd: SAR_PER_USD});
  window.addEventListener('account:languagechange', refresh);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, {once: true});
  else refresh();
})();
