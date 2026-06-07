import os

file_path = "src/pages/ProjectWorkspace.tsx"

with open(file_path, "r") as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    "import { ProjectAdminDashboard } from '../components/ProjectAdminDashboard';",
    "import { ProjectAdminDashboard } from '../components/ProjectAdminDashboard';\nimport { GenericModal, type ModalConfig } from '../components/GenericModal';\nimport { useProjectModules } from '../hooks/useProjectModules';"
)

# 2. Uncomment useProjectModules and Add States
content = content.replace(
    "// const { procurement, dailyReports, variations, subcontractors, snags, correspondence, equipmentLogs } = useProjectModules(id, token);",
    "const { variations, snags, correspondence, fetchAll } = useProjectModules(id, token);"
)

content = content.replace(
    "const [activeTab, setActiveTab] = useState('dashboard');",
    "const [activeTab, setActiveTab] = useState('dashboard');\n  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);\n  const [corrFilter, setCorrFilter] = useState('');"
)

# 3. Modify Sidebar Sidebar Menu array
old_sidebar = """            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
              { id: 'tasks', label: 'Tasks', icon: <ListTodo size={18} /> },
              { id: 'schedule', label: 'Schedule', icon: <CalendarDays size={18} /> },
              { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
              { id: 'procurement', label: 'Procurement', icon: <Package size={18} /> },
              { id: 'daily_reports', label: 'Daily Reports', icon: <ClipboardList size={18} /> },
              { id: 'variations', label: 'Variations', icon: <FileDiff size={18} /> },
              { id: 'subcontractors', label: 'Subcontractors', icon: <HardHat size={18} /> },
              { id: 'punch_list', label: 'Punch List', icon: <ListChecks size={18} /> },
              { id: 'correspondence', label: 'Correspondence', icon: <Mail size={18} /> },
              { id: 'equipment_logs', label: 'Equipment Logs', icon: <Truck size={18} /> },
              { id: 'hse', label: 'HSE', icon: <ShieldAlert size={18} /> },
              { id: 'quality', label: 'Quality', icon: <CheckCircle size={18} /> },
              { id: 'risks', label: 'Risk Register', icon: <AlertTriangle size={18} /> },
              { id: 'resources', label: 'Team', icon: <Users size={18} /> },
              { id: 'financials', label: 'Financials', icon: <DollarSign size={18} /> }
            ]"""

new_sidebar = """            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
              { id: 'tasks', label: 'Tasks', icon: <ListTodo size={18} /> },
              { id: 'schedule', label: 'Schedule', icon: <CalendarDays size={18} /> },
              { id: 'correspondence', label: 'Correspondence', icon: <Mail size={18} /> },
              { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
              { id: 'daily_reports', label: 'Daily Reports', icon: <ClipboardList size={18} /> },
              { id: 'variations', label: 'Variations & Claims', icon: <FileDiff size={18} /> },
              { id: 'snag_list', label: 'Snag List', icon: <ListChecks size={18} /> },
              { id: 'equipment_logs', label: 'Equipment Logs', icon: <Truck size={18} /> },
              { id: 'hse', label: 'HSE', icon: <ShieldAlert size={18} /> },
              { id: 'quality', label: 'Quality', icon: <CheckCircle size={18} /> },
              { id: 'risks', label: 'Risk Register', icon: <AlertTriangle size={18} /> },
              { id: 'resources', label: 'Team', icon: <Users size={18} /> },
              { id: 'financials', label: 'Financials', icon: <DollarSign size={18} /> }
            ]"""

content = content.replace(old_sidebar, new_sidebar)

# 4. Modify Tabs Content (Extract old string and replace with new string)
# Procurement Tab (We just remove the body)
import re
content = re.sub(r"\{\/\* PROCUREMENT TAB \*\/\}.*?\{\/\* DAILY REPORTS TAB \*\/\}", "{/* DAILY REPORTS TAB */}", content, flags=re.DOTALL)
# Wait, Procurement tab was not in my tmp! Oh, I didn't see Procurement tab in the tmp? Yes I did? No I didn't. 
# Look at the previous extraction, Procurement Tab was never implemented in the HTML body! Wait, was it?
# In tmp workspace_current.tsx, there was NO PROCUREMENT TAB! It only had DASHBOARD, TASKS, SCHEDULE, PUNCH LIST, CORRESPONDENCE, EQUIPMENT LOGS, DOCUMENTS, RESOURCES, FINANCIALS, HSE, QUALITY, RISKS, ADMIN.
# Oh! The previous agent didn't even render Procurement!
# So I just need to remove PUNCH LIST, CORRESPONDENCE, and VARIATIONS, and insert my new versions.

