import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutTemplate, Type, Image as ImageIcon, FileType2, Save, Download, Trash2, FolderPlus, FileText, Plus, ArrowLeft, Building2, Calendar, GripVertical, ZoomIn, ZoomOut, Maximize, Edit2, Hand } from 'lucide-react';
import { DrawingCanvas } from '../../components/book-of-drawings/DrawingCanvas';
import * as fabric from 'fabric';
import jsPDF from 'jspdf';
import { useAuth } from '../../contexts/AuthContext';
import { Reorder } from 'framer-motion';

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

export default function BookOfDrawingsWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [sectionsOrder, setSectionsOrder] = useState<string[]>(DEFAULT_SECTIONS);
  const [finalBookSections, setFinalBookSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string>("Final Book");
  const [activePageId, setActivePageId] = useState<number | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  
  const [paperSize, setPaperSize] = useState<keyof typeof PAPER_SIZES>('A1');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [_selectionTick, setSelectionTick] = useState(0);
  
  const [isUploadingCad, setIsUploadingCad] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState<string>('');
  const [globalZoomMultiplier, setGlobalZoomMultiplier] = useState(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isInternalFocus, setIsInternalFocus] = useState(false);
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const isOuterDraggingRef = useRef(false);
  const lastOuterPosRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Calculate zoom to fit within the viewport with 10% padding
        const scaleX = (wrapper.clientWidth * 0.9) / paperDimensions.width;
        const scaleY = (wrapper.clientHeight * 0.9) / paperDimensions.height;
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1 by default
        setGlobalZoomMultiplier(fitScale);
      }
    }
  };

  // Auto-fit and center the canvas when a page is opened
  useEffect(() => {
    if (activeSection !== 'Final Book' && isCanvasOpen) {
      // Need a tiny delay for React to render the DOM and apply padding correctly
      const timer = setTimeout(() => {
        fitCanvasToScreen();
        // Call centerCanvas immediately after setting zoom, but we need another tick for layout to update scrollWidth
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
        // Create the single master page layout if it doesn't exist
        fetch(`/api/book-of-drawings/${id}/pages`, {
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
      const res = await fetch(`/api/book-of-drawings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 403) alert('Forbidden access.');
        if (res.status === 404) alert('Project not found.');
        navigate('/book-of-drawings');
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
      alert('Failed to load workspace.');
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
        canvas.loadFromJSON(state).then(() => {
          canvas.getObjects().forEach(obj => {
            if ((obj as any).placeholderType) {
              applyPlaceholderRenderOverride(obj);
            }
          });
          canvas.renderAll();
        });
      } catch (e) {
        console.error("Failed to load canvas state", e);
      }
    } else {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
  }, [activePageId, canvas, project, isCanvasOpen]);

  const handleReorderSections = async (newOrder: string[]) => {
    setSectionsOrder(newOrder);
    try {
      await fetch(`/api/book-of-drawings/${id}/sections/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sectionsOrder: newOrder })
      });
    } catch(e) { console.error(e); }
  };

  const handleReorderFinalBookSections = async (newOrder: string[]) => {
    setFinalBookSections(newOrder);
    try {
      await fetch(`/api/book-of-drawings/${id}/finalBookSectionsOrder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ finalBookSections: newOrder })
      });
    } catch(e) { console.error(e); }
  };

  const handleReorderPages = async (reorderedPages: any[]) => {
    // Optimistic update
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
      await fetch(`/api/book-of-drawings/${id}/pages/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pageIds })
      });
    } catch(e) { console.error(e); }
  };

  const saveCanvas = async () => {
    if (!canvas || !activePageId) return;
    
    const jsonStateObj = (canvas as any).toJSON(['placeholderType', 'maxRows', 'fontSize', 'fontFamily', 'textFill', 'label']);
    
    // Fabric 7 workaround: manually ensure custom properties are persisted
    if (jsonStateObj && jsonStateObj.objects) {
      jsonStateObj.objects.forEach((obj: any, i: number) => {
        const canvasObj = canvas.getObjects()[i];
        if (canvasObj && (canvasObj as any).placeholderType) {
          obj.placeholderType = (canvasObj as any).placeholderType;
          obj.maxRows = (canvasObj as any).maxRows;
          obj.fontSize = (canvasObj as any).fontSize;
          obj.fontFamily = (canvasObj as any).fontFamily;
          obj.textFill = (canvasObj as any).textFill;
          obj.label = (canvasObj as any).label;
        }
      });
    }

    const jsonState = JSON.stringify(jsonStateObj);
    try {
      const res = await fetch(`/api/book-of-drawings/${id}/pages/${activePageId}`, {
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
        alert(`Saved successfully`);
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save page to database.');
    }
  };

  const handleAddSection = async () => {
    const name = prompt('Enter new section name:');
    if (!name || name.trim() === '') return;
    if (sectionsOrder.includes(name)) {
      alert('Section already exists!');
      return;
    }
    
    // Insert new section before 'Final Book' if it exists, otherwise at the end
    const newOrder = [...sectionsOrder];
    const finalBookIndex = newOrder.indexOf('Final Book');
    if (finalBookIndex !== -1) {
      newOrder.splice(finalBookIndex, 0, name);
    } else {
      newOrder.push(name);
    }

    try {
      const res = await fetch(`/api/book-of-drawings/${id}/sections/order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sectionsOrder: newOrder })
      });
      if (res.ok) {
        setSectionsOrder(newOrder);
        setActiveSection(name);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add section');
    }
  };

  const handleAddPage = async () => {
    const pageName = prompt('Enter Page Name:');
    if (!pageName || pageName.trim() === '') return;

    try {
      const res = await fetch(`/api/book-of-drawings/${id}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ section: activeSection, name: pageName })
      });
      if (res.ok) {
        const newPage = await res.json();
        setProject((prev: any) => ({
          ...prev,
          pages: [...prev.pages, newPage]
        }));
      }
    } catch (err) {
      console.error('Failed to add page', err);
    }
  };

  const handleRenamePage = async (page: any) => {
    const newName = window.prompt("Enter new page name:", page.name);
    if (newName && newName !== page.name) {
      try {
        await fetch(`/api/book-of-drawings/${id}/pages/${page.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: newName })
        });
        fetchProject();
      } catch (e) {
        console.error(e);
      }
    }
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

  const applyPlaceholderRenderOverride = (obj: any) => {
    if (obj.placeholderType && !obj._originalRenderSaved) {
      obj._originalRenderSaved = obj._render.bind(obj);
      obj._render = function(ctx: CanvasRenderingContext2D) {
        this._originalRenderSaved(ctx);
        ctx.save();
        // Reverse the scale so the text doesn't stretch when the rect is resized
        ctx.scale(1 / (this.scaleX || 1), 1 / (this.scaleY || 1));
        
        ctx.fillStyle = this.textFill || '#000000';
        ctx.font = `${this.fontSize || 14}px ${this.fontFamily || 'Arial'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const maxWidth = (this.width * (this.scaleX || 1)) - 10;
        ctx.fillText(this.label || '', 0, 0, maxWidth);
        
        ctx.restore();
      };
    }
  };

  const addPlaceholderText = (type: 'pageName' | 'sectionShortName' | 'pageNumber') => {
    if (!canvas) return;
    let textStr = '';
    if (type === 'pageName') textStr = 'PAGE NAME AREA';
    if (type === 'sectionShortName') textStr = 'SECTION SHORT NAME AREA';
    if (type === 'pageNumber') textStr = 'PAGE NUMBER AREA';

    const rect = new fabric.Rect({
      width: 300, height: 60,
      fill: 'rgba(59, 130, 246, 0.1)',
      stroke: '#3b82f6', strokeWidth: 2, strokeDashArray: [5, 5],
      originX: 'center', originY: 'center',
      left: 100, top: 100
    } as any);
    
    // Explicitly assign custom properties
    (rect as any).placeholderType = type;
    (rect as any).label = textStr;
    (rect as any).maxRows = 1;
    (rect as any).fontSize = 14; // default font size as requested
    (rect as any).fontFamily = 'Arial';
    (rect as any).textFill = '#000000';
    
    applyPlaceholderRenderOverride(rect);
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const handleCadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePageId || !canvas) return;

    setIsUploadingCad(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/book-of-drawings/${id}/pages/${activePageId}/import-cad`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Failed to convert CAD');
      }

      // Ensure the SVG has explicit width and height attributes matching the viewBox
      // This prevents browsers from clamping large SVGs to 300x150 default sizes
      let svgData = resData.svg;
      const match = svgData.match(/viewBox="([^"]+)"/i);
      if (match) {
        const parts = match[1].trim().split(/\s+,?/);
        if (parts.length >= 4) {
          const w = parts[2];
          const h = parts[3];
          svgData = svgData.replace(/\s+width="[^"]*"/i, '');
          svgData = svgData.replace(/\s+height="[^"]*"/i, '');
          svgData = svgData.replace(/<svg\s+/i, `<svg width="${w}" height="${h}" `);
        }
      }

      // Convert SVG string to Base64 Data URL to load as a single Image object
      // This is crucial for performance and ensuring canvas.toJSON() serializes it correctly
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
      
      fabric.FabricImage.fromURL(svgDataUrl).then((img: any) => {
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        
        if (img.width && img.height) {
          const scale = Math.min((canvasWidth * 0.8) / img.width, (canvasHeight * 0.8) / img.height);
          if (scale < 1) {
            img.scale(scale);
          }
        }
        
        img.set({
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center'
        });
        
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });

    } catch (err: any) {
      console.error(err);
      alert(`Failed to import CAD: ${err.message}`);
    } finally {
      setIsUploadingCad(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportPDF = () => {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 1, multiplier: 1 });
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: paperSize.toLowerCase()
    });
    const dim = PAPER_SIZES[paperSize];
    pdf.addImage(dataUrl, 'JPEG', 0, 0, dim.width, dim.height);
    pdf.save(`${project?.name || 'Project'} - ${activeSection} - Page.pdf`);
  };

  const compileFinalPDF = async () => {
    if (!project) return;
    
    // Collect pages from Final Book sections
    const pagesToCompile: any[] = [];
    for (const sectionName of finalBookSections) {
      const sectionPages = project.pages.filter((p: any) => p.section === sectionName && p.includeInFinal);
      // Sort by page number
      sectionPages.sort((a: any, b: any) => a.pageNumber - b.pageNumber);
      pagesToCompile.push(...sectionPages);
    }

    if (pagesToCompile.length === 0) {
      alert("No pages are marked to be included in the final book for the selected sections.");
      return;
    }

    setIsCompiling(true);
    setCompileProgress('Initializing...');

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: paperSize.toLowerCase()
      });
      const dim = PAPER_SIZES[paperSize];
      
      const layoutPage = project.pages.find((p: any) => p.section === 'Page Layout');
      const layoutState = layoutPage?.canvasState ? (typeof layoutPage.canvasState === 'string' ? JSON.parse(layoutPage.canvasState) : layoutPage.canvasState) : null;

      // Helper to render a canvas state to a data URL using a headless StaticCanvas
      const renderToDataURL = async (stateObj: any, transparent: boolean = false): Promise<string> => {
        if (!stateObj) return '';
        
        const canvasEl = document.createElement('canvas');
        canvasEl.width = dim.width;
        canvasEl.height = dim.height;
        
        const headlessCanvas = new fabric.StaticCanvas(canvasEl, {
          width: dim.width,
          height: dim.height,
          backgroundColor: transparent ? 'rgba(0,0,0,0)' : '#ffffff'
        });

        await headlessCanvas.loadFromJSON(stateObj);
        
        if (transparent) {
          headlessCanvas.backgroundColor = 'rgba(0,0,0,0)';
        }
        headlessCanvas.renderAll();
        
        const dataUrl = headlessCanvas.toDataURL({ 
          format: transparent ? 'png' : 'jpeg', 
          quality: 1, 
          multiplier: 6 
        });
        
        headlessCanvas.dispose();
        return dataUrl;
      };

      let dynamicPlaceholders: any[] = [];
      if (layoutState && layoutState.objects) {
        dynamicPlaceholders = layoutState.objects.filter((obj: any) => obj.placeholderType);
        layoutState.objects = layoutState.objects.filter((obj: any) => !obj.placeholderType);
      }

      // Ensure pages are compiled strictly in section order and sorted by pageNumber within section
      const pagesToCompile: any[] = [];
      for (const sec of finalBookSections) {
        if (sec === 'Page Layout') continue;
        const secPages = project.pages.filter((p: any) => p.section === sec);
        secPages.sort((a: any, b: any) => a.pageNumber - b.pageNumber);
        pagesToCompile.push(...secPages);
      }

      // Pre-render layout frame if available (without the placeholders)
      setCompileProgress('Preparing Layout Frame...');
      const layoutDataUrl = layoutState ? await renderToDataURL(layoutState) : '';

      const sectionPageCounters: Record<string, number> = {};

      for (let i = 0; i < pagesToCompile.length; i++) {
        const page = pagesToCompile[i];
        setCompileProgress(`Compiling Page ${i + 1} of ${pagesToCompile.length}...`);
        
        if (!sectionPageCounters[page.section]) sectionPageCounters[page.section] = 0;
        sectionPageCounters[page.section]++;
        const sectionPageNum = sectionPageCounters[page.section];
        
        if (i > 0) pdf.addPage();

        const pageState = page.canvasState ? (typeof page.canvasState === 'string' ? JSON.parse(page.canvasState) : page.canvasState) : null;
        
        // Draw layout background if requested and exists
        if (page.applyFrame && layoutDataUrl) {
          pdf.addImage(layoutDataUrl, 'JPEG', 0, 0, dim.width, dim.height);
        } else {
          // Fill background with white if no layout
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, dim.width, dim.height, 'F');
        }

        // Render the actual page contents over it
        if (pageState) {
          const pageDataUrl = await renderToDataURL(pageState, true);
          pdf.addImage(pageDataUrl, 'PNG', 0, 0, dim.width, dim.height);
        }

        // Render dynamic page data if requested
        if (page.insertPageData && dynamicPlaceholders.length > 0) {
          for (const p of dynamicPlaceholders) {
            let textStr = '';
            if (p.placeholderType === 'pageName') textStr = page.name || '';
            else if (p.placeholderType === 'sectionShortName') textStr = project.sectionShortNames?.[page.section] || '';
            else if (p.placeholderType === 'pageNumber') textStr = sectionPageNum < 10 ? `0${sectionPageNum}` : `${sectionPageNum}`;
            
            // Calculate center coordinates of the placeholder bounding box
            const w = p.width * (p.scaleX || 1);
            const h = p.height * (p.scaleY || 1);
            const cx = (p.left || 0) + w / 2;
            const cy = (p.top || 0) + h / 2;
            
            // jsPDF font sizes are in points. Fabric canvas logical units match mm in jsPDF. 1 mm = 2.83465 pt.
            const fontSizePt = (p.fontSize || 14) * 2.83465;
            pdf.setFont(p.fontFamily || 'Arial');
            pdf.setFontSize(fontSizePt);
            pdf.setTextColor(p.textFill || p.fill || '#000000');
            
            pdf.text(textStr, cx, cy, { align: 'center', baseline: 'middle', maxWidth: w });
          }
        }
      }

      setCompileProgress('Saving PDF...');
      pdf.save(`${project.name || 'Final Book'}.pdf`);
      
    } catch (err) {
      console.error(err);
      alert('Failed to compile PDF.');
    } finally {
      setIsCompiling(false);
      setCompileProgress('');
    }
  };

  const handleDeleteObject = () => {
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
  };

  const handleZoomIn = () => {
    if (!canvas) return;
    canvas.setZoom(canvas.getZoom() * 1.2);
  };

  const handleZoomOut = () => {
    if (!canvas) return;
    canvas.setZoom(canvas.getZoom() / 1.2);
  };

  const handleZoomReset = () => {
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(1);
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Workspace...</div>;
  if (!project) return null;

  const activePageObj = project.pages.find((p: any) => p.id === activePageId);
  const activeSectionPages = project.pages.filter((p: any) => p.section === activeSection).sort((a: any, b: any) => a.pageNumber - b.pageNumber);

  return (
    <div className="layout-container" style={{ padding: '2rem 1rem', maxWidth: '100%' }}>
      <button 
        onClick={() => navigate('/book-of-drawings')}
        style={{ background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}
      >
        <ArrowLeft size={16} style={{ marginRight: '4px' }} /> Back to Dashboard
      </button>

      {/* Project Header */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>{project?.name}</h1>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: project.isTemplate ? '#fef08a' : '#e0f2fe', color: project.isTemplate ? '#854d0e' : '#0284c7' }}>
                {project.isTemplate ? 'Template' : 'Active'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '2rem', color: '#475569', fontSize: '0.9rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={16}/> Client: {project?.client}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16}/> Created: {new Date(project?.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
          <div>
            {project.driveFolderId && (
              <a 
                href={`https://drive.google.com/drive/folders/${project.driveFolderId}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                <FolderPlus size={16} /> Open Drive Folder
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Workspace Layout */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'stretch', height: 'calc(100vh - 180px)' }}>
        
        {/* Left Sidebar */}
        <div style={{ width: '280px', flexShrink: 0, backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Sections</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Reorder.Group 
              axis="y" 
              values={sectionsOrder} 
              onReorder={handleReorderSections} 
              style={{ display: 'flex', flexDirection: 'column', padding: '0 0.5rem' }} 
            >
            {sectionsOrder.map((sectionName) => {
              const isFinalBook = sectionName === 'Final Book';
              const pagesCount = project.pages.filter((p: any) => p.section === sectionName).length;
              
              return (
                <Reorder.Item 
                  key={sectionName} 
                  value={sectionName} 
                  style={{ 
                    marginBottom: sectionName === 'Page Layout' ? '0.5rem' : '0.25rem',
                    borderTop: isFinalBook ? '2px solid #cbd5e1' : 'none',
                    borderBottom: sectionName === 'Page Layout' ? '2px solid #cbd5e1' : 'none',
                    paddingTop: isFinalBook ? '0.5rem' : '0',
                    paddingBottom: sectionName === 'Page Layout' ? '0.5rem' : '0',
                    marginTop: isFinalBook ? '0.25rem' : '0'
                  }}
                >
                  <div 
                    onClick={() => {
                      setActiveSection(sectionName);
                      if (sectionName !== 'Page Layout') {
                        setIsCanvasOpen(false);
                        setActivePageId(null);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'grab',
                      backgroundColor: activeSection === sectionName ? '#f1f5f9' : 'transparent',
                      color: activeSection === sectionName ? '#0f172a' : '#475569',
                      fontWeight: activeSection === sectionName ? 500 : 400,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      if (activeSection !== sectionName) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={e => {
                      if (activeSection !== sectionName) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <GripVertical size={14} color="#cbd5e1" style={{ flexShrink: 0, cursor: 'grab' }} />
                      <LayoutTemplate size={16} color={activeSection === sectionName ? '#0ea5e9' : '#94a3b8'} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sectionName}</span>
                    </div>
                    {pagesCount > 0 && (
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '99px' }}>
                        {pagesCount}
                      </span>
                    )}
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
          </div>
          <div style={{ padding: '1rem 1.5rem 0 1.5rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button onClick={handleAddSection} className="btn btn-secondary w-full" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> New Section
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {/* Toolbar */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {activeSection} {isCanvasOpen && activePageObj ? `> Page ${activePageObj.pageNumber}` : ''}
              </div>
              
              {isCanvasOpen && activePageId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #cbd5e1', paddingLeft: '1.5rem' }}>
                  {activeSection !== 'Page Layout' && (
                    <button onClick={() => setIsCanvasOpen(false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ArrowLeft size={14} /> Back to Gallery
                    </button>
                  )}
                  {activeSection === 'Page Layout' && (
                    <>
                      <button onClick={() => addPlaceholderText('pageName')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Type size={14} /> Page Name Area
                      </button>
                      <button onClick={() => addPlaceholderText('sectionShortName')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Type size={14} /> Section Short Name Area
                      </button>
                      <button onClick={() => addPlaceholderText('pageNumber')} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Type size={14} /> Page Number Area
                      </button>
                      <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 0.5rem' }}></div>
                    </>
                  )}
                  <button onClick={addText} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Type size={14} /> Text
                  </button>
                  <button onClick={() => alert("Drag and drop images directly onto the canvas.")} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ImageIcon size={14} /> Image
                  </button>
                  <input type="file" ref={fileInputRef} accept=".dwg,.dxf" onChange={handleCadUpload} style={{ display: 'none' }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingCad} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileType2 size={16} />
                    {isUploadingCad ? 'Importing...' : 'Import CAD'}
                  </button>
                  <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 0.5rem' }}></div>
                  <button 
                    onClick={() => setIsPanMode(!isPanMode)} 
                    className={`btn ${isPanMode ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} 
                    title="Toggle Pan Mode"
                  >
                    <Hand size={16} />
                  </button>
                  <button onClick={handleZoomIn} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Zoom In (Internal)">
                    <ZoomIn size={16} />
                  </button>
                  <button onClick={handleZoomOut} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Zoom Out (Internal)">
                    <ZoomOut size={16} />
                  </button>
                  <button onClick={() => { 
                    handleZoomReset(); 
                    fitCanvasToScreen(); 
                    requestAnimationFrame(() => centerCanvas()); 
                  }} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Reset Zoom/Pan">
                    <Maximize size={16} />
                  </button>
                </div>
              )}
              
              {activeSection === 'Page Layout' && !isCanvasOpen && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #cbd5e1', paddingLeft: '1.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Global Size:</span>
                  <select 
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as keyof typeof PAPER_SIZES)}
                    className="form-input"
                    style={{ padding: '0.25rem 0.5rem', minWidth: '120px' }}
                  >
                    {Object.keys(PAPER_SIZES).map(size => (
                      <option key={size} value={size}>{size} Landscape</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isCanvasOpen && selectedObject && (
                <>
                  {(selectedObject.type === 'i-text' || selectedObject.type === 'textbox' || (selectedObject as any).placeholderType) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        title="Font Family"
                        value={(selectedObject as any).fontFamily || 'Arial'}
                        onChange={(e) => {
                          selectedObject.set('fontFamily', e.target.value);
                          canvas?.renderAll();
                          setSelectionTick(t => t + 1); // Force React re-render without destroying obj
                        }}
                        className="form-input"
                        style={{ padding: '0.2rem 0.5rem', minWidth: '120px', fontSize: '0.875rem' }}
                      >
                        {['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Tahoma'].map(font => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                      
                      <input
                        type="number"
                        title="Font Size"
                        min="8"
                        max="200"
                        value={(selectedObject as any).fontSize || 40}
                        onChange={(e) => {
                          selectedObject.set('fontSize', parseInt(e.target.value, 10));
                          canvas?.renderAll();
                          setSelectionTick(t => t + 1);
                        }}
                        className="form-input"
                        style={{ width: '60px', padding: '0.2rem 0.5rem', fontSize: '0.875rem' }}
                      />

                      <input 
                        type="color" 
                        title="Text Color"
                        value={(selectedObject as any).placeholderType ? (selectedObject as any).textFill || '#000000' : (selectedObject as any).fill || '#000000'}
                        onChange={(e) => {
                          if ((selectedObject as any).placeholderType) {
                            selectedObject.set('textFill', e.target.value);
                          } else {
                            selectedObject.set('fill', e.target.value);
                          }
                          canvas?.renderAll();
                          setSelectionTick(t => t + 1);
                        }}
                        style={{ width: '30px', height: '30px', padding: '0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      
                      {(selectedObject as any).placeholderType && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem', paddingLeft: '0.5rem', borderLeft: '1px solid #cbd5e1' }}>
                          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Max Rows:</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={(selectedObject as any).maxRows || 1}
                            onChange={(e) => {
                              selectedObject.set('maxRows', parseInt(e.target.value, 10) || 1);
                              canvas?.renderAll();
                              setSelectedObject({ ...selectedObject } as any);
                            }}
                            className="form-input"
                            style={{ width: '50px', padding: '0.1rem 0.25rem', fontSize: '0.75rem' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={handleDeleteObject} style={{ padding: '0.4rem', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }} title="Delete Selected">
                    <Trash2 size={16} />
                  </button>
                  <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 0.5rem' }}></div>
                </>
              )}

              {isCanvasOpen && (
                <>
                  <button onClick={saveCanvas} disabled={!activePageId} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title="Save Page to Database">
                    <Save size={16} /> Save
                  </button>
                  <button onClick={handleExportPDF} disabled={!activePageId} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Download size={16} /> Export PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Central Workspace Area */}
          <div 
            ref={outerWrapperRef}
            style={{ flex: 1, backgroundColor: '#e2e8f0', position: 'relative', overflow: 'auto', cursor: isPanMode ? 'grab' : 'default', border: isInternalFocus ? '2px solid #3b82f6' : '2px solid transparent' }}
            onWheel={(e) => {
              if (activeSection !== 'Final Book' && isCanvasOpen) {
                // Adjust global zoom if not internally focused, or if explicitly scrolling on the background
                if (!isInternalFocus || e.target === e.currentTarget) {
                  setGlobalZoomMultiplier(prev => {
                    let newZoom = prev * (0.999 ** e.deltaY);
                    if (newZoom < 0.1) newZoom = 0.1;
                    if (newZoom > 20) newZoom = 20; // Allow zooming up to 20x
                    return newZoom;
                  });
                }
              }
            }}
            onDoubleClick={(e) => {
              // Return to global pan/zoom if double clicking anywhere outside the inner canvas area
              if (isInternalFocus && !(e.target as HTMLElement).closest('.canvas-container')) {
                setIsInternalFocus(false);
              }
            }}
              onPointerDown={(e) => {
                if (isPanMode && activeSection !== 'Final Book' && isCanvasOpen) {
                  // Global pan applies everywhere if not internally focused, otherwise only on the background
                  if (!isInternalFocus || e.target === e.currentTarget) {
                    isOuterDraggingRef.current = true;
                    lastOuterPosRef.current = { x: e.clientX, y: e.clientY };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    if (outerWrapperRef.current) outerWrapperRef.current.style.cursor = 'grabbing';
                  }
                }
              }}
              onPointerMove={(e) => {
                if (isOuterDraggingRef.current && outerWrapperRef.current) {
                  const dx = e.clientX - lastOuterPosRef.current.x;
                  const dy = e.clientY - lastOuterPosRef.current.y;
                  outerWrapperRef.current.scrollLeft -= dx;
                  outerWrapperRef.current.scrollTop -= dy;
                  lastOuterPosRef.current = { x: e.clientX, y: e.clientY };
                }
              }}
              onPointerUp={(e) => {
                if (isOuterDraggingRef.current) {
                  isOuterDraggingRef.current = false;
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  if (outerWrapperRef.current) outerWrapperRef.current.style.cursor = isPanMode ? 'grab' : 'default';
                }
              }}
            >
              {/* Infinite Area to allow robust panning */}
              {activeSection !== 'Final Book' && isCanvasOpen && (
                <div style={{
                  width: 'max-content',
                  minWidth: '100%',
                  height: 'max-content',
                  minHeight: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ 
                    padding: `${PAPER_SIZES[paperSize as keyof typeof PAPER_SIZES].height * globalZoomMultiplier * 0.1}px ${PAPER_SIZES[paperSize as keyof typeof PAPER_SIZES].width * globalZoomMultiplier * 0.1}px`, 
                    flexShrink: 0
                  }}>
                    <DrawingCanvas 
                      paperSize={PAPER_SIZES[paperSize]} 
                      canvasRefCallback={setCanvas}
                      onSelectionCreated={setSelectedObject}
                      onSelectionCleared={() => setSelectedObject(null)}
                      globalZoomMultiplier={globalZoomMultiplier}
                      isPanMode={isPanMode}
                      isInternalFocus={isInternalFocus}
                      onFocusCanvas={() => setIsInternalFocus(true)}
                    />
                  </div>
                </div>
              )}
            
            {activeSection === 'Final Book' && (
              <div style={{ width: '100%', height: '100%', alignSelf: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#0f172a', fontWeight: 700 }}>Final Book Publication Order</h2>
                    <p style={{ margin: 0, color: '#475569', fontSize: '1rem' }}>Arrange the sections in the exact order you want them printed in the final PDF.</p>
                  </div>
                  <button 
                    onClick={compileFinalPDF} 
                    disabled={isCompiling || finalBookSections.length === 0} 
                    className="btn btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                  >
                    <Download size={20} /> {isCompiling ? compileProgress : 'Compile Final PDF'}
                  </button>
                </div>
                
                <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'white', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#0f172a', fontSize: '0.95rem', fontWeight: 600, marginRight: '0.5rem' }}>Add Section:</span>
                  {sectionsOrder.filter(s => s !== 'Final Book' && s !== 'Page Layout' && !finalBookSections.includes(s)).map(s => (
                    <button 
                      key={s} 
                      onClick={() => {
                        const newOrder = [...finalBookSections, s];
                        handleReorderFinalBookSections(newOrder);
                      }}
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '99px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      + {s}
                    </button>
                  ))}
                  {sectionsOrder.filter(s => s !== 'Final Book' && s !== 'Page Layout' && !finalBookSections.includes(s)).length === 0 && (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>All available sections added.</span>
                  )}
                </div>

                {finalBookSections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <FolderPlus size={48} style={{ margin: '0 auto 1rem auto', color: '#cbd5e1' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>No Sections Added</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Click the Add Section buttons above to include sections in your final book.</p>
                  </div>
                ) : (
                  <Reorder.Group 
                    axis="y" 
                    values={finalBookSections} 
                    onReorder={handleReorderFinalBookSections} 
                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  >
                    {finalBookSections.map((sectionName) => {
                      const pagesCount = project.pages.filter((p: any) => p.section === sectionName && p.includeInFinal).length;
                      return (
                        <Reorder.Item 
                          key={sectionName} 
                          value={sectionName} 
                          style={{ 
                            backgroundColor: 'white', 
                            padding: '1.25rem', 
                            borderRadius: '12px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'grab', 
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <GripVertical size={20} color="#cbd5e1" />
                            <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                              <FolderPlus size={24} />
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>{sectionName}</h4>
                              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Includes {pagesCount} selected page{pagesCount === 1 ? '' : 's'}</span>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderFinalBookSections(finalBookSections.filter(s => s !== sectionName));
                            }} 
                            style={{ padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                            title="Remove from Final Book"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                )}
              </div>
            )}

            {activeSection !== 'Final Book' && !isCanvasOpen ? (
              <div style={{ width: '100%', height: '100%', alignSelf: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', color: '#0f172a' }}>{activeSection} Pages</h2>
                    <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.875rem' }}>Drag and drop cards to reorder pages.</p>
                    {activeSection !== 'Page Layout' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Section Short Name:</span>
                        <input 
                          type="text"
                          className="form-input"
                          placeholder="e.g. GN"
                          value={project?.sectionShortNames?.[activeSection] || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            const newShortNames = { ...(project?.sectionShortNames || {}), [activeSection]: val };
                            setProject((prev: any) => ({ ...prev, sectionShortNames: newShortNames }));
                            
                            fetch(`/api/book-of-drawings/${id}/sections/shortnames`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ sectionShortNames: newShortNames })
                            });
                          }}
                          style={{ width: '120px', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        />
                      </div>
                    )}
                  </div>
                  {activeSection !== 'Page Layout' && (
                    <button onClick={handleAddPage} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Plus size={16} /> Add Page
                    </button>
                  )}
                </div>
                
                {activeSectionPages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <FileText size={48} style={{ margin: '0 auto 1rem auto', color: '#cbd5e1' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>No Pages Found</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Click the Add Page button above to create a new drawing page in this section.</p>
                  </div>
                ) : (
                  <Reorder.Group 
                    axis="y" 
                    values={activeSectionPages} 
                    onReorder={handleReorderPages} 
                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  >
                    {activeSectionPages.map((page: any) => (
                      <Reorder.Item 
                        key={page.id} 
                        value={page} 
                        style={{ 
                          backgroundColor: 'white', 
                          borderRadius: '8px', 
                          cursor: 'grab', 
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'stretch'
                        }}
                      >
                        <div 
                          style={{ 
                            width: '80px', 
                            height: '60px', 
                            backgroundColor: '#f8fafc', 
                            borderRight: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          onClick={() => {
                            setActivePageId(page.id);
                            setIsCanvasOpen(true);
                          }}
                        >
                          <LayoutTemplate size={24} />
                        </div>
                        <div style={{ padding: '0.5rem 1rem', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Page {page.pageNumber}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.15rem 0 0 0' }}>
                              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem' }}>{page.name || `Unnamed Page`}</h4>
                              <button onClick={() => handleRenamePage(page)} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', padding: '0.2rem', display: 'flex' }} title="Rename Page">
                                <Edit2 size={12} />
                              </button>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={page.applyFrame} 
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  await fetch(`/api/book-of-drawings/${id}/pages/${page.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ applyFrame: val })
                                  });
                                  fetchProject();
                                }}
                              />
                              Apply Frame
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={page.includeInFinal} 
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  await fetch(`/api/book-of-drawings/${id}/pages/${page.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ includeInFinal: val })
                                  });
                                  fetchProject();
                                }}
                              />
                              In Final
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={page.insertPageData} 
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  await fetch(`/api/book-of-drawings/${id}/pages/${page.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ insertPageData: val })
                                  });
                                  fetchProject();
                                }}
                              />
                              Insert Data
                            </label>
                            
                            <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0', margin: '0 0.5rem' }}></div>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete this page?')) {
                                  fetch(`/api/book-of-drawings/${id}/pages/${page.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                                    .then(() => fetchProject());
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                              title="Delete Page"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}
