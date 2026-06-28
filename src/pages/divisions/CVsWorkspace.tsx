import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutTemplate, Type, Save, Download, Trash2, ArrowLeft, GripVertical, Square, Circle } from 'lucide-react';
import { DrawingCanvas } from '../../components/book-of-drawings/DrawingCanvas';
import * as fabric from 'fabric';
import jsPDF from 'jspdf';
import { useAuth } from '../../contexts/AuthContext';
import { Reorder } from 'framer-motion';

export interface Overlay {
  id: string;
  type: 'pageName' | 'sectionShortName' | 'pageNumber' | 'text' | 'image' | 'rect' | 'circle' | 'line';
  label: string;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  textFill: string;
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
  maxRows?: number;
}

export const PAPER_SIZES = {
  A4: { width: 210, height: 297 }, // Portrait by default for CVs
  A3: { width: 297, height: 420 }
};

const DEFAULT_SECTIONS = [
  "Page Layout", "Cover Page", "Personal Profile", "Key Qualifications", 
  "Education & Training", "Professional Experience", 
  "Key Project Experience", "Languages", "References", "Final CV Document"
];

export default function CVsWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, hasPermission } = useAuth();
  
  if (!hasPermission('cvs')) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>You do not have permission to access the CVs module. Please contact your administrator.</p>
      </div>
    );
  }

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [sectionsOrder, setSectionsOrder] = useState<string[]>(DEFAULT_SECTIONS);
  const [finalBookSections, setFinalBookSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string>("Final CV Document");
  const [activePageId, setActivePageId] = useState<number | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  
  const [paperSize] = useState<keyof typeof PAPER_SIZES>('A4');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState<string>('');
  const [globalZoomMultiplier, setGlobalZoomMultiplier] = useState(1);
  const [isPanMode] = useState(false);
  const [isInternalFocus, setIsInternalFocus] = useState(false);
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const isOuterDraggingRef = useRef(false);

  const centerCanvas = () => {
    if (outerWrapperRef.current) {
      const wrapper = outerWrapperRef.current;
      wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2;
      wrapper.scrollTop = (wrapper.scrollHeight - wrapper.clientHeight) / 2;
    }
  };

  const fitCanvasToScreen = () => {
    if (outerWrapperRef.current) {
      const wrapper = outerWrapperRef.current;
      const paperDimensions = PAPER_SIZES[paperSize as keyof typeof PAPER_SIZES];
      if (paperDimensions) {
        const scaleX = (wrapper.clientWidth * 0.9) / paperDimensions.width;
        const scaleY = (wrapper.clientHeight * 0.9) / paperDimensions.height;
        const fitScale = Math.min(scaleX, scaleY, 1.5);
        setGlobalZoomMultiplier(fitScale);
      }
    }
  };

  useEffect(() => {
    if (activeSection !== 'Final CV Document' && isCanvasOpen) {
      const timer = setTimeout(() => {
        fitCanvasToScreen();
        requestAnimationFrame(() => {
          centerCanvas();
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSection, isCanvasOpen, paperSize]);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (project && activeSection === 'Page Layout') {
      const pageLayoutPages = project.pages.filter((p: any) => p.section === 'Page Layout');
      if (pageLayoutPages.length > 0) {
        if (activePageId !== pageLayoutPages[0].id) {
          setActivePageId(pageLayoutPages[0].id);
          setIsCanvasOpen(true);
        }
      } else {
        fetch(`/api/cvs/${id}/pages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ section: 'Page Layout', name: 'Master Frame' })
        })
          .then(res => res.json())
          .then(newPage => {
            fetchProject();
            setActivePageId(newPage.id);
            setIsCanvasOpen(true);
          })
          .catch(err => console.error('Error creating Page Layout page:', err));
      }
    }
  }, [activeSection, project, id, token]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cvs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 403) alert('Forbidden access.');
        if (res.status === 404) alert('Project not found.');
        navigate('/cvs');
        return;
      }
      const data = await res.json();
      setProject(data);
      if (data.sectionsOrder && Array.isArray(data.sectionsOrder) && data.sectionsOrder.length > 0) {
        setSectionsOrder(data.sectionsOrder);
      }
      if (data.finalBookSections && Array.isArray(data.finalBookSections)) {
        setFinalBookSections(data.finalBookSections);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load CV workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canvas || !activePageId || !project || !isCanvasOpen) return;
    
    const page = project.pages.find((p: any) => p.id === activePageId);
    if (page && page.canvasState) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      try {
        const state = typeof page.canvasState === 'string' ? JSON.parse(page.canvasState) : page.canvasState;
        let fabricState = state;
        let loadedOverlays: Overlay[] = [];
        
        if (state && state.fabricState) {
          fabricState = state.fabricState;
          loadedOverlays = state.overlays || [];
        }

        canvas.loadFromJSON(fabricState).then(() => {
          const objectsToRemove: any[] = [];
          canvas.getObjects().forEach(obj => {
            if ((obj as any).placeholderType) {
              const rectObj = obj as any;
              loadedOverlays.push({
                id: Math.random().toString(36).substring(2, 9),
                type: rectObj.placeholderType,
                label: rectObj.label || '',
                x: rectObj.left || 0,
                y: rectObj.top || 0,
                width: rectObj.width * (rectObj.scaleX || 1),
                height: rectObj.height * (rectObj.scaleY || 1),
                fontSize: rectObj.fontSize || 14,
                fontFamily: rectObj.fontFamily || 'Arial',
                textFill: rectObj.textFill || '#000000'
              });
              objectsToRemove.push(obj);
            }
          });
          
          if (objectsToRemove.length > 0) {
            objectsToRemove.forEach(obj => canvas.remove(obj));
          }
          
          setOverlays(loadedOverlays);
          canvas.renderAll();
        });
      } catch (e) {
        console.error("Failed to load canvas state", e);
      }
    } else {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      setOverlays([]);
    }
  }, [activePageId, canvas, project, isCanvasOpen]);

  const handleReorderSections = async (newOrder: string[]) => {
    setSectionsOrder(newOrder);
    try {
      await fetch(`/api/cvs/${id}/sections/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sectionsOrder: newOrder })
      });
    } catch(e) { console.error(e); }
  };

  const handleReorderPages = async (reorderedPages: any[]) => {
    const newPages = project.pages.map((p: any) => {
      if (p.section === activeSection) {
        const newIndex = reorderedPages.findIndex((rp: any) => rp.id === p.id);
        if (newIndex !== -1) {
          return { ...p, pageNumber: newIndex + 1 };
        }
      }
      return p;
    });

    setProject((prev: any) => ({ ...prev, pages: newPages }));
    
    try {
      const pageIds = reorderedPages.map((p: any) => p.id);
      await fetch(`/api/cvs/${id}/pages/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pageIds })
      });
    } catch(e) { console.error(e); }
  };

  const handleReorderFinalBookSections = async (newOrder: string[]) => {
    setFinalBookSections(newOrder);
    try {
      await fetch(`/api/cvs/${id}/finalBookSectionsOrder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ finalBookSections: newOrder })
      });
    } catch(e) { console.error(e); }
  };

  const saveCanvas = async () => {
    if (!canvas || !activePageId) return;
    
    const jsonStateObj = (canvas as any).toJSON();
    const finalPayload = {
      fabricState: jsonStateObj,
      overlays: overlays
    };
    
    const jsonState = JSON.stringify(finalPayload);
    try {
      const res = await fetch(`/api/cvs/${id}/pages/${activePageId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ canvasState: jsonState })
      });
      if (res.ok) {
        setProject((prev: any) => ({
          ...prev,
          pages: prev.pages.map((p: any) => p.id === activePageId ? { ...p, canvasState: jsonState } : p)
        }));
        alert('Canvas state saved successfully!');
      } else {
        alert('Failed to save canvas.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving canvas');
    }
  };

  const exportCurrentPagePDF = () => {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 1, multiplier: 1 });
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperSize.toLowerCase()
    });
    const dim = PAPER_SIZES[paperSize];
    pdf.addImage(dataUrl, 'JPEG', 0, 0, dim.width, dim.height);
    pdf.save(`${project?.name || 'CV'} - ${activeSection} - Page.pdf`);
  };

  const compileFinalPDF = async () => {
    if (!project) return;
    
    const pagesToCompile: any[] = [];
    for (const sec of finalBookSections) {
      if (sec === 'Page Layout') continue;
      const secPages = project.pages.filter((p: any) => p.section === sec && p.includeInFinal);
      secPages.sort((a: any, b: any) => a.pageNumber - b.pageNumber);
      pagesToCompile.push(...secPages);
    }

    if (pagesToCompile.length === 0) {
      alert("No pages are selected for the final CV document.");
      return;
    }

    setIsCompiling(true);
    setCompileProgress('Initializing compilation...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: paperSize.toLowerCase()
      });
      const dim = PAPER_SIZES[paperSize];
      
      const layoutPage = project.pages.find((p: any) => p.section === 'Page Layout');
      let layoutStateRaw = layoutPage?.canvasState ? (typeof layoutPage.canvasState === 'string' ? JSON.parse(layoutPage.canvasState) : layoutPage.canvasState) : null;
      
      let layoutFabricState = null;
      let layoutOverlays: Overlay[] = [];
      
      if (layoutStateRaw) {
        if (layoutStateRaw.fabricState) {
          layoutFabricState = layoutStateRaw.fabricState;
          layoutOverlays = layoutStateRaw.overlays || [];
        } else {
          layoutFabricState = layoutStateRaw;
        }
      }

      const renderToDataURL = async (stateObj: any, transparent: boolean = false): Promise<string> => {
        if (!stateObj) return '';
        
        const canvasEl = document.createElement('canvas');
        canvasEl.width = dim.width;
        canvasEl.height = dim.height;
        
        const tempCanvas = new fabric.Canvas(canvasEl, {
          width: dim.width,
          height: dim.height,
          backgroundColor: transparent ? undefined : '#ffffff'
        });
        
        await tempCanvas.loadFromJSON(stateObj);
        tempCanvas.renderAll();
        
        const data = tempCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
        tempCanvas.dispose();
        return data;
      };

      let layoutDataUrl = '';
      if (layoutFabricState) {
        layoutDataUrl = await renderToDataURL(layoutFabricState, true);
      }

      for (let i = 0; i < pagesToCompile.length; i++) {
        const page = pagesToCompile[i];
        setCompileProgress(`Processing page ${i + 1} of ${pagesToCompile.length}...`);
        
        if (i > 0) {
          pdf.addPage(paperSize.toLowerCase(), 'portrait');
        }

        let stateRaw = page.canvasState ? (typeof page.canvasState === 'string' ? JSON.parse(page.canvasState) : page.canvasState) : null;
        let pageFabricState = null;
        let pageOverlays: Overlay[] = [];

        if (stateRaw) {
          if (stateRaw.fabricState) {
            pageFabricState = stateRaw.fabricState;
            pageOverlays = stateRaw.overlays || [];
          } else {
            pageFabricState = stateRaw;
          }
        }

        if (pageFabricState) {
          const pageDataUrl = await renderToDataURL(pageFabricState, false);
          pdf.addImage(pageDataUrl, 'PNG', 0, 0, dim.width, dim.height);
        }

        if (page.applyFrame && layoutDataUrl) {
          pdf.addImage(layoutDataUrl, 'PNG', 0, 0, dim.width, dim.height);
        }

        const resolvePlaceholderText = (overlay: Overlay, pageNum: number, _totalPages: number): string => {
          if (overlay.type === 'pageName') return page.name || 'Unnamed Page';
          if (overlay.type === 'sectionShortName') {
            const shortNames = project?.sectionShortNames ? (typeof project.sectionShortNames === 'string' ? JSON.parse(project.sectionShortNames) : project.sectionShortNames) : {};
            return shortNames[page.section] || page.section;
          }
          if (overlay.type === 'pageNumber') return `${pageNum}`;
          return overlay.label || '';
        };

        const activeOverlays = page.applyFrame ? [...layoutOverlays, ...pageOverlays] : pageOverlays;

        activeOverlays.forEach(overlay => {
          if (overlay.type === 'image' && overlay.src) {
            pdf.addImage(overlay.src, 'PNG', overlay.x, overlay.y, overlay.width, overlay.height);
          } else if (overlay.type === 'text' || overlay.type === 'pageName' || overlay.type === 'sectionShortName' || overlay.type === 'pageNumber') {
            const txt = resolvePlaceholderText(overlay, i + 1, pagesToCompile.length);
            pdf.setFontSize(overlay.fontSize * 0.75); // Convert px to pt approx
            pdf.setTextColor(overlay.textFill || '#000000');
            pdf.text(txt, overlay.x, overlay.y + (overlay.height / 2));
          } else if (overlay.type === 'rect') {
            pdf.setLineWidth(overlay.strokeWidth ?? 1);
            pdf.setDrawColor(overlay.strokeColor || '#000000');
            if (overlay.fillColor) {
              pdf.setFillColor(overlay.fillColor);
              pdf.rect(overlay.x, overlay.y, overlay.width, overlay.height, 'FD');
            } else {
              pdf.rect(overlay.x, overlay.y, overlay.width, overlay.height, 'D');
            }
          }
        });
      }

      pdf.save(`${project?.name || 'CV'}_compiled.pdf`);
      setCompileProgress('Done!');
      setTimeout(() => setIsCompiling(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Compilation failed');
      setIsCompiling(false);
    }
  };

  const addTextOverlay = () => {
    if (!canvas) return;
    const newOverlay: Overlay = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'text',
      label: 'Double click to edit text',
      x: 50,
      y: 50,
      width: 100,
      height: 30,
      fontSize: 14,
      fontFamily: 'Arial',
      textFill: '#000000'
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const addShapeOverlay = (type: 'rect' | 'circle') => {
    if (!canvas) return;
    const newOverlay: Overlay = {
      id: Math.random().toString(36).substring(2, 9),
      type: type,
      label: '',
      x: 50,
      y: 50,
      width: 80,
      height: 80,
      fontSize: 14,
      fontFamily: 'Arial',
      textFill: '#000000',
      strokeWidth: 2,
      strokeColor: '#0f766e',
      fillColor: 'transparent'
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading CV workspace...</div>;
  }

  const activePages = project?.pages.filter((p: any) => p.section === activeSection) || [];
  activePages.sort((a: any, b: any) => a.pageNumber - b.pageNumber);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
      
      {/* Sidebar - CV Sections */}
      <div style={{ width: '280px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/cvs')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>CV Workspace</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{project?.name}</p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', paddingLeft: '0.5rem', marginBottom: '0.5rem' }}>CV Sections</h3>
          <Reorder.Group axis="y" values={sectionsOrder} onReorder={handleReorderSections}>
            {sectionsOrder.map((section) => (
              <Reorder.Item 
                key={section} 
                value={section}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: activeSection === section ? '#eff6ff' : 'transparent',
                  color: activeSection === section ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: activeSection === section ? 600 : 500,
                  marginBottom: '2px'
                }}
                onClick={() => {
                  setActiveSection(section);
                  if (section === 'Final CV Document') {
                    setIsCanvasOpen(false);
                    setActivePageId(null);
                  } else {
                    const pages = project?.pages.filter((p: any) => p.section === section) || [];
                    if (pages.length > 0) {
                      setActivePageId(pages[0].id);
                      setIsCanvasOpen(true);
                    } else {
                      setIsCanvasOpen(false);
                      setActivePageId(null);
                    }
                  }
                }}
              >
                <GripVertical size={14} color="#cbd5e1" style={{ cursor: 'grab' }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{section}</span>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      </div>

      {/* Pages Workspace Panel */}
      {activeSection !== 'Final CV Document' && (
        <div style={{ width: '240px', backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', margin: 0 }}>Section Pages</h3>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              onClick={async () => {
                try {
                  const res = await fetch(`/api/cvs/${id}/pages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ section: activeSection, name: `Page ${activePages.length + 1}` })
                  });
                  if (res.ok) {
                    const newPage = await res.json();
                    setProject((prev: any) => ({ ...prev, pages: [...prev.pages, newPage] }));
                    setActivePageId(newPage.id);
                    setIsCanvasOpen(true);
                  }
                } catch(e) { console.error(e); }
              }}
            >
              Add Page
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {activePages.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No pages in this section yet. Click Add Page above.</div>
            ) : (
              <Reorder.Group axis="y" values={activePages} onReorder={handleReorderPages}>
                {activePages.map((page: any) => (
                  <Reorder.Item 
                    key={page.id} 
                    value={page}
                    style={{ 
                      padding: '0.6rem 0.75rem',
                      backgroundColor: activePageId === page.id ? '#ffffff' : 'transparent',
                      borderRadius: '6px',
                      border: activePageId === page.id ? '1px solid #cbd5e1' : '1px solid transparent',
                      boxShadow: activePageId === page.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: '4px'
                    }}
                    onClick={() => {
                      setActivePageId(page.id);
                      setIsCanvasOpen(true);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '80%' }}>
                      <GripVertical size={14} color="#cbd5e1" style={{ cursor: 'grab', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.name}</span>
                    </div>
                    {activePages.length > 1 && (
                      <button 
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this page?")) {
                            try {
                              const res = await fetch(`/api/cvs/${id}/pages/${page.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (res.ok) {
                                setProject((prev: any) => ({ ...prev, pages: prev.pages.filter((p: any) => p.id !== page.id) }));
                                if (activePageId === page.id) {
                                  const remaining = activePages.filter((p: any) => p.id !== page.id);
                                  if (remaining.length > 0) setActivePageId(remaining[0].id);
                                  else setIsCanvasOpen(false);
                                }
                              }
                            } catch(err) { console.error(err); }
                          }
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>
      )}

      {/* Main Canvas Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {activeSection === 'Final CV Document' ? (
          <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <LayoutTemplate size={48} color="#0f766e" style={{ margin: '0 auto 1.5rem auto' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Compile Final CV Document</h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Compile all sections and pages of this profile into a single, standardized, high-quality PDF CV.</p>
              
              <div style={{ textAlign: 'left', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Included Sections:</h4>
                {sectionsOrder.filter(s => s !== 'Page Layout' && s !== 'Final CV Document').map((s) => {
                  const pagesCount = project?.pages.filter((p: any) => p.section === s && p.includeInFinal).length || 0;
                  const isIncluded = finalBookSections.includes(s);
                  return (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(e) => {
                          let newOrder = [...finalBookSections];
                          if (e.target.checked) {
                            if (!newOrder.includes(s)) newOrder.push(s);
                          } else {
                            newOrder = newOrder.filter(item => item !== s);
                          }
                          handleReorderFinalBookSections(newOrder);
                        }}
                      />
                      <span style={{ color: '#334155' }}>{s} ({pagesCount} {pagesCount === 1 ? 'page' : 'pages'})</span>
                    </label>
                  );
                })}
              </div>

              {isCompiling ? (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ fontWeight: 500, color: '#0f766e', marginBottom: '0.5rem' }}>{compileProgress}</div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '60%', backgroundColor: '#0f766e', borderRadius: '2px', animation: 'pulse 1.5s infinite' }}></div>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={compileFinalPDF}>
                  Compile & Export PDF
                </button>
              )}
            </div>
          </div>
        ) : isCanvasOpen && activePageId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Toolbar */}
            <div style={{ height: '52px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={addTextOverlay} title="Add Text Block">
                  <Type size={16} /> Text
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => addShapeOverlay('rect')} title="Add Border / Rectangle">
                  <Square size={16} /> Rect
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => addShapeOverlay('circle')} title="Add Circle">
                  <Circle size={16} /> Circle
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={exportCurrentPagePDF} title="Download Current Page PDF">
                  <Download size={16} /> Export Page
                </button>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={saveCanvas}>
                  <Save size={16} /> Save Canvas
                </button>
              </div>
            </div>

            {/* Design Area */}
            <div 
              ref={outerWrapperRef}
              style={{ 
                flex: 1, 
                position: 'relative', 
                overflow: 'auto', 
                padding: '2rem',
                cursor: isPanMode ? (isOuterDraggingRef.current ? 'grabbing' : 'grab') : 'default'
              }}
            >
              <DrawingCanvas 
                paperSize={PAPER_SIZES[paperSize]}
                canvasRefCallback={setCanvas}
                globalZoomMultiplier={globalZoomMultiplier}
                isPanMode={isPanMode}
                isInternalFocus={isInternalFocus}
                onFocusCanvas={() => setIsInternalFocus(true)}
                overlays={overlays}
                onOverlaysChange={setOverlays}
                selectedOverlayId={selectedOverlayId}
                onOverlaySelect={setSelectedOverlayId}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Select or add a page to start designing.
          </div>
        )}
      </div>
    </div>
  );
}
