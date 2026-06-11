import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

interface DrawingCanvasProps {
  paperSize: { width: number; height: number };
  onSelectionCreated?: (obj: any) => void;
  onSelectionCleared?: () => void;
  canvasRefCallback: (canvas: fabric.Canvas) => void;
  zoomLevel?: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  paperSize, 
  onSelectionCreated, 
  onSelectionCleared,
  canvasRefCallback,
  zoomLevel = 1
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // We scale the canvas visually to fit the screen, but the internal logical size remains the paper size
  const [displayScale, setDisplayScale] = React.useState(0.8);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const parent = canvasContainerRef.current.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Calculate scale to fit within parent with 5% padding
        const scaleX = (width * 0.95) / paperSize.width;
        const scaleY = (height * 0.95) / paperSize.height;
        // Use the smaller scale to ensure the whole paper fits
        setDisplayScale(Math.min(scaleX, scaleY));
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, [paperSize]);

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

    // Mouse wheel zoom
    canvas.on('mouse:wheel', function(opt) {
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

    // Panning with Alt + Drag
    canvas.on('mouse:down', function(opt) {
      const evt = opt.e as MouseEvent;
      if (evt.altKey === true) {
        (canvas as any).isDragging = true;
        canvas.selection = false;
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
      canvas.selection = true;
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

  return (
    <div 
      ref={canvasContainerRef}
      className="shadow-2xl ring-1 ring-gray-300 relative bg-gray-100"
      style={{
        width: paperSize.width * displayScale,
        height: paperSize.height * displayScale,
        overflow: 'hidden'
      }}
    >
      <div style={{ transform: `scale(${displayScale})`, transformOrigin: 'top left', width: paperSize.width, height: paperSize.height }}>
        <canvas ref={canvasElRef} />
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', pointerEvents: 'none' }}>
        Hold Alt + Drag to Pan. Use Scroll to Zoom.
      </div>
    </div>
  );
};