# Replace PUNCH LIST
old_punch = """{/* PUNCH LIST TAB */}
          {activeTab === 'snag_list' && ("""
if "activeTab === 'punch_list'" in content:
    old_punch = """{/* PUNCH LIST TAB */}
          {activeTab === 'punch_list' && ("""

# Actually let's use regex that goes from the comment to the closing div of that tab.
# PUNCH LIST TAB is followed by CORRESPONDENCE TAB
snags_block = """{/* SNAG LIST TAB */}
          {activeTab === 'snag_list' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Snag List</h2>
                <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Log Snag/Defect', endpoint: `/api/projects/${id}/snags`, fields: [{name: 'location', label: 'Location', type: 'text', required: true}, {name: 'description', label: 'Description', type: 'text', required: true}, {name: 'severity', label: 'Severity', type: 'select', options: ['Minor', 'Major', 'Critical'], required: true}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Log Defect</button>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Location</th>
                    <th style={{ padding: '1rem' }}>Description</th>
                    <th style={{ padding: '1rem' }}>Severity</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {snags.map((snag: any) => (
                    <tr key={snag.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{snag.location}</td>
                      <td style={{ padding: '1rem' }}>{snag.description || snag.desc}</td>
                      <td style={{ padding: '1rem' }}>{snag.severity}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#fee2e2', color: '#991b1b' }}>{snag.status || 'Open'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}"""

content = re.sub(r"\{\/\* PUNCH LIST TAB \*\/\}.*?\{\/\* CORRESPONDENCE TAB \*\/\}", snags_block + "\n\n          {/* CORRESPONDENCE TAB */}", content, flags=re.DOTALL)

corr_block = """{/* CORRESPONDENCE TAB */}
          {activeTab === 'correspondence' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Formal Correspondence Log</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input type="text" placeholder="Filter correspondence..." value={corrFilter} onChange={(e) => setCorrFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px' }} />
                  <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Add Formal Correspondence', endpoint: `/api/projects/${id}/correspondence`, fields: [{name: 'date', label: 'Date', type: 'date', required: true}, {name: 'referenceNumber', label: 'Reference Number', type: 'text', required: true}, {name: 'type', label: 'Type (Incoming/Outgoing)', type: 'select', options: ['Incoming', 'Outgoing'], required: true}, {name: 'subject', label: 'Subject', type: 'text', required: true}, {name: 'sender', label: 'Sender', type: 'select', options: ['Client', 'Contractor', 'Consultant', 'Other'], required: true}, {name: 'recipient', label: 'Recipient', type: 'select', options: ['Client', 'Contractor', 'Consultant', 'Other'], required: true}, {name: 'file', label: 'Attach PDF', type: 'file'}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Add Log</button>
                </div>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Ref #</th>
                    <th style={{ padding: '1rem' }}>Type</th>
                    <th style={{ padding: '1rem' }}>Subject</th>
                    <th style={{ padding: '1rem' }}>Sender</th>
                    <th style={{ padding: '1rem' }}>Recipient</th>
                    <th style={{ padding: '1rem' }}>Attachment</th>
                  </tr>
                </thead>
                <tbody>
                  {correspondence.filter((corr: any) => {
                    const q = corrFilter.toLowerCase();
                    return (
                      (corr.date && corr.date.toLowerCase().includes(q)) ||
                      (corr.referenceNumber && corr.referenceNumber.toLowerCase().includes(q)) ||
                      (corr.ref && corr.ref.toLowerCase().includes(q)) ||
                      (corr.type && corr.type.toLowerCase().includes(q)) ||
                      (corr.subject && corr.subject.toLowerCase().includes(q)) ||
                      (corr.sender && corr.sender.toLowerCase().includes(q)) ||
                      (corr.recipient && corr.recipient.toLowerCase().includes(q))
                    );
                  }).map((corr: any) => (
                    <tr key={corr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>{corr.date ? new Date(corr.date).toLocaleDateString() : ''}</td>
                      <td style={{ padding: '1rem', fontWeight: 500, color: '#0ea5e9' }}>{corr.referenceNumber || corr.ref}</td>
                      <td style={{ padding: '1rem' }}>{corr.type}</td>
                      <td style={{ padding: '1rem' }}>{corr.subject}</td>
                      <td style={{ padding: '1rem' }}>{corr.sender}</td>
                      <td style={{ padding: '1rem' }}>{corr.recipient}</td>
                      <td style={{ padding: '1rem' }}>
                        {corr.fileUrl ? (
                          <a href={corr.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                            <FileText size={16} /> View
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}"""

