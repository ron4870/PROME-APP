import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle, 
  FileText, 
  Upload, 
  Trash2, 
  Save, 
  Send, 
  AlertCircle, 
  FileCheck,
  ShieldCheck,
  Building,
  HelpCircle
} from 'lucide-react';

interface Attachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  createdAt: string;
}

interface Question {
  id: number;
  clauseNumber: string;
  clauseTitle: string;
  questionText: string;
  guidance: string | null;
  response: string | null;
  attachments: Attachment[];
}

interface InterviewData {
  id: number;
  token: string;
  intervieweeName: string;
  intervieweeEmail: string;
  projects: string | null;
  isoSections: string;
  status: string;
  submittedAt: string | null;
  audit: {
    id: number;
    auditNumber: string;
    title: string;
    standard: string | null;
    scope: string | null;
    plannedDate: string;
    status: string;
    auditor: { name: string; email: string } | null;
  };
  questions: Question[];
}

export default function AuditInterviewPortal() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local state for answers: map questionId -> response string
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingForQ, setUploadingForQ] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      fetchInterviewData();
    }
  }, [token]);

  const fetchInterviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/audits/interviews/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load interview');
      }
      const interview: InterviewData = await res.json();
      setData(interview);

      // Initialize answers map
      const initialAnswers: Record<number, string> = {};
      interview.questions.forEach(q => {
        initialAnswers[q.id] = q.response || '';
      });
      setAnswers(initialAnswers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleSaveDraft = async () => {
    if (!token) return;
    try {
      setSavingDraft(true);
      setFeedbackMsg(null);
      const payload = {
        responses: Object.entries(answers).map(([qId, val]) => ({
          questionId: parseInt(qId),
          response: val
        }))
      };

      const res = await fetch(`/api/audits/interviews/${token}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save draft');
      setFeedbackMsg({ type: 'success', text: 'Draft saved successfully. You can return to this page anytime.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleFileUpload = async (questionId: number, file: File) => {
    if (!token) return;
    try {
      setUploadingForQ(questionId);
      setFeedbackMsg(null);

      const formData = new FormData();
      formData.append('questionId', questionId.toString());
      formData.append('file', file);

      const res = await fetch(`/api/audits/interviews/${token}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to upload evidence file');
      const attachment: Attachment = await res.json();

      // Update question attachments locally
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map(q => {
            if (q.id === questionId) {
              return { ...q, attachments: [...q.attachments, attachment] };
            }
            return q;
          })
        };
      });

      setFeedbackMsg({ type: 'success', text: `Evidence file "${file.name}" uploaded successfully!` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingForQ(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number, questionId: number) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to remove this evidentiary file?')) return;

    try {
      const res = await fetch(`/api/audits/interviews/${token}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete attachment');

      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map(q => {
            if (q.id === questionId) {
              return { ...q, attachments: q.attachments.filter(a => a.id !== attachmentId) };
            }
            return q;
          })
        };
      });
    } catch (err: any) {
      alert('Error removing attachment: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    
    // Check if at least some answers have been filled
    const filledCount = Object.values(answers).filter(a => a.trim().length > 0).length;
    if (filledCount === 0) {
      alert('Please provide responses to the audit questions before submitting.');
      return;
    }

    if (!window.confirm('Are you ready to submit your ISO audit interview responses and evidence? Once submitted, the Lead Auditor will evaluate compliance.')) {
      return;
    }

    try {
      setSubmitting(true);
      setFeedbackMsg(null);

      const payload = {
        responses: Object.entries(answers).map(([qId, val]) => ({
          questionId: parseInt(qId),
          response: val
        }))
      };

      const res = await fetch(`/api/audits/interviews/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Submission failed');
      const resData = await res.json();

      setData(prev => prev ? { ...prev, status: 'SUBMITTED', submittedAt: resData.interview.submittedAt } : prev);
      setFeedbackMsg({ type: 'success', text: 'Thank you! Your ISO 9001 audit interview has been submitted successfully.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #fee2e2', borderTopColor: '#cc0000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: '15px' }}>Loading ISO Quality Audit Interview...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', color: '#0f172a', margin: '0 0 8px 0' }}>Invalid or Expired Link</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            {error || 'This audit interview session could not be found. Please check your invitation link or contact the Lead Auditor.'}
          </p>
        </div>
      </div>
    );
  }

  const isSubmitted = data.status === 'SUBMITTED' || data.status === 'EVALUATED';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '80px' }}>
      {/* Top Banner / Header */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#cc0000" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#cc0000', letterSpacing: '-0.3px' }}>PROME CONSULT</span>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                  {data.audit.standard || 'ISO 9001:2015'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Internal Quality Audit Questionnaire</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isSubmitted ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                <CheckCircle size={16} /> Submitted
              </span>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: 600,
                    cursor: savingDraft ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Save size={15} /> {savingDraft ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 18px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#cc0000', color: '#ffffff', fontSize: '13px', fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(204, 0, 0, 0.2)'
                  }}
                >
                  <Send size={15} /> {submitting ? 'Submitting...' : 'Submit Audit'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1000px', margin: '32px auto 0', padding: '0 24px' }}>
        {/* Feedback Alert */}
        {feedbackMsg && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            backgroundColor: feedbackMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: feedbackMsg.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '14px',
            fontWeight: 500
          }}>
            {feedbackMsg.text}
          </div>
        )}

        {/* Audit Context Overview Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#cc0000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ref: {data.audit.auditNumber}
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px 0' }}>
                {data.audit.title}
              </h1>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0, maxWidth: '700px' }}>
                {data.audit.scope || 'Quality Management System ISO 9001 compliance audit across corporate and project engineering operations.'}
              </p>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '220px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Lead Quality Auditor</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{data.audit.auditor?.name || 'PROME Lead Auditor'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Interviewee Name</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.intervieweeName}</span>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>{data.intervieweeEmail}</span>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Designated Projects</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="#64748b" /> {data.projects || 'All Engineering Projects'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Assigned Standard Clauses</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#cc0000' }}>
                {data.isoSections}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions Banner */}
        <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', padding: '16px 20px', marginBottom: '32px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <HelpCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13.5px', color: '#1e3a8a', lineHeight: 1.6 }}>
            <strong>Audit Instructions:</strong> Please answer each of the ISO 9001 compliance questions below thoroughly with respect to the project(s) and department you manage. 
            Under each question, click <strong>"Attach Evidentiary Document"</strong> to upload objective proof (e.g., Project Quality Plans, design review checklists, inspection logs, risk registers, or subconsultant evaluation forms).
          </div>
        </div>

        {/* Questionnaire List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {data.questions.map((q, idx) => (
            <div 
              key={q.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              {/* Question Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    backgroundColor: '#fee2e2', 
                    color: '#cc0000', 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    padding: '4px 10px', 
                    borderRadius: '6px' 
                  }}>
                    Clause {q.clauseNumber}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    {q.clauseTitle}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Question {idx + 1} of {data.questions.length}</span>
              </div>

              {/* Question Text */}
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                {q.questionText}
              </h3>

              {/* Guidance / Objective Evidence Required */}
              {q.guidance && (
                <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #cc0000', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '2px' }}>
                    Objective Evidence Needed:
                  </span>
                  <span style={{ fontSize: '13px', color: '#334155' }}>
                    {q.guidance}
                  </span>
                </div>
              )}

              {/* Response Textarea */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Written Response / Explanation:
                </label>
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Provide a detailed explanation of how this ISO requirement is fulfilled in your project, referencing specific processes, teams, and records..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    backgroundColor: isSubmitted ? '#f8fafc' : '#ffffff'
                  }}
                />
              </div>

              {/* Evidentiary Attachments */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck size={16} color="#cc0000" />
                    Attached Evidentiary Documents ({q.attachments.length})
                  </span>

                  {!isSubmitted && (
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f1f5f9',
                      color: '#0f172a', fontSize: '12px', fontWeight: 600, cursor: uploadingForQ === q.id ? 'not-allowed' : 'pointer',
                      border: '1px solid #cbd5e1'
                    }}>
                      <Upload size={14} />
                      {uploadingForQ === q.id ? 'Uploading...' : 'Attach Evidence File'}
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        disabled={uploadingForQ === q.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(q.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>

                {q.attachments.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    No evidentiary files attached yet. Attach your project quality plan, reports, or check sheets above.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {q.attachments.map(att => (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '6px 12px', borderRadius: '8px',
                          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                          fontSize: '12.5px', color: '#1e293b'
                        }}
                      >
                        <FileText size={15} color="#cc0000" />
                        <a 
                          href={att.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={att.fileName}
                        >
                          {att.fileName}
                        </a>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>({formatFileSize(att.fileSize)})</span>

                        {!isSubmitted && (
                          <button
                            onClick={() => handleDeleteAttachment(att.id, q.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                            title="Remove attachment"
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        {!isSubmitted && (
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', borderRadius: '10px', border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff', color: '#334155', fontSize: '14px', fontWeight: 600,
                cursor: savingDraft ? 'not-allowed' : 'pointer'
              }}
            >
              <Save size={16} /> {savingDraft ? 'Saving Draft...' : 'Save Draft Progress'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px', borderRadius: '10px', border: 'none',
                backgroundColor: '#cc0000', color: '#ffffff', fontSize: '14px', fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(204, 0, 0, 0.25)'
              }}
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Complete Audit Interview'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
