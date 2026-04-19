const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const baseDir = path.resolve(scriptDir, '..');
const adminDashboardPath = path.join(baseDir, 'pages/AdminDashboard.tsx');

let adminSrc;
try {
  adminSrc = fs.readFileSync(adminDashboardPath, 'utf-8');
} catch (e) {
  console.error('Error: Could not read file at', adminDashboardPath, e.message);
  process.exit(1);
}

adminSrc = adminSrc.replace(/>\s*Operations\s*Overview\s*</g, '>{t("Operations Overview")}<');
adminSrc = adminSrc.replace(/>\s*Synchronizing\s*</g, '>{t("Synchronizing")}<');
adminSrc = adminSrc.replace(/>\s*Institutional intelligence and administrative priorities synchronized in real-time.\s*</g, '>{t("Institutional intelligence and administrative priorities synchronized in real-time.")}<');
adminSrc = adminSrc.replace(/>\s*Sync\s*</g, '>{t("Sync")}<');
adminSrc = adminSrc.replace(/>\s*Announce\s*</g, '>{t("Announce")}<');
adminSrc = adminSrc.replace(/>\s*Attention\s*</g, '>{t("Attention")}<');

fs.writeFileSync(adminDashboardPath, adminSrc);

console.log("Updated via Regex.");