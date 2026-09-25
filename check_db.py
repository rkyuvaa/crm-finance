from app.db.session import SessionLocal
from app.models.projects import Task, TaskAssignee
from app.models.user import User

db = SessionLocal()
for u in db.query(User).all():
    print(u.id, u.full_name, u.role)
