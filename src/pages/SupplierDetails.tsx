import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, ClipboardList, Settings } from 'lucide-react';

interface SupplierEvaluation {
  id: number;
  evaluationDate: string;
  qualityScore: number;
  deliveryScore: number;
  responsivenessScore: number;
  overallScore: string;
  comments: string | null;
  resultStatus: string;
  evaluator?: { id: number; name: string };
}

interface Supplier {
  id: number;
  supplierNumber: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  status: string;
  approvalDate: string | null;
  nextEvaluationDate: string | null;
  notes: string | null;
  evaluations: SupplierEvaluation[];
}

const SupplierDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // New evaluation entry
  const [newEvalDate, setNewEvalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [qScore, setQScore] = useState<number>(5);
  const [dScore, setDScore] = useState<number>(5);
  const [rScore, setRScore] = useState<number>(5);
  const [newResultStatus, setNewResultStatus] = useState<string>('Approved');
  const [newComments, setNewComments] = useState<string>('');

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setSupplier(await response.json());
      } else {
        navigate('/suppliers');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!supplier) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(supplier)
      });
      if (response.ok) {
        setSupplier(await response.json());
        alert('Supplier saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save supplier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEvaluation = async () => {
    if (!newEvalDate) return;
    
    try {
      const response = await fetch(`/api/suppliers/${id}/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          evaluationDate: newEvalDate,
          qualityScore: qScore,
          deliveryScore: dScore,
          responsivenessScore: rScore,
          comments: newComments,
          resultStatus: newResultStatus
        })
      });
      
      if (response.ok) {
        fetchSupplier();
        setNewComments('');
        setQScore(5);
        setDScore(5);
        setRScore(5);
        setNewResultStatus('Approved');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!supplier) return <div className="layout-container">Loading...</div>;

  return (
    <div className="layout-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/suppliers')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{supplier.supplierNumber}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: 
                supplier.status === 'Approved' ? '#dcfce3' : 
                supplier.status === 'Rejected' ? '#fee2e2' : 
                supplier.status === 'Conditional' ? '#fef3c7' : '#f3f4f6',
              color: 
                supplier.status === 'Approved' ? '#166534' : 
                supplier.status === 'Rejected' ? '#991b1b' : 
                supplier.status === 'Conditional' ? '#b45309' : '#374151',
              fontWeight: '600'
            }}>
              {supplier.status}
            </span>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#6366f1' }}
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left Column: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="#6366f1" /> Supplier Profile
            </h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Company / Supplier Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={supplier.name}
                onChange={e => setSupplier({...supplier, name: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={supplier.contactName || ''}
                  onChange={e => setSupplier({...supplier, contactName: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-select"
                  value={supplier.category || ''}
                  onChange={e => setSupplier({...supplier, category: e.target.value})}
                >
                  <option value="">Select Category...</option>
                  <option value="Materials">Materials / Raw Goods</option>
                  <option value="IT Services">IT Services</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Logistics">Logistics / Transport</option>
                  <option value="General Equipment">General Equipment</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={supplier.email || ''}
                  onChange={e => setSupplier({...supplier, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={supplier.phone || ''}
                  onChange={e => setSupplier({...supplier, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">General Notes</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={supplier.notes || ''}
                onChange={e => setSupplier({...supplier, notes: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Administration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Approval Status</h2>
            <div className="form-group">
              <label className="form-label">Current Status</label>
              <select 
                className="form-select"
                value={supplier.status}
                onChange={e => setSupplier({...supplier, status: e.target.value})}
                style={{ 
                  backgroundColor: supplier.status === 'Approved' ? '#f0fdf4' : supplier.status === 'Rejected' ? '#fef2f2' : 'white',
                  borderColor: supplier.status === 'Approved' ? '#bbf7d0' : supplier.status === 'Rejected' ? '#fecaca' : '#d1d5db',
                  fontWeight: '600'
                }}
              >
                <option value="Approved">Approved</option>
                <option value="Conditional">Conditional (Needs Review)</option>
                <option value="Under Review">Under Review</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Approval Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={supplier.approvalDate ? supplier.approvalDate.split('T')[0] : ''}
                onChange={e => setSupplier({...supplier, approvalDate: e.target.value})}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Next Evaluation Due</label>
              <input 
                type="date" 
                className="form-input" 
                value={supplier.nextEvaluationDate ? supplier.nextEvaluationDate.split('T')[0] : ''}
                onChange={e => setSupplier({...supplier, nextEvaluationDate: e.target.value})}
              />
            </div>
            
            {supplier.status === 'Rejected' && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>This supplier is currently rejected and must not be used for procurement.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width: Evaluation Log */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={20} color="#6366f1" /> Performance Evaluations (ISO 9001: 8.4)
        </h2>

        {/* Quick Entry Form */}
        <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Log New Evaluation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Evaluation Date</label>
              <input type="date" className="form-input" value={newEvalDate} onChange={e => setNewEvalDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Quality (1-5)</label>
              <input type="number" min="1" max="5" className="form-input" value={qScore} onChange={e => setQScore(parseInt(e.target.value))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Delivery (1-5)</label>
              <input type="number" min="1" max="5" className="form-input" value={dScore} onChange={e => setDScore(parseInt(e.target.value))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Responsiveness (1-5)</label>
              <input type="number" min="1" max="5" className="form-input" value={rScore} onChange={e => setRScore(parseInt(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Comments / Justification</label>
              <input type="text" className="form-input" placeholder="Feedback on performance..." value={newComments} onChange={e => setNewComments(e.target.value)} />
            </div>
            <div className="form-group" style={{ width: '150px', marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Resulting Status</label>
              <select className="form-select" value={newResultStatus} onChange={e => setNewResultStatus(e.target.value)}>
                <option value="Approved">Approved</option>
                <option value="Conditional">Conditional</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleAddEvaluation}
              disabled={!newEvalDate}
              style={{ backgroundColor: '#6366f1', height: '42px', padding: '0 1.5rem' }}
            >
              Submit Evaluation
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Scores (Q/D/R)</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Overall</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Comments</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Evaluator</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Result Status</th>
              </tr>
            </thead>
            <tbody>
              {supplier.evaluations.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
                    {new Date(record.evaluationDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    {record.qualityScore} / {record.deliveryScore} / {record.responsivenessScore}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                    {record.overallScore}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{record.comments || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{record.evaluator?.name || 'System'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: record.resultStatus === 'Approved' ? '#dcfce3' : record.resultStatus === 'Rejected' ? '#fee2e2' : '#fef3c7',
                      color: record.resultStatus === 'Approved' ? '#166534' : record.resultStatus === 'Rejected' ? '#991b1b' : '#b45309'
                    }}>
                      {record.resultStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {supplier.evaluations.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                    No evaluations logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetails;
