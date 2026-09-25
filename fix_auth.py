import re

with open("server/app/api/v1/tasks.py", "r", encoding="utf-8") as f:
    content = f.read()

pattern1 = r'task\s*=\s*db\.get\(Task,\s*task_id\)\n\s*if\s*not\s*task\s*or\s*task\.is_deleted:\n\s*raise\s*HTTPException\(status_code=status\.HTTP_404_NOT_FOUND,\s*detail="Task\s*not\s*found"\)'
replacement1 = r'task = _get_task_or_404_with_auth(db, task_id, current_user)'
content = re.sub(pattern1, replacement1, content)

pattern2 = r'task\s*=\s*db\.get\(Task,\s*task_id\)\n\s*if\s*not\s*task:\n\s*raise\s*HTTPException\(status_code=status\.HTTP_404_NOT_FOUND,\s*detail="Task\s*not\s*found"\)'
content = re.sub(pattern2, replacement1, content)

with open("server/app/api/v1/tasks.py", "w", encoding="utf-8") as f:
    f.write(content)
