import React, { useState } from 'react';

export interface ModalConfig {
  title: string;
  endpoint: string;
  fields: { name: string; label: string; type: string; required?: boolean; options?: string[] }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: ModalConfig | null;
  token: string | null;
  onSuccess: () => void;
}

export const GenericModal: React.FC<Props> = ({ isOpen, onClose, config, token, onSuccess }) => {
  const [formData, setFormData] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !config) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let body: any;
      let headers: any = { Authorization: `Bearer ${token}` };

      if (file) {
        body = new FormData();
        Object.keys(formData).forEach(k => body.append(k, formData[k]));
        body.append('file', file);
      } else {
        body = JSON.stringify(formData);
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body
      });
      if (!res.ok) throw new Error('Failed to save');
      setFormData({});
      setFile(null);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>{config.title}</h2>
        <form onSubmit={handleSubmit}>
          {config.fields.map(f => (
            <div key={f.name} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>{f.label}</label>
              {f.type === 'file' ? (
                <input 
                  type="file" 
                  required={f.required}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              ) : f.type === 'select' ? (
                <select
                  required={f.required}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                  onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                >
                  <option value="">Select...</option>
                  {f.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type={f.type} 
                  required={f.required}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                  onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
