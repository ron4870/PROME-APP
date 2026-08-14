import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Award, MapPin, FileText } from 'lucide-react';

interface CompanyExperienceDetail {
  id: number;
  itemNo?: number;
  projectNumber: string;
  projectName: string;
  category: string;
  duration?: string | null;
  client: string;
  funder?: string | null;
  clientAddress?: string | null;
  country: string;
  contractValue?: string | null;
  role: string;
  status: string;
  deliverables?: string | null;
  description?: string | null;
  scopeOfServices?: string | null;
  clientContact?: string | null;
  sector?: string | null;
  location?: string | null;
}

const CATEGORIES = [
  'A. Feasibility Studies and Design of Expressway Projects',
  'B. Feasibility Studies and Design of Highway Projects',
  'C. Feasibility Studies and Design of Bridges',
  'D. Feasibility Studies and Design of Urban/Town Road Projects',
  'E. Field Investigations and Data Collection Assignments',
  'F. Feasibility Studies and Design of Infrastructure Projects in Oil and GAS',
  'G. Feasibility Studies and Design of Building Projects',
  'H. Development and Management of Asset Management Systems',
  'I. Design Review and Construction Supervision'
];

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
        alert('Infrastructure project experience saved successfully');
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
        Loading project details...
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="layout-container" style={{ maxWidth: '1050px', margin: '0 auto', paddingBottom: '4rem' }}>
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
              <span style={{ fontSize: '0.875rem', fontWeight: '800', color: '#cc0000', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '6px' }}>
                Item #{record.itemNo || record.id} | {record.projectNumber}
              </span>
              <span style={{
                padding: '4px 12px',
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
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', margin: 0, lineHeight: '1.3' }}>
              {record.projectName}
            </h1>
            <p style={{ color: '#6b7280', margin: '6px 0 0 0' }}>
              Category: <strong style={{ color: '#cc0000' }}>{record.category}</strong>
            </p>
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

        {/* Section 1: Official Project Classification */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} color="#cc0000" /> Infrastructure Assignment Details
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Official Project Category *
              </label>
              <select 
                value={record.category}
                onChange={(e) => setRecord({ ...record, category: e.target.value })}
                className="form-input"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem', fontWeight: '600', color: '#991b1b' }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Full Project Name / Assignment Title *
              </label>
              <textarea 
                rows={2}
                value={record.projectName}
                onChange={(e) => setRecord({ ...record, projectName: e.target.value })}
                className="form-input"
                required
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem', fontWeight: '600' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Project Duration (e.g. March 2016 to June 2020) *
              </label>
              <input 
                type="text" 
                value={record.duration || ''}
                onChange={(e) => setRecord({ ...record, duration: e.target.value })}
                className="form-input"
                placeholder="e.g. November 2016 to November 2017"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Country of Project Execution *
              </label>
              <input 
                type="text" 
                value={record.country || 'Uganda'}
                onChange={(e) => setRecord({ ...record, country: e.target.value })}
                className="form-input"
                placeholder="e.g. Uganda, Ethiopia, Tanzania"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Role in Assignment *
              </label>
              <input 
                type="text" 
                value={record.role || ''}
                onChange={(e) => setRecord({ ...record, role: e.target.value })}
                className="form-input"
                placeholder="e.g. Sole Consultant, Sub Consultant in association with EGIS International"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Assignment Status *
              </label>
              <select 
                value={record.status}
                onChange={(e) => setRecord({ ...record, status: e.target.value })}
                className="form-input"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              >
                <option value="Completed">Completed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Pipeline">Pipeline / Tender</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Client, Funder & Financials */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="#cc0000" /> Client / Employer, Funder & Contract Value
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
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
                placeholder="e.g. Uganda National Roads Authority"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Funder / Donor Agency
              </label>
              <input 
                type="text" 
                value={record.funder || ''}
                onChange={(e) => setRecord({ ...record, funder: e.target.value })}
                className="form-input"
                placeholder="e.g. Government of Uganda, World Bank, JICA, AfDB"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Client Physical Address & Contact Info
              </label>
              <input 
                type="text" 
                value={record.clientAddress || ''}
                onChange={(e) => setRecord({ ...record, clientAddress: e.target.value })}
                className="form-input"
                placeholder="e.g. P.O. Box 28487, Kampala Uganda"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Contract Value (UGX / USD / ETB)
              </label>
              <input 
                type="text" 
                value={record.contractValue || ''}
                onChange={(e) => setRecord({ ...record, contractValue: e.target.value })}
                className="form-input"
                placeholder="e.g. UGX 6,342,048,583 (USD 1,865,308.40)"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem', fontWeight: '700', color: '#047857' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Main Deliverables & Outputs */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#cc0000" /> Description of Main Deliverables / Outputs
          </h2>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Main Deliverables & Bullet Points *
            </label>
            <textarea 
              rows={8}
              value={record.deliverables || ''}
              onChange={(e) => setRecord({ ...record, deliverables: e.target.value })}
              className="form-input"
              placeholder="• Traffic Surveys&#10;• Topographic and Cadastral Surveys&#10;• Geotechnical Investigations&#10;• Feasibility Study&#10;• Engineering Design&#10;• Environmental and Social Impact Assessment (ESIA)&#10;• Resettlement Action Plan (RAP)&#10;• Road safety audit studies&#10;• Preparation of Bidding documents&#10;• Unit rate analysis and confidential Engineers estimate&#10;• Preparation of Drawings"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.625rem', fontFamily: 'monospace, sans-serif', fontSize: '0.875rem', lineHeight: '1.5' }}
            />
          </div>
        </div>
      </form>
    </div>
  );
};
