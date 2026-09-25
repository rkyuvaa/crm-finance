import re

with open("server/app/api/v1/tasks.py", "r", encoding="utf-8") as f:
    content = f.read()

pattern1 = r'task\s*=\s*db\.get\(Task,\s*task_id\)\n\n\s*# Support both'
replacement1 = r'task = _get_task_or_404_with_auth(db, task_id, current_user)\n\n    # Support both'
content = re.sub(pattern1, replacement1, content)

pattern2 = r'if\s*not\s*task\s*or\s*not\s*target_task:\n\s*raise\s*HTTPException\(status_code=status\.HTTP_404_NOT_FOUND,\s*detail="Task\s*or\s*target\s*task\s*not\s*found"\)'
replacement2 = r'''if not target_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target task not found")
    
    # Optional: check if user can access target task
    _get_task_or_404_with_auth(db, target_task_id, current_user)'''
content = re.sub(pattern2, replacement2, content)


with open("server/app/api/v1/tasks.py", "w", encoding="utf-8") as f:
    f.write(content)
