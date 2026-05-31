import re

with open('public/PROMEHydrology/app.js', 'r') as f:
    content = f.read()

# 1. Fix resetFileState
reset_pattern = r"function resetFileState\(\) \{.*?state\.alignments = \[\];.*?log\(`Parsed \$\{state\.surfaces\.length\} surface\(s\) with \$\{state\.surfaces\[0\]\.triangles\.length\} triangles\.`, 'success'\);\n      \}\n\n}"
fixed_reset = """function resetFileState() {
  state.rawXml = null;
  state.fileName = '';
  state.fileSize = '';
  state.alignments = [];
  state.surfaces = [];
}"""
content = re.sub(reset_pattern, lambda m: fixed_reset, content, flags=re.DOTALL)


# 2. Fix handleFile
handleFile_pattern = r"function handleFile\(file, importType\) \{.*?(?=function resetFileState\(\) \{)"
fixed_handleFile = """function handleFile(file, importType) {
  state.fileName = file.name;
  state.fileSize = `${(file.size / 1024).toFixed(1)} KB`;
  
  // Read dropdowns
  if (importType === 'alignment') {
    const orderSelect = document.getElementById('alignment-coord-order');
    if (orderSelect) state.coordinateOrder = orderSelect.value;
    
    const crsSelect = document.getElementById('alignment-crs');
    if (crsSelect) state.currentImportProjStr = crsSelect.value;
  } else {
    const crsSelect = document.getElementById('surface-crs');
    if (crsSelect) state.currentImportProjStr = crsSelect.value;
  }
  
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    if (importType === 'alignment') {
      alignmentDropzone.style.display = 'none';
      alignmentFileName.textContent = state.fileName;
      alignmentFileStatus.style.display = 'flex';
      state.alignments = [];
    } else {
      surfaceDropzone.style.display = 'none';
      surfaceFileName.textContent = state.fileName;
      surfaceFileStatus.style.display = 'flex';
      state.surfaces = [];
    }
    log(`Uploaded file: ${state.fileName} (${state.fileSize})`, 'success');

    if (ext === 'xml' || ext === 'landxml') {
      state.rawXml = e.target.result;
      parseLandXML(state.rawXml, importType);
    } else if (ext === 'xodr') {
      state.rawXml = e.target.result;
      parseOpenDRIVE(state.rawXml);
    } else if (ext === 'zip' || ext === 'shp') {
      state.rawBuffer = e.target.result;
      await parseShapefile(state.rawBuffer);
    } else {
      log('Unsupported file format.', 'error');
    }
  };

  reader.onerror = () => {
    log('Failed to read file', 'error');
  };

  if (ext === 'zip' || ext === 'shp') {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}
"""
content = re.sub(handleFile_pattern, lambda m: fixed_handleFile, content, flags=re.DOTALL)


# 3. Replace parseLandXML
parseLandXML_pattern = r"function parseLandXML\(xmlText\) \{.*?(?=function parseShapefile)"
fixed_parseLandXML = """function parseLandXML(xmlText, importType) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing failed: ' + parserError.textContent);
    }
    
    // Parse Alignments
    if (importType === 'alignment' || !importType) {
      const alignmentNodes = xmlDoc.querySelectorAll('Alignment');
      state.alignments = [];
      
      alignmentNodes.forEach(alNode => {
        const name = alNode.getAttribute('name') || alNode.getAttribute('desc') || 'Unnamed Alignment';
        const length = parseFloat(alNode.getAttribute('length')) || 0;
        const startStation = parseFloat(alNode.getAttribute('staStart')) || 0;
        
        const segments = [];
        const coordGeom = alNode.querySelector('CoordGeom');
        
        if (coordGeom) {
          coordGeom.childNodes.forEach(geomNode => {
            if (geomNode.nodeType !== 1) return;
            const type = geomNode.nodeName.toLowerCase();
            const seg = parseSegment(geomNode, type);
            if (seg) segments.push(seg);
          });
        }
        
        if (segments.length > 0) {
          state.alignments.push({
            name,
            length,
            startStation,
            segments,
            verticalProfiles: [],
            targetProjStr: state.currentImportProjStr || CRS_DEFINITIONS['wgs84_36n']
          });
        }
      });
      
      if (state.alignments.length > 0) {
        log(`Parsed ${state.alignments.length} alignment(s).`, 'success');
      }
    }
    
    // Parse Surfaces
    if (importType === 'surface' || !importType) {
      const surfaceNodes = xmlDoc.querySelectorAll('Surfaces > Surface');
      state.surfaces = [];
      
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
              const p_parsed = parseCoordString(pNode.textContent);
              if (p_parsed) {
                points[id] = p_parsed;
                if (p_parsed.z < minElev) minElev = p_parsed.z;
                if (p_parsed.z > maxElev) maxElev = p_parsed.z;
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
            state.surfaces.push({
              name,
              triangles,
              minElev,
              maxElev,
              targetProjStr: state.currentImportProjStr || CRS_DEFINITIONS['wgs84_36n']
            });
          }
        }
      });
      
      if (state.surfaces.length > 0) {
        log(`Parsed ${state.surfaces.length} surface(s) with ${state.surfaces[0].triangles.length} triangles.`, 'success');
      }
    }
    
    fitBounds();
  } catch (err) {
    log(`Error parsing LandXML: ${err.message}`, 'error');
  }
}
"""
content = re.sub(parseLandXML_pattern, lambda m: fixed_parseLandXML, content, flags=re.DOTALL)


# 4. Append UTM logic at bottom of file
append_logic = """

// --- Populate UTM Zones Dropdowns ---
(function populateUTMZones() {
  const alignmentCrs = document.getElementById('alignment-crs');
  const surfaceCrs = document.getElementById('surface-crs');
  if (!alignmentCrs && !surfaceCrs) return;
  
  let optionsHTML = '';
  for (let z = 1; z <= 60; z++) {
    const projN = `+proj=utm +zone=${z} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
    const projS = `+proj=utm +zone=${z} +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
    
    const selectedN = (z === 36) ? 'selected' : '';
    
    optionsHTML += `<option value="${projN}" ${selectedN}>WGS 84 / UTM Zone ${z}N</option>`;
    optionsHTML += `<option value="${projS}">WGS 84 / UTM Zone ${z}S</option>`;
  }
  
  if (alignmentCrs) alignmentCrs.innerHTML = optionsHTML;
  if (surfaceCrs) surfaceCrs.innerHTML = optionsHTML;
})();
"""
if "populateUTMZones" not in content:
    content += append_logic

with open('public/PROMEHydrology/app.js', 'w') as f:
    f.write(content)
