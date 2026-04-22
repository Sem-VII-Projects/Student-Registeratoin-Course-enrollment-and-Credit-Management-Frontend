const fs = require('fs');

const file = 'C:/Frontend/Frontend/pages/CourseDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace('import { useParams, useNavigate, useLocation } from "react-router-dom";', 'import { useParams, useNavigate, useLocation } from "react-router-dom";\nimport { useTranslation } from "react-i18next";');
    content = content.replace('const { courseId } = useParams<{ courseId: string }>();', 'const { t } = useTranslation();\n  const { courseId } = useParams<{ courseId: string }>();');
}

// Ensure strict `t` usages
content = content.replace(/title="Course Details"/g, 'title={t("Course Details")}');
content = content.replace(/'Failed to load course'/g, 't("Failed to load course")');
content = content.replace(/Back to Courses/g, '{t("Back to Courses")}');
content = content.replace(/'Course not found'/g, 't("Course not found")');
content = content.replace(/title="Course Inventory"/g, 'title={t("Course Inventory")}');
content = content.replace(/Back to Catalog/g, '{t("Back to Catalog")}');
content = content.replace(/'Course Protocol'/g, 't("Course Protocol")');
content = content.replace(/>Course Abstract<\/p>/g, '>{t("Course Abstract")}</p>');
content = content.replace(/>Curriculum Lifecycle<\/h3>/g, '>{t("Curriculum Lifecycle")}</h3>');
content = content.replace(/>Weekly Syllabus Manifest<\/p>/g, '>{t("Weekly Syllabus Manifest")}</p>');
content = content.replace(/>Syllabus synchronization pending...<\/p>/g, '>{t("Syllabus synchronization pending...")}</p>');
content = content.replace(/>Logistics Matrix<\/h3>/g, '>{t("Logistics Matrix")}</h3>');
content = content.replace(/>Academic Lead<\/p>/g, '>{t("Academic Lead")}</p>');
content = content.replace(/>Execution Schedule<\/p>/g, '>{t("Execution Schedule")}</p>');
content = content.replace(/>Vector Location<\/p>/g, '>{t("Vector Location")}</p>');
content = content.replace(/>Unit Weight<\/p>/g, '>{t("Unit Weight")}</p>');
content = content.replace(/\{course.credits\} Credits<\/p>/g, '{course.credits} {t("Credits")}</p>');
content = content.replace(/>Semester Cycle<\/p>/g, '>{t("Semester Cycle")}</p>');
content = content.replace(/>Department Hub<\/p>/g, '>{t("Department Hub")}</p>');
content = content.replace(/>System Prerequisites<\/h4>/g, '>{t("System Prerequisites")}</h4>');
content = content.replace(/>Zero Requirements\n/g, '>{t("Zero Requirements")}\n');

fs.writeFileSync(file, content, 'utf8');

const translations = {
  "Course Details": "သင်တန်း အသေးစိတ်များ",
  "Failed to load course": "သင်တန်း အချက်အလက် ခေါ်ယူ၍မရပါ",
  "Back to Courses": "သင်တန်းများသို့ ပြန်သွားရန်",
  "Course not found": "သင်တန်း မတွေ့ပါ",
  "Course Inventory": "သင်တန်း စာရင်း",
  "Back to Catalog": "သင်တန်း မာတိကာသို့ ပြန်သွားရန်",
  "Course Protocol": "သင်တန်း မူဘောင်",
  "Course Abstract": "သင်တန်း အကျဉ်းချုပ်",
  "Curriculum Lifecycle": "သင်ရိုးညွှန်းတမ်း လုပ်ငန်းစဉ်",
  "Weekly Syllabus Manifest": "အပတ်စဉ် သင်ခန်းစာ စာရင်း",
  "Syllabus synchronization pending...": "သင်ခန်းစာများ ထည့်သွင်းဆဲဖြစ်ပါသည်...",
  "Logistics Matrix": "ထောက်ပံ့မှုပြဇယား",
  "Academic Lead": "သင်တန်းဆရာ",
  "Execution Schedule": "အချိန်စာရင်း",
  "Vector Location": "တည်နေရာ",
  "Unit Weight": "ခရက်ဒစ်",
  "Credits": "ခရက်ဒစ်",
  "Semester Cycle": "စာသင်နှစ်စက်ဝန်း",
  "Department Hub": "ဌာနချုပ်",
  "System Prerequisites": "အခြေခံ လိုအပ်ချက်များ",
  "Zero Requirements": "အခြေခံ လိုအပ်ချက်မရှိပါ"
};

const enPath = 'C:/Frontend/Frontend/public/locales/en/translation.json';
const myPath = 'C:/Frontend/Frontend/public/locales/my/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const myData = JSON.parse(fs.readFileSync(myPath, 'utf8'));

for (const [key, value] of Object.entries(translations)) {
    if (!enData[key] || enData[key] === key) enData[key] = key;
    myData[key] = value;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(myPath, JSON.stringify(myData, null, 2), 'utf8');

console.log('Translations applied successfully for Course Details pages.');