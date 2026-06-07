import re

file_workspace = "src/pages/ProjectWorkspace.tsx"
with open(file_workspace, "r") as f:
    content = f.read()

# 1. Add docFilter state
if "const [docFilter, setDocFilter] = useState('');" not in content:
    content = content.replace(
        "const [corrFilter, setCorrFilter] = useState('');",
        "const [corrFilter, setCorrFilter] = useState('');\n  const [docFilter, setDocFilter] = useState('');"
    )

# 2. Replace the filter button in Documents Tab with an input
old_filter_button = """<button className="btn btn-secondary"><Filter size={16} style={{ marginRight: '8px' }}/> Filter</button>"""
new_filter_input = """<input type="text" placeholder="Filter documents..." value={docFilter} onChange={(e) => setDocFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px' }} />"""

content = content.replace(old_filter_button, new_filter_input)

# 3. Add filtering logic to the documents.map
old_map = "{documents.map((doc: any) => ("
new_map = """{documents.filter((doc: any) => {
                  const q = docFilter.toLowerCase();
                  return (
                    (doc.documentNumber && doc.documentNumber.toLowerCase().includes(q)) ||
                    (doc.title && doc.title.toLowerCase().includes(q)) ||
                    (doc.type && doc.type.toLowerCase().includes(q)) ||
                    (doc.status && doc.status.toLowerCase().includes(q))
                  );
                }).map((doc: any) => ("""

content = content.replace(old_map, new_map)

# 4. Make sure the div wraps the items correctly
old_div = """<div style={{ display: 'flex', gap: '1rem' }}>"""
new_div = """<div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>"""

# Be careful with this replace, only do it in Documents section. 
# We'll use regex to target the one right before the document modal config.

content = re.sub(
    r"(<div style={{ display: 'flex', gap: '1rem' }}>\s*<input type=\"text\" placeholder=\"Filter documents...\")",
    r"<div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>\n                <input type=\"text\" placeholder=\"Filter documents...\"",
    content
)


with open(file_workspace, "w") as f:
    f.write(content)
