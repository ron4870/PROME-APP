import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ListTodo, FileText, Users, DollarSign, Building2, Calendar, ArrowLeft, Plus, Download, ShieldAlert, CheckCircle, AlertTriangle, LayoutDashboard, CalendarDays, ClipboardList, FileDiff, ListChecks, Mail, Shield, CreditCard, Flag, GitMerge, CalendarRange, BarChartHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectAdminDashboard } from '../components/ProjectAdminDashboard';
import { GenericModal, type ModalConfig } from '../components/GenericModal';
import { useProjectModules } from '../hooks/useProjectModules';

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

// import { useProjectModules } from '../hooks/useProjectModules';

export const ProjectWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // Real data fetching hook
  const { tasks, meetings, variations, snags, correspondence, documents, dailyReports, paymentInvoices, fetchAll } = useProjectModules(id, token);

  const overallTrackerTask = tasks?.find((t: any) => t.isOverallProgressTracker);
  const overallProgress = overallTrackerTask ? overallTrackerTask.progress : 0;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [corrFilter, setCorrFilter] = useState('');
  const [docFilter, setDocFilter] = useState('');
  const [dailyReportFilter, setDailyReportFilter] = useState('');
  const [paymentInvoiceFilter, setPaymentInvoiceFilter] = useState('');
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
              { id: 'correspondence', label: 'Correspondence', icon: <Mail size={18} /> },
              { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
              { id: 'daily_reports', label: 'Daily Reports', icon: <ClipboardList size={18} /> },
              { id: 'variations', label: 'Variations & Claims', icon: <FileDiff size={18} /> },
              { id: 'payment_invoices', label: 'Payments / Invoices', icon: <CreditCard size={18} /> },
              { id: 'hse', label: 'HSE', icon: <ShieldAlert size={18} /> },
              { id: 'quality', label: 'Quality', icon: <CheckCircle size={18} /> },
              { id: 'risks', label: 'Risk Register', icon: <AlertTriangle size={18} /> },
              { id: 'resources', label: 'Team', icon: <Users size={18} /> },
              { id: 'snag_list', label: 'Snag List', icon: <ListChecks size={18} /> },
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
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: 'bold' }}>Project Dashboard</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* My Pending Tasks Widget */}
                <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>My Pending Tasks</h3>
                    <ListTodo size={24} color="#64748b" />
                  </div>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {tasks && tasks.filter((t: any) => t.assignedToId === user?.id && t.status !== 'Completed').length > 0 ? (
                      tasks.filter((t: any) => t.assignedToId === user?.id && t.status !== 'Completed').map((task: any) => (
                        <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>{task.title}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date set'} • Progress: {task.progress || 0}%
                            </div>
                          </div>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: task.status === 'In Progress' ? '#e0f2fe' : '#f1f5f9',
                            color: task.status === 'In Progress' ? '#075985' : '#475569'
                          }}>{task.status}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        You have no pending tasks assigned.
                      </div>
                    )}
                  </div>
                </div>

                {/* Overall Progress Widget */}
                <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Overall Progress</h3>
                    <LayoutDashboard size={24} color="#64748b" />
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0ea5e9', marginBottom: '0.5rem' }}>{overallProgress}%</div>
                  <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '9999px', height: '8px' }}>
                    <div style={{ backgroundColor: '#0ea5e9', height: '8px', borderRadius: '9999px', width: `${overallProgress}%` }}></div>
                  </div>
                </div>

                {/* Upcoming Meetings Widget */}
                <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Next Meeting</h3>
                    <CalendarDays size={24} color="#64748b" />
                  </div>
                  {meetings && meetings.length > 0 ? (
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{meetings[0].title}</div>
                      <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>{new Date(meetings[0].date).toLocaleDateString()} at {meetings[0].time}</div>
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8' }}>No upcoming meetings</div>
                  )}
                </div>

                {/* Open Snags Widget */}
                <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Open Snags</h3>
                    <AlertTriangle size={24} color="#64748b" />
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                    {snags ? snags.filter((s: any) => s.status !== 'Closed' && s.status !== 'Fixed').length : 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Task Management</h2>
              <button className="btn btn-primary" onClick={() => {
                const baseFields: any[] = [
                  {name: 'title', label: 'Title', type: 'text', required: true},
                  {name: 'description', label: 'Description', type: 'textarea'},
                  {name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'In Review', 'Completed']},
                  {name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical']},
                  {name: 'progress', label: 'Progress (%)', type: 'number'},
                  {name: 'dueDate', label: 'Due Date', type: 'date'}
                ];

                const canAssignTasks = isAdministrator || ['Project Manager', 'Project Top Managment', 'Project Top Management'].includes(currentUserMembership?.role || '');
                if (canAssignTasks) {
                  baseFields.splice(4, 0, {
                    name: 'assignedToId', 
                    label: 'Assign To', 
                    type: 'select', 
                    options: project?.members?.map((m: any) => ({ label: `${m.user.name} (${m.role})`, value: m.user.id.toString() })) || [] 
                  });
                  baseFields.push({name: 'isOverallProgressTracker', label: 'Set as Overall Progress Tracker?', type: 'checkbox'});
                }

                setModalConfig({ 
                  title: 'Add Task', 
                  endpoint: `/api/projects/${id}/tasks`, 
                  fields: baseFields 
                });
              }}><Plus size={16} style={{ marginRight: '8px' }}/> Add Task</button>
            </div>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Task Title</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Progress</th>
                  <th style={{ padding: '1rem' }}>Priority</th>
                  <th style={{ padding: '1rem' }}>Assignee</th>
                  <th style={{ padding: '1rem' }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks?.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: task.isOverallProgressTracker ? '#fffbeb' : 'transparent' }}>
                    <td style={{ padding: '1rem', fontWeight: 500, color: '#0f172a' }}>
                      {task.title}
                      {task.isOverallProgressTracker && <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>⭐ Tracker</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: task.status === 'Completed' ? '#dcfce7' : task.status === 'In Progress' ? '#e0f2fe' : '#f1f5f9',
                        color: task.status === 'Completed' ? '#166534' : task.status === 'In Progress' ? '#075985' : '#475569'
                      }}>{task.status}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '100px', backgroundColor: '#e2e8f0', borderRadius: '9999px', height: '6px' }}>
                          <div style={{ backgroundColor: task.progress === 100 ? '#22c55e' : '#3b82f6', height: '6px', borderRadius: '9999px', width: `${task.progress || 0}%` }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{task.progress || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>{task.priority}</td>
                    <td style={{ padding: '1rem' }}>{task.assignedTo?.name || '-'}</td>
                    <td style={{ padding: '1rem' }}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
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
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Project Schedule & Meetings</h2>
                <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Schedule Meeting', endpoint: `/api/projects/${id}/meetings`, fields: [{name: 'title', label: 'Meeting Title', type: 'text', required: true}, {name: 'date', label: 'Date', type: 'date', required: true}, {name: 'time', label: 'Time', type: 'text', required: true, placeholder: 'e.g. 10:00 AM'}, {name: 'locationOrLink', label: 'Location or Link', type: 'text', required: true}, {name: 'attendees', label: 'Attendees', type: 'text'}, {name: 'description', label: 'Agenda/Description', type: 'textarea'}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Add Meeting</button>
              </div>

              {/* Gantt Chart & Milestones Tools */}
              <div style={{ marginBottom: '2rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChartHorizontal size={20} color="#0ea5e9" /> Gantt Chart & Milestones
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Configure milestones, manage task dependencies, and automatically generate your project's Gantt chart timeline.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={() => alert('Milestones feature coming soon!')}>
                    <Flag size={16} style={{ marginRight: '8px' }}/> Add Milestone
                  </button>
                  <button className="btn btn-secondary" onClick={() => alert('Dependencies feature coming soon!')}>
                    <GitMerge size={16} style={{ marginRight: '8px' }}/> Manage Dependencies
                  </button>
                  <button className="btn btn-secondary" onClick={() => alert('Timeline Configuration coming soon!')}>
                    <CalendarRange size={16} style={{ marginRight: '8px' }}/> Configure Timeline
                  </button>
                  <button className="btn btn-primary" onClick={() => alert('Gantt Chart generation coming soon!')}>
                    <BarChartHorizontal size={16} style={{ marginRight: '8px' }}/> Generate Gantt Chart
                  </button>
                </div>
              </div>

              {/* Upcoming Meetings List */}
              <div style={{ marginBottom: '2rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#334155' }}>Upcoming Meetings</h3>
                {meetings && meetings.length > 0 ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {meetings.map((m: any) => (
                      <div key={m.id} style={{ padding: '1.25rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.05rem', marginBottom: '0.25rem' }}>{m.title}</div>
                          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{new Date(m.date).toLocaleDateString()} @ {m.time} | Location: {m.locationOrLink}</div>
                          {m.attendees && <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}><strong>Attendees:</strong> {m.attendees}</div>}
                        </div>
                        <span style={{ padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: m.status === 'Completed' ? '#dcfce7' : '#e0f2fe', color: m.status === 'Completed' ? '#166534' : '#075985' }}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>No upcoming meetings scheduled.</p>
                )}
              </div>

              {/* Task Progress Tracker */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#334155' }}>Task Progress Tracker</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {tasks && tasks.length > 0 ? tasks.map((task: any) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: task.isOverallProgressTracker ? '#fffbeb' : 'white', padding: '1rem', borderRadius: '8px', border: '1px solid', borderColor: task.isOverallProgressTracker ? '#fbbf24' : '#cbd5e1' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {task.title}
                            {task.isOverallProgressTracker && <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>⭐ Tracker</span>}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>{task.progress || 0}%</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#f1f5f9', borderRadius: '9999px', height: '12px' }}>
                          <div style={{ backgroundColor: (task.progress || 0) === 100 ? '#22c55e' : '#0ea5e9', height: '12px', borderRadius: '9999px', width: `${task.progress || 0}%`, transition: 'width 0.3s ease-in-out' }}></div>
                        </div>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }} onClick={() => setModalConfig({ title: 'Update Progress', endpoint: `/api/projects/${id}/tasks/${task.id}`, method: 'PUT', fields: [{name: 'progress', label: 'Progress (%)', type: 'number', required: true, defaultValue: task.progress || 0}, {name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'In Review', 'Completed'], defaultValue: task.status}] })}>Update</button>
                    </div>
                  )) : (
                    <p style={{ color: '#64748b' }}>No tasks found for this project.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VARIATIONS TAB */}
          {activeTab === 'daily_reports' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Daily Reports</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input type="text" placeholder="Filter reports..." value={dailyReportFilter} onChange={(e) => setDailyReportFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px' }} />
                  <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Add Daily Report', endpoint: `/api/projects/${id}/daily-reports`, fields: [{name: 'date', label: 'Date', type: 'date', required: true}, {name: 'location', label: 'Location', type: 'text', required: true}, {name: 'weatherCondition', label: 'Weather', type: 'text'}, {name: 'manpowerCount', label: 'Active Manpower', type: 'number'}, {name: 'equipmentCount', label: 'Active Equipment', type: 'number'}, {name: 'summary', label: 'Activities Summary', type: 'textarea', required: true}, {name: 'file', label: 'Attach PDF', type: 'file'}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Log Report</button>
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem' }}>Date</th>
                      <th style={{ padding: '1rem' }}>Location</th>
                      <th style={{ padding: '1rem' }}>Weather</th>
                      <th style={{ padding: '1rem' }}>Manpower</th>
                      <th style={{ padding: '1rem' }}>Equipment</th>
                      <th style={{ padding: '1rem' }}>Activities</th>
                      <th style={{ padding: '1rem' }}>Attachment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReports?.filter((r: any) => !dailyReportFilter || r.location?.toLowerCase().includes(dailyReportFilter.toLowerCase()) || r.activities?.toLowerCase().includes(dailyReportFilter.toLowerCase()) || r.date?.includes(dailyReportFilter)).map((report: any) => {
                      let dlLink = null;
                      if (report.fileUrl) {
                        try { dlLink = JSON.parse(report.fileUrl).download; } catch(e) { dlLink = report.fileUrl; }
                      }
                      return (
                      <tr key={report.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{report.date ? new Date(report.date).toLocaleDateString() : ''}</td>
                        <td style={{ padding: '1rem' }}>{report.location || '-'}</td>
                        <td style={{ padding: '1rem' }}>{report.weatherMorning || '-'}</td>
                        <td style={{ padding: '1rem' }}>{report.activeManpower || 0}</td>
                        <td style={{ padding: '1rem' }}>{report.activeEquipment || 0}</td>
                        <td style={{ padding: '1rem', color: '#475569' }}>{report.activities}</td>
                        <td style={{ padding: '1rem' }}>
                          {dlLink ? (
                            <a href={dlLink} download style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}><Download size={16} /> Download</a>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                      </tr>
                    )})}
                    {(!dailyReports || dailyReports.length === 0) && (
                      <tr>
                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No daily reports logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
          )}

          {/* SNAG LIST TAB */}
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
          )}

          {/* CORRESPONDENCE TAB */}
          {activeTab === 'correspondence' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Formal Correspondence Log</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input type="text" placeholder="Filter correspondence..." value={corrFilter} onChange={(e) => setCorrFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px' }} />
                  <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Add Formal Correspondence', endpoint: `/api/projects/${id}/correspondence`, fields: [{name: 'date', label: 'Date', type: 'date', required: true}, {name: 'referenceNumber', label: 'Reference Number', type: 'text', required: true}, {name: 'type', label: 'Type (Incoming/Outgoing)', type: 'select', options: ['Incoming', 'Outgoing'], required: true}, {name: 'subject', label: 'Subject', type: 'text', required: true}, {name: 'sender', label: 'Sender', type: 'select', options: ['Client', 'Contractor', 'Consultant', 'Other'], required: true}, {name: 'recipient', label: 'Recipient', type: 'select', options: ['Client', 'Contractor', 'Consultant', 'Other'], required: true}, {name: 'file', label: 'Attach PDF', type: 'file'}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Add Log</button>
                </div>
              </div>
            {(() => {
              const filteredCorr = correspondence.filter((corr: any) => {
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
              });
              
              const groupedCorr = filteredCorr.reduce((acc: any, corr: any) => {
                const t = corr.type || 'Other';
                if (!acc[t]) acc[t] = [];
                acc[t].push(corr);
                return acc;
              }, {});

              if (Object.keys(groupedCorr).length === 0) {
                return (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    No correspondence found matching your filter.
                  </div>
                );
              }

              return Object.entries(groupedCorr).map(([type, corrs]: [string, any]) => (
                <div key={type} style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {type}
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '0.1rem 0.6rem', borderRadius: '999px' }}>
                      {corrs.length}
                    </span>
                  </h3>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '1rem', color: '#475569' }}>Date</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Ref #</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Subject</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Sender</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Recipient</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {corrs.map((corr: any) => (
                          <tr key={corr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '1rem' }}>{corr.date ? new Date(corr.date).toLocaleDateString() : ''}</td>
                            <td style={{ padding: '1rem', fontWeight: 500, color: '#0ea5e9' }}>{corr.referenceNumber || corr.ref}</td>
                            <td style={{ padding: '1rem' }}>{corr.subject}</td>
                            <td style={{ padding: '1rem' }}>{corr.sender}</td>
                            <td style={{ padding: '1rem' }}>{corr.recipient}</td>
                            <td style={{ padding: '1rem' }}>
                              {(() => {
                                if (!corr.fileUrl) return <span style={{ color: '#94a3b8' }}>-</span>;
                                
                                let downloadLink = corr.fileUrl;
                                
                                const extractDriveId = (url: string) => {
                                  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                  return match ? match[1] : null;
                                };
                                
                                try {
                                  const parsed = JSON.parse(corr.fileUrl);
                                  if (parsed && parsed.download) {
                                    downloadLink = parsed.download;
                                  }
                                } catch (e) {
                                  // Legacy link handling
                                  const driveId = extractDriveId(corr.fileUrl);
                                  if (driveId) {
                                    downloadLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
                                  }
                                }
                                
                                return (
                                  <a href={downloadLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>
                                    <Download size={16} /> Download
                                  </a>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })()}
            </div>
          )}



        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Project Documents</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input type="text" placeholder="Filter documents..." value={docFilter} onChange={(e) => setDocFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px' }} />
                <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Upload Document', endpoint: `/api/projects/${id}/documents`, fields: [{name: 'documentNumber', label: 'Document Number', type: 'text'}, {name: 'title', label: 'Title', type: 'text'}, {name: 'type', label: 'Type', type: 'select', options: ['Contractual Document', 'Report', 'Design Document', 'Meeting Minutes', 'QA/QC Plan', 'Method Statement', 'Quality Control Form', 'Project Drawing', 'Media', 'RFI']}, {name: 'revision', label: 'Revision', type: 'text'}, {name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Issued for Review', 'Approved']}, {name: 'issueDate', label: 'Issue Date', type: 'date'}, {name: 'file', label: 'Attach File', type: 'file', required: true}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Upload</button>
              </div>
            </div>
            {(() => {
              const filteredDocs = documents.filter((doc: any) => {
                const q = docFilter.toLowerCase();
                return (
                  (doc.documentNumber && doc.documentNumber.toLowerCase().includes(q)) ||
                  (doc.title && doc.title.toLowerCase().includes(q)) ||
                  (doc.type && doc.type.toLowerCase().includes(q)) ||
                  (doc.status && doc.status.toLowerCase().includes(q))
                );
              });
              
              const groupedDocs = filteredDocs.reduce((acc: any, doc: any) => {
                const t = doc.type || 'Other';
                if (!acc[t]) acc[t] = [];
                acc[t].push(doc);
                return acc;
              }, {});

              if (Object.keys(groupedDocs).length === 0) {
                return (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    No documents found matching your filter.
                  </div>
                );
              }

              return Object.entries(groupedDocs).map(([type, docs]: [string, any]) => (
                <div key={type} style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {type}
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '0.1rem 0.6rem', borderRadius: '999px' }}>
                      {docs.length}
                    </span>
                  </h3>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '1rem', color: '#475569' }}>Doc No.</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Title</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Rev</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Status</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Date</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((doc: any) => (
                          <tr key={doc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#0369a1' }}>{doc.documentNumber}</td>
                            <td style={{ padding: '1rem', fontWeight: 500 }}>{doc.title}</td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>{doc.revision}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: doc.status === 'Approved' ? '#dcfce7' : '#fef3c7', color: doc.status === 'Approved' ? '#166534' : '#b45309' }}>{doc.status}</span>
                            </td>
                            <td style={{ padding: '1rem', color: '#64748b' }}>{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : ''}</td>
                            <td style={{ padding: '1rem' }}>
                              {(() => {
                                if (!doc.fileUrl) return <span style={{ color: '#94a3b8' }}>-</span>;
                                
                                let downloadLink = doc.fileUrl;
                                
                                const extractDriveId = (url: string) => {
                                  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                  return match ? match[1] : null;
                                };
                                
                                try {
                                  const parsed = JSON.parse(doc.fileUrl);
                                  if (parsed && parsed.download) {
                                    downloadLink = parsed.download;
                                  }
                                } catch (e) {
                                  // Legacy link handling
                                  const driveId = extractDriveId(doc.fileUrl);
                                  if (driveId) {
                                    downloadLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
                                  }
                                }
                                
                                return (
                                  <a href={downloadLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>
                                    <Download size={16} /> Download
                                  </a>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })()}
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

        {/* PAYMENTS / INVOICES TAB */}
        {activeTab === 'payment_invoices' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Payments / Invoices</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input type="text" placeholder="Filter invoices..." value={paymentInvoiceFilter} onChange={(e) => setPaymentInvoiceFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px' }} />
                <button className="btn btn-primary" onClick={() => setModalConfig({ title: 'Upload Invoice', endpoint: `/api/projects/${id}/payment-invoices`, fields: [{name: 'documentNumber', label: 'Invoice Number', type: 'text'}, {name: 'title', label: 'Title', type: 'text'}, {name: 'type', label: 'Type', type: 'select', options: ['Consultant Invoice', 'Contractor IPC', 'Other']}, {name: 'revision', label: 'Revision', type: 'text'}, {name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Submitted', 'Approved', 'Paid', 'Rejected']}, {name: 'issueDate', label: 'Issue Date', type: 'date'}, {name: 'file', label: 'Attach File', type: 'file', required: true}] })}><Plus size={16} style={{ marginRight: '8px' }}/> Upload</button>
              </div>
            </div>
            {(() => {
              const filteredInvoices = (paymentInvoices || []).filter((inv: any) => {
                const q = paymentInvoiceFilter.toLowerCase();
                return (
                  (inv.documentNumber && inv.documentNumber.toLowerCase().includes(q)) ||
                  (inv.title && inv.title.toLowerCase().includes(q)) ||
                  (inv.type && inv.type.toLowerCase().includes(q)) ||
                  (inv.status && inv.status.toLowerCase().includes(q))
                );
              });
              
              const groupedInvoices = filteredInvoices.reduce((acc: any, inv: any) => {
                const t = inv.type || 'Other';
                if (!acc[t]) acc[t] = [];
                acc[t].push(inv);
                return acc;
              }, {});

              if (Object.keys(groupedInvoices).length === 0) {
                return (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    No payments or invoices found matching your filter.
                  </div>
                );
              }

              return Object.entries(groupedInvoices).map(([type, invoices]: [string, any]) => (
                <div key={type} style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {type}
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 'normal', backgroundColor: '#f1f5f9', padding: '0.1rem 0.6rem', borderRadius: '999px' }}>
                      {invoices.length}
                    </span>
                  </h3>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '1rem', color: '#475569' }}>Invoice No.</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Title</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Rev</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Status</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Date</th>
                          <th style={{ padding: '1rem', color: '#475569' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv: any) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#0369a1' }}>{inv.documentNumber}</td>
                            <td style={{ padding: '1rem', fontWeight: 500 }}>{inv.title}</td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>{inv.revision}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', backgroundColor: inv.status === 'Approved' || inv.status === 'Paid' ? '#dcfce7' : '#fef3c7', color: inv.status === 'Approved' || inv.status === 'Paid' ? '#166534' : '#b45309' }}>{inv.status}</span>
                            </td>
                            <td style={{ padding: '1rem', color: '#64748b' }}>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : ''}</td>
                            <td style={{ padding: '1rem' }}>
                              {(() => {
                                if (!inv.fileUrl) return <span style={{ color: '#94a3b8' }}>-</span>;
                                
                                let downloadLink = inv.fileUrl;
                                
                                const extractDriveId = (url: string) => {
                                  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                  return match ? match[1] : null;
                                };
                                
                                try {
                                  const parsed = JSON.parse(inv.fileUrl);
                                  if (parsed && parsed.download) {
                                    downloadLink = parsed.download;
                                  }
                                } catch (e) {
                                  // Legacy link handling
                                  const driveId = extractDriveId(inv.fileUrl);
                                  if (driveId) {
                                    downloadLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
                                  }
                                }
                                
                                return (
                                  <a href={downloadLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>
                                    <Download size={16} /> Download
                                  </a>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })()}
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
      <GenericModal 
        isOpen={!!modalConfig}
        onClose={() => setModalConfig(null)}
        config={modalConfig}
        token={token}
        onSuccess={fetchAll}
      />
    </div>
  );
};
