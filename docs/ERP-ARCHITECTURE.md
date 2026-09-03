# MASTER ERP ARCHITECTURE SPECIFICATION

> **Principle**: ONE PLATFORM | ONE ARCHITECTURE | ONE DESIGN SYSTEM | ONE CORE | MANY MODULES

---

## 1. Executive Summary & Core Directives

This project operates under a unified, enterprise-grade ERP architecture. Multiple AI coding agents and human developers (Antigravity, Cursor, GitHub Copilot, etc.) will contribute to this codebase over time. 

**Rule #1**: No AI agent or developer is permitted to introduce competing architectures, secondary UI frameworks, duplicated core services, or parallel permission/database systems.

---

## 2. Technology Stack Matrix

| Tier | Primary Technology | Standard Libraries / Specifications |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript ~5.6) | Vite 5, React Router DOM 6 |
| **State & API Client** | Redux Toolkit & RTK Query | `@reduxjs/toolkit`, `react-redux` |
| **UI Component Library** | Material UI (MUI v6) | `@mui/material`, `@emotion/react`, `@emotion/styled` |
| **Icons & Styling** | Lucide Icons (`lucide-react`) | Vanilla CSS / Tailwind CSS utilities, HSL dark/light palette |
| **Forms & Validation** | React Hook Form & Zod | `@hookform/resolvers`, `zod` |
| **Backend Framework** | Python 3.12 + FastAPI | Uvicorn (ASGI Server), Pydantic v2 |
| **Database ORM** | SQLAlchemy 2.0 (Mapped Types) | PostgreSQL 16 (Prod) / SQLite (Dev) |
| **Migrations** | Alembic | Version-controlled, idempotent DDL scripts |
| **Auth & Security** | JWT (`pyjwt`) + Argon2 hashing | `argon2-cffi`, OAuth2 Bearer scheme |
| **Logging & Audit** | `python-json-logger`, `ActivityLog` | Structured JSON logs + Audit tables |

---

## 3. Directory Layout Standard

```
CRM-Finance/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── api/                # RTK Query Services (mastersApi, applicationsApi, etc.)
│   │   ├── app/                # Redux store & root configurations
│   │   ├── auth/               # Auth guards & token storage
│   │   ├── components/         # Shared Core UI Design System
│   │   │   ├── fields/         # Form Engine & Dynamic Field Builders
│   │   │   ├── layout/         # ERP Shell (TopHeader, Sidebar, PageHeader)
│   │   │   └── ui/             # DataTable, Dialogs, Toasts, Badges, EmptyStates
│   │   ├── context/            # Global React Contexts (AuthPermissionContext)
│   │   ├── features/           # Reusable ERP Feature Engines (Dynamic Tabs, Config)
│   │   ├── pages/              # Module Page Views (Leads, Projects, Tasks, HR, etc.)
│   │   ├── theme/              # MUI Theme tokens & color palettes
│   │   ├── types/              # Unified TypeScript definitions
│   │   └── utils/              # Formatter & helper utilities
├── server/                     # Backend API & Business Engine
│   ├── alembic/                # Database Migrations
│   ├── app/
│   │   ├── api/v1/             # REST Route Handlers (Endpoints)
│   │   ├── core/               # App config, Security, Password Hashing
│   │   ├── db/                 # DB Session, Base Model, RBAC Seeding
│   │   ├── models/             # SQLAlchemy ORM Data Models
│   │   ├── rbac/               # Permission Registry & Enforcement Guards
│   │   ├── schemas/            # Pydantic Input/Output Validation Schemas
│   │   └── services/           # Reusable Core Business Engines
│   ├── scripts/                # Database Seeding & Maintenance
│   └── tests/                  # Pytest Automated Test Suite
└── docs/                       # Architecture & Technical Documentation
    ├── ERP-ARCHITECTURE.md
    ├── AI-DEVELOPMENT-RULES.md
    └── MODULE-ARCHITECTURE.md
```

