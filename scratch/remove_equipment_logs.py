import os
import re

file_workspace = "src/pages/ProjectWorkspace.tsx"
with open(file_workspace, "r") as f:
    content = f.read()

# Remove the sidebar entry
sidebar_entry = r"\s*\{\s*id:\s*'equipment_logs',\s*label:\s*'Equipment Logs',\s*icon:\s*<Truck size=\{18\}\s*\/>\s*\},"
content = re.sub(sidebar_entry, "", content)

# Remove the Truck import if no longer used
if "Truck" in content and "Truck" not in content.replace("Truck, ", ""):
    content = content.replace("Truck, ", "")

# Remove the EQUIPMENT LOGS TAB block
tab_block = r"\{\/\* EQUIPMENT LOGS TAB \*\/\}.*?\{\/\* HSE TAB \*\/\}|\{\/\* EQUIPMENT LOGS TAB \*\/\}.*?\{\/\* (?!EQUIPMENT LOGS).*?TAB \*\/\}"
# We can use a non-greedy match to find the block up to the next Tab comment
content = re.sub(r"\s*\{\/\* EQUIPMENT LOGS TAB \*\/\}\s*\{activeTab === 'equipment_logs' && \(.*?\)\}\n", "\n", content, flags=re.DOTALL)

with open(file_workspace, "w") as f:
    f.write(content)

file_hook = "src/hooks/useProjectModules.ts"
with open(file_hook, "r") as f:
    hook_content = f.read()

hook_content = re.sub(r"\s*const \[equipmentLogs, setEquipmentLogs\] = useState<any\[\]>\(\[\]\);", "", hook_content)
hook_content = re.sub(r"\s*fetch\(`/api/projects/\$\{projectId\}/equipment-logs`, \{ headers \}\),?", "", hook_content)
hook_content = re.sub(r",\s*equipRes", "", hook_content)
hook_content = re.sub(r"\s*if \(equipRes\.ok\) setEquipmentLogs\(await equipRes\.json\(\)\);", "", hook_content)
hook_content = re.sub(r"equipmentLogs,\s*", "", hook_content)

with open(file_hook, "w") as f:
    f.write(hook_content)

