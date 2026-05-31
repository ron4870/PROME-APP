import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, Wrench, FileText, Package, AlertTriangle, 
  MessageSquare, ShieldAlert, Activity, ArrowRight,
  Megaphone, Plus, User, Clock
} from 'lucide-react';

interface DashboardMetrics {
  capa: { open: number, overdue: number };
  risk: { criticalOpen: number };
  equipment: { overdue: number, upcoming: number };
  feedback: { openComplaints: number };
  suppliers: { evaluationsDue: number };
  documents: { pending: number, reviewsDue: number };
  audits: { upcoming: number };
  ncr: { open: number };
}

interface Notice {
  id: number;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
  author: { name: string };
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', priority: 'Info' });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchMetrics();
    fetchNotices();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setMetrics(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotices = async () => {
    try {
      const response = await fetch('/api/notices', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setNotices(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const response = await fetch('/api/notices', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ ...newNotice, authorId: user?.id })
      });
      
      if (response.ok) {
        setIsNoticeModalOpen(false);
        setNewNotice({ title: '', content: '', priority: 'Info' });
        fetchNotices();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="layout-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ color: '#6b7280', fontSize: '1.25rem' }}>Loading Command Center...</div>
    </div>;
  }

  if (!metrics) return null;

  return (
    <div className="layout-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={32} color="#0f766e" /> Global Command Center
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          Real-time ISO 9001 IMS performance and compliance overview.
        </p>
      </div>

      {/* URGENT ALERTS SECTION */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#991b1b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #fecaca', paddingBottom: '0.5rem' }}>
        Critical Action Required
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        
        {/* Overdue CAPAs */}
        <div 
          style={{ backgroundColor: metrics.capa.overdue > 0 ? '#fef2f2' : 'white', border: metrics.capa.overdue > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          onClick={() => navigate('/capa')}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: metrics.capa.overdue > 0 ? '#991b1b' : '#6b7280', fontWeight: '600' }}>
                <AlertOctagon size={24} /> Overdue CAPAs
              </div>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: metrics.capa.overdue > 0 ? '#b91c1c' : '#111827', lineHeight: 1 }}>{metrics.capa.overdue}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>Corrective actions that have passed their target completion date.</p>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', color: '#0f766e', fontWeight: '600', fontSize: '0.875rem' }}>
            View CAPAs <ArrowRight size={16} style={{ marginLeft: '4px' }}/>
          </div>
        </div>

        {/* Expired Calibrations */}
        <div 
          style={{ backgroundColor: metrics.equipment.overdue > 0 ? '#fef2f2' : 'white', border: metrics.equipment.overdue > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          onClick={() => navigate('/equipment')}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: metrics.equipment.overdue > 0 ? '#991b1b' : '#6b7280', fontWeight: '600' }}>
                <Wrench size={24} /> Expired Calibrations
              </div>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: metrics.equipment.overdue > 0 ? '#b91c1c' : '#111827', lineHeight: 1 }}>{metrics.equipment.overdue}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>Equipment actively in use with expired calibration certificates.</p>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', color: '#0f766e', fontWeight: '600', fontSize: '0.875rem' }}>
            Manage Equipment <ArrowRight size={16} style={{ marginLeft: '4px' }}/>
          </div>
        </div>

