import re

# 1. Update project.routes.ts
routes_file = "server/src/routes/project.routes.ts"
with open(routes_file, "r") as f:
    routes_content = f.read()

# We need to change the POST /:id/documents fileUrl logic
# Find: fields: 'id, webViewLink',
routes_content = routes_content.replace(
    "fields: 'id, webViewLink',",
    "fields: 'id, webViewLink, webContentLink',"
)

# Find where fileUrl is set in POST /:id/documents
old_file_url_assignment = "fileUrl = driveFile.data.webViewLink;"
# We need to only replace the one in POST /:id/documents.
# We'll use a regex that looks for it inside the documents route.

def replace_documents_file_url(match):
    return match.group(0).replace(
        "fileUrl = driveFile.data.webViewLink;",
        "fileUrl = JSON.stringify({ view: driveFile.data.webViewLink, download: driveFile.data.webContentLink, isPdf: file.mimetype === 'application/pdf' });"
    )

# The document route starts at router.post('/:id/documents' and ends at the next router.post
routes_content = re.sub(
    r"router\.post\('/:id/documents'.*?res\.json\(newDoc\);\n  } catch",
    replace_documents_file_url,
    routes_content,
    flags=re.DOTALL
)

with open(routes_file, "w") as f:
    f.write(routes_content)


# 2. Update ProjectWorkspace.tsx
workspace_file = "src/pages/ProjectWorkspace.tsx"
with open(workspace_file, "r") as f:
    workspace_content = f.read()

# Replace the action column render logic in Documents Tab
old_action_td = """<td style={{ padding: '1rem' }}>
                      {doc.fileUrl ? (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                          <Download size={16} /> View
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>"""

new_action_td = """<td style={{ padding: '1rem' }}>
                      {(() => {
                        if (!doc.fileUrl) return <span style={{ color: '#94a3b8' }}>-</span>;
                        
                        let viewLink = doc.fileUrl;
                        let downloadLink = doc.fileUrl;
                        let isPdf = true; // Default legacy to View
                        
                        try {
                          const parsed = JSON.parse(doc.fileUrl);
                          if (parsed && parsed.view) {
                            viewLink = parsed.view;
                            downloadLink = parsed.download;
                            isPdf = parsed.isPdf;
                          }
                        } catch (e) {
                          // Legacy link
                          if (doc.title && !doc.title.toLowerCase().endsWith('.pdf')) {
                             // Can't force download on legacy link without webContentLink, but we can change the label
                             isPdf = false;
                          }
                        }
                        
                        if (isPdf) {
                          return (
                            <a href={viewLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                              <FileText size={16} /> View
                            </a>
                          );
                        } else {
                          return (
                            <a href={downloadLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>
                              <Download size={16} /> Download
                            </a>
                          );
                        }
                      })()}
                    </td>"""

workspace_content = workspace_content.replace(old_action_td, new_action_td)

with open(workspace_file, "w") as f:
    f.write(workspace_content)
