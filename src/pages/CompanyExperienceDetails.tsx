import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Award, MapPin, FileText, UserCheck } from 'lucide-react';

interface CompanyExperienceDetail {
  id: number;
  projectNumber: string;
  projectName: string;
  client: string;
  sector: string;
  location: string;
  contractValue: string | null;
  role: string;
  startDate: string | null;
  completionDate: string | null;
  status: string;
  description: string | null;
  scopeOfServices: string | null;
  clientContact: string | null;
  createdBy?: { id: number; name: string };
}

export const CompanyExperienceDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<CompanyExperienceDetail | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const response = await fetch(`/api/company-experience/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setRecord(await response.json());
      } else {
        navigate('/company-experience');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/company-experience/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(record)
      });
      
      if (response.ok) {
        const updated = await response.json();
        setRecord(updated);
        alert('Company experience record saved successfully');
      } else {
        alert('Failed to save record');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save record');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="layout-container" style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
        Loading experience details...
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="layout-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <button 
        onClick={() => navigate('/company-experience')} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '500' }}
      >
        <ArrowLeft size={18} /> Back to Experience Register
      </button>

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#cc0000', backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: '6px' }}>
                {record.projectNumber}
              </span>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: 
                  record.status === 'Completed' ? '#dcfce3' : 
                  record.status === 'Ongoing' ? '#e0f2fe' : '#fef9c3',
                color: 
                  record.status === 'Completed' ? '#166534' : 
                  record.status === 'Ongoing' ? '#0369a1' : '#854d0e'
              }}>
                {record.status}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              {record.projectName}
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Client: {record.client} | Location: {record.location}</p>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#cc0000' }}
          >
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Section 1: General Project Information */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} color="#cc0000" /> Basic Project Credentials
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Project Title / Name *
              </label>
              <input 
                type="text" 
                value={record.projectName}
                onChange={(e) => setRecord({ ...record, projectName: e.target.value })}
                className="form-input"
                required
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Client / Employer Name *
              </label>
              <input 
                type="text" 
                value={record.client}
                onChange={(e) => setRecord({ ...record, client: e.target.value })}
                className="form-input"
                required
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Engineering Sector / Discipline *
              </label>
              <select 
                value={record.sector}
                onChange={(e) => setRecord({ ...record, sector: e.target.value })}
                className="form-input"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              >
                <option value="Civil & Infrastructure">Civil & Infrastructure</option>
                <option value="Roads & Highways">Roads & Highways</option>
                <option value="Structures & Buildings">Structures & Buildings</option>
                <option value="Water & Sanitation">Water & Sanitation</option>
                <option value="Geotechnical & Foundation">Geotechnical & Foundation</option>
                <option value="Transportation Studies">Transportation Studies</option>
                <option value="Hydrology & Drainage">Hydrology & Drainage</option>
                <option value="Infrastructure & Logistics">Infrastructure & Logistics</option>
                <option value="Environmental & Social">Environmental & Social</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Consulting Role *
              </label>
              <select 
                value={record.role}
                onChange={(e) => setRecord({ ...record, role: e.target.value })}
                className="form-input"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              >
                <option value="Lead Consultant">Lead Consultant</option>
                <option value="Sub-Consultant">Sub-Consultant</option>
                <option value="Joint Venture Partner">Joint Venture Partner</option>
                <option value="Project Manager">Project Manager</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Project Status *
              </label>
              <select 
                value={record.status}
                onChange={(e) => setRecord({ ...record, status: e.target.value })}
                className="form-input"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              >
                <option value="Completed">Completed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Pipeline">Pipeline / Bidding</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Location, Financials & Dates */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="#cc0000" /> Location, Financials & Timeline
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Project Location (City / Country)
              </label>
              <input 
                type="text" 
                value={record.location}
                onChange={(e) => setRecord({ ...record, location: e.target.value })}
                className="form-input"
                placeholder="e.g. Kampala, Uganda"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Contract Value (Currency & Amount)
              </label>
              <input 
                type="text" 
                value={record.contractValue || ''}
                onChange={(e) => setRecord({ ...record, contractValue: e.target.value })}
                className="form-input"
                placeholder="e.g. USD 3,800,000 or UGX 14.2B"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Commencement Date
              </label>
              <input 
                type="date" 
                value={record.startDate ? new Date(record.startDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setRecord({ ...record, startDate: e.target.value || null })}
                className="form-input"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Completion Date
              </label>
              <input 
                type="date" 
                value={record.completionDate ? new Date(record.completionDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setRecord({ ...record, completionDate: e.target.value || null })}
                className="form-input"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Scope of Services & Project Description */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#cc0000" /> Executive Summary & Scope of Services
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Detailed Project Description
              </label>
              <textarea 
                rows={4}
                value={record.description || ''}
                onChange={(e) => setRecord({ ...record, description: e.target.value })}
                className="form-input"
                placeholder="Comprehensive project background, technical parameters, structural dimensions, alignment length, capacity, etc."
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Scope of Services Provided
              </label>
              <textarea 
                rows={4}
                value={record.scopeOfServices || ''}
                onChange={(e) => setRecord({ ...record, scopeOfServices: e.target.value })}
                className="form-input"
                placeholder="List key services: Topographical surveying, geotechnical drilling, structural analysis, hydraulic modeling, construction supervision, ESIA, defects liability monitoring, etc."
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Client References & Verification */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} color="#cc0000" /> Client References & Contact Person
          </h2>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Client Contact Person & Verification Details
            </label>
            <textarea 
              rows={3}
              value={record.clientContact || ''}
              onChange={(e) => setRecord({ ...record, clientContact: e.target.value })}
              className="form-input"
              placeholder="Name, Designation, Organization, Phone, Email, and physical office location for client reference checks."
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
            />
          </div>
        </div>
      </form>
    </div>
  );
};
