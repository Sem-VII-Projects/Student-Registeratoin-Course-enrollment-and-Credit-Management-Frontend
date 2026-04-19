const fs = require('fs');
const content = fs.readFileSync('pages/AdminGrading.tsx', 'utf8');
const matches = content.match(/>([^<{]+)</g) || [];
const strings = new Set();
matches.forEach(m => {
    const s = m.replace(/[><]/g, '').trim();
    if(s && !/^[0-9.-]+$/.test(s) && !/^[{]+/.test(s) && !/^[a-zA-Z0-9_\-\.]+$/.test(s)) strings.add(s);
});
console.log(Array.from(strings));
