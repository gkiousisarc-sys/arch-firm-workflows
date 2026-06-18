# 🏗️ Construction Management Platform — Claude Code Spec
**Architecture Firm Athens | Active Project Platform**
*Version 1.0 | June 2026*

---

## Purpose

A web-based platform built with Claude Code that allows the project team to input, track, and visualize all construction activity for a multi-floor residential building. The platform produces a live timetable, cost dashboard, and subcontractor coordination view.

---

## Building Structure (This Project)

| Zone | Description |
|------|-------------|
| B0 | Basement (1 floor) |
| L1 | Ground floor / Level 1 housing |
| L2 | Level 2 housing |
| L3 | Level 3 housing |
| L4 | Level 4 housing |
| STAIR | Staircase (all levels) |
| LIFT | Elevator shaft & installation |
| ROOF | Roof slab, waterproofing, plant |

---

## Platform Modules

### MODULE 1 — Project Setup & Dimensions

**Inputs:**
- Project name, address, start date
- Per-zone: floor area (m²), ceiling height (m), slab area (m²)
- Upload field for floor plans (PDF) — stored as reference attachment
- Materials spec per zone (free text + structured fields)
- Overall project budget (€)

**Outputs:**
- Project summary card
- Zone area table auto-calculated
- Materials list per zone

---

### MODULE 2 — Subcontractor Registry

**Inputs per subcontractor:**
- Name / Company
- Trade (e.g. concrete, plumbing, electrical, plastering, tiling, carpentry, aluminum, marble, elevator)
- Contact person + phone
- Contract type (daily rate / fixed price / m² rate)
- Rate / price (€)
- Assigned zones
- Planned start date
- Planned end date
- Actual days worked (auto-tallied from schedule entries)

**Features:**
- Add / edit / deactivate subcontractors
- View subcontractors active on a given date
- Conflict detector: highlights when 2+ trades are in the same zone on same day (with override option and note)

---

### MODULE 3 — Work Schedule & Timetable

**Inputs:**
- Per subcontractor + zone: planned work periods (start date → end date)
- Work days per week (default Mon–Fri, configurable per subcontractor)
- Gap days (planned shutdowns, site closures)
- Greek public holidays (pre-loaded, editable)
- Custom holiday/gap entries (e.g. August closure, Christmas break)
- Delay threshold: % buffer applied to each phase (default 10%, configurable per trade)

**Outputs:**
- Gantt chart view — grouped by zone, then by subcontractor
- Calendar view — day-by-day, color-coded by trade
- Critical path: auto-identifies dependent phases (e.g. electrical roughing must complete before plastering)
- Projected completion date (with and without delay buffer)
- Export: PNG / PDF of Gantt

**Logic:**
```
Effective work days = Calendar days 
  - weekends 
  - Greek public holidays 
  - gap days 
  + delay buffer (% of phase duration)

Projected completion = latest phase end date (buffered)
```

---

### MODULE 4 — Orders & Deliveries Tracker

**Order categories:**

| Category | Examples |
|----------|---------|
| Kitchens | Kitchen units, worktops, appliances |
| Balusters & Railings | Staircase railings, balcony balusters |
| Marble & Stone | Floor marble, stair treads, cladding |
| Aluminum Works | Windows, sliding doors, curtain wall |
| Interior Doors | Apartment entrance doors, room doors |
| Waterproofing | Basement membrane, roof waterproofing materials |
| MEP Equipment | Boilers, HVAC units, electrical panels |
| Elevator | Cabin, mechanism, installation kit |
| Other | Custom entry |

**Per order inputs:**
- Category + item description
- Supplier name
- Order date
- Confirmed delivery date
- Lead time (days) — auto-calculates from order → delivery
- Assigned zone(s) and subcontractor
- Order value (€)
- Status: Draft / Ordered / Confirmed / Delivered / Installed

**Alerts:**
- ⚠️ Delivery date is after scheduled installation start → red flag
- ⏳ Order not yet placed but installation window is within 4 weeks → amber flag
- ✅ Delivery confirmed before installation window → green

---

### MODULE 5 — Cost & Budget Dashboard