---

## 4. Core Platform vs. Business Modules

The ERP is divided into **Core Platform Infrastructure** and **Business Modules**.

### Core Platform Infrastructure (`shared`)
- **Authentication**: JWT verification, token rotation, session context.
- **RBAC Engine**: Dynamic permission registry, role assignment, data-scope evaluation (`OWN`, `TEAM`, `DEPARTMENT`, `BRANCH`, `COMPANY`, `ALL`).
- **UI Design System**: Table data-grids, form layouts, status badges, toast hosts, modal dialogs.
- **Dynamic Custom Fields**: Field definitions (`crm_tab_fields`), custom values (`crm_lead_custom_field_values`), OCR verification scores.
- **Workflow & Stage Auto-Move Engine**: Condition evaluator (`evaluate_automove_rules`), trigger rules (`StageAutomoveRule`).
- **Audit & Activity Trail**: Unified logging (`ActivityLog`, `Activity`).
- **Notifications Engine**: In-app alerts (`Notification`), SMTP email dispatch (`smtp.py`).

### Business Modules
- **CRM Module**: Lead capture, qualification, opportunity pipeline stages, financier submissions.
- **Project & Task Module**: Workspaces, lists, projects, tasks, checklists, dependencies, gantt/kanban views, costing.
- **HR & Employee Module**: Employee profiles, attendance, leave management, department structures.
- **Finance Module**: Disbursement tracking, loan sanctions, invoice/payment records.

---

## 5. Backend Architecture (Layered Flow)

All backend endpoints must adhere to a clean layered pattern:

$$\text{HTTP Request} \longrightarrow \text{Router (API)} \longrightarrow \text{Service Layer} \longrightarrow \text{Repository / ORM Model} \longrightarrow \text{Database}$$

1. **Router (`app/api/v1/`)**: Validates Pydantic payloads, enforces permission dependencies (`require_permission`, `require_application_access`), handles HTTP status codes.
2. **Service (`app/services/`)**: Encapsulates reusable business logic (e.g. `evaluate_automove_rules`, `backup_service`, `aging`).
3. **Model (`app/models/`)**: Defines database table structures using SQLAlchemy 2.0 `Mapped` type annotations.
4. **Schema (`app/schemas/`)**: Defines input (`Create`/`Update`) and output (`Out`) serialization structures.

---

## 6. Frontend Design System & Component Reuse

Every business module must use the shared UI design system:

- **ERP Shell**: Unified layout via `AppLayout`, `Sidebar`, `TopHeader`, and `PageHeader`.
- **Data Tables**: Reusable tabular layout supporting pagination, status chips, search input, and bulk action drawers.
- **Form Controls**: Standardized form inputs using `React Hook Form` + `MUI` components wrapped with consistent border radii (`8px` - `12px`), brand greens (`#04552B`, `#087A3D`), and subtle gray borders (`#E4EBE1`).
- **Toast Alerts**: Global toast host via `useToast()`.

---

## 7. Master Data Framework

Modules must reference existing central master entities instead of creating module-specific duplicates:

- **Users & Staff**: Reference `User` model (`users` table) for assigned owners, actors, and creators.
- **Financiers / Vendors**: Reference `FinanceCompany` (`finance_companies` table).
- **Vehicles / Assets**: Reference `VehicleModel` (`vehicle_models` table).
- **Pipeline Stages**: Reference `PipelineStage` (`pipeline_stages` table).

---

## 8. Change Management & Verification Protocol

Before declaring any feature complete:

1. **Build Validation**: Run `npx tsc --noEmit` on `client/` to verify zero TypeScript errors.
2. **Test Validation**: Run `python -m pytest` on `server/` to verify backend test suite passes cleanly.
3. **Database Integrity**: Ensure all DB changes are represented in version-controlled Alembic migrations (`server/alembic/versions/`).
