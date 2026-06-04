import re

with open("src/pages/ManualsDirectory.tsx", "r") as f:
    content = f.read()

# Replace the PROME Manuals grid
old_prome_grid = """<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {promeManuals.map(doc => (
                  <div key={doc.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between" style={{ borderTop: '4px solid #cc0000' }}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                          <FileText size={28} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-md tracking-wider">{doc.documentNumber}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            doc.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-700' :
                            doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 line-clamp-2 text-lg tracking-tight" title={doc.title}>{doc.title}</h4>
                      <p className="text-sm text-gray-500 mb-6 font-medium">
                        {doc.author?.name} • {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate(`/iso-documents/${doc.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
                      >
                        <Eye size={18} /> View
                      </button>
                      {(doc.status === 'DRAFT' || doc.status === 'REJECTED') && user?.role?.name === 'Administrator' && (
                         <button 
                          onClick={() => navigate(`/iso-documents/edit/${doc.id}`)}
                          className="flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm transition-colors"
                          title="Edit Native Doc"
                        >
                          <Edit3 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>"""

new_prome_grid = """<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">
                {promeManuals.map(doc => (
                  <div 
                    key={doc.id} 
                    onClick={() => navigate(`/iso-documents/${doc.id}`)}
                    className="flex flex-col items-center gap-3 cursor-pointer group"
                    title={`${doc.documentNumber} - ${doc.title}\nStatus: ${doc.status}`}
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
              </div>"""

content = content.replace(old_prome_grid, new_prome_grid)

# Replace the External Manuals rendering function
old_render_fn = """  const renderExternalCard = (m: Manual, Icon: any, colorCode: string, themeColorClass: string) => (
    <div key={m.id} className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between`} style={{ borderTop: `4px solid ${colorCode}` }}>
      <div>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
          <Icon size={28} color={colorCode} strokeWidth={2} style={{ filter: `drop-shadow(1px 2px 2px ${colorCode}4D)` }} />
        </div>
        <h4 className="font-bold text-gray-900 mb-2 line-clamp-2 text-lg tracking-tight" title={m.title}>{m.title}</h4>
        <p className="text-sm text-gray-500 mb-6 font-medium">
          By {m.uploadedBy?.name} • {new Date(m.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <a 
        href={m.fileUrl} 
        target="_blank" 
        rel="noreferrer"
        className={`w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-800 py-2.5 rounded-xl text-sm font-bold transition-colors`}
      >
        <Eye size={18} className={themeColorClass} /> View PDF
      </a>
    </div>
  );"""

new_render_fn = """  const renderExternalIcon = (m: Manual, Icon: any, colorCode: string, themeColorClass: string) => (
    <a 
      key={m.id} 
      href={m.fileUrl} 
      target="_blank" 
      rel="noreferrer"
      className="flex flex-col items-center gap-3 group text-decoration-none"
      title={`${m.title}\nUploaded by: ${m.uploadedBy?.name}`}
    >
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }} className="group-hover:scale-110 group-hover:shadow-lg">
        <Icon size={32} color={colorCode} strokeWidth={2} style={{ filter: `drop-shadow(1px 2px 2px ${colorCode}4D)` }} />
      </div>
      <span className="text-xs font-semibold text-gray-800 text-center line-clamp-2 leading-tight px-1 transition-colors" style={{ '--tw-hover-text-opacity': '1', ':hover': { color: colorCode } } as any}>
        {m.title}
      </span>
    </a>
  );"""

content = content.replace(old_render_fn, new_render_fn)

# Replace the grids for Intl Standards, Design Manuals, Reference Docs
content = content.replace(
    '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n                {intlStandards.map(m => renderExternalCard(m, Globe, "#2563eb", "text-blue-600"))}\n              </div>',
    '<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">\n                {intlStandards.map(m => renderExternalIcon(m, Globe, "#2563eb", "text-blue-600"))}\n              </div>'
)

content = content.replace(
    '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n                {designManuals.map(m => renderExternalCard(m, PenTool, "#16a34a", "text-green-600"))}\n              </div>',
    '<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">\n                {designManuals.map(m => renderExternalIcon(m, PenTool, "#16a34a", "text-green-600"))}\n              </div>'
)

content = content.replace(
    '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n                {refDocs.map(m => renderExternalCard(m, Library, "#9333ea", "text-purple-600"))}\n              </div>',
    '<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4">\n                {refDocs.map(m => renderExternalIcon(m, Library, "#9333ea", "text-purple-600"))}\n              </div>'
)

with open("src/pages/ManualsDirectory.tsx", "w") as f:
    f.write(content)
