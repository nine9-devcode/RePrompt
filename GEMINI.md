# RePrompt: Stable Diffusion Prompt & Gallery Hub 🚀

This file contains the foundational mandates, technical standards, and workflows for the **RePrompt** project. Adhere to these instructions strictly.

## 📌 Project Overview
**RePrompt** is a self-hosted web application for saving, organizing, and searching Stable Diffusion prompts along with their generated images.

- **Primary Goal:** Enable easy reproduction of AI-generated images.
- **Educational Context:** The user is learning .NET (C#) and Angular. Explain technical concepts and the "why" behind implementation choices.

---

## 🛠️ Technical Stack & Standards

### 🎨 Frontend (Angular)
- **Framework:** Angular (Modern Standalone Components only).
- **Language:** TypeScript 100%. No `any`. Use interfaces in `core/models/`.
- **Styling:** Tailwind CSS. Avoid raw CSS files.
- **Icons:** Use imported icons instead of emojis for UI elements.
- **Key Features:** Dashboard/Gallery (Infinite Scroll/Pagination), CRUD for Prompts (Copy Click), Drag & Drop Upload, Bilingual Support (Thai/English).

### 🛡️ Backend (.NET Core)
- **Framework:** ASP.NET Core (Minimal APIs preferred: `app.MapGet`, `app.MapPost`).
- **Language:** C# (PascalCase for variables, functions, and classes).
- **ORM:** Entity Framework Core (EF Core) using LINQ for queries.
- **Database:** SQLite (File-based).
- **Storage:** Local File System for images.

---

## 🗄️ Database Schema

### Table: `Prompts`
- `Id`: GUID / Int (Primary Key)
- `Title`: String
- `PositivePrompt`: String
- `NegativePrompt`: String
- `Sampler`: String (e.g., Euler a, DPM++ 2M Karras)
- `Steps`: Int
- `CFGScale`: Float
- `Seed`: String/Long
- `ModelName`: String (Checkpoint/LoRA)
- `CreatedAt`: DateTime

### Table: `Images`
- `Id`: GUID / Int (Primary Key)
- `PromptId`: GUID / Int (Foreign Key to `Prompts`)
- `ImageUrl`: String (Path/URL)

---

## 🚨 Operational Mandates

### 1. Communication & Decisions
- **No Guessing:** If requirements are unclear, stop and ask.
- **Strategy First:** Always summarize your proposed implementation and get approval BEFORE writing code.
- **Surgical Precision:** Do not modify unrelated files or functions.
- **Refactoring:** Always request permission before refactoring existing code.

### 2. Code Delivery
- **No Placeholders:** Provide complete code blocks. Never use `// ... existing code ...`.
- **Concise Summaries:** Keep technical explanations focused and brief after providing code.
- **Validation:** Always check for side effects on Routing or Database Migrations.

### 3. Development Roadmap
- [x] **Phase 1:** Angular Frontend Structure
- [x] **Phase 2:** .NET Web API & EF Core Design
- [x] **Phase 3:** Backend Image Upload & Storage
- [x] **Phase 4:** Frontend-Backend Integration (API Calls)
- [x] **Phase 5:** UI Polishing & Copy-Prompt Feature
- [x] **Phase 6:** Image Modal & Delete Functionality
- [x] **Phase 7:** Edit Prompt & Metadata Update
- [x] **Phase 8:** Terminal Logs (Removed as per request)
- [x] **Phase 9:** Advanced Metadata, Autocomplete & Categories
- [x] **Phase 10:** Gallery Search, Filter & Server-Side Pagination
- [x] **Phase 11:** Toast Notifications System
- [x] **Phase 12:** Auto-Extract Image Metadata (Stable Diffusion)
- [x] **Phase 13:** Masonry Gallery Layout (Pinterest Style)
- [x] **Phase 14:** NSFW Content Handling (Blur & Toggle)
- [x] **Phase 15:** Web App Settings Page (Dynamic Configuration)
- [x] **Phase 16:** Custom Confirmation Modals & Advanced Gallery UI
- [x] **Phase 17:** Auto-Flag NSFW based on Keywords (Settings)
- [x] **Phase 18:** Clickable Tags (Chips) for Quick Selection
- [x] **Phase 19:** Global Drag & Drop Overlay (Anywhere Drop)
- [x] **Phase 20:** Backend Performance Optimization (Indexing & No-Tracking)
- [x] **Phase 21:** Advanced NSFW Censorship (Multiple Styles & Click-to-Reveal)
- [x] **Phase 22:** Gallery UX Refinement (Event Bubbling & Interaction Fixes)
- [x] **Phase 23:** Backend Thread-Safety & Filesystem Sync Optimization (Fixed concurrent suggestions endpoint and transaction safety for physical file deletions)
- [x] **Phase 24:** Frontend Performance Refactoring (Optimized change detection by caching censor filter values and states)
- [x] **Phase 25:** Seamless Infinite Scroll (Integrated IntersectionObserver to dynamically load prompts without manual buttons)

---

## 🛠️ Technical Notes & Troubleshooting

### 🚀 Launcher & Tools
- **Launcher Script:** `start-reprompt.bat` (Root directory).
  - Runs Backend (.NET) and Frontend (Angular) in a single consolidated CMD window.
  - Automatically kills any orphaned processes on port 4200 (Angular) and port 5144 (C# API) at startup to prevent port locking conflicts.
  - Automatically waits for Angular compilation using `curl` before opening the browser.
  - Built-in wait timeout (max 30 retries, ~90 seconds) in the check loop to prevent infinite hangs during compilation failure.
  - Standalone: Can be run without opening VS Code.

### 🎨 Frontend
- **Theme:** "IDE-Style" Dark Theme.
- **Tailwind CSS:** v3.4.17.
- **Masonry Layout:** Uses Tailwind `columns` and `break-inside-avoid` to create a Pinterest-style gallery that respects original image aspect ratios.
- **Image Metadata:** Form extracts Pixels (WxH), File Size, and Original Filename.
- **Auto-Extract SD Data:** Uses the `exifr` library to parse generation parameters (Prompt, Negative, Steps, Seed, Model) directly from uploaded PNG/JPEG/WebP images.
- **SSR & Vite Optimization:** Implemented dynamic imports for `exifr` with `/* @vite-ignore */` and `isPlatformBrowser` checks to avoid build-time analysis warnings and ensure SSR compatibility.
- **Search & Filter:** Implemented server-side filtering for Title, Category, and ModelName to ensure scalability.
- **Pagination:** Uses an "Offset/Limit" strategy with a "Load More" UI. Displays total matched results (e.g., "Showing 20 / 45").
- **Enhanced Gallery Cards:**
    - **Icon Actions:** Compact row for Copy POS (`$`), Copy NEG (`!`), and header-aligned Edit/Delete icons with theme-consistent colors.
    - **NSFW System:** 
        - **Multiple Styles:** Supports "Blur", "Pixelate" (via dynamic SVG filter), and "Solid Block" censor styles.
        - **Session Persistence:** Click-to-unblur state is tracked via a session-level Set (`unblurredIds`).
        - **Event Handling:** Optimized event propagation using `stopPropagation()` to prevent conflict between censor toggles and modal interaction.
- **NSFW Controls:** 
    - **Global Toggle:** Switch between "CENSORED" and "UNCENSORED" modes.
    - **Strict Mode:** Completely hide NSFW entries from the gallery.
    - **Persistence:** All states saved in `localStorage` with `isPlatformBrowser` safety checks.
- **Auto-Flag NSFW:** Automatically checks the NSFW toggle if keywords defined in Settings (stored in `localStorage`) are detected in positive or negative prompts during manual entry or auto-extraction.
- **Clickable Tags (Chips):** Replaced native `<datalist>` dropdowns with interactive chips for Category, Model, and Sampler. This allows 1-click selection of existing values while maintaining the ability to type new ones.
- **Global Drag & Drop:** Users can drop an image anywhere in the Prompt Form window to upload it. A full-screen dashed overlay with backdrop blur appears during the drag state to provide visual feedback. Optimized drag state changes using a numeric counter (`dragCounter`) to eliminate flicker.
- **Settings Page:** Dedicated route (`/settings`) for app-wide configuration:
    - **NSFW Blur Intensity:** Real-time slider (0-64px).
    - **NSFW Keywords:** Comma-separated list for auto-flagging.
    - **Censor Style:** Selection between Blur, Pixelate, and Block.
- **Custom Modals:**
    - **Inspector:** Advanced image viewer with mouse-wheel zoom and drag-to-pan capabilities. Displays all metadata including `seed`.
    - **Confirmations:** Custom-styled IDE-themed confirmation dialogs replace native browser `confirm()`.
- **Autocomplete:** Uses `datalist` populated by `/api/suggestions`.
- **Category System:** Prompts belong to a Category (Default: "General").
- **Bilingual UI:** Thai (Primary) + English (Parentheses) for all UI labels.
- **Toast Notifications:** Custom system using Angular Signals for non-blocking feedback (Copy, Save, Delete).
- **SSR & Prerender Build Fix:** Configured dynamic routing `edit/:id` to run with `RenderMode.Server` in `app.routes.server.ts` to solve Angular compile-time prerendering failures.
- **Template Performance Cache:** Optimized gallery rendering by mapping prompt models inside TypeScript (`preparePromptState`) rather than calling dynamic functions (like `getCensorFilter`) directly in Angular template expressions, preventing CPU overhead during change detection.
- **RxJS Subscription safety:** Embedded `takeUntilDestroyed` from `@angular/core/rxjs-interop` on valueChanges observables in PromptForm to prevent memory leaks when components are destroyed.
- **Auto Infinite Scroll:** Replaced the manual load-more button with a browser-safe `IntersectionObserver` directive targeting a sentinel bottom divider to automatically paginate prompts.

### 🛡️ Backend
- **Schema Update:** `Prompts` table includes `Category` and `IsNsfw` columns.
- **Optimization:** 
    - **AsNoTracking:** Implemented for all read-only API calls to reduce EF Core memory overhead.
    - **Thread-Safe Suggestions:** Fixed concurrency failures in `/suggestions` (caused by simultaneous queries running via `Task.WhenAll` on a single DbContext) by executing database fetches sequentially.
    - **Database Indexes:** Added composite and single-column indexes on `Category`, `ModelName`, and `CreatedAt` for faster filtering/sorting.
    - **Transaction-Safe Disk Deletion:** Deferred disk image removals in `PUT` and `DELETE` handlers to execute only after successful database savings (`SaveChangesAsync()`), securing file integrity against SQL transaction rollbacks.
- **Pagination API:** `GET /api/prompts` supports `search`, `category`, `model`, `limit`, and `offset`. Returns `{ totalCount, prompts }`.

