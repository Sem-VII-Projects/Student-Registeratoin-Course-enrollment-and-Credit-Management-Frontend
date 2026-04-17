const fs = require('fs');
const file = 'AGENTS.md';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
## Project Scope & Separation (CRITICAL)
This workspace contains two distinct projects:
1. **Course Enrollment and Credit Management** (My Project)
2. **Student Registration** (My friend's project)

**Rule 1: Component Separation**
When a task or component is explicitly labeled or stated as "my friend's project" (Student Registration), the code or component MUST be separately copied, created, or placed. DO NOT overwrite, modify, or delete any components belonging to "my project" (Course Enrollment and Credit Management).

**Rule 2: API & Backend Routing**
Any API endpoint, service, or backend integration labeled or stated as "my friend's project" MUST be configured to be handled by a **Spring Boot server**.

`;

content = content.replace("## Source-of-Truth Order", replacement + "## Source-of-Truth Order");

fs.writeFileSync(file, content);
console.log("AGENTS.md updated successfully!");