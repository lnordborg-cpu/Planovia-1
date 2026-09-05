# Planovia – PRD

## Original problem statement
Build a functional MVP of a digital teacher planner named **Planovia** (formerly Planova, rebranded 2026-02). Swedish UI. Warm off-white / muted pastel Canva+Notion aesthetic. Frontend-only React + localStorage. Starts completely empty. No auth/backend at MVP stage. Central principle: **enter information once, display it everywhere it is relevant.**

## Brand identity (2026-02)
- Name: **Planovia**
- Tagline: *Din digitala lärarplanerare*
- Core words: **Samla · Planera · Inspirera** (muted sage / dusty rose / warm gold)
- **Official logo (2026-09)**: uploaded PNG at `/app/frontend/public/planovia-logo.png` – tree with dusty-rose heart in the canopy. Used consistently: navigation, welcome page, login page, favicon. Component `/app/frontend/src/components/PlanoviaLogo.jsx` exports `PlanoviaMark` (renders the official PNG) plus `PlanoviaCompact` / `PlanoviaStandard` / `PlanoviaFull` lockups.
- Favicon: `/planovia-logo.png` (same official mark).
- **Hero copy (landing / login)**: headline *"Allt för din lärarvardag – samlat på ett ställe."* with supporting paragraph *"Planera undervisningen, samla reflektioner och behåll överblicken. Planovia kopplar samman din planering så att informationen finns där du behöver den – från läsår och vecka till dagens lektion."* Dashboard `/oversikt` retains personal "God morgon" greeting – hero copy never appears there.

## Architecture
- React 19 + React Router 7 + Tailwind + shadcn/ui + Lucide + Sonner (toasts) + Recharts
- Single-source state via `PlannerContext` (`/app/frontend/src/context/PlannerContext.jsx`) persisted to `localStorage` key `lararplanerare_v1`
- Three-area layout (`Layout.jsx`): sidebar nav, main outlet, persistent collapsible right "Att göra" panel
- ISO week helpers in `lib/dateUtils.js`; derived data (week, materials, unit progress, task sort) in `lib/plannerHelpers.js`

## Data entities
`classes, subjects, students, timetable, events (lesson|meeting|utvecklingssamtal), units, tasks (with completedAt), followups, calendarExceptions, studentNotes, meetingNotes, studentAdaptations, studentSupport, meetingTemplates, standaloneMaterials, customSubcategories, dayTrends, daySummaries`

