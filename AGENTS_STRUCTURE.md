# 🏛️ Architecture Firm — AI Agents & Subagents Structure
**Athens-based Firm | Workflow Automation via Claude Code**
*Last updated: June 2026*

---

## Overview

This document maps the agent hierarchy that powers the firm's end-to-end workflow — from design inception through construction completion. Each top-level **Agent** owns a domain; **Subagents** handle specific tasks within that domain.

---

## Agent Map

```
FIRM WORKFLOW
│
├── 🏗️  AGENT: CONSTRUCTION MANAGEMENT          ← active now
│   ├── Subagent: Site Input & Data Collection
│   ├── Subagent: Timetable & Scheduling
│   ├── Subagent: Subcontractor Coordination
│   ├── Subagent: Materials & Orders Tracker
│   └── Subagent: Cost & Budget Monitor
│
├── 🎨  AGENT: DESIGN PROCESS                   ← to be built
│   ├── Subagent: Brief & Programme Analysis
│   ├── Subagent: Concept Development
│   ├── Subagent: Drawing & Document Manager
│   └── Subagent: Client Communication
│
├── 📋  AGENT: PROJECT MANAGEMENT               ← to be built
│   ├── Subagent: Milestone Tracker
│   ├── Subagent: Permit & Compliance Monitor
│   └── Subagent: Reporting & Dashboards
│
└── 💼  AGENT: OFFICE OPERATIONS               ← to be built
    ├── Subagent: Fee & Invoice Manager
    ├── Subagent: Team Scheduling
    └── Subagent: Vendor & Supplier Database
```

---

## 🏗️ AGENT: CONSTRUCTION MANAGEMENT
*Status: Active — Platform in development (see CONSTRUCTION_PLATFORM_SPEC.md)*

The Construction Management Agent oversees all activity on active building sites. It accepts real-time inputs from site supervisors and project architects, tracks progress across floors/zones, and surfaces schedule conflicts, cost overruns, and critical path risks.

### Subagent 1 — Site Input & Data Collection
- Accepts inputs: dimensions, areas, floor plans, materials specs
- Parses uploaded drawings (PDF/DWG references)
- Logs daily/weekly site progress reports
- Stores zone-by-zone status (Basement, L1–L4, Staircase, Elevator, Roof)

### Subagent 2 — Timetable & Scheduling
- Generates Gantt-style schedules per subcontractor and zone
- Tracks work days, gap days, and public holidays (Greek calendar)
- Applies delay threshold buffer (configurable %)
- Flags critical path dependencies and overlaps
- Recalculates projected completion on any update

### Subagent 3 — Subcontractor Coordination
- Manages subcontractor registry (name, trade, contact, contract dates)
- Tracks which subcontractors are active per zone/floor on any given day
- Detects overlapping crews in the same zone
- Logs on-site days and absences

### Subagent 4 — Materials & Orders Tracker
- Tracks all supply orders: kitchens, balusters, marble, aluminum windows, doors, etc.
- Links delivery dates to schedule dependencies
- Sends alerts when delivery lags behind installation window
- Manages lead times per supplier/category

### Subagent 5 — Cost & Budget Monitor
- Logs costs per subcontractor, per zone, per trade category
- Tracks cumulative spend vs. budget
- Projects final cost based on current burn rate
- Flags overruns with configurable threshold alerts

---

## 🎨 AGENT: DESIGN PROCESS
*Status: Planned — Structure to be defined in next session*

Handles the design workflow from initial brief through developed design and technical drawings.

*(Subagents to be defined)*

---

## 📋 AGENT: PROJECT MANAGEMENT
*Status: Planned*

Cross-cutting agent that connects design and construction phases, manages permits, milestones, and client reporting.

*(Subagents to be defined)*

---

## 💼 AGENT: OFFICE OPERATIONS
*Status: Planned*

Back-office automation: fees, invoicing, team allocation, and vendor management.

*(Subagents to be defined)*

---

## Notes
- All agents are to be deployed via **Claude Code**
- The Construction Management platform is the first to be built (see companion spec file)
- Design Process agent structure will be created in the next working session
- This file lives at the root of the firm's Claude Code project directory
