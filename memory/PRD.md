# Lärarplaneraren – PRD

## Original problem statement
Build a functional MVP of a digital teacher planner. Swedish UI. Warm off-white / muted pastel Canva+Notion aesthetic. Frontend-only React + localStorage. Starts completely empty. No auth, no backend, no external APIs. Central principle: **enter information once, display it everywhere it is relevant.**

## Architecture
- React 19 + React Router 7 + Tailwind + shadcn/ui + Lucide + Sonner (toasts)
- Single-source state via `PlannerContext` (`/app/frontend/src/context/PlannerContext.jsx`) persisted to `localStorage` key `lararplanerare_v1`
- Three-area layout (`Layout.jsx`): sidebar nav, main outlet, persistent collapsible right "Att göra" panel
- ISO week helpers in `lib/dateUtils.js`; derived data (week, materials, unit progress, task sort) in `lib/plannerHelpers.js`

## Data entities (all in one JSON tree)
`classes, subjects, students, timetable, events (lesson|meeting|utvecklingssamtal), units, tasks, followups, calendarExceptions, studentNotes, meetingNotes, studentAdaptations, studentSupport`

Follow-up sync: one `followup` object mirrors one linked `task` (sourceType=`followup`) — toggling either updates both. Displayed inline in weekly planner top-of-day column and in Att göra panel. PDF materials optionally spawn a `Skriv ut …` task with the lesson date as deadline.

## Implemented (v1, 2026-02)
- Översikt dashboard with empty-state onboarding, 4 stat cards, today's list (mixing recurring slots + events), upcoming follow-ups, active unit progress
- Veckoplanering: 5-column Mon–Fri, prev/next/this-week nav, virtual timetable slots + materialised events, exceptions banners, follow-up rows
- Läsår/Termin: Arbetsområden with progress bars; Kalenderavvikelser with "Dölj ordinarie lektioner"
- Elevkort: search list + tabs (Dagliga notiser, Mötesanteckningar, Anpassningar, Behov & stöd, Uppföljning) — utvecklingssamtal events auto-shown in Mötesanteckningar
- Material: derived list from all lesson materials
- Inställningar: klasser, ämnen (pastellpalett), elever, återkommande schema, backup export/import JSON, rensa hela planeraren
- LessonDialog: create Lektion / Möte / Utvecklingssamtal (+ optional prep task)
- LessonExpandedDialog: notes, materials with PDF print prompt, genomförd, ta bort

## Backlog / not yet built
- Drag-to-move lessons between days
- Copy previous week's plan
- Search across everything
- Multi-teacher / cloud sync (would need auth + backend)
- PWA/offline install prompt
- Print/export week as PDF
