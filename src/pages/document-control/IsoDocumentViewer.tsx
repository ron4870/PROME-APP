import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const IsoDocumentViewer: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/iso-documents`, { // Need to fetch from the list and find it or add a specific GET /api/iso-documents/:id if not exists. Wait, index.ts doesn't have GET /:id for iso-documents. I will just fetch all and find it for now, or I should use the master documents one? Wait, IsoDocuments is a separate model.
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const found = data.find((d: any) => d.id === Number(id));
        setDoc(found);
        if (found) {
          const ack = found.acknowledgments?.find((a: any) => a.userId === user?.id);
          setHasAcknowledged(!!ack);
        }
      }
    } catch (error) {
      console.error('Error fetching document', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await fetch(`/api/iso-documents/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setHasAcknowledged(true);
    } catch (error) {
      console.error('Failed to acknowledge', error);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await fetch(`/api/iso-documents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'PUBLISHED', changeSummary: 'Document Approved and Published' })
      });
      navigate('/iso-documents');
    } catch (error) {
      console.error('Failed to approve', error);
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!doc) return <div>Document not found</div>;

  const isApprover = user?.role?.name === 'Administrator' || user?.role?.name === 'Super Admin' || user?.id === doc.approverId;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 border-b pb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/iso-documents')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{doc.title}</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{doc.documentNumber}</span>
              <span>Rev: {doc.revision}</span>
              <span className={`px-2 py-1 font-semibold rounded-full ${
                doc.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {doc.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          {doc.status === 'IN_REVIEW' && isApprover && (
            <button 
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {approving ? 'Approving...' : 'Approve & Publish'}
            </button>
          )}

          {doc.status === 'PUBLISHED' && (
            <button 
              onClick={handleAcknowledge}
              disabled={hasAcknowledged || acknowledging}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                hasAcknowledged 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-[#000080] text-white hover:bg-blue-900'
              }`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {hasAcknowledged ? 'Acknowledged' : acknowledging ? 'Processing...' : 'Acknowledge Read'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[600px] prose max-w-none">
        {doc.format === 'legacy' && doc.fileUrl ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">This is a legacy PDF document.</p>
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 bg-[#000080] text-white rounded hover:bg-blue-900">
              View PDF Document
            </a>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: doc.content || '<em>No content</em>' }} />
        )}
      </div>
    </div>
  );
};

export default IsoDocumentViewer;
