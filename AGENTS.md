# Project Behavioral Rules & Guidelines

## 1. No Demo / Sample Data Rule
- When creating or modifying any new module, feature, menu, or page:
  - **DO NOT include dummy, sample, or demo data arrays** (e.g. `INITIAL_RENEWALS`, `INITIAL_BRANCHES`, mock rows).
  - Start all data states with empty arrays (`[]`) by default, so users only see real data added by them or fetched from the backend.
  - Provide clear and clean Empty State UI messages when no items exist.
