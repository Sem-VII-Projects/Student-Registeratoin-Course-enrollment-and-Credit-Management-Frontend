const fs = require('fs');
const path = require('path');

const bmMappings = {
  "Select track first": "အရင်ဆုံး ဘာသာရပ်လမ်းကြောင်းကို ရွေးချယ်ပါ",
  "Failed to load options": "ရွေးချယ်စရာများကို ဖွင့်၍မရပါ",
  "Major selected and permanently locked. You cannot change it later.": "ဘာသာရပ်ကို ရွေးချယ်ပြီးဖြစ်၍ အပြီးအပိုင် ပိတ်ထားပါသည်။ နောက်မှ ပြောင်းလဲ၍မရပါ။",
  "Failed": "လုပ်ဆောင်မှု မအောင်မြင်ပါ",
  "Academic Specialization": "ပညာရပ်ဆိုင်ရာ အထူးပြုဘာသာရပ်",
  "Select Specialization": "အထူးပြုဘာသာရပ် ရွေးချယ်ရန်",
  "Define your academic trajectory within the {{programType}} framework.": "{{programType}} မူဘောင်အတွင်း သင့်ပညာရေးလမ်းကြောင်းကို သတ်မှတ်ပါ။",
  "Curriculum": "သင်ရိုးညွှန်းတမ်း",
  "State: Synchronized & Locked": "အခြေအနေ: စင့်ခ်လုပ်ပြီး/ပိတ်ထားသည်",
  "The selection window has concluded for this academic cycle.": "ယခုပညာသင်နှစ်အတွက် ရွေးချယ်မှုကာလ ပြီးဆုံးသွားပါပြီ။",
  "Foundation Phase Active": "အခြေခံအဆင့် ဖွင့်ထားသည်",
  "Specialization selection initiates in the 3rd academic year. Complete your core requirements to unlock this protocol.": "အထူးပြုဘာသာရပ် ရွေးချယ်ခြင်းကို တတိယနှစ်တွင် စတင်ပါသည်။ ဤလုပ်ဆောင်ချက်ကို ဖွင့်ရန် သင့်အခြေခံလိုအပ်ချက်များကို ပြီးမြောက်အောင်လုပ်ပါ။",
  "Major selection is not available for the current year or semester.": "ယခုနှစ် သို့မဟုတ် စာသင်နှစ်အတွက် ဘာသာရပ်ရွေးချယ်ခွင့် မရှိပါ။",
  "Recorded:": "မှတ်တမ်းတင်ထားသည် -",
  "Track:": "လမ်းကြောင်း -",
  "Major:": "ဘာသာရပ် -",
  "Institutional Definition": "တက္ကသိုလ်အဓိပ္ပာယ်ဖွင့်ဆိုချက်",
  "Optimal Candidate": "အသင့်တော်ဆုံး လျှောက်ထားသူ",
  "ACTIVE PROTOCOL": "လုပ်ဆောင်မှု အသက်ဝင်နေသည်",
  "INITIATE SELECTION": "ရွေးချယ်မှု စတင်ရန်",
  "Software Engineering": "ဆော့ဖ်ဝဲလ် အင်ဂျင်နီယာ",
  "Knowledge Engineering": "အသိပညာရပ် အင်ဂျင်နီယာ",
  "Business Information Systems": "စီးပွားရေး သတင်းအချက်အလက် စနစ်",
  "Cyber Security": "ဆိုက်ဘာ လုံခြုံရေး",
  "High Performance Computing": "စွမ်းဆောင်ရည်မြင့် ကွန်ပျူတာနည်းပညာ",
  "Computer Networks": "ကွန်ပျူတာ ကွန်ရက်ပညာ",
  "Embedded Systems": "မြှုပ်နှံထားသော စနစ်များ",
  "Software design, development, and quality.": "ဆော့ဖ်ဝဲလ် ဒီဇိုင်းရေးဆွဲခြင်း၊ တီထွင်ခြင်းနှင့် အရည်အသွေး။",
  "Enjoy building robust apps": "ခိုင်မာသော အက်ပလီကေးရှင်းများ တည်ဆောက်ရတာကို နှစ်သက်သူများ",
  "Knowledge systems, AI reasoning.": "အသိပညာရပ်များ စနစ်နှင့် အေအိုင် ဆင်ခြင်တုံတရား။",
  "Interested in AI knowledge bases": "အေအိုင်နည်းပညာ များအကြောင်းကို စိတ်ဝင်စားသူများ",
  "IT solutions for business processes.": "စီးပွားရေးလုပ်ငန်းစဉ်များအတွက် အိုင်တီဖြေရှင်းချက်များ။",
  "Blend of tech and business": "နည်းပညာနှင့် စီးပွားရေး ပေါင်းစပ်မှု",
  "Protect systems and data.": "စနစ်များနှင့် ဒေတာများကို ကာကွယ်ခြင်း။",
  "Defensive and security mindset": "ကာကွယ်ရေးနှင့် လုံခြုံရေး စိတ်ထား",
  "Compute-intensive systems.": "တွက်ချက်မှုပြင်းထန်သော စနစ်များ။",
  "Performance and parallelism": "စွမ်းဆောင်ရည်နှင့် အပြိုင်လုပ်ဆောင်ခြင်း",
  "Network design and operations.": "ကွန်ရက်ပုံစံရေးဆွဲခြင်းနှင့် လုပ်ငန်းစဉ်များ။",
  "Networking and infrastructure": "ကွန်ရက်နှင့် အခြေခံအဆောက်အအုံ",
  "Hardware-software integration.": "စက်ပိုင်းဆိုင်ရာ-ဆော့ဖ်ဝဲ ပေါင်းစပ်မှု။",
  "Low-level systems interest": "အနိမ့်ဆုံးအဆင့် စနစ်များကို စိတ်ဝင်စားသူများ"
};

const enJsonPath = 'C:/Frontend/Frontend/public/locales/en/translation.json';
const myJsonPath = 'C:/Frontend/Frontend/public/locales/my/translation.json';

const enF = fs.readFileSync(enJsonPath, 'utf8');
const enData = JSON.parse(enF);

const myF = fs.readFileSync(myJsonPath, 'utf8');
const myData = JSON.parse(myF);

for (const key in bmMappings) {
  // Ensure the english side has the correct english instead of falling back to default
  if (!enData[key] || enData[key] === key) {
    enData[key] = key;
  }
  
  // Apply myanmar translations
  myData[key] = bmMappings[key];
}

fs.writeFileSync(enJsonPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(myJsonPath, JSON.stringify(myData, null, 2), 'utf8');
console.log("Updated myanmar and english translations!");