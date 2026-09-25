import re

with open("server/app/api/v1/masters.py", "r", encoding="utf-8") as f:
    content = f.read()

import subprocess
subprocess.run(["git", "checkout", "server/app/api/v1/masters.py"])

with open("server/app/api/v1/masters.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'router = APIRouter(prefix="/masters", tags=["masters"], dependencies=[Depends(require_permission("view", "masters"))])',
    'router = APIRouter(prefix="/masters", tags=["masters"])'
)

blocks = re.split(r'(@router\.)', content)
new_content = blocks[0]

for i in range(1, len(blocks), 2):
    decorator = blocks[i]
    block = blocks[i+1]
    
    if decorator.startswith("@router.post") or decorator.startswith("@router.patch") or decorator.startswith("@router.delete"):
        block = block.replace("get_current_user", 'require_permission("edit", "masters")')
        
    new_content += decorator + block

with open("server/app/api/v1/masters.py", "w", encoding="utf-8") as f:
    f.write(new_content)
