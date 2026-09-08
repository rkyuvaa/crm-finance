# Rule: No Demo / Mock Sample Data

When creating or modifying any module, menu, or page:
1. **DO NOT populate frontend components with dummy, sample, or demo data arrays** (e.g., `INITIAL_RENEWALS`, `INITIAL_BRANCHES`, hardcoded sample rows).
2. Start all data lists with empty state (`[]`) by default, so users only see real data created by them or retrieved from the backend database/API.
3. Always render clean Empty State UI components (e.g., "No items found. Click 'Add New' to create one.") when the data array is empty.
