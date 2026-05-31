import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, FileText, Activity, Settings, MapPin, Mail, Phone, Briefcase, FileUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function UserProfile() {
  const { user, token, setAuth } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fileCount, setFileCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setAuth(updatedUser, token!);
        setSaveSuccess(true);
        form.reset();
        setFileCount(0);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (location.hash) {
      setActiveTab(location.hash.replace('#', ''));
    }
  }, [location]);

  return (
    <div className="responsive-container" style={{ padding: '2rem 1rem' }}>
      {/* Header Profile Card */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', padding: '2rem' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#64748b', fontWeight: 'bold' }}>
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>{user?.name || 'Unknown User'}</h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} /> {user?.role?.name || 'Staff Member'} {user?.division ? `• ${user.division}` : ''}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
        {[
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'documents', label: 'My Documents', icon: FileText },
          { id: 'activity', label: 'My Activity', icon: Activity },
          { id: 'settings', label: 'Account Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #dc2626' : '3px solid transparent',
              color: activeTab === tab.id ? '#dc2626' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'profile' && (
          <form className="glass-panel" style={{ padding: '2rem' }} onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', color: '#0f172a' }}>Personal Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Email Address</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', color: '#334155' }}>
                  <Mail size={16} />
                  <span>{user?.email}</span>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#334155' }}>
                  <Phone size={16} color="#94a3b8" />
                  <input type="text" name="phone" style={{ border: 'none', background: 'transparent', padding: '0.75rem 0', outline: 'none', width: '100%' }} placeholder="+256..." defaultValue={user?.phone || ''} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Office Location</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#334155' }}>
                  <MapPin size={16} color="#94a3b8" />
                  <input type="text" name="location" style={{ border: 'none', background: 'transparent', padding: '0.75rem 0', outline: 'none', width: '100%' }} placeholder="e.g. Kampala HQ - Floor 3" defaultValue={user?.location || ''} />
                </div>
              </div>
            </div>
            
            <h2 style={{ fontSize: '1.25rem', margin: '2rem 0 1.5rem 0', color: '#0f172a' }}>Professional Summary</h2>
            
            <div className="form-group">
              <label className="form-label">Professional Bio</label>
              <textarea 
                name="bio"
                className="form-input" 
                rows={4} 
                placeholder="Write a brief professional bio..."
                defaultValue={user?.bio || ''}
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Skills</label>
              <textarea 
                name="skills"
                className="form-input" 
                rows={2} 
                placeholder="List your key skills (e.g., Project Management, Structural Engineering, AutoCAD)..."
                defaultValue={user?.skills || ''}
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Qualifications (Type or Upload Documents)</label>
              <textarea 
                name="qualifications"
                className="form-input" 
                rows={2} 
                placeholder="List your qualifications (e.g., BSc Civil Engineering, PMP Certification)..."
                defaultValue={user?.qualifications || ''}
                style={{ marginBottom: '0.5rem' }}
              ></textarea>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <label className="btn" style={{ background: '#e2e8f0', color: '#475569', cursor: 'pointer', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                  <input type="file" name="documents" style={{ display: 'none' }} multiple onChange={(e) => setFileCount(e.target.files?.length || 0)} />
                  Upload Documents
                </label>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {fileCount > 0 ? `${fileCount} file(s) selected` : 'PDF, DOCX, or Images up to 5MB'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
               {saveSuccess && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><CheckCircle size={16} /> Saved Successfully</span>}
               <button type="submit" className="btn btn-primary" disabled={saving}>
                 {saving ? 'Saving...' : 'Save Changes'}
               </button>
            </div>
          </form>
        )}

        {activeTab === 'documents' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', color: '#0f172a' }}>My Uploaded Documents</h2>
            {user?.userDocuments && user.userDocuments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {user.userDocuments.map((doc: any) => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <FileText size={24} color="#3b82f6" />
                      <div>
                        <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{doc.filename}</p>
                      </div>
                    </div>
                    <a href={`/api${doc.filepath}`} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.875rem', padding: '0.5rem 1rem', textDecoration: 'none' }}>
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                <FileUp size={48} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>No Documents Yet</h3>
                <p style={{ color: '#64748b', margin: 0 }}>Documents uploaded from your profile will appear here.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
             <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#0f172a' }}>Recent Activity</h2>
             <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '1.5rem', marginLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0' }}>Logged In</h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Today</p>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></div>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0' }}>Account Created</h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>System Administrator</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#0f172a' }}>Security & Login</h2>
            <button className="btn btn-primary">Change Password</button>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '1rem' }}>
              We recommend changing your password every 90 days to keep your account secure.
            </p>
            
            <h2 style={{ fontSize: '1.25rem', margin: '2rem 0 1.5rem 0', color: '#0f172a' }}>Notification Preferences</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#dc2626' }} />
              <span>Receive email notifications for system updates</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#dc2626' }} />
              <span>Receive email notifications for assigned tasks</span>
            </label>
          </div>
        )}
      </motion.div>
    </div>
  );
}