**Inputs:**
- Budget per zone (or total project budget split by %)
- Subcontractor costs auto-pulled from registry × days worked
- Material order costs auto-pulled from orders tracker
- Manual cost entries (site preliminaries, supervision, fees, etc.)

**Outputs:**
- Total committed cost (orders placed + contracts signed)
- Total spent to date
- Remaining budget
- Cost per zone breakdown (bar chart)
- Cost per trade category (pie chart)
- Burn rate: spend per week, projected final cost
- Overrun alert: configurable threshold (default: flag when >5% over budget per zone)

---

### MODULE 6 — Daily Site Log

**Inputs (quick entry form):**
- Date
- Zone(s) active today
- Subcontractors on site (checkboxes from registry)
- Works carried out (free text per zone)
- Issues / blockers
- Photo upload (optional, stored with date + zone tag)
- Weather (dropdown: Fine / Rain / Wind / Extreme heat)

**Outputs:**
- Chronological log searchable by date / zone / subcontractor
- Auto-updates "actual days worked" counter per subcontractor
- Generates weekly summary report (PDF export)

---

## Data Model (Key Entities)

```
Project
  └── Zones[]
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
  └── Zone
  └── Date

Gap_Days[]
  └── Type (holiday | shutdown | custom)
  └── Date_Range

Daily_Logs[]
  └── Zone
  └── Subcontractors_Present[]
  └── Notes
  └── Photos[]
```

---

## Technology Stack (Claude Code Build)

| Layer | Choice |
|-------|--------|
| Frontend | React + Tailwind CSS |
| Charts / Gantt | Recharts + custom Gantt component |
| Backend / API | Node.js (Express) or Next.js API routes |
| Database | SQLite (local, simple) or Supabase (if cloud needed) |
| PDF Export | Puppeteer or jsPDF |
| File Storage | Local filesystem or Supabase Storage |
| Authentication | Single-user PIN or simple password (firm internal only) |

---

## Build Phases

### Phase 1 — Core (build first, meeting-ready)
- [ ] Project setup form
- [ ] Subcontractor registry
- [ ] Basic schedule input + Gantt view
- [ ] Greek holidays pre-loaded

### Phase 2 — Orders & Costs
- [ ] Orders tracker with alert logic
- [ ] Cost dashboard
- [ ] Budget vs. actual view

### Phase 3 — Daily Operations
- [ ] Daily site log
- [ ] Photo upload
- [ ] Weekly PDF report export

### Phase 4 — Intelligence
- [ ] Delay threshold auto-apply
- [ ] Critical path detection
- [ ] Overlap conflict alerts
- [ ] Projected completion recalculation

---

## Greek Public Holidays (Pre-load)

| Date | Holiday |
|------|---------|
| Jan 1 | New Year's Day |
| Jan 6 | Epiphany |
| Mar 25 | Independence Day |
| Apr (variable) | Clean Monday (Καθαρά Δευτέρα) |
| Apr (variable) | Good Friday |
| Apr (variable) | Easter Sunday + Monday |
| May 1 | Labour Day |
| Jun (variable) | Whit Monday |
| Aug 15 | Dormition of the Virgin |
| Oct 28 | Ohi Day |
| Dec 25 | Christmas Day |
| Dec 26 | Boxing Day (St. Stephen) |

*Plus: August site closure (typically Aug 1–31 — configurable per project)*

---

## Claude Code Prompt to Start Build

Paste this into Claude Code to begin:

```
Build a construction management web platform for an Athens architecture firm.
The project is a multi-floor residential building with: 1 basement, 4 housing 
floors, staircase, elevator shaft, and roof.

Tech stack: React + Tailwind + Node.js/Express + SQLite.

Start with Module 1 (Project Setup) and Module 2 (Subcontractor Registry) with 
a clean sidebar navigation. Use a dark construction-themed UI. 
Pre-load Greek public holidays for 2025–2027.

Follow the full spec in CONSTRUCTION_PLATFORM_SPEC.md.
```

---

## Files in This Project

```
/project-root
├── AGENTS_STRUCTURE.md          ← firm-wide agent map
├── CONSTRUCTION_PLATFORM_SPEC.md ← this file
└── /construction-platform        ← Claude Code will build here
```
