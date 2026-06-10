import React, { useState, useEffect } from 'react';
import { Library, Upload, X, Search, FileText, Filter, FileSpreadsheet, Globe, PenTool, ExternalLink } from 'lucide-react';

interface LibraryItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  discipline: string | null;
  fileUrl: string | null;
  version: string;
  uploader: { name: string };
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  'Design Codes & Standards',
  'Technical Guidelines & Manuals',
  'Software & IT Guides',
  'Journals & Research',
  'Past Project Reports',
  'Standard Templates',
  'Legal Documents',
  'Financial Documents',
  'Certificates',
  'Company Profiles',
  'Insurance Documents'
];

const DISCIPLINES = [
  'Structural Engineering',
  'Highway & Transportation',
  'Water & Sanitation',
  'Electrical & Energy',
  'Project Management',
  'General / Corporate'
];

const LibraryModule: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);
  const [uploadDiscipline, setUploadDiscipline] = useState(DISCIPLINES[5]);
  const [uploadVersion, setUploadVersion] = useState('1.0');
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/library?';
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (filterCategory) url += `category=${encodeURIComponent(filterCategory)}&`;
      if (filterDiscipline) url += `discipline=${encodeURIComponent(filterDiscipline)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch library items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchQuery, filterCategory, filterDiscipline]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadCategory) {
      setErrorMsg('Title and Category are required.');
      return;
    }

    setUploading(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('category', uploadCategory);
      formData.append('discipline', uploadDiscipline);
      formData.append('version', uploadVersion);
      if (uploadFileUrl) formData.append('fileUrl', uploadFileUrl);
      if (uploadFile) formData.append('file', uploadFile);

      const response = await fetch('/api/library', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setIsUploadModalOpen(false);
        // Reset form
        setUploadTitle('');
        setUploadDescription('');
        setUploadVersion('1.0');
        setUploadFileUrl('');
        setUploadFile(null);
        fetchItems();
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

  const getCategoryIcon = (category: string) => {
    if (category.includes('Codes')) return <Globe size={24} color="#2563eb" />;
    if (category.includes('Guidelines')) return <Library size={24} color="#9333ea" />;
    if (category.includes('Software')) return <Filter size={24} color="#0891b2" />;
    if (category.includes('Journals')) return <FileText size={24} color="#dc2626" />;
    if (category.includes('Templates')) return <FileSpreadsheet size={24} color="#16a34a" />;
    return <PenTool size={24} color="#475569" />;
  };

  return (
    <div className="layout-container" style={{ padding: '2rem 0' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Corporate Library</h1>
          <p className="text-gray-500 text-sm mt-1">Single source of truth for PROME Engineering resources, standards, and manuals.</p>
        </div>
        
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Upload size={18} /> Add to Library
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by title, description or tags..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg outline-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select 
          value={filterDiscipline} 
          onChange={(e) => setFilterDiscipline(e.target.value)}
          className="w-full md:w-56 px-3 py-2 border border-gray-300 rounded-lg outline-none"
        >
          <option value="">All Disciplines</option>
          {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
      ) : items.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
          <Library size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No items found</h3>
          <p className="text-gray-500">Try adjusting your filters or upload a new document to the library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 leading-tight mb-1">{item.title}</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium">{item.category}</span>
                    {item.discipline && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.discipline}</span>}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-3">
                {item.description || "No description provided."}
              </p>
              
              <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-auto">
                <div className="text-xs text-gray-500">
                  <p>Uploaded by: <span className="font-semibold text-gray-700">{item.uploader?.name}</span></p>
                  <p>Version: {item.version} • {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                {item.fileUrl && (
                  <a 
                    href={item.fileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    View <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="font-bold text-lg text-gray-800">Add to Corporate Library</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 overflow-y-auto">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {errorMsg}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input 
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select 
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                      required
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
                    <select 
                      value={uploadDiscipline}
                      onChange={(e) => setUploadDiscipline(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                    >
                      {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                    <input 
                      type="text"
                      value={uploadVersion}
                      onChange={(e) => setUploadVersion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF Document</label>
                  <input 
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-medium">Or</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">External File URL / Google Drive Link</label>
                  <input 
                    type="url"
                    value={uploadFileUrl}
                    onChange={(e) => setUploadFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Provide a link to the document hosted on PROME Drive or SharePoint if it's too large to upload.</p>
                </div>

              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-4">
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
                  {uploading ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryModule;
