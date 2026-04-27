---
name: ui-enhancer-perplexity
description: Enhances UI/UX with minimalist principles, refined typography, and smooth transitions inspired by Perplexity AI. Operates under a strict guardrail to only modify presentation code while preserving business logic and the existing color system.
---

# UI Enhancer (Perplexity Inspired)

This skill applies minimalist, type-centric, and motion-enhanced design patterns to the UI, strictly following the UI Guardrail.

## Design Philosophy: "The Perplexity Essence"

1.  **Clarity & Breath**: Use ample whitespace. Avoid cluttered grids. Guide the user's eye using hierarchy rather than color.
2.  **Typography First**: 99% of the UI is type. Focus on font scale, line height (relaxed for body), and font weight (bold for headers, medium for labels).
3.  **Conversational Flow**: Sections should transition logically (Step 1, Step 2). Use micro-animations to indicate responsiveness.
4.  **Information Density**: Group related info into clean cards with subtle borders and "barely there" shadows.

## Guardrail Constraints (STRICT)

-   **Color System**: Do NOT change the hex codes of the current design system (e.g., `#077d8a`).
-   **Pure Presentation**: Only touch Tailwind classes, JSX structure (flex/grid), and CSS.
-   **Untouchable**: Hooks (`useState`, `useEffect`), Event Handlers (`onClick`), API calls, and business logic.
-   **Localization Protocol**: Use **Natural Language Keys** in `t()` (e.g., `t("Enrollment Mode")`). NO snake_case keys allowed.

## Reusable Animation Patterns (Tailwind)

Apply these to enhance the "feel" of the app:

-   **Smooth Entry**: `animate-in fade-in duration-500 slide-in-from-bottom-2` for new content or page loads.
-   **Subtle Hover**: `transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30`.
-   **Action Feedback**: `active:scale-[0.98] transition-transform` for buttons.
-   **Loading states**: Use refined shimmer skeletons instead of simple "Loading..." text.

## Execution Workflow

1.  **Audit**: Identify elements that feel "clunky" or "legacy".
2.  **Apply Minimalist Polish**: Increase padding, refine font sizes (using `text-sm` for details, `text-base` for body), and add borders `border-gray-100/50`.
3.  **Inject Motion**: Add the Tailwind animation classes to primary interactions.
4.  **Verify Integrity**: Ensure no functional code (logic/data) was altered. Verify that **ALL labels are localized correctly** using natural English strings as fallback keys.
