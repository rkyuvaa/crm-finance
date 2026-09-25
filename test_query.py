from app.db.session import SessionLocal
from app.models.projects import Task, TaskAssignee
from app.models.user import User
from app.models.enums import UserRole
from sqlalchemy import or_

db = SessionLocal()
sales_user = db.query(User).filter(User.role == UserRole.SALES_EXECUTIVE).first()
if not sales_user:
    print("No sales user found")
else:
    print(f"Sales User: {sales_user.id} {sales_user.full_name}")

    query = db.query(Task).filter(Task.is_deleted.is_(False))
    query = query.filter(
        or_(
            Task.assignee_id == sales_user.id,
            Task.id.in_(db.query(TaskAssignee.task_id).filter(TaskAssignee.user_id == sales_user.id))
        )
    )
    tasks = query.all()
    for t in tasks:
        print(f"Task: {t.task_number} {t.title}")
