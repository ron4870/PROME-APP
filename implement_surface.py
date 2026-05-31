import re

app_js_path = 'public/PROMEHydrology/app.js'

with open(app_js_path, 'r') as f:
    content = f.read()

# 1. Update State
content = content.replace("  alignments: [],        // Parsed from LandXML", "  alignments: [],        // Parsed from LandXML\n  surfaces: [],          // Parsed from LandXML or GeoTIFF")

# 2. Add Surface DOM Elements
surface_dom = """
const surfaceDropzone = document.getElementById('surface-dropzone');
const surfaceFileInput = document.getElementById('surface-file-input');
const surfaceFileStatus = document.getElementById('surface-file-status');
const surfaceSelectedFileName = document.getElementById('surface-selected-file-name');
const surfaceSelectedFileSize = document.getElementById('surface-selected-file-size');
const surfaceRemoveFileBtn = document.getElementById('surface-remove-file-btn');
const surfaceCrsSelect = document.getElementById('surface-crs');
const alignmentCrsSelect = document.getElementById('alignment-crs');
const alignmentCoordOrderSelect = document.getElementById('alignment-coord-order');
"""
content = content.replace("const coordOrderSelect = document.getElementById('coordinate-order-select');", "const coordOrderSelect = document.getElementById('coordinate-order-select');\n" + surface_dom)

# 3. DOM Event Listeners for Surface
surface_events = """
// Surface Drag & Drop
if (surfaceDropzone) {
  surfaceDropzone.addEventListener('click', () => surfaceFileInput.click());
  surfaceDropzone.addEventListener('dragover', (e) => { e.preventDefault(); surfaceDropzone.classList.add('dragover'); });
  surfaceDropzone.addEventListener('dragleave', () => { surfaceDropzone.classList.remove('dragover'); });
  surfaceDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    surfaceDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], 'surface');
  });
  surfaceFileInput.addEventListener('change', () => {
    if (surfaceFileInput.files.length > 0) handleFile(surfaceFileInput.files[0], 'surface');
  });
  surfaceRemoveFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.surfaces = [];
    surfaceDropzone.style.display = 'flex';
    surfaceFileStatus.style.display = 'none';
    surfaceFileInput.value = '';
    log('Cleared loaded surface data.', 'system');
    drawAlignment();
  });
}

// Populate CRS Dropdowns
function populateCRS() {
  const optionsHTML = sourceCrsSelect.innerHTML; // Copy from transformation options
  if(alignmentCrsSelect) alignmentCrsSelect.innerHTML = optionsHTML;
  if(surfaceCrsSelect) surfaceCrsSelect.innerHTML = optionsHTML;
}
populateCRS();

if (alignmentCoordOrderSelect) {
  alignmentCoordOrderSelect.addEventListener('change', (e) => {
    state.coordinateOrder = e.target.value;
    log(`Coordinate parsing order set to: ${state.coordinateOrder === 'NE' ? 'Northing, Easting' : 'Easting, Northing'}`);
  });
}
"""
content = content.replace("// File upload / Drag & Drop", surface_events + "\n// File upload / Drag & Drop")
content = content.replace("handleFile(e.dataTransfer.files[0]);", "handleFile(e.dataTransfer.files[0], 'alignment');")
content = content.replace("handleFile(xmlFileInput.files[0]);", "handleFile(xmlFileInput.files[0], 'alignment');")


# 4. Modify handleFile to take type
handle_file_mod = """
function handleFile(file, type = 'alignment') {
  const fileName = file.name;
  const fileSize = `${(file.size / 1024).toFixed(1)} KB`;
  
  if (type === 'alignment') {
    state.fileName = fileName;
    state.fileSize = fileSize;
  }
  
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    if (type === 'alignment') {
      xmlDropzone.style.display = 'none';
      selectedFileName.textContent = fileName;
      selectedFileSize.textContent = fileSize;
      fileStatus.style.display = 'flex';
    } else {
      surfaceDropzone.style.display = 'none';
      surfaceSelectedFileName.textContent = fileName;
      surfaceSelectedFileSize.textContent = fileSize;
      surfaceFileStatus.style.display = 'flex';
    }
    
    log(`Uploaded ${type} file: ${fileName} (${fileSize})`, 'success');

    if (ext === 'xml' || ext === 'landxml') {
      parseLandXML(e.target.result, type);
    } else if (ext === 'xodr' && type === 'alignment') {
      parseOpenDRIVE(e.target.result);
    } else if ((ext === 'zip' || ext === 'shp') && type === 'alignment') {
      await parseShapefile(e.target.result);
    } else if ((ext === 'tif' || ext === 'tiff' || ext === 'asc') && type === 'surface') {
      await parseGeoTIFF(e.target.result);
    } else {
      log(`Unsupported file format for ${type}.`, 'error');
    }
  };

  reader.onerror = () => log('Failed to read file', 'error');

  if (ext === 'zip' || ext === 'shp' || ext === 'tif' || ext === 'tiff') {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}
"""
# Replace handleFile entirely
content = re.sub(r'function handleFile\(file\) \{.*?\}\n\}\n', handle_file_mod + '\n', content, flags=re.DOTALL)


