import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Wrench, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface Equipment {
  id: number;
  equipmentNumber: string;
  name: string;
  model: string | null;
  location: string | null;
  status: string;
  calibrationRequired: boolean;
  nextCalibrationDate: string | null;
  owner?: { id: number; name: string };
}

const EquipmentDashboard: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const response = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setEquipmentList(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterEquipment = async () => {
    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: 'New Equipment',
          calibrationRequired: true
        })
      });
      if (response.ok) {
        const newEqp = await response.json();
        navigate(`/equipment/${newEqp.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredEquipment = equipmentList.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.equipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCalibrationStatus = (date: string | null) => {
    if (!date) return { label: 'Not Set', color: '#9ca3af', bg: '#f3f4f6' };
    const today = new Date();
    const calDate = new Date(date);
    
    // Reset time for accurate day comparison
    today.setHours(0,0,0,0);
    calDate.setHours(0,0,0,0);
    
    const diffTime = calDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: '#991b1b', bg: '#fee2e2', urgent: true };
    if (diffDays <= 30) return { label: `Due in ${diffDays}d`, color: '#b45309', bg: '#fef3c7', urgent: true };
    return { label: `Valid (${diffDays}d left)`, color: '#166534', bg: '#dcfce3', urgent: false };
  };

  return (
    <div className="layout-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Equipment & Calibration
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Manage tracking and calibration intervals for measuring resources (ISO 9001 Clause 7.1.5)</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f766e' }}
          onClick={handleRegisterEquipment}
        >
          <Plus size={18} /> Register Equipment
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Wrench size={16} color="#0f766e" /> Total Registry
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {equipmentList.length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <AlertCircle size={16} color="#ef4444" /> Needs Attention (Overdue / &lt; 30d)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {equipmentList.filter(e => e.calibrationRequired && getCalibrationStatus(e.nextCalibrationDate).urgent).length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <AlertTriangle size={16} color="#eab308" /> Out of Service
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {equipmentList.filter(e => e.status === 'Out of Service').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#22c55e" /> Active & Verified
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {equipmentList.filter(e => e.status === 'Active').length}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search equipment, model, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading equipment registry...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Number</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Equipment</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Calibration Due</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredEquipment.map((e) => {
                  const calStatus = e.calibrationRequired ? getCalibrationStatus(e.nextCalibrationDate) : { label: 'Not Required', color: '#6b7280', bg: '#f3f4f6' };
                  
                  return (
                    <tr 
                      key={e.id} 
                      style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                      onClick={() => navigate(`/equipment/${e.id}`)}
                      onMouseEnter={(evt) => evt.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(evt) => evt.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#111827' }}>
                        {e.equipmentNumber}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>{e.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{e.model || 'No Model Info'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#374151' }}>
                        {e.location || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                        {e.owner?.name || 'Unassigned'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: 
                            e.status === 'Active' ? '#dcfce3' : 
                            e.status === 'Out of Service' ? '#fee2e2' : 
                            e.status === 'In Calibration' ? '#fef3c7' : '#f3f4f6',
                          color: 
                            e.status === 'Active' ? '#166534' : 
                            e.status === 'Out of Service' ? '#991b1b' : 
                            e.status === 'In Calibration' ? '#b45309' : '#374151'
                        }}>
                          {e.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: calStatus.bg,
                          color: calStatus.color
                        }}>
                          {calStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredEquipment.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No equipment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentDashboard;
