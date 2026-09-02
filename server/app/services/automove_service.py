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


def evaluate_automove_rules(db: Session, app: Application, user: User | None = None) -> list[str]:
    """
    Evaluates active stage auto-move rules against the application state.
    If a rule condition is met, automatically transitions the application stage_key / status.
    Returns list of stage auto-move messages triggered.
    """
    try:
        rules = db.query(StageAutomoveRule).filter(StageAutomoveRule.is_enabled == True).all()
    except Exception as err:
        logger.error(f"Error loading automove rules: {err}")
        return []

    if not rules:
        return []

    moved_messages = []
    actor_id = user.id if user else None

    for rule in rules:
        current_app_stage = getattr(app, "stage_key", None)

        # Check source stage restriction if configured
        if rule.source_stage_key:
            if current_app_stage and current_app_stage.lower() != rule.source_stage_key.lower():
                continue

        target_key = (getattr(rule, "target_stage_key", None) or rule.target_status or "").lower()
        if not target_key:
            continue

        # Don't re-trigger if already at this target stage_key
        if current_app_stage and current_app_stage.lower() == target_key:
            continue

        # Look up stage in database to get label & status mapping
        target_stage_obj = db.query(PipelineStage).filter(PipelineStage.key == target_key).first()

        target_status_enum = None
        if target_stage_obj and target_stage_obj.status:
            target_status_enum = target_stage_obj.status
        else:
            try:
                target_status_enum = ApplicationStatus(rule.target_status.upper())
            except (ValueError, AttributeError):
                pass

        condition_met = False

        if rule.trigger_type == "standard_field":
            val = getattr(app, rule.field_name, None) if rule.field_name else None
            if rule.condition_operator == "is_filled":
                condition_met = val is not None and str(val).strip() != "" and str(val) != "0"
            elif rule.condition_operator == "equals":
                condition_met = str(val).strip().lower() == str(rule.condition_value or "").strip().lower()

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
                        condition_met = str(rec.value).strip().lower() == str(rule.condition_value or "").strip().lower()

        elif rule.trigger_type == "document_verification":
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
            old_stage_val = current_app_stage or str(app.status.value if hasattr(app.status, 'value') else app.status)
            target_display = target_stage_obj.label if target_stage_obj else target_key.title()

            setattr(app, "stage_key", target_key)
            if target_status_enum:
                app.status = target_status_enum

            touch_application(db, app)

            log_msg = f"Auto-moved stage to '{target_display}' (Rule: '{rule.name}')"
            db.add(
                ActivityLog(
                    application_id=app.id,
                    actor_id=actor_id,
                    field_name="Stage (Auto-Move)",
                    old_value=old_stage_val,
                    new_value=f"{target_display} [Rule: {rule.name}]",
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
