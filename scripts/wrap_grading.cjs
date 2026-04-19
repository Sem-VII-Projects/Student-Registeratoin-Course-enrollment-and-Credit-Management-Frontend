const fs = require('fs');

let code = fs.readFileSync('pages/AdminGrading.tsx', 'utf8');

if (!code.includes('import { useTranslation }')) {
  code = code.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\nimport { useTranslation } from 'react-i18next';");
}

if (!code.includes('const { t } = useTranslation();')) {
  code = code.replace('const AdminGrading: React.FC<GradingProps> = ({ user, onLogout }) => {', 
    'const AdminGrading: React.FC<GradingProps> = ({ user, onLogout }) => {\n  const { t } = useTranslation();');
}

const replacements = [
  'Academic Year', 'Period', 'Cohort', 'Specialization', 'Inventory ID',
  'All Tiers', 'Full Cycle', 'All Sec', 'All Majors', 'Bulk Import',
  'Insert Result', 'Commit Metrics', 'Evaluation Matrix', '90-100 (Superior)',
  '80-89 (Standard)', 'Sub-40 (Deficient)', 'System UID', 'Institutional Identity',
  'Catalog Course', 'Semester', 'Scaled Evaluation', 'Grade', 'Actions',
  'Zero Records Discovered', 'Record Performance', 'Modifying student record',
  'Apply Change', 'Discard', 'Cancel', 'Log Result', 'Edit Metric',
  'Student Identifier *', 'Catalog Course Code *', 'Examination Score (0-100)',
  'Context:', 'Student ID', 'Course Code', 'Updated Exam Score'
];

replacements.forEach(str => {
  // exact literal replacement: '>String<' -> '>{t("String")}<'
  code = code.split('>' + str + '<').join('>{t("' + str + '")}<');
});

// also for placeholders and titles
code = code.split('placeholder="Search Code..."').join('placeholder={t("Search Code...")}');
code = code.split('title="Expunge Record"').join('title={t("Expunge Record")}');

fs.writeFileSync('pages/AdminGrading.tsx', code);
console.log('Applied t hooks to AdminGrading.tsx');
