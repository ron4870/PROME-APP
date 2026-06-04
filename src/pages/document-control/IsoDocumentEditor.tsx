import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { ArrowLeft, Save, Send } from 'lucide-react';
import TipTapEditor from '../../components/TipTapEditor';

const IsoDocumentEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    if (id && id !== 'new') {
      fetchDocument();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/iso-documents/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContent(data.content || '');
        setTitle(data.title || '');
        setDocumentNumber(data.documentNumber || '');
        setStatus(data.status || 'DRAFT');
      }
    } catch (error) {
      console.error('Error fetching document', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (id === 'new') {
        const response = await fetch('/api/iso-documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            documentNumber,
            category: 'SOP', // Default or make it dynamic
            format: 'native',
            content
          })
        });
        if (response.ok) {
          const data = await response.json();
          navigate(`/iso-documents/edit/${data.id}`);
        }
      } else {
        await fetch(`/api/iso-documents/${id}/content`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content })
        });
      }
    } catch (error) {
      console.error('Failed to save draft', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    await handleSaveDraft();
    try {
      await fetch(`/api/iso-documents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'IN_REVIEW', changeSummary: 'Submitted for review' })
      });
      navigate('/iso-documents');
    } catch (error) {
      console.error('Failed to submit for review', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/iso-documents')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document Title"
              className="text-2xl font-bold border-none bg-transparent focus:ring-0 p-0"
              disabled={status !== 'DRAFT'}
            />
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {status}
              </span>
              {id === 'new' && (
                <input 
                  type="text" 
                  value={documentNumber} 
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="e.g. PROME-SOP-001"
                  className="text-sm border-gray-300 rounded px-2 py-1"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          {status === 'DRAFT' && (
            <>
              <button 
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              
              <button 
                onClick={handleSubmitForReview}
                disabled={saving || id === 'new'}
                className="flex items-center px-4 py-2 bg-[#000080] text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit for Review
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-grow h-full" style={{ minHeight: 'calc(100vh - 180px)' }}>
        <TipTapEditor 
          content={content} 
          onChange={setContent} 
          editable={status === 'DRAFT'} 
        />
      </div>
    </div>
  );
};

export default IsoDocumentEditor;
