import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Type, Image as ImageIcon, FileType2, Save, Download, Trash2, FolderPlus, FileText, Settings, Copy, Plus } from 'lucide-react';
import { DrawingCanvas } from '../../components/book-of-drawings/DrawingCanvas';
import * as fabric from 'fabric';
import jsPDF from 'jspdf';

// ISO Standard Paper Sizes (Landscape orientation dimensions in mm)
const PAPER_SIZES = {
  A0: { width: 1189, height: 841 },
  A1: { width: 841, height: 594 }, // Default
  A2: { width: 594, height: 420 },
  A3: { width: 420, height: 297 },
  A4: { width: 297, height: 210 },
};

const DEFAULT_SECTIONS = [
  "Page Layout", "Cover Page", "General", "Typical Cross Sections & Pavement Details",
  "Setting-Out Data", "Detailed Plan and Profile", "Cross Sections", "Layout Drawings",
  "Junctions & Intersections", "Utility Services", "Drainage Details", "Structures Details",
  "Geotechnical Works", "Landscaping Works", "Traffic Accomodation", "Engineer's Facilities",
  "Road Signs & Marking", "Ancillary Works", "Final Book"
];

const BookOfDrawingsCreator: React.FC = () => {
  const [activeProject] = useState('Template Project');
  const [activeSection, setActiveSection] = useState('General');
  const [activePage, setActivePage] = useState('Page 1');
  const [paperSize, setPaperSize] = useState<keyof typeof PAPER_SIZES>('A1');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  
  // Scaffold state for project tree
  const [projectTree] = useState({
    name: 'Template Project',
    sections: DEFAULT_SECTIONS.map(name => ({
      name,
      pages: name === 'Page Layout' || name === 'Final Book' ? [] : ['Page 1']
    }))
  });

  // Load and Save Canvas State
  const getPageKey = () => `prome_bod_${activeProject}_${activeSection}_${activePage}`;

  useEffect(() => {
    if (!canvas) return;
    const saved = localStorage.getItem(getPageKey());
    if (saved) {
      canvas.loadFromJSON(saved, () => {
        canvas.renderAll();
      });
    } else {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
  }, [activePage, activeSection, canvas]);

  const saveCanvas = () => {
    if (!canvas) return;
    localStorage.setItem(getPageKey(), JSON.stringify(canvas.toJSON()));
    alert(`Saved ${activePage}`);
  };

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('Double click to edit', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const handleExportPDF = () => {
    // For now, exports only the current page to demonstrate capability
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 1, multiplier: 1 });
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: paperSize.toLowerCase()
    });
    const dim = PAPER_SIZES[paperSize];
    pdf.addImage(dataUrl, 'JPEG', 0, 0, dim.width, dim.height);
    pdf.save(`${activeProject} - ${activeSection} - ${activePage}.pdf`);
  };

  const handleDeleteObject = () => {
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-gray-50 overflow-hidden font-sans">
      
      {/* Left Sidebar: Project Explorer */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full shrink-0 shadow-sm z-10">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
            <LayoutTemplate size={16} className="text-red-600" />
            Project Explorer
          </h2>
          <button className="text-gray-400 hover:text-red-600 transition-colors">
            <Plus size={16} />
          </button>
        </div>
        
        <div className="p-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-red-700" />
            <span className="font-semibold text-sm text-red-900 truncate max-w-[150px]">{projectTree.name}</span>
          </div>
          <button title="Duplicate Project" className="p-1 hover:bg-red-200 rounded text-red-700">
            <Copy size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {projectTree.sections.map((section, sIdx) => (
            <div key={sIdx} className="mb-1">
              <div 
                onClick={() => setActiveSection(section.name)}
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${activeSection === section.name ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FolderPlus size={14} className={activeSection === section.name ? 'text-red-500' : 'text-gray-400'} />
                  <span className="truncate">{section.name}</span>
                </div>
                {section.name !== 'Page Layout' && section.name !== 'Final Book' && (
                  <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded text-gray-500">
                    <Plus size={12} />
                  </button>
                )}
              </div>
              
              {/* Pages under section */}
              {activeSection === section.name && section.pages.length > 0 && (
                <div className="pl-6 border-l border-gray-200 ml-3 mt-1 mb-2">
                  {section.pages.map((page, pIdx) => (
                    <div 
                      key={pIdx}
                      onClick={() => setActivePage(page)}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs transition-colors ${activePage === page ? 'bg-red-100 text-red-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <FileText size={12} className={activePage === page ? 'text-red-600' : 'text-gray-400'} />
                      <span>{page}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center Canvas Area */}
      <div className="flex-1 flex flex-col h-full bg-[#e5e7eb] relative overflow-hidden">
        
        {/* Top Toolbar */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-800 text-sm">
              {activeSection} {activeSection !== 'Page Layout' && activeSection !== 'Final Book' && `> ${activePage}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveCanvas} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 tooltip" title="Save Page">
              <Save size={18} />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors shadow-sm">
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div className="flex-1 overflow-auto relative p-8 flex items-center justify-center bg-gray-100">
          {(activeSection === 'Page Layout' || activeSection === 'Final Book') ? (
            <div className="text-center text-gray-500">
              <LayoutTemplate size={48} className="mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold">System Section</h2>
              <p className="mt-2 text-sm">Select a standard section to draw pages.</p>
            </div>
          ) : (
            <DrawingCanvas 
              paperSize={PAPER_SIZES[paperSize]} 
              canvasRefCallback={setCanvas}
              onSelectionCreated={setSelectedObject}
              onSelectionCleared={() => setSelectedObject(null)}
            />
          )}
        </div>
        
        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-4 left-4 flex bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <button className="px-3 py-1.5 hover:bg-gray-50 border-r border-gray-200 text-gray-600">-</button>
          <div className="px-3 py-1.5 text-sm font-medium text-gray-700 w-16 text-center">80%</div>
          <button className="px-3 py-1.5 hover:bg-gray-50 border-l border-gray-200 text-gray-600">+</button>
        </div>
      </div>

      {/* Right Sidebar: Properties & Tools */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full shrink-0 shadow-sm z-10">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
            <Settings size={16} className="text-gray-500" />
            Properties
          </h2>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          
          {/* Page Layout Settings (Visible when activeSection is Page Layout) */}
          {activeSection === 'Page Layout' ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Document Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
                <select 
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as keyof typeof PAPER_SIZES)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                >
                  {Object.keys(PAPER_SIZES).map(size => (
                    <option key={size} value={size}>{size} Landscape</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Applies to all pages.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tools */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add Elements</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={addText} className="flex flex-col items-center justify-center gap-2 p-3 border border-gray-200 rounded hover:border-red-500 hover:bg-red-50 transition-colors text-gray-700 group">
                    <Type size={20} className="group-hover:text-red-600 transition-colors" />
                    <span className="text-xs font-medium">Text</span>
                  </button>
                  <button onClick={() => alert("Drag and drop images directly onto the canvas.")} className="flex flex-col items-center justify-center gap-2 p-3 border border-gray-200 rounded hover:border-red-500 hover:bg-red-50 transition-colors text-gray-700 group">
                    <ImageIcon size={20} className="group-hover:text-red-600 transition-colors" />
                    <span className="text-xs font-medium">Image</span>
                  </button>
                  <button onClick={() => alert("DWG/DXF Backend Conversion in progress. For now, please export your CAD files to images or PDFs and drag them in.")} className="flex flex-col items-center justify-center gap-2 p-3 border border-gray-200 rounded hover:border-red-500 hover:bg-red-50 transition-colors text-gray-700 group col-span-2">
                    <FileType2 size={20} className="group-hover:text-red-600 transition-colors" />
                    <span className="text-xs font-medium">Upload CAD (.dwg/.dxf)</span>
                  </button>
                </div>
              </div>

              {/* Selection Properties */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Selection Properties</h3>
                {selectedObject ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                      <span className="font-medium text-gray-700 capitalize">{selectedObject.type}</span>
                      <button onClick={handleDeleteObject} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {selectedObject.type === 'i-text' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                        <input 
                          type="color" 
                          value={(selectedObject as any).fill || '#000000'}
                          onChange={(e) => {
                            selectedObject.set('fill', e.target.value);
                            canvas?.renderAll();
                          }}
                          className="w-full h-8 cursor-pointer rounded"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 border-dashed rounded text-center text-sm text-gray-500">
                    Select an object on the canvas to view its properties.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default BookOfDrawingsCreator;
