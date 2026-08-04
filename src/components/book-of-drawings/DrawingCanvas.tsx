import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

import { Rnd } from 'react-rnd';

interface DrawingCanvasProps {
  paperSize: { width: number; height: number };
  onSelectionCreated?: (obj: any) => void;
  onSelectionCleared?: () => void;
  canvasRefCallback: (canvas: fabric.Canvas) => void;
  zoomLevel?: number;
  globalZoomMultiplier?: number;
  isPanMode?: boolean;
  isInternalFocus?: boolean;
  onFocusCanvas?: () => void;
  overlays?: any[];
  onOverlaysChange?: (overlays: any[]) => void;
  selectedOverlayId?: string | null;
  onOverlaySelect?: (id: string | null) => void;
  readOnly?: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  paperSize, 
  onSelectionCreated, 
  onSelectionCleared,
  canvasRefCallback,
  zoomLevel = 1,
  globalZoomMultiplier = 1,
  isPanMode = false,
  isInternalFocus = false,
  onFocusCanvas,
  overlays = [],
  onOverlaysChange,
  selectedOverlayId,
  onOverlaySelect,
  readOnly = false
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isPanModeRef = useRef(isPanMode);
  const isInternalFocusRef = useRef(false);

  const overlaysRef = useRef(overlays);
  const onOverlaysChangeRef = useRef(onOverlaysChange);
  const onOverlaySelectRef = useRef(onOverlaySelect);
  const onFocusCanvasRef = useRef(onFocusCanvas);

  useEffect(() => {
    overlaysRef.current = overlays;
    onOverlaysChangeRef.current = onOverlaysChange;
    onOverlaySelectRef.current = onOverlaySelect;
  }, [overlays, onOverlaysChange, onOverlaySelect]);

