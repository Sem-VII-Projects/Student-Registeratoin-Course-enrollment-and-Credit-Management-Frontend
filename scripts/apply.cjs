const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const inputPath = path.resolve(scriptDir, 'update_ui.cjs');
const outputPath = path.resolve(scriptDir, 'pages/IntegratedAdminPortal.tsx');

const s = fs.readFileSync(inputPath, 'utf-8');
const firstTick = s.indexOf('`');
const lastTick = s.lastIndexOf('`');

if (firstTick === -1 || lastTick === -1 || firstTick >= lastTick) {
  console.error('Error: Could not find valid backtick-delimited content in update_ui.cjs');
  process.exit(1);
}

const body = s.substring(firstTick + 1, lastTick);
fs.writeFileSync(outputPath, body);
console.log('Fixed UI');