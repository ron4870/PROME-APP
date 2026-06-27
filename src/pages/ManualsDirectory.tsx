import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Upload, X, Globe, PenTool, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Manual {
  id: number;
  title: string;
  category: string;
  fileUrl: string;
  uploadedBy: { name: string };
  updatedAt: string;
}

interface IsoDocument {
  id: number;
  documentNumber: string;
  title: string;
  category: string;
  status: string;
  format: string;
  author: { name: string };
  updatedAt: string;
}

const ManualsDirectory: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [externalManuals, setExternalManuals] = useState<Manual[]>([]);
  const [promeManuals, setPromeManuals] = useState<IsoDocument[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('PROME Manuals');
  const [uploadDocNumber, setUploadDocNumber] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchManuals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch External Manuals
      const extRes = await fetch('/api/manuals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (extRes.ok) {
        setExternalManuals(await extRes.json());
      }

      // Fetch PROME Manuals (ISO Documents with category 'Manual')
      const isoRes = await fetch('/api/iso-documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (isoRes.ok) {
        const isoDocs: IsoDocument[] = await isoRes.json();
        setPromeManuals(isoDocs.filter(d => d.category === 'Manual' || d.category === 'PROME Manuals' || d.category === 'PROME Manual'));
      }
    } catch (err) {
      console.error('Failed to fetch manuals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManuals();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setErrorMsg('Please select a PDF file.');
      return;
    }
    if (uploadCategory === 'PROME Manuals' && !uploadDocNumber) {
      setErrorMsg('Document Number is required for PROME Manuals.');
      return;
    }

    setUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('category', uploadCategory);
    if (uploadCategory === 'PROME Manuals') {
      formData.append('documentNumber', uploadDocNumber);
    }
    formData.append('file', uploadFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/manuals', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setIsUploadModalOpen(false);
        setUploadTitle('');
        setUploadDocNumber('');
        setUploadFile(null);
        fetchManuals(); // Refresh lists
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Upload failed');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  // Group external manuals by category
  const intlStandards = externalManuals.filter(m => m.category === 'International Standards');
  const designManuals = externalManuals.filter(m => m.category === 'Design Manuals');
  const refDocs = externalManuals.filter(m => m.category === 'Reference Documents');

  const renderExternalIcon = (m: Manual, Icon: any, colorCode: string) => (
    <a 
      key={m.id} 
      href={m.fileUrl} 
      target="_blank" 
      rel="noreferrer"
      className="flex flex-col items-center gap-3 group text-decoration-none"
      title={`${m.title}
Uploaded by: ${m.uploadedBy?.name}`}
    >
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }} className="group-hover:scale-110 group-hover:shadow-lg">
        <Icon size={32} color={colorCode} strokeWidth={2} style={{ filter: `drop-shadow(1px 2px 2px ${colorCode}4D)` }} />
      </div>
      <span className="text-xs font-semibold text-gray-800 text-center line-clamp-2 leading-tight px-1 transition-colors" style={{ '--tw-hover-text-opacity': '1', ':hover': { color: colorCode } } as any}>
        {m.title}
      </span>
    </a>
  );

  return (
    <div className="layout-container" style={{ padding: '2rem 0' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Corporate Manuals</h1>
          <p className="text-gray-500 text-sm mt-1">Directory of all PROME guidelines and external reference manuals</p>
        </div>
        
        {user?.roles?.some(r => r.name === 'Administrator') && (
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Upload size={18} /> Register Manual
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
      ) : (
        <div className="space-y-10">
          
          {/* PROME Manuals Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.5)' }}><FileText size={20} color="#cc0000" strokeWidth={2} /></div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight" style={{ color: '#cc0000' }}>PROME Manuals</h2>
            </div>
            {promeManuals.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No PROME Manuals found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">
                {promeManuals.map(doc => (
                  <div 
                    key={doc.id} 
                    onClick={() => navigate(`/iso-documents/${doc.id}`)}
                    className="flex flex-col items-center gap-3 cursor-pointer group"
                    title={`${doc.documentNumber} - ${doc.title}
Status: ${doc.status}`}
                  >
                    <div className="relative">
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }} className="group-hover:scale-110 group-hover:shadow-lg">
                        <FileText size={32} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                      </div>
                      {/* Status indicator dot */}
                      <div 
                        className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{
                          backgroundColor: doc.status === 'APPROVED' ? '#16a34a' :
                                         doc.status === 'PUBLISHED' ? '#2563eb' :
                                         doc.status === 'REJECTED' ? '#dc2626' : '#eab308'
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 text-center line-clamp-2 leading-tight group-hover:text-red-700 px-1">
                      {doc.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* International Standards Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.5)' }}><Globe size={20} color="#2563eb" strokeWidth={2} /></div>
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#2563eb' }}>International Standards</h2>
            </div>
            {intlStandards.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No International Standards found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">
                {intlStandards.map(m => renderExternalIcon(m, Globe, "#2563eb"))}
              </div>
            )}
          </section>

          {/* Design Manuals Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.5)' }}><PenTool size={20} color="#16a34a" strokeWidth={2} /></div>
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#16a34a' }}>Design Manuals</h2>
            </div>
            {designManuals.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No Design Manuals found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">
                {designManuals.map(m => renderExternalIcon(m, PenTool, "#16a34a"))}
              </div>
            )}
          </section>

          {/* Reference Documents Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.5)' }}><Library size={20} color="#9333ea" strokeWidth={2} /></div>
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#9333ea' }}>Reference Documents</h2>
            </div>
            {refDocs.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No Reference Documents found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">
                {refDocs.map(m => renderExternalIcon(m, Library, "#9333ea"))}
              </div>
            )}
          </section>

        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Register Manual</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {errorMsg}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manual Category</label>
                  <select 
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  >
                    <option value="PROME Manuals">PROME Manuals</option>
                    <option value="International Standards">International Standards</option>
                    <option value="Design Manuals">Design Manuals</option>
                    <option value="Reference Documents">Reference Documents</option>
                  </select>
                  {uploadCategory === 'PROME Manuals' && (
                    <p className="text-xs text-blue-600 mt-1 flex items-start gap-1">
                      <span className="font-bold">Info:</span> The uploaded PDF will be automatically parsed to create an editable Native Draft Document.
                    </p>
                  )}
                </div>

                {uploadCategory === 'PROME Manuals' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
                    <input 
                      type="text"
                      value={uploadDocNumber}
                      onChange={(e) => setUploadDocNumber(e.target.value)}
                      placeholder="e.g. PROME-MAN-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      required={uploadCategory === 'PROME Manuals'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manual Title</label>
                  <input 
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF</label>
                  <input 
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    required
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Uploading...</>
                  ) : (
                    'Upload Manual'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Lucide icon fallbacks for the component



export default ManualsDirectory;
