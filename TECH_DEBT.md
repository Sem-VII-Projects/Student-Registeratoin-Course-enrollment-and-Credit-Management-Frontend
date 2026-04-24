# Technical Debt & Refactoring (TECH_DEBT.md)

## Priority: High
- **API Consolidation:** Ensure all API calls use the `lib/api.ts` singleton rather than direct Supabase client calls.
- **Type Safety:** Move all remaining any/untyped interfaces to `types.ts` or project-specific type files.

## Priority: Medium
- **Component Consistency:** Audit legacy components (e.g., in `Temp/`) to ensure they match the 'Perplexity' UI aesthetic.
- **Localization Completion:** Verify all UI strings are properly extracted to `public/locales/`.

## Priority: Low
- **Performance:** Evaluate bundle size and lazy loading for large dashboard components.
- **Testing:** Increase test coverage for critical enrollment logic.
