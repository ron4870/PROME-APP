import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ListTodo, FileText, Users, DollarSign, Building2, Calendar, ArrowLeft, Plus, Filter, Download, ShieldAlert, CheckCircle, AlertTriangle, LayoutDashboard, CalendarDays, Package, ClipboardList, FileDiff, HardHat, ListChecks, Mail, Truck, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectAdminDashboard } from '../components/ProjectAdminDashboard';

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  startDate: string;
  members?: any[];
  userPermissions?: any[];
}

// Fallback Mock Data
const MOCK_TASKS = [
  { id: 1, title: 'Geotechnical Survey', status: 'Completed', priority: 'High', assignedTo: 'Alice Engineer', dueDate: '2025-01-20' },
  { id: 2, title: 'Preliminary Design Review', status: 'In Progress', priority: 'High', assignedTo: 'Bob Technician', dueDate: '2025-02-15' },
  { id: 3, title: 'Environmental Impact Assessment', status: 'Not Started', priority: 'Medium', assignedTo: 'Alice Engineer', dueDate: '2025-03-01' }
];

const MOCK_DOCS = [
  { id: 1, documentNumber: 'DRW-001', title: 'Site Plan Overview', type: 'Drawing', revision: 'A', status: 'Issued for Review', issueDate: '2025-01-10', uploader: 'Bob Technician' },
  { id: 2, documentNumber: 'RFI-042', title: 'Clarification on Material Spec', type: 'RFI', revision: '0', status: 'Approved', issueDate: '2025-01-12', uploader: 'Alice Engineer' },
  { id: 3, documentNumber: 'SUB-011', title: 'Concrete Mix Design', type: 'Submittal', revision: '1', status: 'Draft', issueDate: '2025-02-01', uploader: 'Bob Technician' }
];

const MOCK_RESOURCES = [
  { id: 1, type: 'Personnel', name: 'Alice Engineer', role: 'Lead Design', allocation: '100%', dates: 'Jan 15 - Dec 31' },
  { id: 2, type: 'Equipment', name: 'Total Station TS16', role: 'Survey', allocation: '100%', dates: 'Jan 20 - Feb 28' }
];

const MOCK_FINANCIALS = [
  { id: 1, type: 'Budget Allocation', amount: 500000, date: '2025-01-10', desc: 'Initial Project Funding', status: 'Approved' },
  { id: 2, type: 'Expense', amount: 15000, date: '2025-01-22', desc: 'Surveying Contractor', status: 'Paid' },
  { id: 3, type: 'Invoice', amount: 100000, date: '2025-02-01', desc: 'Milestone 1 Billing', status: 'Pending' }
];

const MOCK_HSE = {
  metrics: { lti: 120, trir: 0.8, toolboxTalks: 14, walkdowns: 8 },
  incidents: [
    { id: 1, date: '2025-02-10', type: 'Near Miss', description: 'Scaffolding unsecure near Block B', status: 'Closed' },
    { id: 2, date: '2025-02-28', type: 'Medical Treatment', description: 'Minor cut on hand during rebar tying', status: 'Open' }
  ]
};

const MOCK_QUALITY = {
  ncrs: [
    { id: 1, number: 'NCR-2025-001', title: 'Concrete slump test failed', severity: 'High', status: 'Open' },
    { id: 2, number: 'NCR-2025-002', title: 'Incorrect rebar spacing', severity: 'Medium', status: 'Closed' }
  ],
  inspections: [
    { id: 1, date: '2025-02-15', type: 'Pre-Pour Inspection', location: 'Foundation A', result: 'Passed' },
    { id: 2, date: '2025-02-20', type: 'Compaction Test', location: 'Access Road', result: 'Failed' }
  ]
};

const MOCK_RISKS = [
  { id: 1, title: 'Heavy rains delaying earthworks', category: 'Environmental', likelihood: 'High', impact: 'Medium', score: 12 },
  { id: 2, title: 'Supply chain delay for structural steel', category: 'Operational', likelihood: 'Medium', impact: 'High', score: 15 },
  { id: 3, title: 'Community protests over noise', category: 'Social', likelihood: 'Low', impact: 'Low', score: 4 }
];

