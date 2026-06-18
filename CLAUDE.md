# CLAUDE.md — Architecture Firm Workflows
*This file is read automatically by Claude Code at the start of every session.*

---

## Who We Are
Athens-based architecture firm. This repository contains our AI-assisted workflow platform, starting with construction management and expanding to cover the full design-to-delivery process.

## Repo Structure
```
arch-firm-workflows/
├── CLAUDE.md                          ← you are here
├── AGENTS_STRUCTURE.md                ← firm-wide agent hierarchy
├── CONSTRUCTION_PLATFORM_SPEC.md      ← full spec for the construction platform
├── construction-platform/             ← active build — Phase 1 in progress
├── design-process/                    ← planned, not yet started
└── project-management/                ← planned, not yet started
```

## Active Work
**Construction Management Platform** — web app for tracking a live residential building project.

Building zones: Basement (B0), Housing Levels 1–4, Staircase, Elevator, Roof.

Current phase: **Phase 1** — Project setup, subcontractor registry, Gantt schedule.

Full spec: see `CONSTRUCTION_PLATFORM_SPEC.md` and `construction-platform/CONSTRUCTION_PLATFORM_SPEC.md`

## Tech Stack (Construction Platform)
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite
- Charts/Gantt: Recharts + custom Gantt component
- All code lives in: `construction-platform/`

## Build Rules
- Always work inside the correct subfolder (`construction-platform/`, etc.)
- Never touch `design-process/` or `project-management/` until instructed
- After each phase, confirm with the user before starting the next
- Keep UI professional and functional — dark theme, construction-appropriate
- Greek public holidays must be pre-loaded for 2025–2027
- Delay buffer is configurable per subcontractor (default 10%)

## Phases (Construction Platform)
1. ✅ Project setup form + Subcontractor registry + Basic Gantt — **build this first**
2. Orders & Deliveries tracker + Cost dashboard
3. Daily site log + Photo upload + Weekly PDF report
4. Delay threshold auto-apply + Critical path + Overlap conflict alerts

## Context for All Sessions
- Two users work on this repo: the principal architect and the PM
- Both have Claude Pro subscriptions
- Changes are shared via GitHub (push/pull)
- The platform is for internal use only (single-firm, Athens timezone, EUR currency)
- Language: English for code and docs; Greek holiday names are acceptable in the holidays table
