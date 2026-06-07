import os

file_workspace = "src/pages/ProjectWorkspace.tsx"
with open(file_workspace, "r") as f:
    content = f.read()

# Remove the sidebar entry
content = content.replace("              { id: 'equipment_logs', label: 'Equipment Logs', icon: <Truck size={18} /> },\n", "")

# Remove the Truck import if no longer used
content = content.replace("Truck, ", "")

# Define the exact equipment block
equip_block = """          {/* EQUIPMENT LOGS TAB */}
          {activeTab === 'equipment_logs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Plant & Equipment Telemetry</h2>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Log Usage</button>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Equipment</th>
                    <th style={{ padding: '1rem' }}>Running Hours</th>
                    <th style={{ padding: '1rem' }}>Fuel (Liters)</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_EQUIPMENT_LOGS.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>{log.date}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{log.equipment}</td>
                      <td style={{ padding: '1rem' }}>{log.runningHours} hrs</td>
                      <td style={{ padding: '1rem' }}>{log.fuelConsumed} L</td>
                      <td style={{ padding: '1rem' }}>
                        {log.breakdown ? (
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#fee2e2', color: '#991b1b' }}>Breakdown</span>
                        ) : (
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#dcfce7', color: '#166534' }}>Operational</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}"""

content = content.replace(equip_block, "")

# Ensure the MOCK_EQUIPMENT_LOGS definition is also deleted if it exists
import re
content = re.sub(r"const MOCK_EQUIPMENT_LOGS = \[.*?\];\n", "", content, flags=re.DOTALL)

with open(file_workspace, "w") as f:
    f.write(content)

file_hook = "src/hooks/useProjectModules.ts"
with open(file_hook, "r") as f:
    hook_content = f.read()

hook_content = hook_content.replace("const [equipmentLogs, setEquipmentLogs] = useState<any[]>([]);", "")
hook_content = hook_content.replace("fetch(`/api/projects/${projectId}/equipment-logs`, { headers }),", "")
hook_content = hook_content.replace("fetch(`/api/projects/${projectId}/equipment-logs`, { headers })", "")
hook_content = hook_content.replace(", equipRes", "")
hook_content = hook_content.replace("if (equipRes.ok) setEquipmentLogs(await equipRes.json());", "")
hook_content = hook_content.replace("equipmentLogs, ", "")
hook_content = hook_content.replace("equipmentLogs,", "")

with open(file_hook, "w") as f:
    f.write(hook_content)