content = re.sub(r"\{\/\* CORRESPONDENCE TAB \*\/\}.*?\{\/\* EQUIPMENT LOGS TAB \*\/\}", corr_block + "\n\n          {/* EQUIPMENT LOGS TAB */}", content, flags=re.DOTALL)

variations_block = """{/* VARIATIONS TAB */}
          {activeTab === 'variations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Variations & Claims</h2>
                <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Log Variation/Claim', endpoint: `/api/projects/${id}/variations`, fields: [{name: 'date', label: 'Date', type: 'date', required: true}, {name: 'referenceNumber', label: 'Reference Number', type: 'text', required: true}, {name: 'title', label: 'Variation Title', type: 'text', required: true}, {name: 'costImpact', label: 'Cost Impact', type: 'number'}, {name: 'scheduleImpactDays', label: 'Schedule Impact (Days)', type: 'number'}, {name: 'file', label: 'Attach File', type: 'file'}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Log Variation</button>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Ref #</th>
                    <th style={{ padding: '1rem' }}>Title</th>
                    <th style={{ padding: '1rem' }}>Cost Impact</th>
                    <th style={{ padding: '1rem' }}>Schedule Impact</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}>Attachment</th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map((vo: any) => (
                    <tr key={vo.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>{vo.date ? new Date(vo.date).toLocaleDateString() : ''}</td>
                      <td style={{ padding: '1rem', fontWeight: 500, color: '#0ea5e9' }}>{vo.referenceNumber || vo.voNumber || vo.ref}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{vo.title}</td>
                      <td style={{ padding: '1rem' }}>${vo.costImpact?.toLocaleString() || 0}</td>
                      <td style={{ padding: '1rem' }}>+{vo.scheduleImpactDays || vo.scheduleImpact || 0} Days</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#fef3c7', color: '#b45309' }}>{vo.status || 'Under Review'}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {vo.fileUrl ? (
                          <a href={vo.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                            <FileText size={16} /> View
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}"""

content = re.sub(r"\{\/\* SCHEDULE TAB \*\/\}.*?\{\/\* SNAG LIST TAB \*\/\}", "{/* SCHEDULE TAB */}\n          {activeTab === 'schedule' && (\n            <div>\n              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>\n                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Project Schedule</h2>\n                <button className=\"btn btn-primary\"><Plus size={16} style={{ marginRight: '8px' }}/> Add Milestone</button>\n              </div>\n              <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '2px dashed #cbd5e1', color: '#64748b' }}>\n                <CalendarDays size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />\n                <h3>Gantt Chart & Timeline</h3>\n                <p>The interactive project timeline and milestones will be displayed here.</p>\n              </div>\n            </div>\n          )}\n\n          " + variations_block + "\n\n          {/* SNAG LIST TAB */}", content, flags=re.DOTALL)


content = content.replace(
    "        </div>\n      </div>\n    </div>\n  );\n};",
    "        </div>\n      </div>\n      <GenericModal \n        isOpen={!!modalConfig}\n        onClose={() => setModalConfig(null)}\n        config={modalConfig}\n        token={token}\n        onSuccess={fetchAll}\n      />\n    </div>\n  );\n};"
)

with open(file_path, "w") as f:
    f.write(content)
