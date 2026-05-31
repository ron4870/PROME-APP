import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface Capa {
  id: number;
  reportNumber: string;
  status: string;
}

interface RiskDetail {
  id: number;
  riskNumber: string;
  title: string;
  type: string;
  category: string;
  description: string;
  status: string;
  ownerId: number | null;
  likelihood: number | null;
  impact: number | null;
  score: number | null;
  mitigationPlan: string;
  actionDeadline: string | null;
  residualLikelihood: number | null;
  residualImpact: number | null;
  residualScore: number | null;
  owner?: User;
  capa?: Capa;
}

const RiskDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [risk, setRisk] = useState<RiskDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const { hasPermission } = useAuth();

  useEffect(() => {
    fetchRisk();
    fetchUsers();
  }, [id]);

  const fetchRisk = async () => {
    try {
      const response = await fetch(`/api/risks/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setRisk(await response.json());
      } else {
        navigate('/risks');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!risk) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/risks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(risk)
      });
      
      if (response.ok) {
        const updated = await response.json();
        setRisk(updated);
        alert('Risk saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save risk');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEscalateToCapa = async () => {
    if (!risk || !confirm('Are you sure you want to escalate this realized risk to CAPA?')) return;
    
    setIsEscalating(true);
    try {
      const response = await fetch(`/api/risks/${id}/capa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const updated = await response.json();
        setRisk(updated);
        alert('Successfully escalated to CAPA!');
      } else {
        const err = await response.json();
        alert(`Failed: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEscalating(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return '#e5e7eb';
    if (score >= 15) return '#fee2e2'; 
    if (score >= 8) return '#fef3c7';  
    return '#dcfce3'; 
  };

  if (!risk) return <div className="layout-container">Loading...</div>;

  const currentScore = (risk.likelihood && risk.impact) ? risk.likelihood * risk.impact : null;
  const currentResidual = (risk.residualLikelihood && risk.residualImpact) ? risk.residualLikelihood * risk.residualImpact : null;

  return (
    <div className="layout-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/risks')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{risk.riskNumber}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: risk.type === 'Risk' ? '#fee2e2' : '#e0f2fe',
              color: risk.type === 'Risk' ? '#991b1b' : '#0369a1',
              fontWeight: '600'
            }}>
              {risk.type}
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              fontWeight: '600'
            }}>
              {risk.status}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {risk.status === 'Realized' && !risk.capa && hasPermission('create_capa') && (
            <button 
              className="btn btn-primary" 
              style={{ backgroundColor: '#e11d48', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={handleEscalateToCapa}
              disabled={isEscalating}
            >
              <ShieldAlert size={16} /> {isEscalating ? 'Escalating...' : 'Escalate to CAPA'}
            </button>
          )}
          {risk.capa && (
            <button 
              className="btn btn-outline" 
              onClick={() => navigate(`/capa/${risk.capa?.id}`)}
              style={{ borderColor: '#0ea5e9', color: '#0ea5e9' }}
            >
              View CAPA ({risk.capa.reportNumber})
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* General Information */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>General Information</h2>
            
            <div className="form-group">
              <label className="form-label">Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={risk.title}
                onChange={e => setRisk({...risk, title: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-select"
                  value={risk.category}
                  onChange={e => setRisk({...risk, category: e.target.value})}
                >
                  <option value="Operational">Operational</option>
                  <option value="Strategic">Strategic</option>
                  <option value="Financial">Financial</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Project">Project</option>
                  <option value="HSE">HSE</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Owner</label>
                <select 
                  className="form-select"
                  value={risk.ownerId || ''}
                  onChange={e => setRisk({...risk, ownerId: e.target.value ? parseInt(e.target.value) : null})}
                >
                  <option value="">Select Owner...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Description</label>
              <textarea 
                className="form-textarea" 
                rows={4}
                value={risk.description || ''}
                onChange={e => setRisk({...risk, description: e.target.value})}
                placeholder={`Describe the ${risk.type.toLowerCase()} in detail...`}
              />
            </div>
            
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={risk.status}
                onChange={e => setRisk({...risk, status: e.target.value})}
              >
                <option value="Identified">Identified</option>
                <option value="Assessed">Assessed</option>
                <option value="Mitigated">Mitigated</option>
                <option value="Closed">Closed</option>
                <option value="Realized">Realized</option>
              </select>
            </div>
          </div>

          {/* Mitigation */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Mitigation / Treatment Plan</h2>
            <div className="form-group">
              <textarea 
                className="form-textarea" 
                rows={4}
                value={risk.mitigationPlan || ''}
                onChange={e => setRisk({...risk, mitigationPlan: e.target.value})}
                placeholder="What actions are planned or in place to mitigate this risk?"
              />
            </div>
            <div className="form-group" style={{ marginTop: '1rem', maxWidth: '200px' }}>
              <label className="form-label">Action Deadline</label>
              <input 
                type="date" 
                className="form-input" 
                value={risk.actionDeadline ? risk.actionDeadline.split('T')[0] : ''}
                onChange={e => setRisk({...risk, actionDeadline: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Assessment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Initial Assessment */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Initial Assessment</h2>
            
            <div className="form-group">
              <label className="form-label">Likelihood (1-5)</label>
              <input 
                type="range" 
                min="1" max="5" 
                value={risk.likelihood || 1}
                onChange={e => setRisk({...risk, likelihood: parseInt(e.target.value)})}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>Rare (1)</span>
                <span>{risk.likelihood || 1}</span>
                <span>Certain (5)</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Impact (1-5)</label>
              <input 
                type="range" 
                min="1" max="5" 
                value={risk.impact || 1}
                onChange={e => setRisk({...risk, impact: parseInt(e.target.value)})}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>Negligible (1)</span>
                <span>{risk.impact || 1}</span>
                <span>Severe (5)</span>
              </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: getScoreColor(currentScore), borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Initial Risk Score</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827' }}>{currentScore || '-'}</div>
            </div>
          </div>

          {/* Residual Assessment */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Residual Assessment</h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>Score after mitigation plan is implemented.</p>

            <div className="form-group">
              <label className="form-label">Likelihood (1-5)</label>
              <input 
                type="range" 
                min="1" max="5" 
                value={risk.residualLikelihood || 1}
                onChange={e => setRisk({...risk, residualLikelihood: parseInt(e.target.value)})}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>Rare (1)</span>
                <span>{risk.residualLikelihood || 1}</span>
                <span>Certain (5)</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Impact (1-5)</label>
              <input 
                type="range" 
                min="1" max="5" 
                value={risk.residualImpact || 1}
                onChange={e => setRisk({...risk, residualImpact: parseInt(e.target.value)})}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>Negligible (1)</span>
                <span>{risk.residualImpact || 1}</span>
                <span>Severe (5)</span>
              </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: getScoreColor(currentResidual), borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Residual Risk Score</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827' }}>{currentResidual || '-'}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RiskDetails;
