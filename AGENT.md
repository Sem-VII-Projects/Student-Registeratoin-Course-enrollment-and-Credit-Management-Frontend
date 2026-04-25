# AGENTS.md

## Project Context
This workspace implements a University Management System (UniPortal / UniAdmin CMS).
All planning, code generation, and review should follow the skill files under `Frontend/.github/skills`, prompt standards under `Frontend/.github/prompts`, and role definitions under `Frontend/.github/agents`.


## Project Scope & Separation (CRITICAL)
This workspace contains two distinct projects:
1. **Course Enrollment and Credit Management** (My Project)
2. **Student Registration** (My friend's project)

**Rule 1: Component Separation**
When a task or component is explicitly labeled or stated as "my friend's project" (Student Registration), the code or component MUST be separately copied, created, or placed. DO NOT overwrite, modify, or delete any components belonging to "my project" (Course Enrollment and Credit Management).

**Rule 2: API & Backend Routing**
Any API endpoint, service, or backend integration labeled or stated as "my friend's project" MUST be configured to be handled by a **Spring Boot server**.

## Source-of-Truth Order
When rules conflict, apply this precedence:
1. `Frontend/.github/skills/business-logic/SKILL.md`
2. `Frontend/.github/skills/data-schemas/SKILL.md`
3. `Frontend/.github/skills/ui-patterns/SKILL.md`
4. Relevant prompt template (`apiGuide.prompt.md`, `scaffold-page.prompt.md`)
5. Relevant role profile (`academic-advisor.agent.md`, `conflict-resolver.agent.md`)

## Business Logic Rules (Mandatory)
1. Enforce authentication gate:
- If `must_reset_password` is `true`, redirect to `/reset-password`.
- Do not allow dashboard access before reset completion.
2. Role routing after auth/reset:
- `student` -> Student Dashboard.
- `admin`/staff -> Admin Dashboard.
3. Enrollment flow must be sequential and strict:
- Course selection.
- Credit limit check (`total + candidate <= 24`).
- Prerequisite validation against `Academic History` with `Completed` status.
- Retake verification (`is_retake: true` for previously failed courses).
- Final confirmation and persistence.
4. Trade-off logic on credit overflow:
- Preserve retakes.
- Drop electives first.
- Defer core only if needed.
5. Student status constraints:
- Respect registration type (Regular/Private) and academic standing (Active/Probation/Suspended).
- Apply probation/failure caps where required.

## Data Schema Rules (Mandatory)
1. Treat `Frontend/.github/skills/data-schemas/SKILL.md` as schema authority.
2. Match collection field names, enums, and value domains exactly.
3. Use correct polymorphism:
- `User.role='student'` requires `student_profile`.
- `User.role='admin'` requires `admin_profile`.
4. Keep auth data separated (`UserAuth`) and preserve `must_reset_password`.
5. Enforce academic enums exactly, including year/semester labels in the prescribed string format.
6. Frontend types and API payloads must align with schema constraints before integration.

## UI/UX Rules (Mandatory)
1. Follow `Frontend/.github/skills/ui-patterns/SKILL.md` design system.
2. Use the defined palette:
- Primary blue `#0d4a8f`, secondary blue `#1e73be`, teal `#077d8a`, yellow `#ffc20e`.
3. Typography:
- Heading: Poppins (500/600/700).
- Body: Roboto (400, 16px baseline).
4. Tailwind-first styling patterns:
- Buttons/cards with `rounded-[6px]` or specified component radii.
- Form focus/hover states must match design tokens.
5. Reuse layout primitives:
- Sidebar + Header for app pages.
- Standard table, card, and notification patterns.
6. Keep responsive behavior desktop-first with tablet/mobile adaptation.

## API & Typing Rules
1. Use centralized API client (`lib/api.ts`) and TypeScript types (`types.ts`).
2. Prefer generic request typing (`request<T>`) and typed method returns.
3. Standardize error handling with status-aware errors.
4. Include loading and error states for data fetches.
5. Keep code ready for scalable patterns (query caching/interceptors/runtime validation) when extending API layer.

## Scripting & Automation Rules
1. **Windows PowerShell Environment**: Keep in mind that all terminal commands execute in PowerShell.
2. **No Heredocs**: Never use bash `cat << 'EOF' > file.ext` or complex terminal output redirection since it leads to syntax errors in PowerShell.
3. **No Inline Scripts**: Never use `node -e "..."` with embedded quotes or backslashes `\"`, as escaping fails on PowerShell and results in `MODULE_NOT_FOUND` or `SyntaxError: Invalid or unexpected token`. 
4. ALWAYS use the designated `create_file` tool to drop `.cjs` or script files to disk, execute them via `node file.cjs`, and then optionally delete them.

## Prompt-Conformant Scaffolding
When generating a new page:
1. Use functional React components and hooks.
2. Integrate existing `Sidebar` and `Header`.
3. Use Tailwind classes aligned with UI pattern skill.
4. Fetch via `api` singleton and typed interfaces.
5. Implement clear loading, error, and success states.

## Agent Roles
Use these behavior modes when task intent matches:

### Academic Advisor Mode
- Focus: student success, degree planning, dashboard guidance.
- Must apply prerequisite checks and enrollment sequence before recommendations.
- Prioritize retakes, then credit constraints, then prerequisites.
- Tailor advice to registration type and academic standing.

### Conflict Resolver Mode
- Trigger: enrollment exceeds 24 credits or conflict optimization request.
- Resolve using strict priorities:
1. Preserve retakes.
2. Remove electives first.
3. Defer core only when necessary.
- Re-validate prerequisites after each adjustment.

## Output Expectations
1. Proposals and implementations must cite which rules above they satisfy.
2. Never bypass prerequisite or credit-limit checks in generated logic.
3. Keep UI output consistent with UniPortal tokens and component conventions.
4. Keep schema/API outputs strongly typed and enum-safe.
