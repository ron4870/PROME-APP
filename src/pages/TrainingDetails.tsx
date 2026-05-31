import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Users, Trash2, GraduationCap } from 'lucide-react';

interface User {
  id: number;
  name: string;
  department: string | null;
}

interface TrainingAttendance {
  id: number;
  attendeeId: number;
  attendee: User;
  status: string;
  competenceEval: string | null;
  evaluationNotes: string | null;
  evaluator?: User | null;
}

interface TrainingRecord {
  id: number;
  trainingNumber: string;
  title: string;
  description: string;
  trainerName: string | null;
  internalTrainerId: number | null;
  scheduledDate: string | null;
  completedDate: string | null;
  status: string;
  attendees: TrainingAttendance[];
}

const TrainingDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState<TrainingRecord | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<number | ''>('');

  useEffect(() => {
    fetchTraining();
    fetchUsers();
  }, [id]);

  const fetchTraining = async () => {
    try {
      const response = await fetch(`/api/trainings/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setTraining(await response.json());
      } else {
        navigate('/trainings');
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
    if (!training) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/trainings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(training)
      });
      if (response.ok) {
        setTraining(await response.json());
        alert('Training record saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save training record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAttendee = async () => {
    if (!selectedUserToAdd) return;
    try {
      const response = await fetch(`/api/trainings/${id}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ attendeeId: selectedUserToAdd })
      });
      
      if (response.ok) {
        const newAttendee = await response.json();
        setTraining(prev => prev ? {
          ...prev,
          attendees: [...prev.attendees, newAttendee]
        } : null);
        setSelectedUserToAdd('');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to add attendee');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveAttendee = async (attendanceId: number) => {
    try {
      const response = await fetch(`/api/trainings/${id}/attendees/${attendanceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setTraining(prev => prev ? {
          ...prev,
          attendees: prev.attendees.filter(a => a.id !== attendanceId)
        } : null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateAttendance = async (attendanceId: number, field: string, value: string) => {
    try {
      const attendance = training?.attendees.find(a => a.id === attendanceId);
      if (!attendance) return;

      const payload = { ...attendance, [field]: value };
      
      const response = await fetch(`/api/trainings/${id}/attendees/${attendanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updated = await response.json();
        setTraining(prev => prev ? {
          ...prev,
          attendees: prev.attendees.map(a => a.id === attendanceId ? updated : a)
        } : null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!training) return <div className="layout-container">Loading...</div>;

  return (
    <div className="layout-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/trainings')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{training.trainingNumber}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: 
                training.status === 'Completed' ? '#dcfce3' : 
                training.status === 'In Progress' ? '#e0f2fe' : 
                training.status === 'Cancelled' ? '#fee2e2' : '#fef3c7',
              color: 
                training.status === 'Completed' ? '#166534' : 
                training.status === 'In Progress' ? '#0369a1' : 
                training.status === 'Cancelled' ? '#991b1b' : '#b45309',
              fontWeight: '600'
            }}>
              {training.status}
            </span>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f97316' }}
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Training'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left Column: Details */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GraduationCap size={20} color="#f97316" /> Course Details
          </h2>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Training Topic / Title</label>
            <input 
              type="text" 
              className="form-input" 
              value={training.title}
              onChange={e => setTraining({...training, title: e.target.value})}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description & Syllabus</label>
            <textarea 
              className="form-textarea" 
              rows={4}
              value={training.description || ''}
              onChange={e => setTraining({...training, description: e.target.value})}
              placeholder="What topics will be covered? What skills will be acquired?"
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Scheduled Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={training.scheduledDate ? training.scheduledDate.split('T')[0] : ''}
                onChange={e => setTraining({...training, scheduledDate: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Completed Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={training.completedDate ? training.completedDate.split('T')[0] : ''}
                onChange={e => setTraining({...training, completedDate: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Administration */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Administration</h2>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Overall Status</label>
            <select 
              className="form-select"
              value={training.status}
              onChange={e => setTraining({...training, status: e.target.value})}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Internal Trainer (Optional)</label>
            <select 
              className="form-select"
              value={training.internalTrainerId || ''}
              onChange={e => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                setTraining({...training, internalTrainerId: val, trainerName: val ? null : training.trainerName});
              }}
            >
              <option value="">Select an internal staff member...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {!training.internalTrainerId && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">External Trainer Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={training.trainerName || ''}
                onChange={e => setTraining({...training, trainerName: e.target.value})}
                placeholder="Name of external trainer or institution"
              />
            </div>
          )}
        </div>
      </div>

      {/* Full Width: Attendance & Competency Roster */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Users size={20} color="#3b82f6" /> Attendance & Competence Roster
          </h2>
          
          {/* Add Attendee */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              className="form-select" 
              style={{ width: '250px' }}
              value={selectedUserToAdd}
              onChange={e => setSelectedUserToAdd(parseInt(e.target.value) || '')}
            >
              <option value="">Select employee to add...</option>
              {users.filter(u => !training.attendees.find(a => a.attendeeId === u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.department || 'No Dept'})</option>
              ))}
            </select>
            <button 
              className="btn btn-outline" 
              onClick={handleAddAttendee}
              disabled={!selectedUserToAdd}
            >
              Add to Roster
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Employee</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Attendance</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', borderLeft: '2px solid #e5e7eb' }}>Competence Evaluation (ISO 9001)</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Notes</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Evaluator</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {training.attendees.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '0.875rem' }}>{a.attendee.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{a.attendee.department || '-'}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <select 
                      className="form-select" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: '120px' }}
                      value={a.status}
                      onChange={(e) => updateAttendance(a.id, 'status', e.target.value)}
                    >
                      <option value="Registered">Registered</option>
                      <option value="Attended">Attended</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', borderLeft: '2px solid #e5e7eb' }}>
                    <select 
                      className="form-select" 
                      style={{ 
                        padding: '0.25rem 0.5rem', 
                        fontSize: '0.75rem', 
                        width: '120px',
                        backgroundColor: a.competenceEval === 'Pass' ? '#dcfce3' : a.competenceEval === 'Fail' ? '#fee2e2' : 'white',
                        color: a.competenceEval === 'Pass' ? '#166534' : a.competenceEval === 'Fail' ? '#991b1b' : 'inherit'
                      }}
                      value={a.competenceEval || 'Pending'}
                      onChange={(e) => updateAttendance(a.id, 'competenceEval', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Verification notes..."
                      value={a.evaluationNotes || ''}
                      onChange={(e) => updateAttendance(a.id, 'evaluationNotes', e.target.value)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    {a.evaluator?.name || '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleRemoveAttendee(a.id)} 
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                      title="Remove from roster"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {training.attendees.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                    No employees added to the roster yet.
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

export default TrainingDetails;
