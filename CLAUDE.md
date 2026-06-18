# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Repo Is

Athens-based architecture firm. This repository contains an AI-assisted workflow platform, starting with a **Construction Management Platform** and expanding later to design process and project management tooling.

Two users share this repo (principal architect + PM), both with Claude Pro, collaborating via GitHub. The platform is internal only — Athens timezone, EUR currency, English code/docs.

---

## Repo Structure

```
arch-firm-workflows/
├── CLAUDE.md                          ← you are here
├── AGENTS_STRUCTURE.md                ← firm-wide agent hierarchy (read-only reference)
├── CONSTRUCTION_PLATFORM_SPEC.md      ← full spec for the construction platform
├── construction-platform/             ← active build (Phase 1 in progress)
├── design-process/                    ← planned, not yet started
└── project-management/                ← planned, not yet started
```

Never touch `design-process/` or `project-management/` until instructed. All active work lives in `construction-platform/`.

---

## Tech Stack (Construction Platform)

| Layer | Choice |
|-------|--------|
| Frontend | React + Tailwind CSS |
| Charts / Gantt | Recharts + custom Gantt component |
| Backend | Node.js + Express |
| Database | SQLite |
| PDF Export | Puppeteer or jsPDF |
| Auth | Single-user PIN (firm internal only) |

---

## Build & Run Commands

```bash
cd construction-platform
npm install
npm run dev          # starts local dev server at http://localhost:3000
```

To run just the backend separately (if split):
```bash
npm run server       # Express API
npm run client       # React frontend
```

---

## Build Phases

Work through phases in order; confirm with the user before starting the next phase.

| Phase | Status | Scope |
|-------|--------|-------|
| 1 | **Active** | Project setup form + Subcontractor registry + Basic Gantt + Greek holidays |
| 2 | Planned | Orders & Deliveries tracker + Cost dashboard |
| 3 | Planned | Daily site log + Photo upload + Weekly PDF report |
| 4 | Planned | Delay auto-apply + Critical path + Overlap conflict alerts |

---

## Core Business Logic

**Schedule calculation:**
```
Effective work days = Calendar days
  - weekends
  - Greek public holidays
  - gap days (site closures, custom shutdowns)
  + delay buffer (% of phase duration, default 10%, configurable per trade)

Projected completion = latest buffered phase end date
```

**Greek public holidays** must be pre-loaded for 2025–2027. Fixed dates: Jan 1, Jan 6, Mar 25, May 1, Aug 15, Oct 28, Dec 25, Dec 26. Variable dates (Orthodox Easter-based): Clean Monday, Good Friday, Easter Sunday+Monday, Whit Monday. August site closure (typically Aug 1–31) is configurable per project.

**Order alert logic (Module 4):**
- Red: delivery date is after scheduled installation start
- Amber: order not yet placed and installation window is within 4 weeks
- Green: delivery confirmed before installation window

**Cost overrun alert:** configurable threshold, default flag at >5% over budget per zone.

**Overlap conflict:** flag when 2+ trades are assigned to the same zone on the same day (with override option + note).

---

## Data Model (Key Entities)

```
Project
  └── Zones[] (B0, L1–L4, STAIR, LIFT, ROOF)
       └── Materials[]
       └── Schedule_Phases[]

Subcontractors[]
  └── Assigned_Zones[]
  └── Work_Periods[]
  └── Daily_Log_Entries[]

Orders[]
  └── Linked_Zone
  └── Linked_Subcontractor

Cost_Entries[]
  └── Category (subcontractor | order | preliminary | other)
  └── Zone, Date

Gap_Days[]
  └── Type (holiday | shutdown | custom)
  └── Date_Range

Daily_Logs[]
  └── Zone, Subcontractors_Present[], Notes, Photos[]
```

---

## UI Rules

- Dark theme, professional construction aesthetic
- Sidebar navigation between modules
- Language: English for all UI labels and code; Greek holiday names are acceptable in the holidays data table
