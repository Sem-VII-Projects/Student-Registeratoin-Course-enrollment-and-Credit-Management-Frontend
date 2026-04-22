# Localization Maintenance Guidelines

This document outlines the procedures for adding new language support (English/Myanmar) to the UniPortal system.

## ⚠️ Critical Maintenance Warnings
- **Preserve Structure:** When localizing, never remove or alter the wrapper `div`s, `section`s, or conditional rendering logic (`activeTab === '...' && (...)`). Accidental deletion will cause entire UI components to disappear from the rendered view.
- **Syntactic Integrity:** Ensure all JSX tags remain balanced. Mismatched or missing closing tags will trigger build failures.
- **Verify Before Commit:** After any modification, run `npm run build` locally to confirm the component structure remains intact and the build succeeds.
- **Style Isolation:** Do not modify parent `relative`/`absolute`/`z-index` classes in an attempt to fix UI issues. Instead, investigate if the obstruction is truly styling or an event-binding issue.
- **Test Interaction:** Always manually verify that form inputs (search bars, text areas) are still focusable and interactive after modifying the DOM or adding CSS classes.

## Workflow
1. Identify the hardcoded string.
2. Add it to `public/locales/en/translation.json` and `public/locales/my/translation.json`.
3. Use the `t()` hook in the component.
4. Verify by running `npm run build`.