// ADVANCED ENGINEERING MODULES MOCK DATA
const MOCK_PROCUREMENT = {
  requisitions: [{ id: 1, item: 'Cement Type II', quantity: 500, unit: 'Bags', status: 'Approved', date: '2025-05-15' }],
  inventory: [{ id: 1, item: 'Cement Type II', category: 'Materials', quantity: 1200, unit: 'Bags' }]
};

const MOCK_DAILY_REPORTS = [
  { id: 1, date: '2025-05-30', weather: 'Sunny', manpower: 45, equipment: 12, summary: 'Poured concrete for foundation B.' }
];

const MOCK_VARIATIONS = [
  { id: 1, ref: 'VO-001', title: 'Additional piling depth', status: 'Under Review', costImpact: 45000, scheduleImpact: 14 }
];

const MOCK_SUBCONTRACTORS = [
  { id: 1, name: 'ElectroMech Ltd', scope: 'HVAC Installation', value: 250000, status: 'Active' }
];

const MOCK_SNAGS = [
  { id: 1, location: 'Level 2, Room 4', desc: 'Touch up paint on window sill', severity: 'Minor', status: 'Open' }
];

const MOCK_CORRESPONDENCE = [
  { id: 1, ref: 'LTR-042', type: 'Incoming', subject: 'Approval of VO-001', sender: 'Client Rep', date: '2025-05-28' },
  { id: 2, ref: 'LTR-043', type: 'Outgoing', subject: 'Request for Information #12', sender: 'Project Manager', date: '2025-05-29' }
];

const MOCK_EQUIPMENT_LOGS = [
  { id: 1, equipment: 'Excavator EX-02', runningHours: 8.5, fuelConsumed: 45, breakdown: false, date: '2025-05-30' },
  { id: 2, equipment: 'Crane CR-01', runningHours: 4.0, fuelConsumed: 20, breakdown: true, date: '2025-05-30' }
];

// import { useProjectModules } from '../hooks/useProjectModules';