# 5. Add parseGeoTIFF and modify parseLandXML
parse_geotiff = """
async function parseGeoTIFF(buffer) {
  try {
    log('Parsing GeoTIFF file...', 'info');
    const tiff = await GeoTIFF.fromArrayBuffer(buffer);
    const image = await tiff.getImage();
    const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
    const rasters = await image.readRasters();
    
    let minElev = Infinity, maxElev = -Infinity;
    if (rasters && rasters[0]) {
      const data = rasters[0];
      for (let i=0; i<data.length; i++) {
        if (data[i] !== -9999 && !isNaN(data[i])) { // Ignore common nodata
           if(data[i] < minElev) minElev = data[i];
           if(data[i] > maxElev) maxElev = data[i];
        }
      }
    }
    
    state.surfaces.push({
      name: 'GeoTIFF Surface',
      type: 'geotiff',
      bbox: { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3] },
      minElev: minElev !== Infinity ? minElev : 0,
      maxElev: maxElev !== -Infinity ? maxElev : 0
    });
    
    log(`Successfully parsed GeoTIFF bounds: E(${bbox[0].toFixed(2)} - ${bbox[2].toFixed(2)}), N(${bbox[1].toFixed(2)} - ${bbox[3].toFixed(2)})`, 'success');
    fitBounds();
  } catch (err) {
    log(`Error parsing GeoTIFF: ${err.message}`, 'error');
  }
}

// Helper to fit view to bounds
window.fitBounds = function() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  if (state.alignments && state.alignments.length > 0) {
    state.alignments.forEach(al => {
      al.segments.forEach(seg => {
        [seg.start, seg.end].forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
      });
    });
  }
  
  if (state.surfaces && state.surfaces.length > 0) {
    state.surfaces.forEach(surf => {
      if (surf.type === 'geotiff' && surf.bbox) {
        if (surf.bbox.minX < minX) minX = surf.bbox.minX;
        if (surf.bbox.maxX > maxX) maxX = surf.bbox.maxX;
        if (surf.bbox.minY < minY) minY = surf.bbox.minY;
        if (surf.bbox.maxY > maxY) maxY = surf.bbox.maxY;
      } else if (surf.triangles) {
        surf.triangles.forEach(tri => {
          tri.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
        });
      }
    });
  }
  
  if (minX === Infinity) return; // Nothing to fit
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Calculate zoom to fit nicely (with 10% padding)
  const padding = 0.9;
  if (alignmentCanvas && alignmentCanvas.width > 0 && width > 0 && height > 0) {
     const zoomX = (alignmentCanvas.width * padding) / width;
     const zoomY = (alignmentCanvas.height * padding) / height;
     state.zoom = Math.min(zoomX, zoomY);
  } else {
     state.zoom = 1.0;
  }
  
  // Center is mapped to canvas/2. By default drawAlignment subtracts cx. So pan=0 makes it perfectly centered!
  state.panX = 0;
  state.panY = 0;
  
  log('Zoomed to fit extents.', 'system');
  drawAlignment();
};
"""
content = content.replace("// Parses LandXML structure to JS object geometry representation", parse_geotiff + "\n// Parses LandXML structure to JS object geometry representation")

