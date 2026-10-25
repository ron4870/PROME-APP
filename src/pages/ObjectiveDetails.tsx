import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Target, TrendingUp, CheckCircle2, FileText, Calendar, Printer } from 'lucide-react';
import { QualityObjectiveIsoSheet, type QualityObjectiveData } from '../components/QualityObjectiveIsoSheet';

interface User {
  id: number;
  name: string;
}

interface KpiMeasurement {
  id?: number;
  measuredDate: string;
  value: number;
  notes: string;
  measuredBy?: User;
}

interface QualityObjective {
  id: number;
  objectiveNumber: string;
  title: string;
  description: string;
  division: string;
  ownerId: number | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string | null;
  status: string;
  measurements: KpiMeasurement[];
  corporateStrategicObjective?: string | null;
  departmentalQualityObjective?: string | null;
  strategyMethodology?: string | null;
  measurementMethod?: string | null;
  frequencyOfReview?: number | null;
  kpiTargetPrevious?: string | null;
  statusPreviousYear?: string | null;
  kpiTargetCurrent?: string | null;
  q1Status?: string | null;
  q2Status?: string | null;
  q3Status?: string | null;
  q4Status?: string | null;
  comments?: string | null;
  records?: string | null;
  departmentHeadApproval?: string | null;
  departmentHeadDate?: string | null;
  managingDirectorApproval?: string | null;
  managingDirectorDate?: string | null;
}

const ObjectiveDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState<QualityObjective | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isIsoSheetOpen, setIsIsoSheetOpen] = useState(false);
  
  // New measurement state
  const [newValue, setNewValue] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState<string>('');

  useEffect(() => {
    fetchObjective();
    fetchUsers();
  }, [id]);

  const fetchObjective = async () => {
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setObj(await response.json());
      } else {
        navigate('/objectives');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setUsers(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!obj) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(obj)
      });
      if (response.ok) {
        setObj(await response.json());
        alert('Quality Objective saved successfully!');
      } else {
        alert('Failed to save objective.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save objective');
    } finally {
      setIsSaving(false);
    }
  };

  const handleIsoSheetSave = async (updated: QualityObjectiveData) => {
    if (!obj) return;
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        setObj(await response.json());
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleAddMeasurement = async () => {
    if (!newValue || !newDate) return;
    try {
      const response = await fetch(`/api/objectives/${id}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          measuredDate: newDate,
          value: parseFloat(newValue),
          notes: newNotes
        })
      });
      if (response.ok) {
        fetchObjective();
        setNewValue('');
        setNewNotes('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!obj) return <div className="layout-container" style={{ padding: '3rem', textAlign: 'center' }}>Loading objective details...</div>;

  const progressPct = obj.targetValue === 0 ? 0 : Math.min(Math.max((obj.currentValue / obj.targetValue) * 100, 0), 100);

  return (
    <div className="layout-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/objectives')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>{obj.objectiveNumber}</h1>
              <span style={{ 
                padding: '4px 10px', 
                borderRadius: '12px', 
                fontSize: '0.8rem',
                backgroundColor: 
                  obj.status === 'Achieved' ? '#dcfce3' : 
                  obj.status === 'Off-Track' ? '#fee2e2' : 
                  obj.status === 'Draft' ? '#f3f4f6' : '#e0f2fe',
                color: 
                  obj.status === 'Achieved' ? '#166534' : 
                  obj.status === 'Off-Track' ? '#991b1b' : 
                  obj.status === 'Draft' ? '#374151' : '#0369a1',
                fontWeight: '600'
              }}>
                {obj.status}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                ISO 9001:2015 Clause 6.2
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
              {obj.title}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={() => setIsIsoSheetOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', borderColor: '#fca5a5', backgroundColor: '#fff5f5' }}
          >
            <Printer size={16} /> Print ISO Sheet (V3.0)
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#7c3aed', color: '#ffffff' }}
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ========================================================================= */}
          {/* QUARTERLY PERFORMANCE REVIEW (ISO VERSION 3.0) CARD                       */}
          {/* ========================================================================= */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #b91c1c' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="#b91c1c" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                  Quarterly Performance Review (ISO Version 3.0)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsIsoSheetOpen(true)}
                style={{ fontSize: '0.75rem', fontWeight: '600', color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileText size={14} /> Open Full ISO Sheet
              </button>
            </div>

            {/* Corporate Strategic Objective */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>
                Corporate Strategic Objective
              </label>
              <input 
                type="text" 
                className="form-input" 
                value={obj.corporateStrategicObjective || ''}
                onChange={e => setObj({...obj, corporateStrategicObjective: e.target.value})}
                placeholder="e.g. No. 1 - To ensure that PROME's operations are constantly innovative and agile"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>

            {/* Departmental Quality Objective */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>
                Departmental Quality Objective
              </label>
              <textarea 
                rows={2}
                className="form-textarea" 
                value={obj.departmentalQualityObjective || ''}
                onChange={e => setObj({...obj, departmentalQualityObjective: e.target.value})}
                placeholder="e.g. To facilitate the efficient and effective communication both internally and with Clients through digitization..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>

            {/* Strategy / Methodology */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>
                Strategy & Methodology
              </label>
              <textarea 
                rows={3}
                className="form-textarea" 
                value={obj.strategyMethodology || ''}
                onChange={e => setObj({...obj, strategyMethodology: e.target.value})}
                placeholder="Detail the operational steps, tools, and actions implemented..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>

            {/* Measurement Method & Frequency */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>Measurement Method</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={obj.measurementMethod || ''}
                  onChange={e => setObj({...obj, measurementMethod: e.target.value})}
                  placeholder="e.g. % of projects having MIS access"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>Frequency of Review</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={obj.frequencyOfReview || 4}
                  onChange={e => setObj({...obj, frequencyOfReview: parseInt(e.target.value) || 4})}
                  placeholder="4 (Quarterly)"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
            </div>

            {/* Performance Targets & Quarterly Review Table */}
            <div style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
              <label className="form-label" style={{ fontWeight: '700', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                Performance Review Matrix (Quarterly Tracking)
              </label>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }}>
                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center' }}>KPI Target 2025</th>
                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center' }}>Status End 2025</th>
                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center' }}>KPI Target 2026</th>
                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center', backgroundColor: '#fecaca' }}>Q1 Status</th>
                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center', backgroundColor: '#fecaca' }}>Q2 Status</th>
                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center', backgroundColor: '#fecaca' }}>Q3 Status</th>
                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center', backgroundColor: '#fecaca' }}>Q4 Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      <input 
                        type="text" 
                        value={obj.kpiTargetPrevious || ''} 
                        onChange={e => setObj({...obj, kpiTargetPrevious: e.target.value})}
                        placeholder="100% or 3"
                        style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      <input 
                        type="text" 
                        value={obj.statusPreviousYear || ''} 
                        onChange={e => setObj({...obj, statusPreviousYear: e.target.value})}
                        placeholder="100% or 3"
                        style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                      <input 
                        type="text" 
                        value={obj.kpiTargetCurrent || ''} 
                        onChange={e => setObj({...obj, kpiTargetCurrent: e.target.value})}
                        placeholder="100% or 2"
                        style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none', fontWeight: 'bold' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f0fdf4' }}>
                      <input 
                        type="text" 
                        value={obj.q1Status || ''} 
                        onChange={e => setObj({...obj, q1Status: e.target.value})}
                        placeholder="Q1"
                        style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none', fontWeight: 'bold', color: '#166534' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f0fdf4' }}>
                      <input 
                        type="text" 
                        value={obj.q2Status || ''} 
                        onChange={e => setObj({...obj, q2Status: e.target.value})}
                        placeholder="Q2"
                        style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none', fontWeight: 'bold', color: '#166534' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f0fdf4' }}>
                      <input 
                        type="text" 
                        value={obj.q3Status || ''} 
                        onChange={e => setObj({...obj, q3Status: e.target.value})}
                        placeholder="Q3"
                        style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none', fontWeight: 'bold', color: '#166534' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f0fdf4' }}>
                      <input 
                        type="text" 
                        value={obj.q4Status || ''} 
                        onChange={e => setObj({...obj, q4Status: e.target.value})}
                        placeholder="Q4"
                        style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none', fontWeight: 'bold', color: '#166534' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Comments & Records */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>Comments / Remarks</label>
                <textarea 
                  rows={3}
                  className="form-textarea" 
                  value={obj.comments || ''}
                  onChange={e => setObj({...obj, comments: e.target.value})}
                  placeholder="e.g. All projects have MIS access. Document control and change management procedures are followed."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.8rem' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>Evidence & Records</label>
                <textarea 
                  rows={3}
                  className="form-textarea" 
                  value={obj.records || ''}
                  onChange={e => setObj({...obj, records: e.target.value})}
                  placeholder="e.g. MIS Access Log, Project Technical Audit Reports, Training Reports"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            {/* Approvals */}
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                ISO Management Approvals
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Department Head Approval</label>
                  <input 
                    type="text" 
                    value={obj.departmentHeadApproval || ''} 
                    onChange={e => setObj({...obj, departmentHeadApproval: e.target.value})}
                    placeholder="e.g. Godfrey Ssambwa (08/04/2026)"
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Managing Director Approval</label>
                  <input 
                    type="text" 
                    value={obj.managingDirectorApproval || ''} 
                    onChange={e => setObj({...obj, managingDirectorApproval: e.target.value})}
                    placeholder="e.g. Ronald Kibuuka (08/04/2026)"
                    style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* General Objective Details */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
              General Objective Information
            </h2>
            
            <div className="form-group">
              <label className="form-label">Objective Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={obj.title}
                onChange={e => setObj({...obj, title: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Division / Department</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={obj.division || ''}
                  onChange={e => setObj({...obj, division: e.target.value})}
                  placeholder="e.g., PMBDD, BE&ED, F&A"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Owner</label>
                <select 
                  className="form-select"
                  value={obj.ownerId || ''}
                  onChange={e => setObj({...obj, ownerId: e.target.value ? parseInt(e.target.value) : null})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Owner...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Description & Background</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={obj.description || ''}
                onChange={e => setObj({...obj, description: e.target.value})}
                placeholder="Background notes on this objective..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select"
                  value={obj.status}
                  onChange={e => setObj({...obj, status: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Off-Track">Off-Track</option>
                  <option value="Achieved">Achieved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={obj.targetDate ? obj.targetDate.split('T')[0] : ''}
                  onChange={e => setObj({...obj, targetDate: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
            </div>
          </div>

          {/* Measurements Log */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#7c3aed" /> KPI Log Entries
            </h2>

            {/* Quick Entry Form */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px' }}>
                <input 
                  type="date" 
                  className="form-input" 
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Value" 
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  />
                  <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderLeft: 'none', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color: '#6b7280' }}>
                    {obj.unit}
                  </div>
                </div>
              </div>
              <div style={{ flex: '2 1 200px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Notes (Optional)" 
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleAddMeasurement}
                disabled={!newValue || !newDate}
                style={{ backgroundColor: '#7c3aed', color: '#ffffff', padding: '0.5rem 1rem' }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Measurement History */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Value</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Notes</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Reported By</th>
                  </tr>
                </thead>
                <tbody>
                  {obj.measurements.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
                        {new Date(m.measuredDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                        {m.value} {obj.unit}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {m.notes || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {m.measuredBy?.name}
                      </td>
                    </tr>
                  ))}
                  {obj.measurements.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                        No specific log entries recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Target & Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="#0ea5e9" /> Progress Tracking
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ color: '#6b7280', fontWeight: '600' }}>Target Value</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={obj.targetValue}
                    onChange={e => setObj({...obj, targetValue: parseFloat(e.target.value) || 0})}
                    style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.5rem', border: '1px solid #d1d5db', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '100%' }}
                  />
                  <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderLeft: 'none', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color: '#6b7280', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    <input 
                      type="text" 
                      value={obj.unit} 
                      onChange={e => setObj({...obj, unit: e.target.value})}
                      style={{ background: 'transparent', border: 'none', width: '50px', outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ color: '#6b7280', fontWeight: '600' }}>Current Value</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={obj.currentValue}
                    onChange={e => setObj({...obj, currentValue: parseFloat(e.target.value) || 0})}
                    style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', color: obj.status === 'Achieved' ? '#166534' : '#111827' }}
                  />
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#64748b' }}>{obj.unit}</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                  <span>Overall Completion</span>
                  <span>{progressPct.toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${progressPct}%`, 
                    height: '100%', 
                    backgroundColor: progressPct >= 100 ? '#22c55e' : '#7c3aed',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                {progressPct >= 100 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', marginTop: '1rem', backgroundColor: '#dcfce3', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '600' }}>
                    <CheckCircle2 size={18} /> Target Achieved!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Print Card */}
          <div style={{ backgroundColor: '#fef2f2', padding: '1.25rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#991b1b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Official ISO Record (V3.0)
            </div>
            <p style={{ fontSize: '0.75rem', color: '#7f1d1d', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
              Export or print the standard ISO 9001:2015 Clause 6.2 review form (Form No. PROME-IMSR-QOBJ-01) with barcode and signature blocks.
            </p>
            <button
              type="button"
              onClick={() => setIsIsoSheetOpen(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '700',
                backgroundColor: '#b91c1c',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Printer size={16} /> Open & Print ISO Sheet
            </button>
          </div>

        </div>
      </div>

      {/* ISO Sheet Modal */}
      {isIsoSheetOpen && (
        <QualityObjectiveIsoSheet
          objective={obj as QualityObjectiveData}
          isOpen={isIsoSheetOpen}
          onClose={() => setIsIsoSheetOpen(false)}
          onSave={handleIsoSheetSave}
          editable={true}
        />
      )}
    </div>
  );
};

export default ObjectiveDetails;
