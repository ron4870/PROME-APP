import re

file_workspace = "src/pages/ProjectWorkspace.tsx"
with open(file_workspace, "r") as f:
    content = f.read()

# 1. Destructure documents
content = content.replace(
    "const { variations, snags, correspondence, fetchAll } = useProjectModules(id, token);",
    "const { variations, snags, correspondence, documents, fetchAll } = useProjectModules(id, token);"
)

# 2. Remove MOCK_DOCS
content = re.sub(r"const MOCK_DOCS = \[.*?\];\n\n", "", content, flags=re.DOTALL)

# 3. Add onClick to Upload button in Documents Tab
old_button = """<button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Upload</button>"""
new_button = """<button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Upload Document', endpoint: `/api/projects/${id}/documents`, fields: [{name: 'documentNumber', label: 'Document Number', type: 'text'}, {name: 'title', label: 'Title', type: 'text'}, {name: 'type', label: 'Type', type: 'select', options: ['Drawing', 'RFI', 'Submittal', 'General']}, {name: 'revision', label: 'Revision', type: 'text'}, {name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Issued for Review', 'Approved']}, {name: 'issueDate', label: 'Issue Date', type: 'date'}, {name: 'file', label: 'Attach File', type: 'file', required: true}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Upload</button>"""

content = content.replace(old_button, new_button)

# 4. Replace MOCK_DOCS mapping and add View link
old_map = """{MOCK_DOCS.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#0369a1' }}>{doc.documentNumber}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{doc.title}</td>
                    <td style={{ padding: '1rem' }}>{doc.type}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{doc.revision}</td>
                    <td style={{ padding: '1rem' }}>{doc.status}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{doc.issueDate}</td>
                    <td style={{ padding: '1rem' }}><button style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer' }}><Download size={18}/></button></td>
                  </tr>
                ))}"""

new_map = """{documents.map((doc: any) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#0369a1' }}>{doc.documentNumber}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{doc.title}</td>
                    <td style={{ padding: '1rem' }}>{doc.type}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{doc.revision}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: doc.status === 'Approved' ? '#dcfce7' : '#fef3c7', color: doc.status === 'Approved' ? '#166534' : '#b45309' }}>{doc.status}</span>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : ''}</td>
                    <td style={{ padding: '1rem' }}>
                      {doc.fileUrl ? (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                          <Download size={16} /> View
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}"""

content = content.replace(old_map, new_map)

with open(file_workspace, "w") as f:
    f.write(content)
