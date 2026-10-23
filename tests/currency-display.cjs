const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const price = {dataset: {currencyAmount: '375'}, textContent: ''};
const document = {documentElement: {lang: 'ar'}, readyState: 'complete', querySelectorAll: () => [price]};
const listeners = {};
const window = {addEventListener: (name, fn) => {listeners[name] = fn;}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../currency.js'), 'utf8'), {window, document, Intl, Number, Object});
const currency = window.CurrencySystem;
assert.match(price.textContent, /375\.00.*SAR/);
document.documentElement.lang = 'en';
listeners['account:languagechange']();
assert.equal(price.textContent, '$100.00');
assert.equal(currency.format(50), '$13.33');
assert.equal(currency.format(1000), '$266.67');
assert.equal(currency.format('0'), '$0.00');
assert.equal(currency.format(3.75), '$1.00');
assert.equal(currency.format(1000000), '$266,666.67');
for (let i = 0; i < 20; i++) {
  document.documentElement.lang = i % 2 ? 'en' : 'ar';
  listeners['account:languagechange']();
}
assert.equal(price.dataset.currencyAmount, '375');
assert.equal(price.textContent, '$100.00');
document.documentElement.lang = 'ar';
listeners['account:languagechange']();
assert.match(price.textContent, /375\.00.*SAR/);
assert.ok(!price.textContent.includes('$'));
console.log('Currency display: correct parity, rounding, symbols and repeated language switching; base SAR unchanged.');
