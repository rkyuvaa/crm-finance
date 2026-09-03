"""Reorganize crm_tabs module assignments between LEAD and OPPORTUNITY

Revision ID: 20260903_reorganize_tabs
Revises: 20260902_add_stage_module
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa

revision = '20260903_reorganize_tabs'
down_revision = '20260902_add_app_stage_key'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    
    # 1. Update all Opportunity dynamic tabs to module_id = 'OPPORTUNITY'
    opp_codes = [
        'document_upload', 'document_verification', 'final_submission',
        'finance_approval', 'loan_sanctioned', 'disbursement', 'completed',
        'all_opportunities', 'finance', 'closed'
    ]
    codes_str = ", ".join(f"'{c}'" for c in opp_codes)
    bind.execute(sa.text(f"UPDATE crm_tabs SET module_id = 'OPPORTUNITY' WHERE code IN ({codes_str})"))
    
    # 2. Ensure Lead Details tab exists for LEAD module
    res = bind.execute(sa.text("SELECT id FROM crm_tabs WHERE code IN ('lead_details', 'all_leads') LIMIT 1")).fetchone()
    if res:
        lead_tab_id = res[0]
        bind.execute(
            sa.text(f"UPDATE crm_tabs SET module_id = 'LEAD', name = 'Lead Details', code = 'lead_details', is_default = TRUE WHERE id = {lead_tab_id}")
        )
    else:
        bind.execute(
            sa.text("""
                INSERT INTO crm_tabs (module_id, name, code, description, icon, display_order, is_active, is_default, visibility_type, created_at, updated_at)
                VALUES ('LEAD', 'Lead Details', 'lead_details', 'Default lead capture and qualification fields', 'UserCheck', 1, TRUE, TRUE, 'EVERYONE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """)
        )
        res = bind.execute(sa.text("SELECT id FROM crm_tabs WHERE code = 'lead_details' LIMIT 1")).fetchone()
        lead_tab_id = res[0] if res else None

    # 3. Move any other remaining tabs under LEAD over to OPPORTUNITY
    if lead_tab_id:
        bind.execute(
            sa.text(f"UPDATE crm_tabs SET module_id = 'OPPORTUNITY' WHERE module_id = 'LEAD' AND id != {lead_tab_id}")
        )


def downgrade() -> None:
    pass
