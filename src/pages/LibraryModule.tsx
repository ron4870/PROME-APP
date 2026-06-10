import React, { useState, useEffect } from 'react';
import { Library, Upload, X, Search, FileText, Filter, FileSpreadsheet, Globe, PenTool, ExternalLink, Scale, Landmark, Award, Building2, ShieldCheck } from 'lucide-react';

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

  const getCategoryIcon = (category: string, size = 24) => {
    if (category.includes('Codes')) return <Globe size={size} color="#2563eb" strokeWidth={1.5} />;
    if (category.includes('Guidelines')) return <Library size={size} color="#9333ea" strokeWidth={1.5} />;
    if (category.includes('Software')) return <Filter size={size} color="#0891b2" strokeWidth={1.5} />;
    if (category.includes('Journals')) return <FileText size={size} color="#dc2626" strokeWidth={1.5} />;
    if (category.includes('Templates')) return <FileSpreadsheet size={size} color="#16a34a" strokeWidth={1.5} />;
    if (category.includes('Legal')) return <Scale size={size} color="#b45309" strokeWidth={1.5} />;
    if (category.includes('Financial')) return <Landmark size={size} color="#15803d" strokeWidth={1.5} />;
    if (category.includes('Certificates')) return <Award size={size} color="#eab308" strokeWidth={1.5} />;
    if (category.includes('Company Profiles')) return <Building2 size={size} color="#1d4ed8" strokeWidth={1.5} />;
    if (category.includes('Insurance')) return <ShieldCheck size={size} color="#be185d" strokeWidth={1.5} />;
    return <PenTool size={size} color="#475569" strokeWidth={1.5} />;
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

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-red-50 to-white p-10 rounded-2xl border border-red-100 shadow-sm mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Library size={200} /></div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4 relative z-10">Find what you need, instantly.</h2>
        
        {/* Large Prominent Search */}
        <div className="max-w-2xl mx-auto relative z-10 mb-6">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-4 text-gray-400" size={24} />
            <input 
              type="text" 
              placeholder="Search library documents by title, tags or description..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 text-lg border-2 border-red-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 shadow-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 relative z-10">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg outline-none bg-white/80 backdrop-blur-sm shadow-sm"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={filterDiscipline} 
            onChange={(e) => setFilterDiscipline(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg outline-none bg-white/80 backdrop-blur-sm shadow-sm"
          >
            <option value="">All Disciplines</option>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
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
        <div className="space-y-12">
          {CATEGORIES.map(category => {
            const categoryItems = items.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;
            
            return (
              <section key={category}>
                <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-2">
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 shadow-sm">
                    {getCategoryIcon(category)}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">{category}</h2>
                </div>
                
                <div className="flex flex-wrap gap-6">
                  {categoryItems.map(item => (
                    <div key={item.id} className="group relative flex flex-col items-center justify-start p-3 rounded-xl hover:bg-gray-50 transition-colors w-28 text-center cursor-pointer">
                      <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:shadow-md transition-shadow mb-3 flex items-center justify-center">
                        {getCategoryIcon(item.category, 40)}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 leading-tight line-clamp-3 px-1 w-full">
                        {item.title}
                      </span>
                      
                      {/* Document Details Tooltip Popover - Appears after 1s delay */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-white p-5 rounded-xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all delay-1000 duration-300 z-50 text-left pointer-events-none group-hover:pointer-events-auto origin-bottom transform scale-95 group-hover:scale-100">
                        <div className="flex flex-col gap-1 mb-3">
                          <h3 className="font-bold text-gray-900 leading-tight">{item.title}</h3>
                          {item.discipline && <span className="text-[10px] uppercase font-bold tracking-wider text-red-600">{item.discipline}</span>}
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-4 line-clamp-4">
                          {item.description || "No description provided."}
                        </p>
                        
                        <div className="space-y-1 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 mb-3">
                          <p>Uploader: <span className="font-medium text-gray-800">{item.uploader?.name}</span></p>
                          <p>Version: <span className="font-medium text-gray-800">{item.version}</span></p>
                          <p>Date: <span className="font-medium text-gray-800">{new Date(item.createdAt).toLocaleDateString()}</span></p>
                        </div>

                        {item.fileUrl && (
                          <a 
                            href={item.fileUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Open Document <ExternalLink size={14} />
                          </a>
                        )}
                        
                        {/* Caret pointing down */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-white drop-shadow-md"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
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
