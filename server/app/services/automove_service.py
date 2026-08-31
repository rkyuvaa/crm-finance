import logging
from sqlalchemy.orm import Session

from app.models import (
    Activity,
    ActivityLog,
    Application,
    ApplicationStatus,
    CrmLeadCustomFieldValue,
    CrmTabField,
    PipelineStage,
    StageAutomoveRule,
    User,
)
from app.services.auth import touch_application

logger = logging.getLogger(__name__)

STATUS_ORDER = {
    ApplicationStatus.LEAD: 1,
    ApplicationStatus.APPLICATION: 2,
    ApplicationStatus.VERIFICATION: 3,
    ApplicationStatus.FINANCE: 4,
    ApplicationStatus.QUERY: 5,
    ApplicationStatus.SANCTIONED: 6,
    ApplicationStatus.DELIVERY: 7,
    ApplicationStatus.DISBURSEMENT: 8,
    ApplicationStatus.COMPLETED: 9,
    ApplicationStatus.REJECTED: 99,
}


def evaluate_automove_rules(db: Session, app: Application, user: User | None = None) -> list[str]:
    """
    Evaluates active stage auto-move rules against the application state.
    If a rule condition is met and targets a progressive stage, automatically moves the application status.
    Returns list of stage auto-move messages triggered.
    """
    rules = db.query(StageAutomoveRule).filter(StageAutomoveRule.is_enabled == True).all()
    if not rules:
        return []

    moved_messages = []
    actor_id = user.id if user else None
    actor_name = user.full_name if user else "System Auto-Rule"

    for rule in rules:
        # Check source stage restriction if configured
        if rule.source_stage_key:
            # Map current app status to pipeline stage key if needed
            stage_match = (
                db.query(PipelineStage)
                .filter(PipelineStage.key == rule.source_stage_key)
                .first()
            )
            if stage_match and stage_match.status and stage_match.status != app.status:
                continue

        # Target status validation
        target_status_str = rule.target_status.upper()
        try:
            target_status_enum = ApplicationStatus(target_status_str)
        except ValueError:
            # Check if matching key in PipelineStage table
            stage_obj = db.query(PipelineStage).filter(PipelineStage.key == rule.target_status.lower()).first()
            if stage_obj and stage_obj.status:
                target_status_enum = stage_obj.status
            else:
                continue

        current_rank = STATUS_ORDER.get(app.status, 0)
        target_rank = STATUS_ORDER.get(target_status_enum, 0)

        # Do not downgrade or auto-move if already at or beyond target rank
        if target_rank <= current_rank:
            continue

        condition_met = False

        if rule.trigger_type == "standard_field":
            val = getattr(app, rule.field_name, None) if rule.field_name else None
            if rule.condition_operator == "is_filled":
                condition_met = val is not None and str(val).strip() != "" and str(val) != "0"
            elif rule.condition_operator == "equals":
                condition_met = str(val) == str(rule.condition_value)

        elif rule.trigger_type == "custom_field":
            if rule.field_id:
                rec = (
                    db.query(CrmLeadCustomFieldValue)
                    .filter(
                        CrmLeadCustomFieldValue.application_id == app.id,
                        CrmLeadCustomFieldValue.field_id == rule.field_id,
                    )
                    .first()
                )
                if rec:
                    if rule.condition_operator == "is_filled":
                        condition_met = (rec.value is not None and rec.value.strip() != "") or rec.file_metadata is not None
                    elif rule.condition_operator == "is_verified":
                        condition_met = rec.is_verified is True
                    elif rule.condition_operator == "equals":
                        condition_met = str(rec.value) == str(rule.condition_value)

        elif rule.trigger_type == "document_verification":
            # Check if any or specific document field is verified
            if rule.field_id:
                rec = (
                    db.query(CrmLeadCustomFieldValue)
                    .filter(
                        CrmLeadCustomFieldValue.application_id == app.id,
                        CrmLeadCustomFieldValue.field_id == rule.field_id,
                    )
                    .first()
                )
                if rec and rec.is_verified:
                    condition_met = True
            else:
                # Check if all uploaded documents for app are verified
                docs = (
                    db.query(CrmLeadCustomFieldValue)
                    .join(CrmTabField, CrmLeadCustomFieldValue.field_id == CrmTabField.id)
                    .filter(
                        CrmLeadCustomFieldValue.application_id == app.id,
                        CrmTabField.field_type == "file",
                    )
                    .all()
                )
                if docs and all(d.is_verified for d in docs):
                    condition_met = True

        if condition_met:
            old_status_val = app.status.value if hasattr(app.status, 'value') else str(app.status)
            new_status_val = target_status_enum.value if hasattr(target_status_enum, 'value') else str(target_status_enum)
            
            app.status = target_status_enum
            touch_application(db, app)

            log_msg = f"Auto-moved stage to {new_status_val} (Rule: '{rule.name}')"
            db.add(
                ActivityLog(
                    application_id=app.id,
                    actor_id=actor_id,
                    field_name="Status (Auto-Move)",
                    old_value=old_status_val,
                    new_value=f"{new_status_val} [Rule: {rule.name}]",
                )
            )
            db.add(
                Activity(
                    application_id=app.id,
                    actor_id=actor_id,
                    action=log_msg,
                )
            )
            db.commit()
            db.refresh(app)
            moved_messages.append(log_msg)
            logger.info(f"App {app.app_no}: {log_msg}")

    return moved_messages
