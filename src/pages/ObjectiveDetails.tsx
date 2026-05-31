import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Target, TrendingUp, CheckCircle2 } from 'lucide-react';

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
}

const ObjectiveDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState<QualityObjective | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
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
        alert('Objective saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save objective');
    } finally {
      setIsSaving(false);
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
        // Refetch everything to get the updated currentValue as well
        fetchObjective();
        setNewValue('');
        setNewNotes('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!obj) return <div className="layout-container">Loading...</div>;

  const progressPct = obj.targetValue === 0 ? 0 : Math.min(Math.max((obj.currentValue / obj.targetValue) * 100, 0), 100);

  return (
    <div className="layout-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/objectives')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{obj.objectiveNumber}</h1>
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
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#8b5cf6' }}
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Objective Details</h2>
            
            <div className="form-group">
              <label className="form-label">Objective Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={obj.title}
                onChange={e => setObj({...obj, title: e.target.value})}
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
                  placeholder="e.g., Company-Wide, IT, HR"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Owner</label>
                <select 
                  className="form-select"
                  value={obj.ownerId || ''}
                  onChange={e => setObj({...obj, ownerId: e.target.value ? parseInt(e.target.value) : null})}
                >
                  <option value="">Select Owner...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Description & Strategy</label>
              <textarea 
                className="form-textarea" 
                rows={4}
                value={obj.description || ''}
                onChange={e => setObj({...obj, description: e.target.value})}
                placeholder="How will this objective be achieved? What resources are needed?"
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select"
                  value={obj.status}
                  onChange={e => setObj({...obj, status: e.target.value})}
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
                />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#8b5cf6" /> KPI Measurements
            </h2>

            {/* Quick Entry Form */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="date" 
                  className="form-input" 
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Value" 
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    style={{ borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  />
                  <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderLeft: 'none', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color: '#6b7280' }}>
                    {obj.unit}
                  </div>
                </div>
              </div>
              <div style={{ flex: 2 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Notes (Optional)" 
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleAddMeasurement}
                disabled={!newValue || !newDate}
                style={{ backgroundColor: '#8b5cf6' }}
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
                        No measurements recorded yet.
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
                <label className="form-label" style={{ color: '#6b7280' }}>Target Value</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={obj.targetValue}
                    onChange={e => setObj({...obj, targetValue: parseFloat(e.target.value) || 0})}
                    style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.5rem', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  />
                  <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderLeft: 'none', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color: '#6b7280', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    <input 
                      type="text" 
                      value={obj.unit} 
                      onChange={e => setObj({...obj, unit: e.target.value})}
                      style={{ background: 'transparent', border: 'none', width: '40px', outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ color: '#6b7280' }}>Current Value</label>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: obj.status === 'Achieved' ? '#22c55e' : '#111827' }}>
                  {obj.currentValue} <span style={{ fontSize: '1.5rem', color: '#9ca3af' }}>{obj.unit}</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                  <span>Progress</span>
                  <span>{progressPct.toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${progressPct}%`, 
                    height: '100%', 
                    backgroundColor: progressPct >= 100 ? '#22c55e' : '#8b5cf6',
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

        </div>
      </div>
    </div>
  );
};

export default ObjectiveDetails;
