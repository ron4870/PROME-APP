import re

file_workspace = "src/pages/ProjectWorkspace.tsx"
with open(file_workspace, "r") as f:
    content = f.read()

# Replace the options array in the documents upload button
old_options = "options: ['Drawing', 'RFI', 'Submittal', 'General']"
new_options = "options: ['Contractual Document', 'Report', 'Design Document', 'Meeting Minutes', 'QA/QC Plan', 'Method Statement', 'Quality Control Form', 'Project Drawing', 'Media']"

content = content.replace(old_options, new_options)

with open(file_workspace, "w") as f:
    f.write(content)
