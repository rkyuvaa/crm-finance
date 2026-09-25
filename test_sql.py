from app.db.session import SessionLocal
from app.models.projects import Task, TaskAssignee
from sqlalchemy import or_

db = SessionLocal()
current_user_id = 2 # Assuming Ramesh is 2
query = db.query(Task).filter(Task.is_deleted.is_(False))
query = query.filter(
    or_(
        Task.assignee_id == current_user_id,
        Task.id.in_(db.query(TaskAssignee.task_id).filter(TaskAssignee.user_id == current_user_id))
    )
)
print(query.statement.compile(compile_kwargs={"literal_binds": True}))
