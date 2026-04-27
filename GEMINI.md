# UniPortal & UniAdmin CMS - Frontend

This project is the frontend for a comprehensive Student Registration, Course Enrollment, and Credit Management system. It features two primary portals: a Student Portal (UniPortal) and an Administrative Portal (UniAdmin).

## Project Overview

- **Purpose:** To streamline student registration, enrollment workflows, academic progress tracking, and administrative management.
- **Core Technologies:**
  - **Framework:** React 19
  - **Build Tool:** Vite
  - **Language:** TypeScript
  - **Styling:** Tailwind CSS (with minimalist 'Perplexity' aesthetics)     
  - **Routing:** React Router DOM (using `HashRouter`)
  - **Localization:** `react-i18next` (Supporting English and Myanmar)      
  - **State Management:** React Context API (`UIContext`)
  - **API Client:** Fetch API with a centralized wrapper in `lib/api.ts`    
  - **Authentication:** Role-based (Admin, Student, Register) using JWT tokens.

## Architecture

### Dual-Backend Integration
The frontend communicates with two distinct backend services, managed via Vite proxies:
1.  **FastAPI Backend:** Proxied via `/api/v1`. Typically handles newer features, AI/Chatbot functionalities, and specific student/admin workflows.     
2.  **Spring Boot Backend:** Proxied via `/api` and `/v1`. Handles core registration, student data, and legacy administrative tasks.

### API Centralization
- `lib/api.ts`: Contains the `api` object which centralizes all network requests.
- `lib/apiBase.ts`: Defines base URLs for different backends.
- Normalization logic is used within the API client to unify data structures from different backend sources (e.g., `normalizeStudent`, `normalizeAdmin`).

### Routing & Authentication
- `App.tsx`: Defines the application's routing structure and global auth state.
- **Roles:**
  - `admin`: Full access to UniAdmin features.
  - `student`: Access to enrollment, results, and dashboard.
  - `register`: Restricted access for new students in the registration/payment flow.
- Authentication state is synchronized with `localStorage` and `sessionStorage`.

### Localization Standards
To prevent untranslated snake_case keys from appearing in the UI:
- **Natural Language Keys:** Use full English strings as keys (e.g., `t("Course Enrollment")`) rather than snake_case (`t("course_enrollment")`). This ensures that if a translation is missing or loading, the UI remains readable in English.
- **Casing Integrity:** Keys are case-sensitive. Ensure the key in `t()` exactly matches the key in `translation.json`.
- **Mirroring:** Every new key added to `en/translation.json` MUST be mirrored in `my/translation.json`.
- **Ready State:** Components should ideally wait for `i18n.ready` if they rely on heavy translation sets, or use a loading guard to prevent "flickering" of raw keys.

## Building and Running

### Development
```bash
npm run dev
```
Starts the development server on `http://localhost:3000`. Note that it requires backend services to be running or accessible via the proxy targets defined in `vite.config.ts`.

### Production Build
```bash
npm run build
```
Generates a production-ready build in the `dist/` directory.

### Linting
```bash
npm run lint
```
Runs ESLint to check for code quality and style issues.

## Development Conventions

- **Visual Aesthetic:** Adheres to a high-end, minimalist 'Perplexity' design (font-black headings, 32px rounded containers, subtle micro-animations).  
- **Component Structure:** Components are organized in `components/`, with page-level components in `pages/`.
- **Styling:** Prefers Tailwind CSS utility classes. Significant custom styles are in `styles/`.
- **Type Safety:** Strict TypeScript usage is encouraged. Common types are defined in `types/` and `types.ts`.
- **Surgical Updates:** When modifying UI, preserve all existing functional elements and data fields.

## Key Files & Directories

- `App.tsx`: Root component and routing.
- `lib/api.ts`: Central API client.
- `context/UIContext.tsx`: Global UI state management.
- `components/`: Reusable UI components.
- `pages/`: Portal-specific page components.
- `public/locales/`: Localization resources.
- `vite.config.ts`: Build and proxy configuration.
- `types.ts` & `types/`: Type definitions.
