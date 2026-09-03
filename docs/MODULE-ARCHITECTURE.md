# BUSINESS MODULE ARCHITECTURE GUIDELINES

This document governs the design and integration of all business modules within the ERP platform.

---

## 1. Business Module Index & Structure

| Module | Scope / Domain | Key Entities |
| :--- | :--- | :--- |
| **CRM** | Lead generation, qualification, opportunity pipelines, financier submissions | `Application`, `FinanceCompany`, `CrmTab`, `CrmTabField` |
| **Projects & Tasks** | Project workspaces, lists, task breakdown, checklists, dependencies, gantt/kanban | `Project`, `Task`, `Checklist`, `TimeLog`, `ProjectCost` |
| **HR & Employee** | Staff directory, attendance, leave management, department organization | `User`, `Department`, `LeaveRequest`, `Attendance` |
| **Finance** | Loan sanction tracking, disbursement records, invoices, payouts | `Disbursement`, `Sanction`, `Invoice`, `Payment` |
| **PLM / Products** | Vehicle models, product variants, pricing matrix | `VehicleModel` |

---

## 2. Module Boundaries & Communication

1. **Shared Master Data**: Modules must reference master tables (`users`, `departments`, `finance_companies`, `vehicle_models`) rather than re-creating module-local employee/customer/product tables.
2. **API & Event Integration**: Modules communicate with Core services (e.g. Audit Log, Notifications, Stage Automove, Custom Fields) via published core services or helper APIs.
3. **RBAC Scope Alignment**: Modules register their permissions in `server/app/rbac/` so administrators can configure role access centrally across all modules.

---

## 3. Standard Module Blueprint

Each new module must follow this blueprint:

```
[Backend]
server/app/
├── models/module_name.py       # SQLAlchemy ORM Data Models
├── schemas/module_name.py      # Pydantic Schemas
└── api/v1/module_name.py       # REST API Routes

[Frontend]
client/src/
├── pages/ModuleNamePage.tsx    # Main Module Container View
└── features/module_name/       # Specialized Sub-components & Modals
```

---

## 4. UI Consistency Checklist for New Modules

- [ ] Uses `AppLayout` with top header and standard sidebar navigation.
- [ ] Header includes page title, search bar, filter chips, and primary action button (e.g., `+ New Task`, `+ New Project`).
- [ ] Tables use standard status chips, hover rows, and action menus.
- [ ] Dialogs use standardized modal styling (`NewApplicationDialog` pattern).
- [ ] Notifications publish via `Notification` model / `notifications.py` core service.
- [ ] All mutations write an entry to `ActivityLog` / `Activity` for auditability.
