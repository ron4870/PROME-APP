import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Activity, AlertTriangle, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

interface HseIncident {
  id: number;
  incidentNumber: string;
  title: string;
  type: string;
  location: string;
  incidentDate: string;
  severity: string;
  status: string;
  reportedBy?: { name: string };
}

interface EmergencyDrill {
  id: number;
  drillNumber: string;
  type: string;
  scenario: string;
  drillDate: string;
  durationMinutes: number;
  participantsCount: number;
  findings: string;
  status: string;
  conductedBy?: { name: string };
}

export const HseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'incidents' | 'drills'>('incidents');
  
  // Incident State
  const [incidents, setIncidents] = useState<HseIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState('Near-Miss');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newSeverity, setNewSeverity] = useState('Low');
  const [newAction, setNewAction] = useState('');

  // Drill State
  const [drills, setDrills] = useState<EmergencyDrill[]>([]);
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [drillType, setDrillType] = useState('Fire Evacuation');
  const [drillScenario, setDrillScenario] = useState('');
  const [drillDateVal, setDrillDateVal] = useState('');
  const [drillDuration, setDrillDuration] = useState('');
  const [drillParticipants, setDrillParticipants] = useState('');
  const [drillFindings, setDrillFindings] = useState('');
  const [drillStatus, setDrillStatus] = useState('Completed');

  useEffect(() => {
    fetchIncidents();
    fetchDrills();
  }, []);

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hse/incidents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (error) {
      console.error('Failed to fetch incidents', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrills = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/hse/drills', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDrills(data);
      }
    } catch (error) {
      console.error('Failed to fetch drills', error);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch('/api/hse/incidents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          type: newType,
          title: newTitle,
          description: newDescription,
          location: newLocation,
          incidentDate: newDate,
          severity: newSeverity,
          immediateActionTaken: newAction,
          reportedById: user?.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewLocation('');
        setNewDate('');
        setNewAction('');
        fetchIncidents();
      }
    } catch (error) {
      console.error('Failed to report incident', error);
    }
  };

  const handleReportDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch('/api/hse/drills', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          type: drillType,
          scenario: drillScenario,
          drillDate: drillDateVal,
          durationMinutes: drillDuration,
          participantsCount: drillParticipants,
          findings: drillFindings,
          status: drillStatus,
          conductedById: user?.id
        })
      });

      if (res.ok) {
        setIsDrillModalOpen(false);
        setDrillScenario('');
        setDrillDateVal('');
        setDrillDuration('');
        setDrillParticipants('');
        setDrillFindings('');
        fetchDrills();
      }
    } catch (error) {
      console.error('Failed to report drill', error);
    }
  };

  const filtered = incidents.filter(i => 
    i.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDrills = drills.filter(d => 
    d.drillNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical': return { bg: '#fef2f2', col: '#ef4444' };
      case 'High': return { bg: '#fffbeb', col: '#f59e0b' };
      case 'Medium': return { bg: '#fefce8', col: '#eab308' };
      case 'Low': return { bg: '#f0fdf4', col: '#22c55e' };
      default: return { bg: '#f1f5f9', col: '#64748b' };
    }
  };

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="#bb0a0a" size={28} />
            HSE Management
          </h1>
          <p style={{ color: '#64748b' }}>Log safety incidents and manage emergency preparedness (ISO 45001 & 14001).</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {activeTab === 'incidents' ? (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} style={{ marginRight: '8px' }} />
              Report Incident
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setIsDrillModalOpen(true)}>
              <Plus size={18} style={{ marginRight: '8px' }} />
              Log Drill Record
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('incidents')}
          style={{ 
            padding: '1rem 2rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'incidents' ? '2px solid #0f766e' : '2px solid transparent',
            color: activeTab === 'incidents' ? '#0f766e' : '#64748b',
            fontWeight: activeTab === 'incidents' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Incidents & Near-Misses
        </button>
        <button 
          onClick={() => setActiveTab('drills')}
          style={{ 
            padding: '1rem 2rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'drills' ? '2px solid #0f766e' : '2px solid transparent',
            color: activeTab === 'drills' ? '#0f766e' : '#64748b',
            fontWeight: activeTab === 'drills' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Emergency Drills
        </button>
      </div>

      {activeTab === 'incidents' ? (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '50%', color: '#3b82f6' }}><Activity size={24} /></div>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Total Reports</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>{incidents.length}</h3>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#fefce8', borderRadius: '50%', color: '#eab308' }}><AlertTriangle size={24} /></div>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Near-Misses</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
                  {incidents.filter(i => i.type === 'Near-Miss').length}
                </h3>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '50%', color: '#ef4444' }}><ShieldAlert size={24} /></div>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Critical Incidents</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
                  {incidents.filter(i => i.severity === 'Critical').length}
                </h3>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <div className="search-bar" style={{ maxWidth: '400px' }}>
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search incidents..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading incidents...</div>
              ) : (
                <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Incident No.</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Title</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Severity</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No incidents reported.</td>
                      </tr>
                    ) : (
                      filtered.map(inc => {
                        const badge = getSeverityBadge(inc.severity);
                        return (
                          <tr 
                            key={inc.id} 
                            style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                            onClick={() => navigate(`/hse/${inc.id}`)}
                            className="hover-bg"
                          >
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{inc.incidentNumber}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>{inc.type}</td>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{inc.title}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: badge.bg, color: badge.col }}>
                                {inc.severity}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: inc.status === 'Closed' || inc.status === 'Resolved' ? '#f0fdf4' : '#eff6ff', color: inc.status === 'Closed' || inc.status === 'Resolved' ? '#22c55e' : '#3b82f6' }}>
                                {inc.status}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(inc.incidentDate).toLocaleDateString()}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Drills Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '50%', color: '#16a34a' }}><CheckCircle size={24} /></div>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Drills Conducted (YTD)</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
                  {drills.filter(d => new Date(d.drillDate).getFullYear() === new Date().getFullYear()).length}
                </h3>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '50%', color: '#3b82f6' }}><Clock size={24} /></div>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Total Planned Drills</p>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
                  {drills.filter(d => d.status === 'Planned').length}
                </h3>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <div className="search-bar" style={{ maxWidth: '400px' }}>
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search drills..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="iso-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Drill No.</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Duration</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Participants</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrills.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No emergency drills recorded.</td>
                    </tr>
                  ) : (
                    filteredDrills.map(drill => (
                      <tr 
                        key={drill.id} 
                        style={{ borderBottom: '1px solid #e2e8f0' }}
                        className="hover-bg"
                      >
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#0f172a' }}>{drill.drillNumber}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{drill.type}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{new Date(drill.drillDate).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{drill.durationMinutes} mins</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{drill.participantsCount}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: drill.status === 'Completed' ? '#f0fdf4' : '#fefce8', color: drill.status === 'Completed' ? '#22c55e' : '#eab308' }}>
                            {drill.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Incident Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Report HSE Incident</h2>
            <form onSubmit={handleReport}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type of Incident</label>
                  <select className="form-input" style={{ width: '100%' }} value={newType} onChange={e => setNewType(e.target.value)}>
                    <option>Near-Miss</option>
                    <option>Injury / First Aid</option>
                    <option>Spill / Environmental</option>
                    <option>Property Damage</option>
                    <option>Hazard Observation</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Severity</label>
                  <select className="form-input" style={{ width: '100%' }} value={newSeverity} onChange={e => setNewSeverity(e.target.value)}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Short Title</label>
                <input required type="text" className="form-input" style={{ width: '100%' }} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Oil spill in Warehouse B" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Location</label>
                  <input required type="text" className="form-input" style={{ width: '100%' }} value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Exact location..." />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Date & Time</label>
                  <input required type="datetime-local" className="form-input" style={{ width: '100%' }} value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '80px' }} value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Describe what happened in detail..."></textarea>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Immediate Action Taken</label>
                <textarea className="form-input" style={{ width: '100%', minHeight: '60px' }} value={newAction} onChange={e => setNewAction(e.target.value)} placeholder="(Optional) What was done immediately to mitigate the issue?"></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drill Modal */}
      {isDrillModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDrillModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Log Emergency Drill</h2>
            <form onSubmit={handleReportDrill}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Drill Type</label>
                  <select className="form-input" style={{ width: '100%' }} value={drillType} onChange={e => setDrillType(e.target.value)}>
                    <option>Fire Evacuation</option>
                    <option>Medical Emergency</option>
                    <option>Chemical Spill</option>
                    <option>Security Threat</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Status</label>
                  <select className="form-input" style={{ width: '100%' }} value={drillStatus} onChange={e => setDrillStatus(e.target.value)}>
                    <option>Completed</option>
                    <option>Planned</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Date</label>
                  <input required type="date" className="form-input" style={{ width: '100%' }} value={drillDateVal} onChange={e => setDrillDateVal(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Duration (mins)</label>
                  <input required type="number" min="1" className="form-input" style={{ width: '100%' }} value={drillDuration} onChange={e => setDrillDuration(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Participants</label>
                  <input required type="number" min="1" className="form-input" style={{ width: '100%' }} value={drillParticipants} onChange={e => setDrillParticipants(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Scenario Description</label>
                <textarea required className="form-input" style={{ width: '100%', minHeight: '60px' }} value={drillScenario} onChange={e => setDrillScenario(e.target.value)} placeholder="e.g., Simulated fire in main server room..."></textarea>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Findings / Gaps Identified</label>
                <textarea className="form-input" style={{ width: '100%', minHeight: '60px' }} value={drillFindings} onChange={e => setDrillFindings(e.target.value)} placeholder="(Optional) Did anything go wrong? E.g., alarm in section B did not sound."></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDrillModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Drill Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .hover-bg:hover { background-color: #f8fafc; }
      `}</style>
    </div>
  );
};
