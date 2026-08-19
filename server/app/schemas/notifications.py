from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogOut(BaseModel):
    id: int
    application_id: int
    actor_id: int | None
    actor_name: str | None
    field_name: str
    old_value: str | None
    new_value: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
