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
  onOverlaySelect
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isPanModeRef = useRef(isPanMode);
  const isInternalFocusRef = useRef(isInternalFocus);
  const onFocusCanvasRef = useRef(onFocusCanvas);

  useEffect(() => {
    isPanModeRef.current = isPanMode;
    isInternalFocusRef.current = isInternalFocus;
    onFocusCanvasRef.current = onFocusCanvas;
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.defaultCursor = isPanMode && isInternalFocus ? 'grab' : 'default';
      fabricCanvasRef.current.selection = !isPanMode && isInternalFocus;
      // Also update objects so they don't block drag when pan is on, and block interaction if not focused
      fabricCanvasRef.current.getObjects().forEach(obj => {
        obj.set('selectable', !isPanMode && isInternalFocus);
        obj.set('evented', !isPanMode && isInternalFocus);
      });
      fabricCanvasRef.current.renderAll();
    }
  }, [isPanMode, isInternalFocus, onFocusCanvas]);

  // We scale the canvas visually to fit the screen, but the internal logical size remains the paper size
  const displayScale = 1;

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
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });

    fabricCanvasRef.current = canvas;
    canvas.setZoom(zoomLevel);
    canvasRefCallback(canvas);

    // Event Listeners for selection
    canvas.on('selection:created', (e: any) => onSelectionCreated?.(e.selected?.[0]));
    canvas.on('selection:updated', (e: any) => onSelectionCreated?.(e.selected?.[0]));
    canvas.on('selection:cleared', () => onSelectionCleared?.());

    canvas.on('mouse:dblclick', function() {
      if (onFocusCanvasRef.current) {
        onFocusCanvasRef.current();
      }
    });

    // Deselect overlay when clicking canvas
    canvas.on('mouse:down', function(opt) {
      if (!opt.target && onOverlaySelect) {
        onOverlaySelect(null);
      }
    });

    // Mouse wheel zoom
    canvas.on('mouse:wheel', function(opt) {
      if (!isInternalFocusRef.current) {
        // If not focused, ignore and let the event bubble up to trigger global zoom
        return;
      }
      const e = opt.e as WheelEvent;
      const delta = e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
      e.preventDefault();
      e.stopPropagation();
    });

    // Panning with Alt + Drag or isPanMode (only if internally focused)
    canvas.on('mouse:down', function(opt) {
      const evt = opt.e as MouseEvent;
      if (isInternalFocusRef.current && (evt.altKey === true || isPanModeRef.current)) {
        (canvas as any).isDragging = true;
        canvas.selection = false;
        canvas.defaultCursor = 'grabbing';
        (canvas as any).lastPosX = evt.clientX;
        (canvas as any).lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', function(opt) {
      if ((canvas as any).isDragging) {
        const e = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - (canvas as any).lastPosX;
          vpt[5] += e.clientY - (canvas as any).lastPosY;
          canvas.requestRenderAll();
        }
        (canvas as any).lastPosX = e.clientX;
        (canvas as any).lastPosY = e.clientY;
      }
    });

    canvas.on('mouse:up', function() {
      if (canvas.viewportTransform) {
        canvas.setViewportTransform(canvas.viewportTransform);
      }
      (canvas as any).isDragging = false;
      if (isPanModeRef.current && isInternalFocusRef.current) {
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
      } else {
        canvas.defaultCursor = 'default';
        canvas.selection = isInternalFocusRef.current && !isPanModeRef.current;
      }
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
          fabric.FabricImage.fromURL(data).then((img: any) => {
            // Scale down if image is too large
            if (img.width! > paperSize.width * 0.8) {
              img.scaleToWidth(paperSize.width * 0.8);
            }
            // Position at center
            img.set({
              left: (paperSize.width - (img.width! * img.scaleX!)) / 2,
              top: (paperSize.height - (img.height! * img.scaleY!)) / 2
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
          });
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
      canvasRefCallback(null as any);
    };
  }, [paperSize, canvasRefCallback]); // Re-init when paper size changes

  const finalDisplayScale = displayScale * globalZoomMultiplier;
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
                bounds="parent"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: isSelected ? '2px solid #3b82f6' : '2px dashed #3b82f6',
                  cursor: isSelected ? 'move' : 'pointer',
                  pointerEvents: (!isPanMode && isInternalFocus) ? 'auto' : 'none'
                }}
              >
                <div style={{
                  color: overlay.textFill || '#000000',
                  fontSize: `${overlay.fontSize || 14}px`,
                  fontFamily: overlay.fontFamily || 'Arial',
                  textAlign: 'center',
                  width: '100%',
                  userSelect: 'none'
                }}>
                  {overlay.label}
                </div>
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