## Implemented
- Base: Översikt, Läsår/Termin, Veckoplanering, Elevkort, Material, Statistik, Inställningar, **Välkomstsida (/valkommen)**
- Warm "Planova" identity: serif-display greeting, sage/clay/sky/lilac pastels
- Weekly planner: drag & drop, copy previous week, virtual timetable, exceptions
- Global search (⌘K), Quick note FAB
- PDF preview, file attachments (base64 up to 4MB)
- Material folder tree (subject × subcategory) with custom folders
- Statistik: per-subject/class bar charts with color-clickable legend, weekly trend line
- Term selector (HT/VT + auto), Evening mode (Kvällsläge auto/on/off)
- Meeting templates in Settings
- **[2026-02] Drop-zone Material** – drag file rows onto folder tree; drop-target highlight + toast "Flyttad"
- **[2026-02] Nattlig rapport** – dark card on /oversikt when evening mode active: "Idag klarade du X lektioner och Y uppgifter" + encouragement. Tasks tracked via new `completedAt` field.
- **[2026-02] Sammanfatta dagen** – Day summary card on /oversikt with 4 default trends (Energi, Fokus, Elevernas stämning, Egen känsla) on 1–5 scale + note. Editable, per-date storage in `daySummaries`.
- **[2026-02] Trend-statistik** – Dagliga trender on /statistik: line chart over time + bar chart of average per weekday (Mon–Fri).
- **[2026-02] Anpassbara trender** – Add/rename/color/delete/reset default day trends in /installningar.
- **[2026-02] File & media storage** – FastAPI backend `/api/uploads` + `/api/files/{id}` backed by **Emergent Object Storage**. Replaces base64-in-localStorage. Files up to 20MB. MongoDB `files` collection tracks metadata with soft-delete. `frontend/src/lib/api.js` provides `uploadFile`/`deleteFile` helpers. Regression tests in `/app/backend/tests/test_uploads.py`.
- **[2026-02] Reflektion i Kvällsläge** – 25 handplockade svenska kvällscitat, väljs deterministiskt per datum, visas under nattliga rapporten (`EveningReport.jsx`).
- **[2026-02] Trend Insikter** – Regelbaserad analys av `daySummaries` i `frontend/src/lib/insights.js`. Detekterar tunga veckodagar, stigande/fallande trender och "drömveckor". Visas kompakt (max 2) på Översikt och fullständig på Statistik via `TrendInsights.jsx`.
- **[2026-02] Välkomstsida (/valkommen)** – `PlanoviaFull` lockup + tagline + Samla · Planera · Inspirera + tre feature-kort + "Kom igång"-CTA. Auto-omdirigering första gången via `hasSeenWelcome`-flag i planner-state.
- **[2026-02] Kollapsbar sidebar** – Toggle-knapp fäller sidebaren till 64px med enbart trädikon + nav-ikoner. Persisterat i `sidebarCollapsed`. Auto-kollaps under 1024px viewport.
- **[2026-09-05] Officiell logotyp + ny hero-copy** – PNG-logotyp (`/planovia-logo.png`) används överallt (nav, favicon, valkommen, logga-in). Ny hero-rubrik "Allt för din lärarvardag – samlat på ett ställe."
- **[2026-09-05] Lektionsmallar-katalog i Inställningar** – Ny sektion `section-lesson-templates` med lista, inline-rename (`renameLessonTemplate`) och radering med bekräftelse.
- **[2026-09-05] Skriv ut/PDF möte** – `lib/printMeeting.js` öppnar nytt fönster med utskriftsvänlig HTML (agenda, deltagare, beslut, uppföljningar). Print-knapp visas i `LessonExpandedDialog` header för `type === "meeting"`.
- **[2026-09-05] Terminstidslinje utökad** – `TerminTimeline` renderar `calendarExceptions` som färgade band ovanför unit-lanes (typ 'lov' = beige, 'provperiod' = rosa, etc.). Rendrar även när endast exceptions finns.
- **[2026-09-05] Dela vecka med vikarie** – Ny publik läslänk via `POST /api/share/week` + `GET /api/share/week/{token}` + `DELETE /api/share/week/{token}` (revoke via `X-Revoke-Secret`). 7-dagars TTL. Ny route `/vikarie/:token` renderar `Vikarie.jsx` utan sidebar. Nytt fält `event.substituteNote` för "För vikarie"-anteckningar. Backend: MongoDB `week_shares` collection med bcrypt-hashad revoke-secret.

## Backlog
- **P1 – Auth (skipped by user's earlier requests):** Emergent-managed Google Sign-in + Email/password login (msg 183 + 211). Must call `integration_playbook_expert_v2` before implementing.
- **P1 – Reflektion i Kvällsläge**: small encouraging line on /oversikt when kvällsläget aktiveras
- **P1 – Till lov-knapp**: quick jump between HT/VT first break in Veckoplanering
- **P2 – Cloud sync** (needs auth + backend + Mongo)
- **P2 – PWA/offline install prompt**
- **P2 – Print/export week as PDF**

## Notes for future agents
- Language: Swedish always
- Never modify colors palette without user consent — see `constants.js` SUBJECT_COLORS
- Evening mode CSS in `index.css` — body class `evening-mode`
- All new data lists MUST be backfilled on load (see PlannerProvider init) to keep older saves compatible
