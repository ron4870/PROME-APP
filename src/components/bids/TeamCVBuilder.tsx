import { useState, useRef } from 'react';
import { UserPlus, Brain, Trash2, FileText, Download, Loader2, Award } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface EvaluatedCV {
  id: string;
  role: string;
  requirements: string;
  staffName: string;
  wikiPageId: number;
  score: number;
  opinion: string;
  status: string;
}

interface Props {
  sectionId: number;
  team: EvaluatedCV[];
  onChange: (team: EvaluatedCV[]) => void;
  wikiPages: { id: number; title: string }[];
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function TeamCVBuilder({ sectionId, team, onChange, wikiPages }: Props) {
  const [role, setRole] = useState('');
  const [requirements, setRequirements] = useState('');
  const [wikiPageId, setWikiPageId] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  const rosterRef = useRef<HTMLDivElement>(null);

  const handleEvaluate = async () => {
    if (!role || !requirements || !wikiPageId) return alert('Please fill in all fields.');
    
    setIsEvaluating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bids/sections/${sectionId}/evaluate-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role, requirements, wikiPageId: Number(wikiPageId) })
      });

      if (!res.ok) throw new Error('Evaluation failed');

      const evaluation = await res.json();
      const newMember: EvaluatedCV = {
        id: Math.random().toString(36).substring(7),
        ...evaluation
      };

      onChange([...team, newMember]);
      
      // Reset form
      setRole('');
      setRequirements('');
      setWikiPageId('');
    } catch (err) {
      alert('Failed to evaluate CV');
    } finally {
      setIsEvaluating(false);
    }
  };

  const removeMember = (id: string) => {
    onChange(team.filter(m => m.id !== id));
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#16a34a'; // green
    if (score >= 70) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const exportPDF = async () => {
    if (!rosterRef.current) return;
    
    try {
      const canvas = await html2canvas(rosterRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save('Proposed_Team_Evaluations.pdf');
    } catch (err) {
      alert('Failed to generate PDF');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Evaluation Form */}
      <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} /> Propose Team Member
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>Project Role</label>
              <input 
                type="text" 
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Lead Structural Engineer"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>Select Staff CV (from Wiki)</label>
              <select 
                value={wikiPageId}
                onChange={e => setWikiPageId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="">-- Choose a CV --</option>
                {wikiPages.map(page => (
                  <option key={page.id} value={page.id}>{page.title}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleEvaluate}
              disabled={isEvaluating || !role || !requirements || !wikiPageId}
              style={{ 
                padding: '0.75rem 1rem', backgroundColor: '#4f46e5', color: 'white', borderRadius: '6px', 
                fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', marginTop: 'auto'
              }}
            >
              {isEvaluating ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
              {isEvaluating ? 'Evaluating CV...' : 'AI Evaluate & Add'}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>Project Requirements for Role</label>
            <textarea 
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="Paste the ToR requirements here (e.g. Must have a Master's degree, 15 years experience in bridge design...)"
              style={{ width: '100%', height: '100%', minHeight: '160px', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Evaluated Team Roster */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="#4f46e5" /> Proposed Team Roster
          </h3>
          {team.length > 0 && (
            <button 
              onClick={exportPDF}
              style={{ 
                padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', borderRadius: '6px', 
                fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' 
              }}
            >
              <Download size={16} /> Summary PDF
            </button>
          )}
        </div>

        {team.length > 0 ? (
          <div ref={rosterRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'white' }}>
            {team.map((member) => (
              <div key={member.id} style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                
                {/* Left Side: Info & Score */}
                <div style={{ width: '250px', padding: '1.5rem', backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{member.role}</div>
                  <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 600, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="#64748b" /> {member.staffName}
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: getScoreColor(member.score) }}>{member.score}</span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>/ 100</span>
                  </div>
                </div>

                {/* Right Side: Opinion & Actions */}
                <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: '#334155', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Brain size={16} color="#4f46e5" /> AI Evaluator Opinion
                    </h4>
                    <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
                      {member.opinion}
                    </p>
                  </div>
                  
                  <div style={{ alignSelf: 'flex-end', marginTop: '1rem' }}>
                     <button onClick={() => removeMember(member.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>
                      <Trash2 size={14} /> Remove Candidate
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
            No team members proposed yet. Use the form above to evaluate CVs for the required project roles.
          </div>
        )}
      </div>

    </div>
  );
}
