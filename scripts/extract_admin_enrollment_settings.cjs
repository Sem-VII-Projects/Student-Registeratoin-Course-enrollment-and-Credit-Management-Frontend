const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const baseDir = path.resolve(scriptDir, '..');
const file = path.join(baseDir, 'pages/AdminEnrollmentSettings.tsx');

let src;
try {
  src = fs.readFileSync(file, 'utf8');
} catch (e) {
  console.error('Error: Could not read file at', file, e.message);
  process.exit(1);
}

const regex = />([^<{]+)</g;
let match;
while ((match = regex.exec(src)) !== null) {
    const text = match[1].trim();
    if (text.length > 0 && !text.includes('&') && !text.includes('}') && text !== '—' && !text.match(/^[0-9]+$/)) {
        console.log(text);
    }
}
