const fs = require('fs');

const dict = {
  "NAVIGATION CONTEXT": "လမ်းညွှန်",
  "Cancel": "ပယ်ဖျက်ရန်",
  "Add": "ထည့်ရန်",
  "Promise": "ပေးရန်",
  "Persistent unique identifier.": "အမြဲတမ်းသက်တမ်းရှိသော သီးခြားသတ်မှတ်ချက်",
  "Active Periods": "သက်ဝင်နေသော အချိန်များ",
  "No periods assigned.": "အချိန်များ မသတ်မှတ်ရသေးပါ။",
  "Matrix Schedule": "မက်ထရစ်အချိန်ဇယား",
  "Unscheduled.": "အချိန်မသတ်မှတ်ရသေးပါ။",
  "Logical Dependencies": "လိုအပ်သောအချက်များ",
  "No dependencies found.": "လိုအပ်ချက်များမရှိပါ။",
  "Abort Wizard": "ဝစ်ဇတ်ကိုရုတ်သိမ်းရန်",
  "Previous": "ယခင်",
  "Proceed": "ရှေ့ဆက်ရန်",
  "Synchronizing...": "ချိတ်ဆက်နေသည်...",
  "Execute Commit": "အတည်ပြုလုပ်ဆောင်ရန်",
  "Curriculum Inventory": "သင်ရိုးညွှန်းတမ်း စာရင်း",
  "Global management of courses, academic prerequisites, and institutional tracks.": "သင်ခန်းစာများ၊ လိုအပ်ချက်များ၊ နှင့် ကျောင်းဆိုင်ရာ အစီအစဉ်များကို စီမံခန့်ခွဲခြင်း။",
  "Bulk Import": "အစုလိုက်ထည့်သွင်းရန်",
  "Create Course": "သင်ခန်းစာအသစ်ဖန်တီးရန်",
  "All Departments": "ဌာနအားလုံး",
  "All Types": "အမျိုးအစားအားလုံး",
  "All Periods": "အချိန်ကာလအားလုံး",
  "No matching curriculum found": "ကိုက်ညီသောသင်ရိုးညွှန်းတမ်း မရှိပါ",
  "Adjust your filters or initiate a new course record to expand the catalog.": "သင်၏စစ်ထုတ်မှုများကို ပြင်ဆင်ပါ သို့မဟုတ် သင်ခန်းစာအသစ်တစ်ခု ဖန်တီးပါ။",
  "Reset Parameters": "ပြန်လည်သတ်မှတ်ရန်",
  "Initialize Course": "သင်ခန်းစာကို စတင်ရန်",
  "Course Catalog": "သင်ခန်းစာ စာရင်း",
  "TOTAL": "စုစုပေါင်း",
  "FILTERED": "စစ်ထုတ်ထားသော",
  "Filter by code, title, or academic lead...": "ကုဒ်၊ အမည်၊ သို့မဟုတ် ဆရာ ဖြင့်ရှာပါ..."
};

const p = 'public/locales/my/translation.json';
let j = JSON.parse(fs.readFileSync(p, 'utf8'));
for(let k in dict) {
  j[k] = dict[k];
}
fs.writeFileSync(p, JSON.stringify(j, null, 2), 'utf8');
console.log("Updated my/translation.json correctly!");
