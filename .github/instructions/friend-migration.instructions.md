---
description: "Use when migrating pages or components from the friend's frontend project. Covers dependencies, code preservation, and routing placement."
---
# Friend's Project Migration Guidelines

When the user provides a screenshot and file(s) to migrate a page from the friend's project, follow these strict rules:

1. **Review the Migration Plan**: Always consult `Friend_Project_Migration_Plan.md` to understand the routing context and overall architecture.
2. **Install Required Dependencies**: Check the incoming files for specific dependencies (e.g., `@supabase/supabase-js`, `@emailjs/browser`, `xlsx`) and install them if they are not already in `package.json`.
3. **Surgical Refactoring**: When modifying existing files in our codebase (like `App.tsx` or navigation components), you are permitted to refactor or modify existing code to ensure seamless integration. Prioritize maintaining existing functionality and paths while improving code structure or aesthetics.
4. **Preserve Friend's Code and Text**: Preserve Friend's Logic but strictly adapt the styling and CSS to match the clean, minimalist dashboard aesthetic established in the workspace's planning documents (like `UI_UX_Analysis_Improvement_Plan.md`). Replace legacy heavy gradients and arbitrary hex colors with our official modern Tailwind styling (slate/light gray backgrounds, crisp white cards, subtle borders, and emerald accents).
   - **CRITICAL:** Always strictly preserve all original foreign language texts (such as Myanmar/Burmese). When applying modern, minimalist UI transformations, NEVER delete or translate the original Myanmar strings.
5. **Strict Placement**: Follow the user's exact instructions regarding where the new page should be placed in the component tree or routing hierarchy (e.g., "first look", "after login").