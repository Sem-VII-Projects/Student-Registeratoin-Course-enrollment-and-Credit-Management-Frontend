# Knowledge Base (LEARNINGS.md)

## Technical Insights
- **PowerShell vs Bash:** All terminal commands must be compatible with Windows PowerShell (no heredocs, careful with quoting in inline scripts).
- **React 19 Compatibility:** Ensure hooks and component patterns align with React 19 standards.
- **i18next Integration:** Myanmar (my) and English (en) locales are stored in `public/locales/`. Use the `useTranslation` hook for all UI text.
- **Supabase Client:** Centralized in `src/supabase/supabaseClient.js` (legacy) and `lib/api.ts` for newer implementations.

## Project Quirks
- **Dual Project Structure:** The workspace contains both "Course Enrollment" (Current) and "Student Registration" (Friend's project). Always keep them isolated.
- **Spring Boot Integration:** Friend's project (Student Registration) routes to a Spring Boot backend, while the main project uses Supabase.

## Proven Solutions
- **UI Consistency:** Use the 'Perplexity' design aesthetic (font-black headings, 32px rounded corners, ample whitespace) for all new components.
