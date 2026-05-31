import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, AlertTriangle, Target, Printer } from 'lucide-react';

interface Risk {
  id: number;
  riskNumber: string;
  title: string;
  type: string;
  category: string;
  status: string;
  score: number | null;
  residualScore: number | null;
  createdAt: string;
  owner?: { id: number; name: string };
}

const RiskDashboard: React.FC = () => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      const response = await fetch('/api/risks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch risks');
      const data = await response.json();
      setRisks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRisk = async (type: 'Risk' | 'Opportunity') => {
    try {
      const response = await fetch('/api/risks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: `New ${type}`,
          type,
          category: 'Operational',
          description: '',
          ownerId: user?.id
        })
      });
      if (response.ok) {
        const newRisk = await response.json();
        navigate(`/risks/${newRisk.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredRisks = risks.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.riskNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number | null) => {
    if (!score) return '#e5e7eb';
    if (score >= 15) return '#fee2e2'; // Red
    if (score >= 8) return '#fef3c7';  // Yellow
    return '#dcfce3'; // Green
  };

  const getScoreTextClass = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 15) return 'text-red-700 font-bold';
    if (score >= 8) return 'text-yellow-700 font-bold';
    return 'text-green-700 font-bold';
  };

  return (
    <div className="layout-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Risk & Opportunity Register
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Manage corporate and project risks according to ISO 9001:2015 Clause 6.1</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => window.print()}
          >
            <Printer size={18} /> Export PDF
          </button>
          <button 
            className="btn btn-outline no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#0ea5e9', color: '#0ea5e9' }}
            onClick={() => handleCreateRisk('Opportunity')}
          >
            <Target size={18} /> New Opportunity
          </button>
          <button 
            className="btn btn-primary no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e11d48' }}
            onClick={() => handleCreateRisk('Risk')}
          >
            <AlertTriangle size={18} /> New Risk
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Total Risks</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {risks.filter(r => r.type === 'Risk').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Total Opportunities</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {risks.filter(r => r.type === 'Opportunity').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>High Risks (Score ≥ 15)</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e11d48', marginTop: '0.5rem' }}>
            {risks.filter(r => r.type === 'Risk' && r.score && r.score >= 15).length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Mitigated</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669', marginTop: '0.5rem' }}>
            {risks.filter(r => r.status === 'Mitigated').length}
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
              placeholder="Search risks & opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading register...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Number</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Initial Score</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Residual</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredRisks.map((risk) => (
                  <tr 
                    key={risk.id} 
                    style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                    onClick={() => navigate(`/risks/${risk.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#111827' }}>
                      {risk.riskNumber}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem',
                        backgroundColor: risk.type === 'Risk' ? '#fee2e2' : '#e0f2fe',
                        color: risk.type === 'Risk' ? '#991b1b' : '#0369a1',
                        fontWeight: '600'
                      }}>
                        {risk.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151' }}>
                      {risk.title}
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{risk.category}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                      {risk.owner?.name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span 
                        className={getScoreTextClass(risk.score)}
                        style={{ 
                          display: 'inline-block',
                          padding: '4px 12px', 
                          borderRadius: '4px',
                          backgroundColor: getScoreColor(risk.score)
                        }}>
                        {risk.score || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span 
                        className={getScoreTextClass(risk.residualScore)}
                        style={{ 
                          display: 'inline-block',
                          padding: '4px 12px', 
                          borderRadius: '4px',
                          backgroundColor: getScoreColor(risk.residualScore)
                        }}>
                        {risk.residualScore || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 
                          risk.status === 'Closed' || risk.status === 'Mitigated' ? '#dcfce3' : 
                          risk.status === 'Realized' ? '#fee2e2' : '#f3f4f6',
                        color: 
                          risk.status === 'Closed' || risk.status === 'Mitigated' ? '#166534' : 
                          risk.status === 'Realized' ? '#991b1b' : '#374151'
                      }}>
                        {risk.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRisks.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No risks or opportunities found.
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

export default RiskDashboard;