# Replace parseLandXML to accept type and parse surfaces
content = content.replace("function parseLandXML(xmlText) {", "function parseLandXML(xmlText, type = 'alignment') {")
surface_parser_injection = """
    if (type === 'surface') {
      const surfaceNodes = xmlDoc.querySelectorAll('Surfaces > Surface');
      if (surfaceNodes.length === 0) throw new Error('No <Surface> elements found.');
      
      surfaceNodes.forEach(surfNode => {
        const name = surfNode.getAttribute('name') || 'Unknown Surface';
        const pntsNode = surfNode.querySelector('Pnts');
        const facesNode = surfNode.querySelector('Faces');
        
        if (pntsNode && facesNode) {
          const points = {};
          let minElev = Infinity, maxElev = -Infinity;
          
          pntsNode.querySelectorAll('P').forEach(pNode => {
            const id = pNode.getAttribute('id');
            const coords = pNode.textContent.trim().split(/\\s+/).map(Number);
            if (coords.length >= 3) {
              const p = parseCoordString(pNode.textContent);
              if(p) {
                 points[id] = p;
                 if (p.z < minElev) minElev = p.z;
                 if (p.z > maxElev) maxElev = p.z;
              }
            }
          });
          
          const triangles = [];
          facesNode.querySelectorAll('F').forEach(fNode => {
            const ids = fNode.textContent.trim().split(/\\s+/);
            if (ids.length === 3) {
              const p1 = points[ids[0]];
              const p2 = points[ids[1]];
              const p3 = points[ids[2]];
              if (p1 && p2 && p3) {
                triangles.push([p1, p2, p3]);
              }
            }
          });
          
          if (triangles.length > 0) {
            state.surfaces.push({ type: 'tin', name, triangles, minElev, maxElev });
          }
        }
      });
      if(state.surfaces.length > 0) {
         log(`Parsed ${state.surfaces.length} surface(s) from LandXML.`, 'success');
         fitBounds();
      }
      return;
    }
"""
content = content.replace("const alignmentNodes = xmlDoc.querySelectorAll('Alignment');\n    if (alignmentNodes.length === 0) {", surface_parser_injection + "\n    const alignmentNodes = xmlDoc.querySelectorAll('Alignment');\n    if (alignmentNodes.length === 0) {")


# 6. Call fitBounds globally
content = content.replace("finalizeAlignmentImport();", "finalizeAlignmentImport(); fitBounds();")

# 7. Add Surface Drawing logic to drawAlignment
draw_surface_injection = """
  // Draw Surfaces
  if (state.surfaces && state.surfaces.length > 0) {
    state.surfaces.forEach(surf => {
      if (surf.type === 'geotiff' && surf.bbox) {
        // Draw GeoTIFF bounding box outline
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.lineWidth = 2 / state.zoom;
        ctx.fillStyle = 'rgba(100, 150, 255, 0.1)';
        
        const w = surf.bbox.maxX - surf.bbox.minX;
        const h = surf.bbox.maxY - surf.bbox.minY;
        
        ctx.fillRect(surf.bbox.minX - cx, -(surf.bbox.minY - cy + h), w, h);
        ctx.strokeRect(surf.bbox.minX - cx, -(surf.bbox.minY - cy + h), w, h);
        
        // Label
        ctx.fillStyle = '#000';
        ctx.font = `${14/state.zoom}px sans-serif`;
        ctx.fillText(`GeoTIFF DEM (${surf.minElev.toFixed(1)}m to ${surf.maxElev.toFixed(1)}m)`, surf.bbox.minX - cx + 10/state.zoom, -(surf.bbox.minY - cy + h) + 20/state.zoom);
      } else if (surf.type === 'tin' && surf.triangles) {
        // Draw TIN
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 1 / state.zoom;
        ctx.beginPath();
        surf.triangles.forEach(tri => {
          ctx.moveTo(tri[0].x - cx, -(tri[0].y - cy));
          ctx.lineTo(tri[1].x - cx, -(tri[1].y - cy));
          ctx.lineTo(tri[2].x - cx, -(tri[2].y - cy));
          ctx.closePath();
        });
        ctx.stroke();
      }
    });
  }
"""

content = content.replace("function drawAlignment() {", "window.drawAlignment = function drawAlignment() {")

# Inject surface drawing right before alignments
content = content.replace("const alignmentsToDraw = state.transformedAlignment ? [state.transformedAlignment] : (state.alignments.length > 0 ? [state.alignments[state.activeAlignmentIndex]] : []);", 
                          draw_surface_injection + "\n  const alignmentsToDraw = state.transformedAlignment ? [state.transformedAlignment] : (state.alignments.length > 0 ? [state.alignments[state.activeAlignmentIndex]] : []);")


# Fix early return blocking map drawing
content = content.replace(
    "if (!alignmentsToDraw || alignmentsToDraw.length === 0) return;",
    "// Removed early return to allow surface drawing"
)


# Add fitBounds to reset button
content = content.replace(
    "state.panX = 0;\n  state.panY = 0;\n  state.zoom = 1.0;\n  drawAlignment();",
    "if(typeof fitBounds !== 'undefined') fitBounds(); else drawAlignment();"
)

with open(app_js_path, 'w') as f:
    f.write(content)

print("Updated app.js successfully.")