        {/* Open Complaints */}
        <div 
          style={{ backgroundColor: metrics.feedback.openComplaints > 0 ? '#fffbeb' : 'white', border: metrics.feedback.openComplaints > 0 ? '1px solid #fde68a' : '1px solid #e5e7eb', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          onClick={() => navigate('/feedback')}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: metrics.feedback.openComplaints > 0 ? '#b45309' : '#6b7280', fontWeight: '600' }}>
                <MessageSquare size={24} /> Unresolved Complaints
              </div>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: metrics.feedback.openComplaints > 0 ? '#d97706' : '#111827', lineHeight: 1 }}>{metrics.feedback.openComplaints}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>Customer complaints requiring investigation and response.</p>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', color: '#0f766e', fontWeight: '600', fontSize: '0.875rem' }}>
            View Feedback <ArrowRight size={16} style={{ marginLeft: '4px' }}/>
          </div>
        </div>

        {/* Open NCRs */}
        <div 
          style={{ backgroundColor: metrics.ncr.open > 0 ? '#fffbeb' : 'white', border: metrics.ncr.open > 0 ? '1px solid #fde68a' : '1px solid #e5e7eb', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          onClick={() => navigate('/ncr')}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: metrics.ncr.open > 0 ? '#b45309' : '#6b7280', fontWeight: '600' }}>
                <AlertOctagon size={24} /> Open NCRs
              </div>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: metrics.ncr.open > 0 ? '#d97706' : '#111827', lineHeight: 1 }}>{metrics.ncr.open}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>Non-conformities awaiting disposition or review.</p>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', color: '#0f766e', fontWeight: '600', fontSize: '0.875rem' }}>
            View NCRs <ArrowRight size={16} style={{ marginLeft: '4px' }}/>
          </div>
        </div>

      </div>

      {/* OPERATIONAL METRICS SECTION */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
        Operational Status
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* Supplier Evaluations */}
        <div 
          style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onClick={() => navigate('/suppliers')}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '50%' }}>
            <Package size={28} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', lineHeight: 1 }}>{metrics.suppliers.evaluationsDue}</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600', marginTop: '4px' }}>Supplier Evaluations Due (≤30d)</div>
          </div>
        </div>

        {/* High/Critical Risks */}
        <div 
          style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onClick={() => navigate('/risks')}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          <div style={{ backgroundColor: '#fff7ed', padding: '1rem', borderRadius: '50%' }}>
            <ShieldAlert size={28} color="#ea580c" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', lineHeight: 1 }}>{metrics.risk.criticalOpen}</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600', marginTop: '4px' }}>Open High/Critical Risks</div>
          </div>
        </div>

        {/* Document Reviews */}
        <div 
          style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onClick={() => navigate('/documents')}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '50%' }}>
            <FileText size={28} color="#4b5563" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', lineHeight: 1 }}>
              {metrics.documents.reviewsDue} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 'normal' }}>/ {metrics.documents.pending}</span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600', marginTop: '4px' }}>Doc Reviews Due / Pending Docs</div>
          </div>
        </div>

        {/* Upcoming Audits */}
        <div 
          style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onClick={() => navigate('/audits')}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '50%' }}>
            <AlertTriangle size={28} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', lineHeight: 1 }}>{metrics.audits.upcoming}</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600', marginTop: '4px' }}>Upcoming Audits</div>
          </div>
        </div>
      </div>

      {/* INTERNAL COMMUNICATION / NOTICEBOARD */}
      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Megaphone size={20} color="#0f766e" /> Company Noticeboard
        </h2>
        <button onClick={() => setIsNoticeModalOpen(true)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Plus size={16} /> Post Notice
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {notices.length === 0 ? (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No recent notices.</p>
        ) : (
          notices.map(notice => (
            <div key={notice.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', borderLeft: `4px solid ${notice.priority === 'Urgent' ? '#ef4444' : notice.priority === 'Warning' ? '#f59e0b' : '#3b82f6'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>{notice.title}</h3>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: notice.priority === 'Urgent' ? '#fef2f2' : notice.priority === 'Warning' ? '#fffbeb' : '#eff6ff', color: notice.priority === 'Urgent' ? '#ef4444' : notice.priority === 'Warning' ? '#f59e0b' : '#3b82f6', fontWeight: 600 }}>
                  {notice.priority}
                </span>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1rem 0', whiteSpace: 'pre-wrap' }}>
                {notice.content}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14} /> {notice.author?.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {new Date(notice.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Notice Modal */}
      {isNoticeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNoticeModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone color="#0f172a" /> Post a Notice
            </h2>
            <form onSubmit={handleCreateNotice}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} placeholder="e.g., Office Closure for Holidays" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Priority Level</label>
                <select className="form-input" style={{ width: '100%' }} value={newNotice.priority} onChange={e => setNewNotice({...newNotice, priority: e.target.value})}>
                  <option>Info</option>
                  <option>Warning</option>
                  <option>Urgent</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message Content</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '100px' }} value={newNotice.content} onChange={e => setNewNotice({...newNotice, content: e.target.value})} placeholder="Type your message here..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNoticeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
