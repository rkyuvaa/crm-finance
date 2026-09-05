"""Add lead_source and lead_score columns to applications table

Revision ID: 20260903_add_lead_source_and_score
Revises: 20260903_reorganize_crm_tabs_module
Create Date: 2026-09-03 11:20:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260903_add_lead_source_and_score"
down_revision = "20260903_reorganize_tabs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c["name"] for c in inspector.get_columns("applications")]

    # Create the lead_source enum type
    lead_source_enum = sa.Enum(
        "WEBSITE",
        "REFERRAL",
        "EVENT",
        "SOCIAL_MEDIA",
        "COLD_CALL",
        "OTHER",
        name="lead_source",
    )
    lead_source_enum.create(bind, checkfirst=True)

    # Add lead_source column if missing
    if "lead_source" not in existing_cols:
        op.add_column(
            "applications",
            sa.Column(
                "lead_source",
                lead_source_enum,
                nullable=True,
            ),
        )
        op.create_index(
            op.f("ix_applications_lead_source"),
            "applications",
            ["lead_source"],
            unique=False,
        )

    # Add lead_score column if missing
    if "lead_score" not in existing_cols:
        op.add_column(
            "applications",
            sa.Column(
                "lead_score",
                sa.Integer(),
                nullable=False,
                server_default="0",
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c["name"] for c in inspector.get_columns("applications")]

    if "lead_source" in existing_cols:
        try:
            op.drop_index(op.f("ix_applications_lead_source"), table_name="applications")
        except Exception:
            pass
        op.drop_column("applications", "lead_source")

    if "lead_score" in existing_cols:
        op.drop_column("applications", "lead_score")

    try:
        sa.Enum(name="lead_source").drop(bind, checkfirst=True)
    except Exception:
        pass
