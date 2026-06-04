import re

with open('src/pages/ManualsDirectory.tsx', 'r') as f:
    content = f.read()

# Add Globe to imports if missing
if 'Globe' not in content:
    content = content.replace('import { Book, FileText, Upload, X, Eye, Edit3 }', 'import { Book, FileText, Upload, X, Eye, Edit3, Globe, PenTool, Library }')

# Remove the manual PenTool and Library from the bottom since we'll import them from lucide-react
content = re.sub(r'const PenTool = .*?;\n', '', content, flags=re.DOTALL)
content = re.sub(r'const Library = .*?;\n', '', content, flags=re.DOTALL)

# Refactor renderExternalCard
new_render_external = """
  const renderExternalCard = (m: Manual, Icon: any, colorCode: string, themeColorClass: string) => (
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
  );
"""
content = re.sub(r'const renderExternalCard = \(m: Manual\) => \(.*?\);', new_render_external.strip(), content, flags=re.DOTALL)


# Refactor PROME Manuals card
prome_card_regex = r'<div key=\{doc\.id\} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" style=\{\{ borderTop: \'4px solid #dc2626\' \}\}>.*?</div>\s*</div>\s*\)\)}'
new_prome_card = """
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
                          onClick={() => navigate(`/iso-documents/${doc.id}/edit`)}
                          className="flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm transition-colors"
                          title="Edit Native Doc"
                        >
                          <Edit3 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
"""
content = re.sub(prome_card_regex, new_prome_card.strip(), content, flags=re.DOTALL)


# Fix section headers and usage of renderExternalCard
# PROME Manuals section
content = content.replace(
    '<FileText className="text-red-600" size={24} />\n              <h2 className="text-xl font-bold text-gray-800">PROME Manuals</h2>',
    '<div style={{ width: \'40px\', height: \'40px\', borderRadius: \'50%\', background: \'linear-gradient(145deg, #ffffff, #e6e6e6)\', boxShadow: \'2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)\', display: \'flex\', justifyContent: \'center\', alignItems: \'center\', border: \'1px solid rgba(255,255,255,0.5)\' }}><FileText size={20} color="#cc0000" strokeWidth={2} /></div>\n              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight" style={{ color: \'#cc0000\' }}>PROME Manuals</h2>'
)

# International Standards
content = content.replace(
    '<Book className="text-blue-600" size={24} />\n              <h2 className="text-xl font-bold text-gray-800">International Standards</h2>',
    '<div style={{ width: \'40px\', height: \'40px\', borderRadius: \'50%\', background: \'linear-gradient(145deg, #ffffff, #e6e6e6)\', boxShadow: \'2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)\', display: \'flex\', justifyContent: \'center\', alignItems: \'center\', border: \'1px solid rgba(255,255,255,0.5)\' }}><Globe size={20} color="#2563eb" strokeWidth={2} /></div>\n              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: \'#2563eb\' }}>International Standards</h2>'
)
content = content.replace('{intlStandards.map(renderExternalCard)}', '{intlStandards.map(m => renderExternalCard(m, Globe, "#2563eb", "text-blue-600"))}')

# Design Manuals
content = content.replace(
    '<PenTool className="text-green-600" size={24} />\n              <h2 className="text-xl font-bold text-gray-800">Design Manuals</h2>',
    '<div style={{ width: \'40px\', height: \'40px\', borderRadius: \'50%\', background: \'linear-gradient(145deg, #ffffff, #e6e6e6)\', boxShadow: \'2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)\', display: \'flex\', justifyContent: \'center\', alignItems: \'center\', border: \'1px solid rgba(255,255,255,0.5)\' }}><PenTool size={20} color="#16a34a" strokeWidth={2} /></div>\n              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: \'#16a34a\' }}>Design Manuals</h2>'
)
content = content.replace('{designManuals.map(renderExternalCard)}', '{designManuals.map(m => renderExternalCard(m, PenTool, "#16a34a", "text-green-600"))}')

# Reference Documents
content = content.replace(
    '<Library className="text-purple-600" size={24} />\n              <h2 className="text-xl font-bold text-gray-800">Reference Documents</h2>',
    '<div style={{ width: \'40px\', height: \'40px\', borderRadius: \'50%\', background: \'linear-gradient(145deg, #ffffff, #e6e6e6)\', boxShadow: \'2px 2px 5px rgba(0,0,0,0.05), -2px -2px 5px rgba(255,255,255,0.8)\', display: \'flex\', justifyContent: \'center\', alignItems: \'center\', border: \'1px solid rgba(255,255,255,0.5)\' }}><Library size={20} color="#9333ea" strokeWidth={2} /></div>\n              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: \'#9333ea\' }}>Reference Documents</h2>'
)
content = content.replace('{refDocs.map(renderExternalCard)}', '{refDocs.map(m => renderExternalCard(m, Library, "#9333ea", "text-purple-600"))}')

# Top Title
content = content.replace(
    '<h1 className="text-2xl font-bold text-gray-900">Corporate Manuals</h1>',
    '<h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Corporate Manuals</h1>'
)

with open('src/pages/ManualsDirectory.tsx', 'w') as f:
    f.write(content)

