import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, FileSignature, History } from 'lucide-react';

export default function FormsDirectory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/forms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  return (
      <div className="layout-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Company Forms</h1>
            <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Select a form to fill out and submit, or view your history.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          
          {/* Available Forms */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSignature size={20} /> Available Forms
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              
              {/* Funds Requisition Form */}
              <div 
                style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0f766e'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                onClick={() => navigate('/forms/funds-requisition')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: '#f0fdfa', padding: '0.75rem', borderRadius: '8px' }}>
                    <FileText size={24} color="#0f766e" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#111827' }}>Funds Requisition</h3>
                    <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: '600' }}>Finance Dept</span>
                  </div>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                  Request funds for project or departmental activities, including breakdown of requested budget.
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Fill Form <Plus size={16} />
                  </span>
                </div>
              </div>

              {/* Add more forms here in the future */}
              <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#9ca3af' }}>
                Coming Soon
              </div>

            </div>
          </div>

          {/* Submission History */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={20} /> My Submissions
            </h2>
            
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              {history.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                  You have not submitted any forms yet.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {history.map((form) => (
                    <li key={form.id} style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.875rem' }}>{form.uniqueId}</span>
                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '999px', fontWeight: '600' }}>
                          {form.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.25rem' }}>
                        {form.formType === 'FundsRequisition' ? 'Funds Requisition' : form.formType}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(form.createdAt).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
        </div>
      </div>
  );
}