  useEffect(() => {
    isPanModeRef.current = isPanMode;
    isInternalFocusRef.current = isInternalFocus;
    onFocusCanvasRef.current = onFocusCanvas;
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.defaultCursor = isPanMode && isInternalFocus ? 'grab' : 'default';
      fabricCanvasRef.current.selection = !isPanMode && isInternalFocus && !readOnly;
      // Also update objects so they don't block drag when pan is on, and block interaction if not focused
      fabricCanvasRef.current.getObjects().forEach(obj => {
        obj.set('selectable', !isPanMode && isInternalFocus && !readOnly);
        obj.set('evented', !isPanMode && isInternalFocus && !readOnly);
      });
      fabricCanvasRef.current.renderAll();
    }
  }, [isPanMode, isInternalFocus, onFocusCanvas, readOnly]);

  // We scale the canvas visually to fit the screen, but the internal logical size remains the paper size
  const displayScale = 1;
  const finalDisplayScale = displayScale * globalZoomMultiplier;

  // Apply zoom level dynamically
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(zoomLevel);
      fabricCanvasRef.current.renderAll();
    }
  }, [zoomLevel]); 

  useEffect(() => {
    if (!canvasElRef.current || !canvasContainerRef.current) return;

    // Initialize Fabric Canvas
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: paperSize.width,
      height: paperSize.height,
      preserveObjectStacking: true,
      selection: !isPanModeRef.current && isInternalFocusRef.current && !readOnly,
      defaultCursor: isPanModeRef.current && isInternalFocusRef.current ? 'grab' : 'default',
    });

    fabricCanvasRef.current = canvas;
    if (canvasRefCallback) canvasRefCallback(canvas);

    // Event Listeners for selection
    canvas.on('selection:created', (e: any) => onSelectionCreated?.(e.selected?.[0] || null));
    canvas.on('selection:updated', (e: any) => onSelectionCreated?.(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => onSelectionCleared?.());

    canvas.on('mouse:dblclick', function() {
      if (onFocusCanvasRef.current) {
        onFocusCanvasRef.current();
      }
    });

    // Deselect overlay when clicking canvas
    canvas.on('mouse:down', function() {
      if (onOverlaySelectRef.current) onOverlaySelectRef.current(null);
      
      // If we are not focused, a click should ideally request focus
      if (!isInternalFocusRef.current) {
        if (onFocusCanvasRef.current) onFocusCanvasRef.current();
        return;
      }

      // Removed internal panning logic to prevent sync issues with Rnd overlays.
      // All panning and zooming should now be handled by the outer container.
    });

    // Removed internal mouse:wheel zoom logic to ensure CAD and Rnd overlays always scale together via global zoom.

    canvas.on('mouse:up', function () {
      if (isPanModeRef.current && isInternalFocusRef.current) {
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
      } else {
        canvas.defaultCursor = 'default';
        canvas.selection = isInternalFocusRef.current && !isPanModeRef.current;
      }
      canvas.renderAll();
    });

    // Basic drag-and-drop support for images
    const container = canvasContainerRef.current;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
      
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (f) => {
          const data = f.target?.result as string;
          // Create image element to get natural dimensions
          const img = new Image();
          img.onload = () => {
            let w = img.width;
            let h = img.height;
            // Scale down if image is too large
            if (w > paperSize.width * 0.8) {
              const ratio = (paperSize.width * 0.8) / w;
              w *= ratio;
              h *= ratio;
            }
            const newOverlay = {
              id: Math.random().toString(36).substring(2, 9),
              type: 'image' as const,
              label: '',
              src: data,
              x: (paperSize.width - w) / 2,
              y: (paperSize.height - h) / 2,
              width: w,
              height: h,
              fontSize: 14,
              fontFamily: 'Arial',
              textFill: '#000000'
            };
            if (onOverlaysChangeRef.current) {
              onOverlaysChangeRef.current([...overlaysRef.current, newOverlay]);
            }
            if (onOverlaySelectRef.current) {
              onOverlaySelectRef.current(newOverlay.id);
            }
          };
          img.src = data;
        };
        reader.readAsDataURL(file);
      }
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
      canvas.dispose();
      // Clean up parent reference to prevent using disposed canvas when remounting
      if (canvasRefCallback) canvasRefCallback(null as any);
    };
  }, [paperSize, canvasRefCallback]);

  const previousGlobalZoomRef = useRef(finalDisplayScale);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      const newWidth = paperSize.width * finalDisplayScale;
      const newHeight = paperSize.height * finalDisplayScale;
      
      canvas.setDimensions({ width: newWidth, height: newHeight });
      
      if (canvas.viewportTransform) {
        const vpt = [...canvas.viewportTransform] as [number, number, number, number, number, number];
        const ratio = finalDisplayScale / previousGlobalZoomRef.current;
        
        vpt[0] *= ratio;
        vpt[3] *= ratio;
        vpt[4] *= ratio;
        vpt[5] *= ratio;
        
        canvas.setViewportTransform(vpt);
      }
      previousGlobalZoomRef.current = finalDisplayScale;
    }
  }, [finalDisplayScale, paperSize]);

  return (
    <div 
      ref={canvasContainerRef}
      className="shadow-2xl ring-1 ring-gray-300 relative bg-gray-100"
      style={{
        width: paperSize.width * finalDisplayScale,
        height: paperSize.height * finalDisplayScale,
        overflow: 'hidden',
        margin: 'auto'
      }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <canvas ref={canvasElRef} />
        
        {/* Overlays Layer */}
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, left: 0, 
            width: paperSize.width, 
            height: paperSize.height,
            transform: `scale(${finalDisplayScale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none'
          }}
        >
          {overlays.map(overlay => {
            const isSelected = overlay.id === selectedOverlayId;
            return (
              <Rnd
                key={overlay.id}
                disableDragging={readOnly}
                enableResizing={!readOnly}
                size={{ width: overlay.width, height: overlay.height }}
                position={{ x: overlay.x, y: overlay.y }}
                scale={finalDisplayScale}
                onDragStop={(_e, d) => {
                  const updated = overlays.map(o => o.id === overlay.id ? { ...o, x: d.x, y: d.y } : o);
                  if (onOverlaysChange) onOverlaysChange(updated);
                }}
                onResizeStop={(_e, _direction, ref, _delta, position) => {
                  const updated = overlays.map(o => o.id === overlay.id ? {
                    ...o,
                    width: parseInt(ref.style.width, 10),
                    height: parseInt(ref.style.height, 10),
                    x: position.x,
                    y: position.y
                  } : o);
                  if (onOverlaysChange) onOverlaysChange(updated);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (onOverlaySelect) onOverlaySelect(overlay.id);
                  if (fabricCanvasRef.current) fabricCanvasRef.current.discardActiveObject();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: isSelected ? '2px solid #3b82f6' : '2px dashed #3b82f6',
                  cursor: isSelected ? 'move' : 'pointer',
                  pointerEvents: !isPanMode ? 'auto' : 'none'
                }}
              >
                {overlay.type === 'image' && overlay.src ? (
                  <img 
                    src={overlay.src} 
                    alt="overlay" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} 
                  />
                ) : overlay.type === 'rect' || overlay.type === 'circle' ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    border: `${overlay.strokeWidth ?? 2}px solid ${overlay.strokeColor || '#000000'}`,
                    backgroundColor: overlay.fillColor || 'transparent',
                    borderRadius: overlay.type === 'circle' ? '50%' : '0%',
                    pointerEvents: 'none'
                  }} />
                ) : overlay.type === 'line' || overlay.type === 'arrow' || overlay.type === 'leader-line' ? ((() => {
                  const markerId = `arrowhead-${overlay.id}`;
                  const strokeWidth = overlay.strokeWidth ?? 2;
                  const strokeColor = overlay.strokeColor || '#000000';
                  
                  // Coordinate tail/head orientation based on direction
                  let x1 = "0%", y1 = "0%", x2 = "100%", y2 = "100%";
                  if (overlay.direction === 'bottom-left-to-top-right') {
                    x1 = "0%"; y1 = "100%"; x2 = "100%"; y2 = "0%";
                  } else if (overlay.direction === 'top-right-to-bottom-left') {
                    x1 = "100%"; y1 = "0%"; x2 = "0%"; y2 = "100%";
                  } else if (overlay.direction === 'bottom-right-to-top-left') {
                    x1 = "100%"; y1 = "100%"; x2 = "0%"; y2 = "0%";
                  }

                  const showArrowhead = overlay.type === 'arrow' || overlay.type === 'leader-line';
                  
                  // Render the actual line element
                  let pathElement = <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth={strokeWidth} markerEnd={showArrowhead ? `url(#${markerId})` : undefined} />;
                  
                  if (showArrowhead && overlay.arrowType === 'curved') {
                    // Draw Bezier Q curve
                    // Calculate middle point for curve control
                    const x1_n = overlay.direction?.includes('right') ? 100 : 0;
                    const x2_n = overlay.direction?.includes('right') ? 0 : 100;
                    const y1_n = overlay.direction?.startsWith('bottom') ? 100 : 0;
                    const y2_n = overlay.direction?.startsWith('bottom') ? 0 : 100;
                    
                    const cx = (x1_n + x2_n) / 2;
                    const cy = y1_n;
                    const pathData = `M ${x1_n}% ${y1_n}% Q ${cx}% ${cy}% ${x2_n}% ${y2_n}%`;
                    pathElement = <path d={pathData} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} markerEnd={`url(#${markerId})`} />;
                  } else if (showArrowhead && overlay.arrowType === 'angled') {
                    // Draw Polyline (L shape)
                    const x1_n = overlay.direction?.includes('right') ? "100%" : "0%";
                    const x2_n = overlay.direction?.includes('right') ? "0%" : "100%";
                    const y1_n = overlay.direction?.startsWith('bottom') ? "100%" : "0%";
                    const y2_n = overlay.direction?.startsWith('bottom') ? "0%" : "100%";
                    const points = `${x1_n},${y1_n} ${x2_n},${y1_n} ${x2_n},${y2_n}`;
                    pathElement = <polyline points={points} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} markerEnd={`url(#${markerId})`} />;
                  }

                  const isLeader = overlay.type === 'leader-line';

                  return (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <svg width="100%" height="100%" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                        {showArrowhead && (
                          <defs>
                            <marker
                              id={markerId}
                              markerWidth="10"
                              markerHeight="7"
                              refX="8"
                              refY="3.5"
                              orient="auto"
                              markerUnits="strokeWidth"
                            >
                              <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
                            </marker>
                          </defs>
                        )}
                        {pathElement}
                      </svg>

                      {/* Floating Text Label at the Tail of the Leader Line */}
                      {isLeader && (
                        <div
                          style={{
                            position: 'absolute',
                            top: overlay.direction?.startsWith('bottom') ? 'auto' : '0px',
                            bottom: overlay.direction?.startsWith('bottom') ? '0px' : 'auto',
                            left: overlay.direction?.includes('right') ? 'auto' : '0px',
                            right: overlay.direction?.includes('right') ? '0px' : 'auto',
                            transform: 'translate(0, 0)',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '1px solid #94a3b8',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            pointerEvents: 'auto',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: '80px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          onMouseDown={(e) => e.stopPropagation()} // Let user interact with text box
                        >
                          {isSelected ? (
                            <input
                              type="text"
                              value={overlay.label || ''}
                              placeholder="Text..."
                              onChange={(e) => {
                                if (onOverlaysChange) {
                                  const updated = overlays.map(o => o.id === overlay.id ? { ...o, label: e.target.value } : o);
                                  onOverlaysChange(updated);
                                }
                              }}
                              style={{
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: '11px',
                                width: '100%',
                                padding: 0,
                                margin: 0,
                                textAlign: 'center',
                                fontWeight: 500,
                                color: '#1e293b'
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 500, color: '#1e293b', width: '100%', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {overlay.label || 'Leader text'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
                ) : (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {isSelected && overlay.type === 'text' ? (
                      <textarea
                        value={overlay.label || ''}
                        onChange={(e) => {
                          if (onOverlaysChange) {
                            const updated = overlays.map(o => o.id === overlay.id ? { ...o, label: e.target.value } : o);
                            onOverlaysChange(updated);
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()} // Allow clicking inside to select text and edit
                        style={{
                          width: '100%',
                          height: '100%',
                          color: overlay.textFill || '#000000',
                          fontSize: `${overlay.fontSize || 14}px`,
                          fontFamily: overlay.fontFamily || 'Arial',
                          textAlign: 'center',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          resize: 'none',
                          overflow: 'hidden'
                        }}
                      />
                    ) : (
                      <div 
                        style={{
                          color: overlay.textFill || '#000000',
                          fontSize: `${overlay.fontSize || 14}px`,
                          fontFamily: overlay.fontFamily || 'Arial',
                          textAlign: 'center',
                          width: '100%',
                          height: '100%',
                          userSelect: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          ...(overlay.maxRows ? {
                            display: '-webkit-box',
                            WebkitLineClamp: overlay.maxRows,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          } : {})
                        }}
                      >
                        {overlay.type === 'text' ? (overlay.label || 'Double click to edit') : overlay.label}
                      </div>
                    )}
                  </div>
                )}
              </Rnd>
            );
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', pointerEvents: 'none' }}>
        Hold Alt + Drag to Pan. Use Scroll to Zoom.
      </div>
    </div>
  );
};
