import re

file_path = "src/pages/ProjectWorkspace.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Remove unused imports
content = content.replace("Package, ", "")
content = content.replace("HardHat, ", "")

# Remove duplicate corrFilter
content = content.replace("const [corrFilter, setCorrFilter] = useState('');\n  const [corrFilter, setCorrFilter] = useState('');", "const [corrFilter, setCorrFilter] = useState('');")

# We can safely delete the mock variables by replacing their blocks with empty strings
content = re.sub(r"const MOCK_PROCUREMENT = .*?\};\n\n", "", content, flags=re.DOTALL)
content = re.sub(r"const MOCK_DAILY_REPORTS = .*?\n];\n\n", "", content, flags=re.DOTALL)
content = re.sub(r"const MOCK_VARIATIONS = .*?\n];\n\n", "", content, flags=re.DOTALL)
content = re.sub(r"const MOCK_SUBCONTRACTORS = .*?\n];\n\n", "", content, flags=re.DOTALL)
content = re.sub(r"const MOCK_SNAGS = .*?\n];\n\n", "", content, flags=re.DOTALL)
content = re.sub(r"const MOCK_CORRESPONDENCE = .*?\n];\n\n", "", content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(content)
