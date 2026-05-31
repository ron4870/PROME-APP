import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, AlertCircle, Wrench, Settings } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface CalibrationRecord {
  id: number;
  calibrationDate: string;
  performedBy: string;
  certificateNumber: string | null;
  result: string;
  notes: string | null;
}

interface Equipment {
  id: number;
  equipmentNumber: string;
  name: string;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  status: string;
  calibrationRequired: boolean;
  calibrationIntervalMonths: number | null;
  lastCalibrationDate: string | null;
  nextCalibrationDate: string | null;
  ownerId: number | null;
  calibrationRecords: CalibrationRecord[];
}

const EquipmentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eqp, setEqp] = useState<Equipment | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // New calibration entry
  const [newCalDate, setNewCalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPerformedBy, setNewPerformedBy] = useState<string>('');
  const [newCert, setNewCert] = useState<string>('');
  const [newResult, setNewResult] = useState<string>('Pass');
  const [newNotes, setNewNotes] = useState<string>('');

  useEffect(() => {
    fetchEquipment();
    fetchUsers();
  }, [id]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch(`/api/equipment/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setEqp(await response.json());
      } else {
        navigate('/equipment');
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
    if (!eqp) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/equipment/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(eqp)
      });
      if (response.ok) {
        setEqp(await response.json());
        alert('Equipment saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save equipment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCalibration = async () => {
    if (!newCalDate || !newPerformedBy) {
      alert("Date and Performed By are required.");
      return;
    }
    
    try {
      const response = await fetch(`/api/equipment/${id}/calibrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          calibrationDate: newCalDate,
          performedBy: newPerformedBy,
          certificateNumber: newCert,
          result: newResult,
          notes: newNotes
        })
      });
      
      if (response.ok) {
        // Refetch to get updated dates and records
        fetchEquipment();
        setNewPerformedBy('');
        setNewCert('');
        setNewNotes('');
        setNewResult('Pass');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!eqp) return <div className="layout-container">Loading...</div>;

  const isUrgent = () => {
    if (!eqp.nextCalibrationDate || !eqp.calibrationRequired) return false;
    const diffDays = Math.ceil((new Date(eqp.nextCalibrationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  return (
    <div className="layout-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/equipment')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{eqp.equipmentNumber}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: 
                eqp.status === 'Active' ? '#dcfce3' : 
                eqp.status === 'Out of Service' ? '#fee2e2' : 
                eqp.status === 'In Calibration' ? '#fef3c7' : '#f3f4f6',
              color: 
                eqp.status === 'Active' ? '#166534' : 
                eqp.status === 'Out of Service' ? '#991b1b' : 
                eqp.status === 'In Calibration' ? '#b45309' : '#374151',
              fontWeight: '600'
            }}>
              {eqp.status}
            </span>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f766e' }}
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="#0f766e" /> Asset Details
            </h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Equipment Name / Description</label>
              <input 
                type="text" 
                className="form-input" 
                value={eqp.name}
                onChange={e => setEqp({...eqp, name: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Model / Type</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={eqp.model || ''}
                  onChange={e => setEqp({...eqp, model: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={eqp.serialNumber || ''}
                  onChange={e => setEqp({...eqp, serialNumber: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Location / Area</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={eqp.location || ''}
                  onChange={e => setEqp({...eqp, location: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Owner</label>
                <select 
                  className="form-select"
                  value={eqp.ownerId || ''}
                  onChange={e => setEqp({...eqp, ownerId: e.target.value ? parseInt(e.target.value) : null})}
                >
                  <option value="">Select Owner...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={20} color="#3b82f6" /> Calibration Settings
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="checkbox" 
                id="calReq" 
                checked={eqp.calibrationRequired}
                onChange={e => setEqp({...eqp, calibrationRequired: e.target.checked})}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              <label htmlFor="calReq" style={{ fontWeight: '500', cursor: 'pointer' }}>Requires Periodic Calibration</label>
            </div>

            {eqp.calibrationRequired && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Interval (Months)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={eqp.calibrationIntervalMonths || ''}
                    onChange={e => setEqp({...eqp, calibrationIntervalMonths: parseInt(e.target.value) || null})}
                    placeholder="e.g. 12"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Calibrated</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={eqp.lastCalibrationDate ? eqp.lastCalibrationDate.split('T')[0] : ''}
                    onChange={e => setEqp({...eqp, lastCalibrationDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: isUrgent() ? '#ef4444' : 'inherit', fontWeight: isUrgent() ? 'bold' : 'normal' }}>
                    Next Due Date {isUrgent() && <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />}
                  </label>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ borderColor: isUrgent() ? '#f87171' : '#d1d5db' }}
                    value={eqp.nextCalibrationDate ? eqp.nextCalibrationDate.split('T')[0] : ''}
                    onChange={e => setEqp({...eqp, nextCalibrationDate: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Administration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Status Control</h2>
            <div className="form-group">
              <label className="form-label">Operating Status</label>
              <select 
                className="form-select"
                value={eqp.status}
                onChange={e => setEqp({...eqp, status: e.target.value})}
                style={{ 
                  backgroundColor: eqp.status === 'Active' ? '#f0fdf4' : eqp.status === 'Out of Service' ? '#fef2f2' : 'white',
                  borderColor: eqp.status === 'Active' ? '#bbf7d0' : eqp.status === 'Out of Service' ? '#fecaca' : '#d1d5db',
                  fontWeight: '600'
                }}
              >
                <option value="Active">Active</option>
                <option value="In Calibration">In Calibration</option>
                <option value="Out of Service">Out of Service</option>
                <option value="Decommissioned">Decommissioned</option>
              </select>
            </div>
            {eqp.status === 'Out of Service' && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>This equipment is currently marked out of service and must not be used for critical measurements.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width: Calibration Logs */}
      {eqp.calibrationRequired && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
            Calibration & Maintenance Log
          </h2>

          {/* Quick Entry Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 2fr auto', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Date</label>
              <input type="date" className="form-input" value={newCalDate} onChange={e => setNewCalDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Performed By (Vendor/Staff)</label>
              <input type="text" className="form-input" placeholder="Name..." value={newPerformedBy} onChange={e => setNewPerformedBy(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Certificate #</label>
              <input type="text" className="form-input" placeholder="Cert..." value={newCert} onChange={e => setNewCert(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Result</label>
              <select className="form-select" value={newResult} onChange={e => setNewResult(e.target.value)}>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Adjusted">Adjusted</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Notes</label>
              <input type="text" className="form-input" placeholder="Comments..." value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleAddCalibration}
              disabled={!newCalDate || !newPerformedBy}
              style={{ backgroundColor: '#0f766e', height: '42px' }}
            >
              <Plus size={18} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Performed By</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Cert #</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Result</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {eqp.calibrationRecords.map(record => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
                      {new Date(record.calibrationDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{record.performedBy}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{record.certificateNumber || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: record.result === 'Pass' ? '#dcfce3' : record.result === 'Fail' ? '#fee2e2' : '#fef3c7',
                        color: record.result === 'Pass' ? '#166534' : record.result === 'Fail' ? '#991b1b' : '#b45309'
                      }}>
                        {record.result}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{record.notes || '-'}</td>
                  </tr>
                ))}
                {eqp.calibrationRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                      No calibration history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentDetails;
