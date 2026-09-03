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
    lead_source_enum.create(op.get_bind(), checkfirst=True)

    # Add lead_source column
    op.add_column(
        "applications",
        sa.Column(
            "lead_source",
            lead_source_enum,
            nullable=True,
        ),
    )

    # Add lead_score column
    op.add_column(
        "applications",
        sa.Column(
            "lead_score",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # Add index on lead_source
    op.create_index(
        op.f("ix_applications_lead_source"),
        "applications",
        ["lead_source"],
        unique=False,
    )


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f("ix_applications_lead_source"), table_name="applications")

    # Drop columns
    op.drop_column("applications", "lead_score")
    op.drop_column("applications", "lead_source")

    # Drop enum type
    sa.Enum(name="lead_source").drop(op.get_bind(), checkfirst=True)
