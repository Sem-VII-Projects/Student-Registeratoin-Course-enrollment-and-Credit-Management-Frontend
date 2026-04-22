const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'public', 'locales', 'en', 'translation.json');
const myPath = path.join(__dirname, 'public', 'locales', 'my', 'translation.json');

const myStr = "ပေးပို့ရန် CMD + Enter • စာကြောင်းများစွာအတွက် Shift + Enter";
const enStr = "CMD + Enter to dispatch • Shift + Enter for multiline";

function fixJson(filepath, enKey, trValue) {
  let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  // Remove bad keys
  const badKeys = Object.keys(data).filter(k => k.includes('CMD') && k.includes('Shift'));
  badKeys.forEach(k => delete data[k]);
  
  data[enStr] = filepath.includes('\\my\\') || filepath.includes('/my/') ? trValue : enStr;
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

fixJson(enPath, enStr, myStr);
fixJson(myPath, enStr, myStr);

const ccPath = path.join(__dirname, 'components', 'admin-chat', 'ChatComposer.tsx');
let ccData = fs.readFileSync(ccPath, 'utf8');
ccData = ccData.replace(/\{t\(\"CMD \+ Enter to dispatch [^"]* Shift \+ Enter for multiline\"\)\}/g, `{t("${enStr}")}`);
fs.writeFileSync(ccPath, ccData, 'utf8');
console.log('Fixed CMD string in JSON and TSX');