export const ProjectWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // Real data fetching hook
  // const { procurement, dailyReports, variations, subcontractors, snags, correspondence, equipmentLogs } = useProjectModules(id, token);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProject(data);
    } catch (err) {
      console.error('Failed to fetch project', err);
      // Fallback
      setProject({ id: Number(id), name: 'Kampala Flyover Project Lot 2', client: 'UNRA', status: 'Active', startDate: '2025-01-15' });
      setError('Live database connection failed. Showing offline mock data.');
    } finally {
      setLoading(false);
    }
  };

  // Determine financial access based on user role
  const currentUserMembership = project?.members?.find((m: any) => m.user.id === user?.id);
  
  // Administrators automatically have read/write access to all projects
  const isAdministrator = user?.role?.name === 'Administrator';
  
  const getModuleAccess = (moduleName: string) => {
    if (isAdministrator) return 'Edit';
    if (!project?.userPermissions) return 'Read'; // Fallback

    const userPerm = project.userPermissions.find((p: any) => p.userId === user?.id && p.module === moduleName);
    return userPerm?.accessLevel || 'None';
  };

  const canViewFinancials = getModuleAccess('Financials') !== 'None';
  const canEdit = isAdministrator || ['Project Manager', 'Lead Engineer', 'Project Top Managment'].includes(currentUserMembership?.role || '');

  // Add the handler for assigning users
  const handleAssignUser = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role })
      });
      if (!res.ok) throw new Error('Failed to assign user');
      fetchProjectData();
    } catch (err) {
      console.error(err);
      alert('Failed to assign user');
    }
  };

  // Add the handler for updating permissions
  const handleUpdatePermissions = async (updates: any[]) => {
    try {
      const res = await fetch(`/api/projects/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: updates })
      });
      if (!res.ok) throw new Error('Failed to update permissions');
      fetchProjectData();
      alert('Permissions updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update permissions');
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Workspace...</div>;

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <button 
        onClick={() => navigate('/projects')}
        style={{ background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}
      >
        <ArrowLeft size={16} style={{ marginRight: '4px' }} /> Back to Projects
      </button>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fff7ed', color: '#c2410c', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fdba74' }}>
          {error}
        </div>
      )}

      {/* Project Header */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{project?.name}</h1>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                {project?.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '2rem', color: '#475569', fontSize: '0.9rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={16}/> Client: {project?.client}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16}/> Started: {project?.startDate}</div>
            </div>
          </div>
          <div>
            {canEdit && <button className="btn btn-primary">Project Settings</button>}
          </div>
        </div>
      </div>

      {/* 2-Column Workspace Layout */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Project Sidebar */}
        <div style={{ width: '260px', flexShrink: 0, backgroundColor: 'white', borderRadius: '12px', padding: '1rem 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Project Menu</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 1rem' }}>
            {[
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
            ]
            .filter(tab => getModuleAccess(tab.label) !== 'None')
            .concat(isAdministrator || currentUserMembership?.role === 'Project Manager' ? [{ id: 'admin', label: 'Project Admin', icon: <Shield size={18} /> }] : [])
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? '#f0f9ff' : 'transparent',
                  border: 'none',
                  padding: '0.875rem 1rem',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  fontSize: '0.95rem',
                  color: activeTab === tab.id ? '#0284c7' : '#475569',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '600px' }}>
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Project Overview</h2>
              </div>
              <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '2px dashed #cbd5e1', color: '#64748b' }}>
                <LayoutDashboard size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3>Project Dashboard</h3>
                <p>High-level project metrics and recent activities will be displayed here.</p>
              </div>
            </div>
          )}

          {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Task Management</h2>
              <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Add Task</button>
            </div>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Task Title</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Priority</th>
                  <th style={{ padding: '1rem' }}>Assignee</th>
                  <th style={{ padding: '1rem' }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TASKS.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: 500, color: '#0f172a' }}>{task.title}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: task.status === 'Completed' ? '#dcfce7' : task.status === 'In Progress' ? '#e0f2fe' : '#f1f5f9',
                        color: task.status === 'Completed' ? '#166534' : task.status === 'In Progress' ? '#075985' : '#475569'
                      }}>{task.status}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>{task.priority}</td>
                    <td style={{ padding: '1rem' }}>{task.assignedTo}</td>
                    <td style={{ padding: '1rem' }}>{task.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Project Schedule</h2>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Add Milestone</button>
              </div>
              <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '2px dashed #cbd5e1', color: '#64748b' }}>
                <CalendarDays size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3>Gantt Chart & Timeline</h3>
                <p>The interactive project timeline and milestones will be displayed here.</p>
              </div>
            </div>
          )}

          {/* PROCUREMENT TAB */}
          {activeTab === 'procurement' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Procurement & Materials</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-outline"><Filter size={16} style={{ marginRight: '8px' }}/> Filter</button>
                  <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Requisition</button>
                </div>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#334155' }}>Material Requisitions (MR)</h3>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Item</th>
                    <th style={{ padding: '1rem' }}>Qty</th>
                    <th style={{ padding: '1rem' }}>Unit</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PROCUREMENT.requisitions.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{req.item}</td>
                      <td style={{ padding: '1rem' }}>{req.quantity}</td>
                      <td style={{ padding: '1rem' }}>{req.unit}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#dcfce7', color: '#166534' }}>{req.status}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>{req.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#334155' }}>Site Inventory</h3>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Item</th>
                    <th style={{ padding: '1rem' }}>Category</th>
                    <th style={{ padding: '1rem' }}>Qty In Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PROCUREMENT.inventory.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{inv.item}</td>
                      <td style={{ padding: '1rem' }}>{inv.category}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.quantity} {inv.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* DAILY REPORTS TAB */}
          {activeTab === 'daily_reports' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Daily Progress Reports (Site Diary)</h2>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> New Report</button>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Weather</th>
                    <th style={{ padding: '1rem' }}>Manpower</th>
                    <th style={{ padding: '1rem' }}>Equipment</th>
                    <th style={{ padding: '1rem' }}>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DAILY_REPORTS.map(rep => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{rep.date}</td>
                      <td style={{ padding: '1rem' }}>{rep.weather}</td>
                      <td style={{ padding: '1rem' }}>{rep.manpower}</td>
                      <td style={{ padding: '1rem' }}>{rep.equipment}</td>
                      <td style={{ padding: '1rem' }}>{rep.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VARIATIONS & CLAIMS TAB */}
          {activeTab === 'variations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Variations & Claims</h2>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Log Variation</button>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Ref #</th>
                    <th style={{ padding: '1rem' }}>Title</th>
                    <th style={{ padding: '1rem' }}>Cost Impact</th>
                    <th style={{ padding: '1rem' }}>Schedule Impact</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_VARIATIONS.map(vo => (
                    <tr key={vo.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 500, color: '#0ea5e9' }}>{vo.ref}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{vo.title}</td>
                      <td style={{ padding: '1rem' }}>${vo.costImpact.toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}>+{vo.scheduleImpact} Days</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#fef3c7', color: '#b45309' }}>{vo.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SUBCONTRACTORS TAB */}
          {activeTab === 'subcontractors' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Subcontractor Management</h2>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Add Subcontractor</button>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Name</th>
                    <th style={{ padding: '1rem' }}>Scope of Work</th>
                    <th style={{ padding: '1rem' }}>Contract Value</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SUBCONTRACTORS.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{sub.name}</td>
                      <td style={{ padding: '1rem' }}>{sub.scope}</td>
                      <td style={{ padding: '1rem' }}>${sub.value.toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#dcfce7', color: '#166534' }}>{sub.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PUNCH LIST TAB */}
          {activeTab === 'punch_list' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Punch List (Snags)</h2>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Log Defect</button>
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
                  {MOCK_SNAGS.map(snag => (
                    <tr key={snag.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{snag.location}</td>
                      <td style={{ padding: '1rem' }}>{snag.desc}</td>
                      <td style={{ padding: '1rem' }}>{snag.severity}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: '#fee2e2', color: '#991b1b' }}>{snag.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CORRESPONDENCE TAB */}
          {activeTab === 'correspondence' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Formal Correspondence Log</h2>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Add Log</button>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Ref #</th>
                    <th style={{ padding: '1rem' }}>Type</th>
                    <th style={{ padding: '1rem' }}>Subject</th>
                    <th style={{ padding: '1rem' }}>Sender</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CORRESPONDENCE.map(corr => (
                    <tr key={corr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>{corr.date}</td>
                      <td style={{ padding: '1rem', fontWeight: 500, color: '#0ea5e9' }}>{corr.ref}</td>
                      <td style={{ padding: '1rem' }}>{corr.type}</td>
                      <td style={{ padding: '1rem' }}>{corr.subject}</td>
                      <td style={{ padding: '1rem' }}>{corr.sender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* EQUIPMENT LOGS TAB */}
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
          )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Project Documents</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary"><Filter size={16} style={{ marginRight: '8px' }}/> Filter</button>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Upload</button>
              </div>
            </div>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Doc No.</th>
                  <th style={{ padding: '1rem' }}>Title</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Rev</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DOCS.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#0369a1' }}>{doc.documentNumber}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{doc.title}</td>
                    <td style={{ padding: '1rem' }}>{doc.type}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{doc.revision}</td>
                    <td style={{ padding: '1rem' }}>{doc.status}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{doc.issueDate}</td>
                    <td style={{ padding: '1rem' }}><button style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer' }}><Download size={18}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RESOURCES TAB */}
        {activeTab === 'resources' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Resource Allocations</h2>
              <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Allocate Resource</button>
            </div>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Role/Use</th>
                  <th style={{ padding: '1rem' }}>Allocation</th>
                  <th style={{ padding: '1rem' }}>Dates</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RESOURCES.map(res => (
                  <tr key={res.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: res.type === 'Personnel' ? '#f3e8ff' : '#fef3c7', color: res.type === 'Personnel' ? '#7e22ce' : '#b45309' }}>
                        {res.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{res.name}</td>
                    <td style={{ padding: '1rem' }}>{res.role}</td>
                    <td style={{ padding: '1rem' }}>{res.allocation}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{res.dates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FINANCIALS TAB (Restricted) */}
        {activeTab === 'financials' && canViewFinancials && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Financial Tracking</h2>
              <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Log Transaction</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Budget</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>$500,000</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                <div style={{ color: '#be123c', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Expenses Logged</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9f1239' }}>$15,000</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ color: '#15803d', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Invoiced to Client</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>$100,000</div>
              </div>
            </div>

            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Description</th>
                  <th style={{ padding: '1rem' }}>Amount</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_FINANCIALS.map(fin => (
                  <tr key={fin.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{fin.date}</td>
                    <td style={{ padding: '1rem' }}>{fin.type}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{fin.desc}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600 }}>${fin.amount.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: fin.status === 'Approved' || fin.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                        color: fin.status === 'Approved' || fin.status === 'Paid' ? '#166534' : '#b45309'
                      }}>{fin.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* HSE TAB */}
        {activeTab === 'hse' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Health, Safety & Environment</h2>
              <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Log Incident</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ color: '#15803d', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Days Without LTI</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{MOCK_HSE.metrics.lti}</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>TRIR</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{MOCK_HSE.metrics.trir}</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ color: '#1d4ed8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Toolbox Talks</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>{MOCK_HSE.metrics.toolboxTalks}</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
                <div style={{ color: '#a21caf', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Safety Walkdowns</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#86198f' }}>{MOCK_HSE.metrics.walkdowns}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#334155' }}>Recent Incidents</h3>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Description</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HSE.incidents.map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{inc.date}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{inc.type}</td>
                    <td style={{ padding: '1rem' }}>{inc.description}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: inc.status === 'Closed' ? '#dcfce7' : '#fee2e2',
                        color: inc.status === 'Closed' ? '#166534' : '#991b1b'
                      }}>{inc.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* QUALITY TAB */}
        {activeTab === 'quality' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Quality Assurance & Control</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary"><Plus size={16} style={{ marginRight: '8px' }}/> Log Inspection</button>
                <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Log NCR</button>
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#334155' }}>Non-Conformity Reports (NCRs)</h3>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>NCR Number</th>
                  <th style={{ padding: '1rem' }}>Title</th>
                  <th style={{ padding: '1rem' }}>Severity</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_QUALITY.ncrs.map(ncr => (
                  <tr key={ncr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#0369a1' }}>{ncr.number}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{ncr.title}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                        backgroundColor: ncr.severity === 'High' ? '#fee2e2' : '#fef3c7',
                        color: ncr.severity === 'High' ? '#991b1b' : '#b45309'
                      }}>{ncr.severity}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: ncr.status === 'Closed' ? '#dcfce7' : '#e0f2fe',
                        color: ncr.status === 'Closed' ? '#166534' : '#075985'
                      }}>{ncr.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#334155' }}>Recent Inspections & Tests</h3>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Location</th>
                  <th style={{ padding: '1rem' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_QUALITY.inspections.map(insp => (
                  <tr key={insp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{insp.date}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{insp.type}</td>
                    <td style={{ padding: '1rem' }}>{insp.location}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: insp.result === 'Passed' ? '#dcfce7' : '#fee2e2',
                        color: insp.result === 'Passed' ? '#166534' : '#991b1b'
                      }}>{insp.result}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RISKS TAB */}
        {activeTab === 'risks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Project Risk Register</h2>
              <button className="btn btn-primary"><Plus size={16} style={{ marginRight: '8px' }}/> Log Risk</button>
            </div>
            
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Title</th>
                  <th style={{ padding: '1rem' }}>Category</th>
                  <th style={{ padding: '1rem' }}>Likelihood</th>
                  <th style={{ padding: '1rem' }}>Impact</th>
                  <th style={{ padding: '1rem' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RISKS.map(risk => (
                  <tr key={risk.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{risk.title}</td>
                    <td style={{ padding: '1rem' }}>{risk.category}</td>
                    <td style={{ padding: '1rem' }}>{risk.likelihood}</td>
                    <td style={{ padding: '1rem' }}>{risk.impact}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', borderRadius: '50%', fontSize: '0.875rem', fontWeight: 700,
                        backgroundColor: risk.score >= 15 ? '#fee2e2' : risk.score >= 10 ? '#fef3c7' : '#dcfce7',
                        color: risk.score >= 15 ? '#991b1b' : risk.score >= 10 ? '#b45309' : '#166534'
                      }}>{risk.score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

          {/* ADMIN TAB */}
          {activeTab === 'admin' && (
            <ProjectAdminDashboard 
              project={project} 
              onAssignUser={handleAssignUser} 
              onUpdatePermissions={handleUpdatePermissions} 
            />
          )}

        </div>
      </div>
    </div>
  );
};
