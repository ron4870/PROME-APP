/**
 * PROME Consultants Ltd - Road Alignment & Coordinate Transformer
 * Core Application Script
 */
import fresnel from 'https://esm.sh/@stdlib/math-base-special-fresnel';
import { download as shpDownload } from 'https://esm.sh/@crmackey/shp-write';
import shp from 'https://esm.sh/shpjs';

// --- 1. Coordinate Reference Systems (CRS) Configuration ---

// Proj4 definitions for standard systems
// Arc 1960 uses Clarke 1880 Modified ellipsoid (+a=6378249.145 +rf=293.465)
// and official Uganda Geodetic Reference Frame (UGRF) 7-parameter Helmert transformation to WGS84
const CRS_DEFINITIONS = {
  // WGS 84 Systems
  'wgs84_ll': '+proj=longlat +datum=WGS84 +no_defs',
  'wgs84_35n': '+proj=utm +zone=35 +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  'wgs84_35s': '+proj=utm +zone=35 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  'wgs84_36n': '+proj=utm +zone=36 +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  'wgs84_36s': '+proj=utm +zone=36 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs',

  // Arc 1960 Systems (UGRF precise transformation)
  'arc1960_ll': '+proj=longlat +ellps=clrk80m +towgs84=-136.7231,-87.8654,20.1215,4.966933,-9.010010,-2.724860,7.86009 +no_defs',
  'arc1960_35n': '+proj=utm +zone=35 +ellps=clrk80m +towgs84=-136.7231,-87.8654,20.1215,4.966933,-9.010010,-2.724860,7.86009 +units=m +no_defs',
  'arc1960_35s': '+proj=utm +zone=35 +south +ellps=clrk80m +towgs84=-136.7231,-87.8654,20.1215,4.966933,-9.010010,-2.724860,7.86009 +units=m +no_defs',
  'arc1960_36n': '+proj=utm +zone=36 +ellps=clrk80m +towgs84=-136.7231,-87.8654,20.1215,4.966933,-9.010010,-2.724860,7.86009 +units=m +no_defs',
  'arc1960_36s': '+proj=utm +zone=36 +south +ellps=clrk80m +towgs84=-136.7231,-87.8654,20.1215,4.966933,-9.010010,-2.724860,7.86009 +units=m +no_defs'
};

const CRS_WKT = {
  'wgs84_ll': 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
  'wgs84_35n': 'PROJCS["WGS_1984_UTM_Zone_35N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",27.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  'wgs84_35s': 'PROJCS["WGS_1984_UTM_Zone_35S",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",27.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  'wgs84_36n': 'PROJCS["WGS_1984_UTM_Zone_36N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",33.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  'wgs84_36s': 'PROJCS["WGS_1984_UTM_Zone_36S",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",33.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  'arc1960_ll': 'GEOGCS["GCS_Arc_1960",DATUM["D_Arc_1960",SPHEROID["Clarke_1880_RGS",6378249.145,293.465]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
  'arc1960_35n': 'PROJCS["Arc_1960_UTM_Zone_35N",GEOGCS["GCS_Arc_1960",DATUM["D_Arc_1960",SPHEROID["Clarke_1880_RGS",6378249.145,293.465]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",27.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  'arc1960_35s': 'PROJCS["Arc_1960_UTM_Zone_35S",GEOGCS["GCS_Arc_1960",DATUM["D_Arc_1960",SPHEROID["Clarke_1880_RGS",6378249.145,293.465]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",27.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  'arc1960_36n': 'PROJCS["Arc_1960_UTM_Zone_36N",GEOGCS["GCS_Arc_1960",DATUM["D_Arc_1960",SPHEROID["Clarke_1880_RGS",6378249.145,293.465]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",33.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  'arc1960_36s': 'PROJCS["Arc_1960_UTM_Zone_36S",GEOGCS["GCS_Arc_1960",DATUM["D_Arc_1960",SPHEROID["Clarke_1880_RGS",6378249.145,293.465]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",33.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]'
};

function getCustomWKT(params) {
  return `PROJCS["Custom_Transverse_Mercator",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",${params.x_0 || 0}],PARAMETER["False_Northing",${params.y_0 || 0}],PARAMETER["Central_Meridian",${params.lon_0 || 0}],PARAMETER["Scale_Factor",${params.k || 1.0}],PARAMETER["Latitude_Of_Origin",${params.lat_0 || 0}],UNIT["Meter",1.0]]`;
}

// Register pre-defined systems in Proj4
Object.entries(CRS_DEFINITIONS).forEach(([code, def]) => {
  proj4.defs(code, def);
});

// Helper to construct custom Transverse Mercator Proj4 string
function getCustomTMDefinition(params) {
  const ellipsoid = params.datum === 'arc1960' ? '+a=6378249.145 +rf=293.465' : '+ellps=WGS84';
  const datumShift = params.datum === 'arc1960' ? '+towgs84=-160,-6,-302,0,0,0,0' : '+datum=WGS84';
  return `+proj=tmerc +lat_0=${params.lat0} +lon_0=${params.lon0} +k=${params.scale} +x_0=${params.x0} +y_0=${params.y0} ${ellipsoid} ${datumShift} +units=m +no_defs`;
}

// --- 2. Application State ---

let state = {
  theme: 'light',
  rawXml: null,
  fileName: '',
  fileSize: '',
  coordinateOrder: 'NE', // NE = Northing first, EN = Easting first
  alignments: [],        // Parsed from LandXML
  surfaces: [],          // Parsed from LandXML or GeoTIFF
  activeAlignmentIndex: 0,
  sourceCRSCode: 'wgs84_36n',
  targetCRSCode: 'wgs84_36n',
  transformedAlignment: null,
  
  // Custom CRS Params
  customSourceParams: { lat0: 0, lon0: 33, scale: 0.9996, datum: 'wgs84', x0: 500000, y0: 0 },
  customTargetParams: { lat0: 0, lon0: 33, scale: 0.9996, datum: 'wgs84', x0: 500000, y0: 0 },
  laneWidth: 3.5,

  // Canvas View State
  panX: 0,
  panY: 0,
  zoom: 1.0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  
  // Background Map State
  mapSource: 'none',
  mapTileCache: {}
};

// --- 3. DOM Elements ---

const themeToggleBtn = document.getElementById('theme-toggle-btn');
const sunIcon = themeToggleBtn.querySelector('.sun-icon');
const moonIcon = themeToggleBtn.querySelector('.moon-icon');

const xmlDropzone = document.getElementById('xml-dropzone');
const xmlFileInput = document.getElementById('xml-file-input');
const fileStatus = document.getElementById('file-status');
const selectedFileName = document.getElementById('selected-file-name');
const selectedFileSize = document.getElementById('selected-file-size');
const removeFileBtn = document.getElementById('remove-file-btn');
const coordOrderSelect = document.getElementById('coordinate-order-select');

const surfaceDropzone = document.getElementById('surface-dropzone');
const surfaceFileInput = document.getElementById('surface-file-input');
const surfaceFileStatus = document.getElementById('surface-file-status');
const surfaceSelectedFileName = document.getElementById('surface-selected-file-name');
const surfaceSelectedFileSize = document.getElementById('surface-selected-file-size');
const surfaceRemoveFileBtn = document.getElementById('surface-remove-file-btn');
const surfaceCrsSelect = document.getElementById('surface-crs');
const alignmentCrsSelect = document.getElementById('alignment-crs');
const alignmentCoordOrderSelect = document.getElementById('alignment-coord-order');


const sourceCrsSelect = document.getElementById('source-crs-select');
const targetCrsSelect = document.getElementById('target-crs-select');
const customSourceCrsForm = document.getElementById('custom-source-crs-form');
const customTargetCrsForm = document.getElementById('custom-target-crs-form');
const crsWarning = document.getElementById('crs-warning');
const laneWidthInput = document.getElementById('lane-width-input');
const outputFormatSelect = document.getElementById('output-format-select');

const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const resetViewBtn = document.getElementById('reset-view-btn');
const mapSourceSelect = document.getElementById('map-source-select');
const reloadMapBtn = document.getElementById('reload-map-btn');

const convertBtn = document.getElementById('convert-btn');
const downloadBtn = document.getElementById('download-btn');
const copyCodeBtn = document.getElementById('copy-code-btn');

const alignmentSelectorContainer = document.getElementById('alignment-selector-container');
const alignmentSelect = document.getElementById('alignment-select');
const canvasPlaceholder = document.getElementById('canvas-placeholder');
const alignmentCanvas = document.getElementById('alignment-canvas');

const inspectorCard = document.getElementById('inspector-card');
const metaAlignName = document.getElementById('meta-align-name');
const metaAlignLength = document.getElementById('meta-align-length');
const metaAlignStart = document.getElementById('meta-align-start');
const metaAlignSegments = document.getElementById('meta-align-segments');
const segmentsTableBody = document.getElementById('segments-table-body');

const codeOutput = document.getElementById('code-output').querySelector('code');
const logsConsole = document.getElementById('logs-console');
const clearLogsBtn = document.getElementById('clear-logs-btn');

// --- 4. Event Listeners & UI Binding ---

// Theme Toggle
themeToggleBtn.addEventListener('click', () => {
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'light');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
    state.theme = 'light';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
    state.theme = 'dark';
  }
  drawAlignment();
});

// Log writer helper
function log(message, type = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${type}-log`;
  const time = new Date().toLocaleTimeString();
  line.innerHTML = `<span style="opacity: 0.6;">[${time}]</span> ${message}`;
  logsConsole.appendChild(line);
  logsConsole.scrollTop = logsConsole.scrollHeight;
}

clearLogsBtn.addEventListener('click', () => {
  logsConsole.innerHTML = '';
  log('Logs cleared.', 'system');
});


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
  const wgsOptionsHTML = `
    <optgroup label="WGS 84 (Global)">
      <option value="wgs84_36n" selected>WGS 84 / UTM Zone 36N (EPSG:32636)</option>
      <option value="wgs84_36s">WGS 84 / UTM Zone 36S (EPSG:32736)</option>
      <option value="wgs84_35n">WGS 84 / UTM Zone 35N (EPSG:32635)</option>
      <option value="wgs84_35s">WGS 84 / UTM Zone 35S (EPSG:32735)</option>
      <option value="wgs84_ll">WGS 84 Geographic (Lat/Lon) (EPSG:4326)</option>
    </optgroup>
    <optgroup label="Custom Options">
      <option value="custom_tm">Custom Transverse Mercator</option>
    </optgroup>
  `;
  if(alignmentCrsSelect) alignmentCrsSelect.innerHTML = wgsOptionsHTML;
  if(surfaceCrsSelect) surfaceCrsSelect.innerHTML = wgsOptionsHTML;
}

if (alignmentCrsSelect) {
  alignmentCrsSelect.addEventListener('change', (e) => {
    state.sourceCRSCode = e.target.value;
    log(`Alignment Coordinate System changed to: ${e.target.options[e.target.selectedIndex].text}`);
    // Update loaded alignments
    if (state.alignments.length > 0) {
      const projStr = CRS_DEFINITIONS[state.sourceCRSCode] || CRS_DEFINITIONS['wgs84_36n'];
      state.alignments.forEach(al => {
        al.isGeographic = true;
        al.targetProjStr = projStr;
      });
      state.mapTileCache = {}; // clear cache for new proj
      fitBounds();
    }
  });
}

populateCRS();
if (surfaceCrsSelect) {
  surfaceCrsSelect.addEventListener('change', (e) => {
    state.surfaceCRSCode = e.target.value;
    log(`Surface Coordinate System changed to: ${e.target.options[e.target.selectedIndex].text}`);
    state.mapTileCache = {}; // clear cache
    fitBounds();
  });
}

if (alignmentCoordOrderSelect) {
  alignmentCoordOrderSelect.addEventListener('change', (e) => {
    state.coordinateOrder = e.target.value;
    log(`Coordinate parsing order set to: ${state.coordinateOrder === 'NE' ? 'Northing, Easting' : 'Easting, Northing'}`);
  });
}

// File upload / Drag & Drop
xmlDropzone.addEventListener('click', () => xmlFileInput.click());

xmlDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  xmlDropzone.classList.add('dragover');
});

xmlDropzone.addEventListener('dragleave', () => {
  xmlDropzone.classList.remove('dragover');
});

xmlDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  xmlDropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0], 'alignment');
  }
});

xmlFileInput.addEventListener('change', () => {
  if (xmlFileInput.files.length > 0) {
    handleFile(xmlFileInput.files[0], 'alignment');
  }
});

removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetFileState();
});

coordOrderSelect.addEventListener('change', (e) => {
  state.coordinateOrder = e.target.value;
  log(`Coordinate parsing order set to: ${state.coordinateOrder === 'NE' ? 'Northing, Easting' : 'Easting, Northing'}`);
  if (state.rawXml) {
    parseLandXML(state.rawXml);
  }
});

// CRS Select changes
sourceCrsSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  state.sourceCRSCode = val;
  customSourceCrsForm.style.display = val === 'custom_tm' ? 'flex' : 'none';
  checkCrsWarnings();
  if (state.alignments.length > 0) runTransformation();
});

targetCrsSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  state.targetCRSCode = val;
  customTargetCrsForm.style.display = val === 'custom_tm' ? 'flex' : 'none';
  checkCrsWarnings();
  if (state.alignments.length > 0) runTransformation();
});

laneWidthInput.addEventListener('change', (e) => {
  state.laneWidth = parseFloat(e.target.value) || 3.5;
});

function checkCrsWarnings() {
  if (state.targetCRSCode === 'wgs84_ll' || state.targetCRSCode === 'arc1960_ll') {
    crsWarning.style.display = 'flex';
  } else {
    crsWarning.style.display = 'none';
  }
}

// Custom input updates
function updateCustomParams() {
  state.customSourceParams = {
    lat0: parseFloat(document.getElementById('src-lat0').value) || 0,
    lon0: parseFloat(document.getElementById('src-lon0').value) || 0,
    scale: parseFloat(document.getElementById('src-scale').value) || 0.9996,
    datum: document.getElementById('src-datum').value,
    x0: parseFloat(document.getElementById('src-x0').value) || 500000,
    y0: parseFloat(document.getElementById('src-y0').value) || 0
  };
  state.customTargetParams = {
    lat0: parseFloat(document.getElementById('tgt-lat0').value) || 0,
    lon0: parseFloat(document.getElementById('tgt-lon0').value) || 0,
    scale: parseFloat(document.getElementById('tgt-scale').value) || 0.9996,
    datum: document.getElementById('tgt-datum').value,
    x0: parseFloat(document.getElementById('tgt-x0').value) || 500000,
    y0: parseFloat(document.getElementById('tgt-y0').value) || 0
  };
}

// Bind custom inputs to update state
document.querySelectorAll('.custom-crs-form input, .custom-crs-form select').forEach(elem => {
  elem.addEventListener('change', updateCustomParams);
});

// Active alignment select change
alignmentSelect.addEventListener('change', (e) => {
  state.activeAlignmentIndex = parseInt(e.target.value);
  log(`Selected active alignment: ${state.alignments[state.activeAlignmentIndex].name}`);
  showAlignmentDetails();
  resetCanvasView();
});

// Action buttons
convertBtn.addEventListener('click', runTransformation);
downloadBtn.addEventListener('click', handleExport);
copyCodeBtn.addEventListener('click', copyCodeToClipboard);
outputFormatSelect.addEventListener('change', updateOutputPreview);

// Reset zoom and pan
resetViewBtn.addEventListener('click', () => {
  if(typeof fitBounds !== 'undefined') fitBounds(); else drawAlignment();
});

// Map source toggle
mapSourceSelect.addEventListener('change', (e) => {
  state.mapSource = e.target.value;
  drawAlignment();
});

reloadMapBtn.addEventListener('click', () => {
  state.mapTileCache = {}; // Clear cache to force reload
  drawAlignment();
});

// --- 5. File Processing & Parsing ---


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


function resetFileState() {
  state.rawXml = null;
  state.fileName = '';
  state.fileSize = '';
  state.alignments = [];
  state.transformedAlignment = null;
  
  xmlDropzone.style.display = 'flex';
  fileStatus.style.display = 'none';
  xmlFileInput.value = '';
  
  alignmentSelectorContainer.style.display = 'none';
  inspectorCard.style.display = 'none';
  canvasPlaceholder.style.display = 'flex';
  alignmentCanvas.style.height = '0px'; // hide canvas
  
  convertBtn.disabled = true;
  downloadBtn.disabled = true;
  copyCodeBtn.disabled = true;
  
  codeOutput.textContent = '<!-- Load an alignment and click \'Convert Alignment\' to generate output here -->';
  log('Cleared loaded alignment data.', 'system');
}

// Parses OpenDRIVE structure to JS object geometry representation
function parseOpenDRIVE(xmlText) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error("Invalid OpenDRIVE XML structure");
    }
    
    const roads = xmlDoc.querySelectorAll('OpenDRIVE > road');
    if (!roads || roads.length === 0) {
      throw new Error("No <road> elements found in OpenDRIVE file.");
    }
    
    const parsedAlignments = [];
    
    roads.forEach(road => {
      const name = road.getAttribute('name') || road.getAttribute('id') || 'Unknown_Road';
      const roadLength = parseFloat(road.getAttribute('length')) || 0;
      
      const planView = road.querySelector('planView');
      if (!planView) return;
      
      const geometries = planView.querySelectorAll('geometry');
      const segments = [];
      let calculatedLength = 0;
      
      geometries.forEach(geo => {
        const s = parseFloat(geo.getAttribute('s'));
        const x = parseFloat(geo.getAttribute('x'));
        const y = parseFloat(geo.getAttribute('y'));
        const hdg = parseFloat(geo.getAttribute('hdg'));
        const length = parseFloat(geo.getAttribute('length'));
        
        const line = geo.querySelector('line');
        const arc = geo.querySelector('arc');
        const spiral = geo.querySelector('spiral');
        
        let endX = x + length * Math.cos(hdg);
        let endY = y + length * Math.sin(hdg);
        
        if (line) {
          segments.push({
            type: 'line',
            length: length,
            azimuth: hdg,
            start: { x, y },
            end: { x: endX, y: endY }
          });
          calculatedLength += length;
        } else if (arc) {
          const curvature = parseFloat(arc.getAttribute('curvature'));
          const radius = 1.0 / curvature;
          endX = x + radius * (Math.sin(hdg + length * curvature) - Math.sin(hdg));
          endY = y - radius * (Math.cos(hdg + length * curvature) - Math.cos(hdg));
          
          segments.push({
            type: 'curve',
            length: length,
            azimuth: hdg,
            start: { x, y },
            end: { x: endX, y: endY },
            curvature: curvature,
            radius: Math.abs(1.0 / curvature),
            rot: curvature > 0 ? 'CCW' : 'CW',
            center: {
              x: x - radius * Math.sin(hdg),
              y: y + radius * Math.cos(hdg)
            }
          });
          calculatedLength += length;
        } else if (spiral) {
          const curvStart = parseFloat(spiral.getAttribute('curvStart'));
          const curvEnd = parseFloat(spiral.getAttribute('curvEnd'));
          const curvDot = (curvEnd - curvStart) / length;
          const endPos = exactClothoidIntegration(x, y, hdg, curvStart, curvDot, length);
          
          segments.push({
            type: 'spiral',
            length: length,
            azimuth: hdg,
            start: { x, y },
            end: { x: endPos.x, y: endPos.y },
            curvStart: curvStart,
            curvEnd: curvEnd
          });
          calculatedLength += length;
        }
      });
      
      if (segments.length > 0) {
        parsedAlignments.push({
          name: name,
          length: roadLength > 0 ? roadLength : calculatedLength,
          startStation: 0.0,
          segments: segments,
          isGeographic: true,
          targetProjStr: CRS_DEFINITIONS[state.sourceCRSCode] || CRS_DEFINITIONS['wgs84_36n'],
          verticalProfiles: []
        });
      }
    });
    
    if (parsedAlignments.length === 0) {
      log('No valid <planView> geometries found in OpenDRIVE.', 'error');
      return;
    }
    
    state.alignments = parsedAlignments;
    log(`Successfully parsed ${parsedAlignments.length} alignment(s) from OpenDRIVE.`, 'success');
    populateAlignmentSelector();
    
  } catch(err) {
    log(`Error parsing OpenDRIVE: ${err.message}`, 'error');
  }
}

// Parses ESRI Shapefile / GeoJSON directly in browser
async function parseShapefile(buffer) {
  try {
    log('Parsing Shapefile archive...', 'info');
    const geojson = await shp(buffer);
    
    let features = [];
    if (Array.isArray(geojson)) {
      geojson.forEach(gc => features.push(...gc.features));
    } else {
      features = geojson.features;
    }
    
    const parsedAlignments = [];
    
    features.forEach((feat, index) => {
      if (feat.geometry && (feat.geometry.type === 'LineString' || feat.geometry.type === 'MultiLineString')) {
        const coords = feat.geometry.type === 'LineString' 
            ? [feat.geometry.coordinates] 
            : feat.geometry.coordinates;
        
        coords.forEach((lineCoords, lineIndex) => {
          if (lineCoords.length < 2) return;
          
          let totalLength = 0;
          const segments = [];
          
          for (let i = 0; i < lineCoords.length - 1; i++) {
            const p1 = lineCoords[i];
            const p2 = lineCoords[i+1];
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const segLength = Math.sqrt(dx*dx + dy*dy);
            const azimuth = Math.atan2(dy, dx);
            
            if (segLength > 0.000001) {
              segments.push({
                type: 'line',
                length: segLength,
                azimuth: azimuth,
                start: { x: p1[0], y: p1[1] },
                end: { x: p2[0], y: p2[1] }
              });
              totalLength += segLength;
            }
          }
          
          if (segments.length > 0) {
            const featName = feat.properties && feat.properties.name 
                ? feat.properties.name 
                : `Shapefile_Path_${index}_${lineIndex}`;
                
            parsedAlignments.push({
              name: featName,
              length: totalLength,
              startStation: 0.0,
              segments: segments,
              isGeographic: true,
              targetProjStr: CRS_DEFINITIONS[state.sourceCRSCode] || CRS_DEFINITIONS['wgs84_36n'],
              verticalProfiles: []
            });
          }
        });
      }
    });

    if (parsedAlignments.length === 0) {
      log('No LineString geometries found in the Shapefile.', 'error');
      return;
    }

    state.alignments = parsedAlignments;
    log(`Successfully parsed ${parsedAlignments.length} alignment(s) from Shapefile.`, 'success');
    populateAlignmentSelector();
    
  } catch (err) {
    log(`Error parsing Shapefile: ${err.message}`, 'error');
  }
}



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

// Parses LandXML structure to JS object geometry representation
function parseLandXML(xmlText, type = 'alignment') {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check if valid XML
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing failed: ' + parserError.textContent);
    }
    
    
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
            const coords = pNode.textContent.trim().split(/\s+/).map(Number);
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
            const ids = fNode.textContent.trim().split(/\s+/);
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

    const alignmentNodes = xmlDoc.querySelectorAll('Alignment');
    if (alignmentNodes.length === 0) {
      throw new Error('No <Alignment> elements found in LandXML file.');
    }
    
    state.alignments = [];
    
    alignmentNodes.forEach((alignNode, index) => {
      const name = alignNode.getAttribute('name') || `Alignment_${index + 1}`;
      const desc = alignNode.getAttribute('desc') || '';
      const startSta = parseFloat(alignNode.getAttribute('staStart')) || 0.0;
      const length = parseFloat(alignNode.getAttribute('length')) || 0.0;
      
      const coordGeomNode = alignNode.querySelector('CoordGeom');
      if (!coordGeomNode) {
        log(`Warning: Alignment '${name}' does not contain horizontal geometry (<CoordGeom>). Skipping.`, 'warning');
        return;
      }
      
      const segments = [];
      const childNodes = coordGeomNode.children;
      
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        const type = node.tagName.toLowerCase();
        
        if (type === 'line' || type === 'curve' || type === 'spiral') {
          const seg = parseSegment(node, type);
          if (seg) segments.push(seg);
        }
      }
      
      // Parse vertical profile if present
      const profileNodes = alignNode.querySelectorAll('Profile');
      const verticalProfiles = [];
      profileNodes.forEach(profNode => {
        const profName = profNode.getAttribute('name') || 'Profile';
        const profAlign = profNode.querySelector('ProfAlign');
        if (profAlign) {
          const vps = [];
          profAlign.children.forEach(vNode => {
            const vType = vNode.tagName.toLowerCase();
            if (vType === 'pvi' || vType === 'paracurve') {
              const textContent = vNode.textContent.trim();
              const [sta, elev] = textContent.split(/\s+/).map(Number);
              const vp = { type: vType, sta, elev };
              if (vType === 'paracurve') {
                vp.length = parseFloat(vNode.getAttribute('length')) || 0.0;
              }
              vps.push(vp);
            }
          });
          verticalProfiles.push({ name: profName, elements: vps });
        }
      });
      
      state.alignments.push({
        name,
        desc,
        startStation: startSta,
        length,
        segments,
        isGeographic: true,
        targetProjStr: CRS_DEFINITIONS[state.sourceCRSCode] || CRS_DEFINITIONS['wgs84_36n'],
        verticalProfiles
      });
    });
    
    if (state.alignments.length === 0) {
      throw new Error('No alignments with valid geometries found.');
    }
    
    if (state.alignments.length > 1) {
      showAlignmentSelectionModal();
    } else {
      finalizeAlignmentImport(); fitBounds();
    }
    
  } catch (err) {
    log(`Parsing Error: ${err.message}`, 'error');
    alert(`Failed to load LandXML: ${err.message}`);
  }
}

function showAlignmentSelectionModal() {
  const modal = document.getElementById('alignment-selection-modal');
  const listContainer = document.getElementById('modal-alignments-list');
  listContainer.innerHTML = '';
  
  state.alignments.forEach((align, idx) => {
    const item = document.createElement('div');
    item.className = 'alignment-checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `align-checkbox-${idx}`;
    checkbox.value = idx;
    checkbox.checked = true; // Select all by default
    
    const label = document.createElement('label');
    label.htmlFor = `align-checkbox-${idx}`;
    label.textContent = `${align.name} (L = ${align.length.toFixed(1)}m)`;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    listContainer.appendChild(item);
  });
  
  modal.style.display = 'flex';
  
  document.getElementById('modal-cancel-btn').onclick = () => {
    modal.style.display = 'none';
    resetFileState();
  };
  
  document.getElementById('modal-select-all-btn').onclick = () => {
    const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
  };
  
  document.getElementById('modal-deselect-all-btn').onclick = () => {
    const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  };
  
  document.getElementById('modal-import-btn').onclick = () => {
    const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
    const selectedIndices = [];
    checkboxes.forEach(cb => {
      if (cb.checked) selectedIndices.push(parseInt(cb.value));
    });
    
    if (selectedIndices.length === 0) {
      alert('Please select at least one alignment.');
      return;
    }
    
    // Filter state.alignments
    state.alignments = state.alignments.filter((_, idx) => selectedIndices.includes(idx));
    modal.style.display = 'none';
    finalizeAlignmentImport(); fitBounds();
  };
}

function finalizeAlignmentImport() {
  log(`Successfully parsed ${state.alignments.length} road alignment(s) from LandXML.`, 'success');
  
  // Populate active selector
  alignmentSelect.innerHTML = '';
  state.alignments.forEach((align, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${align.name} (L = ${align.length.toFixed(1)}m)`;
    alignmentSelect.appendChild(opt);
  });
  
  if (state.alignments.length > 1) {
    alignmentSelectorContainer.style.display = 'flex';
  } else {
    alignmentSelectorContainer.style.display = 'none';
  }
  
  state.activeAlignmentIndex = 0;
  showAlignmentDetails();
  
  // Setup Canvas
  canvasPlaceholder.style.display = 'none';
  alignmentCanvas.style.height = '420px';
  resizeCanvas();
  resetCanvasView();
  
  // Enable Conversion
  convertBtn.disabled = false;
}

// Parse string coordinate e.g. "9925000.00 450000.00" based on state setting
function parseCoordString(coordStr) {
  if (!coordStr) return null;
  const tokens = coordStr.trim().split(/\s+/).map(Number);
  if (tokens.length < 2 || isNaN(tokens[0]) || isNaN(tokens[1])) return null;
  
  // Return standard [Easting, Northing] or [x, y]
  if (state.coordinateOrder === 'NE') {
    // northing (Y) is first, easting (X) is second
    return { x: tokens[1], y: tokens[0], z: tokens[2] || 0 };
  } else {
    // easting (X) is first, northing (Y) is second
    return { x: tokens[0], y: tokens[1], z: tokens[2] || 0 };
  }
}

function parseSegment(xmlNode, type) {
  const startNode = xmlNode.querySelector('Start');
  const endNode = xmlNode.querySelector('End');
  
  if (!startNode || !endNode) return null;
  
  const start = parseCoordString(startNode.textContent);
  const end = parseCoordString(endNode.textContent);
  
  if (!start || !end) return null;
  
  const length = parseFloat(xmlNode.getAttribute('length')) || 
                 Math.sqrt((end.x - start.x)**2 + (end.y - start.y)**2);
  
  const segment = {
    type,
    start,
    end,
    length
  };
  
  if (type === 'curve') {
    const centerNode = xmlNode.querySelector('Center');
    segment.center = centerNode ? parseCoordString(centerNode.textContent) : null;
    segment.radius = parseFloat(xmlNode.getAttribute('radius')) || 0.0;
    segment.rot = (xmlNode.getAttribute('rot') || xmlNode.getAttribute('dir') || 'CCW').toUpperCase(); // CW or CCW
    
    // Compute center if radius is given but Center is missing
    if (!segment.center && segment.radius > 0) {
      // Approximate center (midpoint perpendicular direction)
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 2 * segment.radius) {
        const h = Math.sqrt(segment.radius**2 - (dist/2)**2);
        // Perpendicular vector
        const px = -dy / dist;
        const py = dx / dist;
        const sign = segment.rot === 'CCW' ? 1 : -1;
        segment.center = {
          x: mx + sign * px * h,
          y: my + sign * py * h,
          z: start.z
        };
      }
    }
  } else if (type === 'spiral') {
    const rStartStr = xmlNode.getAttribute('radiusStart');
    const rEndStr = xmlNode.getAttribute('radiusEnd');
    
    segment.radiusStart = (rStartStr === 'INF' || !rStartStr) ? Infinity : parseFloat(rStartStr);
    segment.radiusEnd = (rEndStr === 'INF' || !rEndStr) ? Infinity : parseFloat(rEndStr);
    segment.spiType = xmlNode.getAttribute('spiType') || 'clothoid';
  }
  
  return segment;
}

// Display alignment metadata and table segments list
function showAlignmentDetails() {
  const align = state.alignments[state.activeAlignmentIndex];
  if (!align) return;
  
  inspectorCard.style.display = 'flex';
  
  metaAlignName.textContent = align.name;
  metaAlignLength.textContent = `${align.length.toFixed(2)} m`;
  metaAlignStart.textContent = `Sta ${align.startStation.toFixed(2)}`;
  metaAlignSegments.textContent = align.segments.length;
  
  segmentsTableBody.innerHTML = '';
  
  let currentStation = align.startStation;
  
  align.segments.forEach((seg, idx) => {
    const row = document.createElement('tr');
    
    // Type Cell
    const typeTd = document.createElement('td');
    typeTd.innerHTML = `<span class="legend-dot ${seg.type}-dot" style="margin-right: 8px;"></span><strong>${seg.type.toUpperCase()}</strong>`;
    row.appendChild(typeTd);
    
    // Station Cell
    const staTd = document.createElement('td');
    staTd.textContent = `Sta ${currentStation.toFixed(2)}`;
    row.appendChild(staTd);
    
    // Length Cell
    const lenTd = document.createElement('td');
    lenTd.textContent = `${seg.length.toFixed(2)} m`;
    row.appendChild(lenTd);
    
    // Coordinates Cell
    const coordTd = document.createElement('td');
    coordTd.className = 'mono-cell';
    coordTd.innerHTML = `S: (${seg.start.x.toFixed(1)}, ${seg.start.y.toFixed(1)})<br>E: (${seg.end.x.toFixed(1)}, ${seg.end.y.toFixed(1)})`;
    row.appendChild(coordTd);
    
    // Parameters Cell
    const paramTd = document.createElement('td');
    paramTd.className = 'mono-cell';
    if (seg.type === 'curve') {
      paramTd.innerHTML = `R: ${seg.radius.toFixed(1)}m | Rot: ${seg.rot}<br>Center: (${seg.center ? seg.center.x.toFixed(1) : '?'}, ${seg.center ? seg.center.y.toFixed(1) : '?'})`;
    } else if (seg.type === 'spiral') {
      const rs = isFinite(seg.radiusStart) ? `${seg.radiusStart.toFixed(1)}m` : 'INF';
      const re = isFinite(seg.radiusEnd) ? `${seg.radiusEnd.toFixed(1)}m` : 'INF';
      paramTd.innerHTML = `R_Start: ${rs}<br>R_End: ${re} (${seg.spiType})`;
    } else {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const bearing = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
      paramTd.innerHTML = `Azimuth: ${bearing.toFixed(2)}°`;
    }
    row.appendChild(paramTd);
    
    segmentsTableBody.appendChild(row);
    currentStation += seg.length;
  });
  
  if (state.alignments.length > 0) {
    runTransformation();
  } else {
    drawAlignment();
  }
}

// --- 6. Coordinate Conversion Engine ---

function runTransformation() {
  const align = state.alignments[state.activeAlignmentIndex];
  if (!align) return;
  
  updateCustomParams();
  
  log('Starting geodetic coordinate transformation...');
  
  // Resolve source proj4 string
  let sourceProj = '';
  if (state.sourceCRSCode === 'custom_tm') {
    sourceProj = getCustomTMDefinition(state.customSourceParams);
    log(`Custom source definition: ${sourceProj}`, 'system');
  } else {
    sourceProj = CRS_DEFINITIONS[state.sourceCRSCode];
    log(`Source Coordinate System: ${state.sourceCRSCode.toUpperCase()}`, 'system');
  }
  
  // Resolve target proj4 string
  let targetProj = '';
  let isTargetGeographic = false;
  if (state.targetCRSCode === 'custom_tm') {
    targetProj = getCustomTMDefinition(state.customTargetParams);
    log(`Custom target definition: ${targetProj}`, 'system');
  } else {
    targetProj = CRS_DEFINITIONS[state.targetCRSCode];
    isTargetGeographic = state.targetCRSCode === 'wgs84_ll' || state.targetCRSCode === 'arc1960_ll';
    log(`Target Coordinate System: ${state.targetCRSCode.toUpperCase()}`, 'system');
  }
  
  try {
    const transformedSegments = [];
    let prevEndPt = null;
    
    // First, let's transform all points to the target coordinate system.
    // If the target is geographic, we transform to Lat/Lon for output headers/coordinates representation,
    // but for the internal math of the OpenDRIVE file (planView geometry x, y in meters),
    // we MUST define them in a local transverse mercator system centered on the first point of the alignment.
    // Let's implement this dual-projection behavior.
    
    let localProj = null;
    let localCoordsRef = null;
    
    if (isTargetGeographic) {
      log('Target is Geographic (Lat/Lon). Local OpenDRIVE geometry will be projected relative to the alignment origin.', 'warning');
    }
    
    const transformedAlignments = [];
    
    state.alignments.forEach((al) => {
      const transformedSegments = [];
      
      al.segments.forEach((seg, idx) => {
        // Transform coordinates
        const startTgt = proj4(sourceProj, targetProj, [seg.start.x, seg.start.y]);
        const endTgt = proj4(sourceProj, targetProj, [seg.end.x, seg.end.y]);
        
        let centerTgt = null;
        if (seg.center) {
          centerTgt = proj4(sourceProj, targetProj, [seg.center.x, seg.center.y]);
        }
        
        const startObj = { x: startTgt[0], y: startTgt[1], z: seg.start.z };
        const endObj = { x: endTgt[0], y: endTgt[1], z: seg.end.z };
        let centerObj = centerTgt ? { x: centerTgt[0], y: centerTgt[1], z: seg.center.z } : null;
        
        // Calculate local meters projection coordinates if target is geographic
        let localStart = { ...startObj };
        let localEnd = { ...endObj };
        let localCenter = centerObj ? { ...centerObj } : null;
        
        if (isTargetGeographic) {
          // startTgt is [lon, lat]
          if (!localCoordsRef) {
            localCoordsRef = { lon: startTgt[0], lat: startTgt[1] };
            // Setup local TM projection centered on the first point
            localProj = `+proj=tmerc +lat_0=${localCoordsRef.lat} +lon_0=${localCoordsRef.lon} +k=1.0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs`;
            proj4.defs('local_ref_crs', localProj);
            log(`Local origin established at Lon: ${localCoordsRef.lon.toFixed(6)}°, Lat: ${localCoordsRef.lat.toFixed(6)}°`, 'system');
          }
          
          // Transform geographic coordinates to local Cartesian (meters)
          const sLoc = proj4(targetProj, 'local_ref_crs', [startTgt[0], startTgt[1]]);
          const eLoc = proj4(targetProj, 'local_ref_crs', [endTgt[0], endTgt[1]]);
          
          localStart = { x: sLoc[0], y: sLoc[1], z: seg.start.z };
          localEnd = { x: eLoc[0], y: eLoc[1], z: seg.end.z };
          
          if (seg.center) {
            const cLoc = proj4(targetProj, 'local_ref_crs', [centerTgt[0], centerTgt[1]]);
            localCenter = { x: cLoc[0], y: cLoc[1], z: seg.center.z };
          }
        }
        
        transformedSegments.push({
          ...seg,
          // The display coordinates in the target system (uses metric local if geographic to prevent Euclidean distortion)
          start: isTargetGeographic ? localStart : startObj,
          end: isTargetGeographic ? localEnd : endObj,
          center: isTargetGeographic ? localCenter : centerObj,
          // The actual geographic coordinates
          geoStart: startObj,
          geoEnd: endObj,
          geoCenter: centerObj,
          // The coordinates used for planView math (always in meters)
          localStart,
          localEnd,
          localCenter
        });
      });
      
      transformedAlignments.push({
        name: al.name,
        startStation: al.startStation,
        length: al.length,
        segments: transformedSegments,
        isGeographic: isTargetGeographic,
        localRef: localCoordsRef,
        targetProjStr: targetProj,
        verticalProfiles: al.verticalProfiles
      });
    });
    
    state.transformedAlignments = transformedAlignments;
    state.transformedAlignment = transformedAlignments[state.activeAlignmentIndex];
    
    log('Geodetic coordinates transformed successfully!', 'success');
    
    // Generate output preview based on selection
    updateOutputPreview();
    
    // Enable Download
    downloadBtn.disabled = false;
    copyCodeBtn.disabled = false;
    
    // Redraw
    drawAlignment();
    
  } catch (err) {
    log(`Transformation Failed: ${err.message}`, 'error');
    alert(`Conversion error: ${err.message}`);
  }
}

// --- 7. OpenDRIVE (.xodr) Builder ---

function generateOpenDRIVE(transformedAlign) {
  log('Generating OpenDRIVE logical model (.xodr)...');
  
  const segments = transformedAlign.segments;
  let s_cum = 0.0;
  
  // Calculate bounding boxes in target system for header
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  segments.forEach(seg => {
    const pts = [seg.start, seg.end];
    pts.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  });
  
  const today = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<OpenDRIVE xmlns="http://www.opendrive.org">
  <header revMajor="1" revMinor="4" name="PROME Road Design App Alignment Export" version="1.0" date="${today}" north="${maxY.toFixed(3)}" south="${minY.toFixed(3)}" east="${maxX.toFixed(3)}" west="${minX.toFixed(3)}">
    <geoReference><![CDATA[${transformedAlign.targetProjStr.trim()}]]></geoReference>
  </header>
  <road name="${transformedAlign.name}" id="1" length="${transformedAlign.length.toFixed(3)}" junction="-1" rule="LHT">
    <link/>
    <type s="0.0" type="town"/>
    <planView>
`;
  
  // Initialize continuous coordinate and heading integration
  let currentX = segments[0].localStart.x;
  let currentY = segments[0].localStart.y;
  let currentHdg = null;
  
  segments.forEach((seg, idx) => {
    const origStartX = seg.localStart.x;
    const origStartY = seg.localStart.y;
    const origEndX = seg.localEnd.x;
    const origEndY = seg.localEnd.y;
    
    let heading = 0.0;
    let geomNode = '';
    let nextX = currentX;
    let nextY = currentY;
    let nextHdg = currentHdg;
    
    if (seg.type === 'line') {
      heading = Math.atan2(origEndY - origStartY, origEndX - origStartX);
      if (currentHdg !== null) {
        heading = currentHdg;
      }
      geomNode = '      <line/>';
      nextX = currentX + seg.length * Math.cos(heading);
      nextY = currentY + seg.length * Math.sin(heading);
      nextHdg = heading;
    } 
    else if (seg.type === 'curve') {
      const cx = seg.localCenter.x;
      const cy = seg.localCenter.y;
      const r = seg.radius;
      let curvature = 1.0 / r;
      if (seg.rot === 'CW') {
        curvature = -curvature;
      }
      
      const radialAngle = Math.atan2(origStartY - cy, origStartX - cx);
      heading = seg.rot === 'CW' ? radialAngle - Math.PI / 2 : radialAngle + Math.PI / 2;
      heading = Math.atan2(Math.sin(heading), Math.cos(heading));
      
      if (currentHdg !== null) {
        heading = currentHdg;
      }
      
      geomNode = `      <arc curvature="${curvature.toFixed(12)}"/>`;
      
      // Arc integration
      nextX = currentX + (Math.sin(heading + curvature * seg.length) - Math.sin(heading)) / curvature;
      nextY = currentY + (Math.cos(heading) - Math.cos(heading + curvature * seg.length)) / curvature;
      nextHdg = heading + curvature * seg.length;
      nextHdg = Math.atan2(Math.sin(nextHdg), Math.cos(nextHdg));
    } 
    else if (seg.type === 'spiral') {
      let curvStart = isFinite(seg.radiusStart) ? 1.0 / seg.radiusStart : 0.0;
      let curvEnd = isFinite(seg.radiusEnd) ? 1.0 / seg.radiusEnd : 0.0;
      
      if (currentHdg === null) {
        heading = Math.atan2(origEndY - origStartY, origEndX - origStartX);
      } else {
        heading = currentHdg;
      }
      
      // Determine sign using cross-product of tangent and vector to target end
      const tx = Math.cos(heading);
      const ty = Math.sin(heading);
      const vx = origEndX - origStartX;
      const vy = origEndY - origStartY;
      const cross = tx * vy - ty * vx;
      const sign = cross >= 0 ? 1 : -1;
      
      curvStart = sign * curvStart;
      curvEnd = sign * curvEnd;
      
      geomNode = `      <spiral curvStart="${curvStart.toFixed(12)}" curvEnd="${curvEnd.toFixed(12)}"/>`;
      
      // Exact analytical integration for continuous OpenDRIVE geometry
      const delta = exactClothoidIntegration(seg.length, curvStart, curvEnd, seg.length, heading);
      
      nextX = currentX + delta.dx;
      nextY = currentY + delta.dy;
      nextHdg = heading + curvStart * seg.length + ((curvEnd - curvStart) / (2.0 * seg.length)) * seg.length * seg.length;
      nextHdg = Math.atan2(Math.sin(nextHdg), Math.cos(nextHdg));
    }
    
    xml += `    <geometry s="${s_cum.toFixed(6)}" x="${currentX.toFixed(6)}" y="${currentY.toFixed(6)}" hdg="${heading.toFixed(12)}" length="${seg.length.toFixed(6)}">
${geomNode}
    </geometry>
`;
    
    s_cum += seg.length;
    currentX = nextX;
    currentY = nextY;
    currentHdg = nextHdg;
  });
  
  xml += `    </planView>
    <elevationProfile>
`;
  
  // Parse and build vertical profile supporting parabolic curves
  let hasVertical = false;
  if (transformedAlign.verticalProfiles && transformedAlign.verticalProfiles.length > 0) {
    const activeProf = transformedAlign.verticalProfiles[0];
    log(`Applying vertical elevation profile: '${activeProf.name}'`, 'info');
    
    const elements = activeProf.elements;
    const N = elements.length;
    
    if (N > 1) {
      // Calculate grade (slope) between adjacent PVIs
      const grades = [];
      for (let i = 0; i < N - 1; i++) {
        const dx = elements[i+1].sta - elements[i].sta;
        const dy = elements[i+1].elev - elements[i].elev;
        grades.push(dx > 0 ? dy / dx : 0.0);
      }
      
      let s_prev = elements[0].sta;
      let y_prev = elements[0].elev;
      let g_curr = grades[0];
      
      for (let i = 1; i < N - 1; i++) {
        const el = elements[i];
        const S_i = el.sta;
        const Y_i = el.elev;
        const g1 = grades[i-1];
        const g2 = grades[i];
        
        if (el.type === 'paracurve' && el.length > 0) {
          const L_vc = el.length;
          const S_start = S_i - L_vc / 2.0;
          const S_end = S_i + L_vc / 2.0;
          
          // 1. Straight grade segment before the curve start
          if (S_start > s_prev) {
            xml += `      <elevation s="${(s_prev - transformedAlign.startStation).toFixed(3)}" a="${y_prev.toFixed(3)}" b="${g1.toFixed(6)}" c="0.0" d="0.0"/>\n`;
            hasVertical = true;
          }
          
          // 2. Parabolic vertical curve segment
          const Y_start = Y_i - g1 * L_vc / 2.0;
          const coef_c = (g2 - g1) / (2.0 * L_vc);
          xml += `      <elevation s="${(S_start - transformedAlign.startStation).toFixed(3)}" a="${Y_start.toFixed(3)}" b="${g1.toFixed(6)}" c="${coef_c.toFixed(8)}" d="0.0"/>\n`;
          hasVertical = true;
          
          // Next segment starts at curve end
          s_prev = S_end;
          y_prev = Y_i + g2 * L_vc / 2.0;
          g_curr = g2;
        } else {
          // Sharp PVI / straight segment
          xml += `      <elevation s="${(s_prev - transformedAlign.startStation).toFixed(3)}" a="${y_prev.toFixed(3)}" b="${g1.toFixed(6)}" c="0.0" d="0.0"/>\n`;
          hasVertical = true;
          s_prev = S_i;
          y_prev = Y_i;
          g_curr = g2;
        }
      }
      
      // Final tangent segment to the end
      if (elements[N-1].sta > s_prev) {
        xml += `      <elevation s="${(s_prev - transformedAlign.startStation).toFixed(3)}" a="${y_prev.toFixed(3)}" b="${g_curr.toFixed(6)}" c="0.0" d="0.0"/>\n`;
        hasVertical = true;
      }
    }
  }
  
  if (!hasVertical) {
    xml += `      <elevation s="0.0" a="0.0" b="0.0" c="0.0" d="0.0"/>\n`;
  }
  
  xml += `    </elevationProfile>
    <lanes>
      <laneSection s="0.0">
        <left>
          <lane id="1" type="driving" level="false">
            <link/>
            <width s="0.0" a="${state.laneWidth.toFixed(3)}" b="0.0" c="0.0" d="0.0"/>
            <roadMark s="0.0" type="solid" weight="standard" color="white" width="0.120"/>
          </lane>
        </left>
        <center>
          <lane id="0" type="none" level="false">
            <roadMark s="0.0" type="broken" weight="standard" color="white" width="0.120"/>
          </lane>
        </center>
        <right>
          <lane id="-1" type="driving" level="false">
            <link/>
            <width s="0.0" a="${state.laneWidth.toFixed(3)}" b="0.0" c="0.0" d="0.0"/>
            <roadMark s="0.0" type="solid" weight="standard" color="white" width="0.120"/>
          </lane>
        </right>
      </laneSection>
    </lanes>
  </road>
</OpenDRIVE>`;
  
  log('OpenDRIVE model generated successfully.', 'success');
  return xml;
}

// Download file utility
function downloadXodr() {
  if (!state.transformedAlignment) return;
  
  const xmlContent = codeOutput.textContent;
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  
  // Format file name based on input alignment
  const name = state.transformedAlignment.name.replace(/[\s\W]+/g, '_');
  a.download = `${name}_opendrive.xodr`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  
  log(`Downloaded file: ${name}_opendrive.xodr`, 'success');
}

// --- 8. Multi-Format Export Orchestration ---

function updateOutputPreview() {
  if (!state.transformedAlignment) return;
  const format = outputFormatSelect.value;
  
  if (format === 'xodr_opendrive') {
    codeOutput.textContent = generateOpenDRIVE(state.transformedAlignment);
  } else if (format === 'landxml') {
    codeOutput.textContent = generateLandXML(state.transformedAlignment);
  } else if (format === 'shapefile') {
    const geojson = generateShapefileGeoJSON(state.transformedAlignment);
    codeOutput.textContent = "ESRI Shapefile Preview (GeoJSON):\n\n" + JSON.stringify(geojson, null, 2);
  }
}

function handleExport() {
  if (!state.transformedAlignment) return;
  const format = outputFormatSelect.value;
  const name = state.transformedAlignment.name.replace(/[\s\W]+/g, '_');
  
  if (format === 'xodr_opendrive') {
    downloadXodr();
  } else if (format === 'landxml') {
    const xmlContent = codeOutput.textContent;
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_alignment.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    log(`Downloaded file: ${name}_alignment.xml`, 'success');
  } else if (format === 'shapefile') {
    log('Packaging ESRI Shapefile (.zip)...', 'info');
    const geojson = generateShapefileGeoJSON(state.transformedAlignment);
    
    let targetWkt = CRS_WKT[state.targetCRSCode];
    if (state.targetCRSCode === 'custom_tm') {
      targetWkt = getCustomWKT(state.customTargetParams);
    }
    
    shpDownload(geojson, {
      folder: name,
      filename: `${name}_shapefile`,
      wkt: targetWkt
    });
    log(`Triggered shapefile download: ${name}_shapefile.zip`, 'success');
  }
}

// --- 9. LandXML & Shapefile Builders ---

function generateLandXML(transformedAlign) {
  log('Generating LandXML logical model...');
  let segmentsXml = '';
  
  transformedAlign.segments.forEach(seg => {
    if (seg.type === 'line') {
      segmentsXml += `
        <Line length="${seg.length.toFixed(6)}" dir="${((seg.azimuth * 180 / Math.PI) % 360).toFixed(6)}">
          <Start>${seg.start.y.toFixed(6)} ${seg.start.x.toFixed(6)}</Start>
          <End>${seg.end.y.toFixed(6)} ${seg.end.x.toFixed(6)}</End>
        </Line>`;
    } else if (seg.type === 'curve') {
      let dir = seg.rot || "CW";
      if (seg.curvature !== undefined && !seg.rot) {
        dir = seg.curvature > 0 ? "CCW" : "CW";
      }
      
      let radius = seg.radius;
      if (radius === undefined && seg.curvature !== undefined) {
        radius = Math.abs(1.0 / seg.curvature);
      }
      if (radius === undefined || isNaN(radius)) radius = 0;
      
      let centerX = seg.center ? seg.center.x : seg.start.x;
      let centerY = seg.center ? seg.center.y : seg.start.y;
      
      segmentsXml += `
        <Curve length="${(seg.length || 0).toFixed(6)}" radius="${radius.toFixed(6)}" dir="${dir}">
          <Start>${seg.start.y.toFixed(6)} ${seg.start.x.toFixed(6)}</Start>
          <Center>${centerY.toFixed(6)} ${centerX.toFixed(6)}</Center>
          <End>${seg.end.y.toFixed(6)} ${seg.end.x.toFixed(6)}</End>
        </Curve>`;
    } else if (seg.type === 'spiral') {
      let dir = seg.rot || "CW";
      if ((seg.curvStart !== undefined || seg.curvEnd !== undefined) && !seg.rot) {
        dir = (seg.curvStart > 0 || seg.curvEnd > 0) ? "CCW" : "CW";
      }
      
      let rStart = "INF";
      if (seg.radiusStart !== undefined) {
        rStart = (seg.radiusStart === 0 || !isFinite(seg.radiusStart)) ? "INF" : Math.abs(seg.radiusStart).toFixed(6);
      } else if (seg.curvStart !== undefined) {
        rStart = (seg.curvStart === 0) ? "INF" : Math.abs(1.0 / seg.curvStart).toFixed(6);
      }
      
      let rEnd = "INF";
      if (seg.radiusEnd !== undefined) {
        rEnd = (seg.radiusEnd === 0 || !isFinite(seg.radiusEnd)) ? "INF" : Math.abs(seg.radiusEnd).toFixed(6);
      } else if (seg.curvEnd !== undefined) {
        rEnd = (seg.curvEnd === 0) ? "INF" : Math.abs(1.0 / seg.curvEnd).toFixed(6);
      }
      
      segmentsXml += `
        <Spiral length="${(seg.length || 0).toFixed(6)}" radiusStart="${rStart}" radiusEnd="${rEnd}" dir="${dir}" curveType="clothoid">
          <Start>${seg.start.y.toFixed(6)} ${seg.start.x.toFixed(6)}</Start>
          <End>${seg.end.y.toFixed(6)} ${seg.end.x.toFixed(6)}</End>
        </Spiral>`;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.landxml.org/schema/LandXML-1.2 http://www.landxml.org/schema/LandXML-1.2/LandXML-1.2.xsd" version="1.2" date="${new Date().toISOString().split('T')[0]}" time="${new Date().toISOString().split('T')[1].split('.')[0]}">
  <Units>
    <Metric areaUnit="squareMeter" linearUnit="meter" volumeUnit="cubicMeter" temperatureUnit="celsius" pressureUnit="mmHG" />
  </Units>
  <Application name="PROME Hydrology Designer" manufacturer="PROME" version="1.0" />
  <Alignments>
    <Alignment name="${transformedAlign.name}" length="${transformedAlign.length.toFixed(6)}" staStart="${transformedAlign.startStation.toFixed(6)}">
      <CoordGeom>${segmentsXml}
      </CoordGeom>
    </Alignment>
  </Alignments>
</LandXML>`;
}

function generateShapefileGeoJSON(transformedAlign) {
  const points = [];
  
  transformedAlign.segments.forEach(seg => {
    // Generate dense vertices for Shapefile linearity
    const steps = seg.type === 'line' ? 2 : Math.max(10, Math.ceil(seg.length / 2));
    for (let i = 0; i <= steps; i++) {
      const s_local = (i / steps) * seg.length;
      let pos;
      
      if (seg.type === 'line') {
        pos = {
          x: seg.start.x + s_local * Math.cos(seg.azimuth),
          y: seg.start.y + s_local * Math.sin(seg.azimuth)
        };
      } else if (seg.type === 'curve') {
        let curvature = seg.curvature;
        if (curvature === undefined && seg.radius) {
          const sign = seg.rot === 'CW' ? -1 : 1;
          curvature = sign * (1.0 / seg.radius);
        }
        if (!curvature || isNaN(curvature)) curvature = 0.000000001; // Avoid divide by zero
        
        const radius = 1.0 / curvature;
        pos = {
          x: seg.start.x + radius * (Math.sin(seg.azimuth + s_local * curvature) - Math.sin(seg.azimuth)),
          y: seg.start.y - radius * (Math.cos(seg.azimuth + s_local * curvature) - Math.cos(seg.azimuth))
        };
      } else if (seg.type === 'spiral') {
        let curvStart = seg.curvStart;
        if (curvStart === undefined && seg.radiusStart !== undefined) {
          const sign = seg.rot === 'CW' ? -1 : 1;
          curvStart = (seg.radiusStart === 0 || !isFinite(seg.radiusStart)) ? 0 : sign * (1.0 / seg.radiusStart);
        }
        
        let curvEnd = seg.curvEnd;
        if (curvEnd === undefined && seg.radiusEnd !== undefined) {
          const sign = seg.rot === 'CW' ? -1 : 1;
          curvEnd = (seg.radiusEnd === 0 || !isFinite(seg.radiusEnd)) ? 0 : sign * (1.0 / seg.radiusEnd);
        }
        
        const curvDot = (curvEnd - curvStart) / seg.length;
        pos = exactClothoidIntegration(seg.start.x, seg.start.y, seg.azimuth, curvStart, curvDot, s_local);
      }
      
      // GeoJSON requires [longitude/x, latitude/y]
      if (transformedAlign.isGeographic) {
        const geoPos = proj4('local_ref_crs', transformedAlign.targetProjStr, [pos.x, pos.y]);
        points.push([geoPos[0], geoPos[1]]);
      } else {
        points.push([pos.x, pos.y]);
      }
    }
  });

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points
        },
        properties: {
          name: transformedAlign.name,
          length: transformedAlign.length,
          type: "Centerline"
        }
      }
    ]
  };
}

// Copy XML to clipboard
function copyCodeToClipboard() {
  const code = codeOutput.textContent;
  navigator.clipboard.writeText(code).then(() => {
    log('OpenDRIVE XML copied to clipboard!', 'success');
    const oldText = copyCodeBtn.innerHTML;
    copyCodeBtn.innerHTML = 'Copied!';
    setTimeout(() => {
      copyCodeBtn.innerHTML = oldText;
    }, 2000);
  }).catch(err => {
    log('Clipboard copy failed: ' + err.message, 'error');
  });
}

// --- 8. 2D Map Canvas Visualizer ---

// Canvas resize handler
function resizeCanvas() {
  if (canvasPlaceholder.style.display !== 'none') return;
  const rect = alignmentCanvas.parentElement.getBoundingClientRect();
  alignmentCanvas.width = rect.width;
  alignmentCanvas.height = 420;
  drawAlignment();
}

window.addEventListener('resize', resizeCanvas);

// Canvas interactive panning/zooming handlers
alignmentCanvas.addEventListener('mousedown', (e) => {
  state.isDragging = true;
  state.dragStartX = e.clientX - state.panX;
  state.dragStartY = e.clientY - state.panY;
});

window.addEventListener('mousemove', (e) => {
  if (!state.isDragging) return;
  state.panX = e.clientX - state.dragStartX;
  state.panY = e.clientY - state.dragStartY;
  drawAlignment();
});

window.addEventListener('mouseup', () => {
  state.isDragging = false;
});

alignmentCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const zoomFactor = 1.15;
  const mouseX = e.offsetX;
  const mouseY = e.offsetY;
  
  // Convert mouse position to canvas coordinates before zoom
  const mapX = (mouseX - alignmentCanvas.width / 2 - state.panX) / state.zoom;
  const mapY = (mouseY - alignmentCanvas.height / 2 - state.panY) / state.zoom;
  
  if (e.deltaY < 0) {
    state.zoom *= zoomFactor;
  } else {
    state.zoom /= zoomFactor;
  }
  
  // Cap zoom levels
  state.zoom = Math.max(0.01, Math.min(1000, state.zoom));
  
  // Adjust pan to zoom relative to mouse pointer
  state.panX = mouseX - alignmentCanvas.width / 2 - mapX * state.zoom;
  state.panY = mouseY - alignmentCanvas.height / 2 - mapY * state.zoom;
  
  drawAlignment();
});

// Canvas controls binding
document.getElementById('zoom-in-btn').addEventListener('click', () => {
  state.zoom *= 1.3;
  drawAlignment();
});

document.getElementById('zoom-out-btn').addEventListener('click', () => {
  state.zoom /= 1.3;
  drawAlignment();
});

document.getElementById('reset-view-btn').addEventListener('click', resetCanvasView);

function resetCanvasView() {
  state.panX = 0;
  state.panY = 0;
  state.zoom = 1.0;
  
  const alignmentsToDraw = state.transformedAlignments || state.alignments;
  // Removed early return to allow surface drawing
  
  // Calculate bounding box in original coordinate system
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  alignmentsToDraw.forEach(al => {
    al.segments.forEach(seg => {
      const pts = [seg.start, seg.end];
      pts.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });
  });
  
  const w = maxX - minX;
  const h = maxY - minY;
  const cx = minX + w / 2;
  const cy = minY + h / 2;
  
  // Padding around alignment
  const pad = 40;
  const scaleX = (alignmentCanvas.width - pad) / (w || 1);
  const scaleY = (alignmentCanvas.height - pad) / (h || 1);
  
  state.zoom = Math.min(scaleX, scaleY);
  // Cap zoom
  if (state.zoom > 10) state.zoom = 10;
  if (state.zoom < 0.001) state.zoom = 0.001;
  
  state.panX = 0;
  state.panY = 0;
  
  drawAlignment();
}

// --- Map Tile Rendering ---
function drawMapTiles(ctx, cx, cy, canvasToMap, mapToCanvas, align) {
  if (state.mapSource === 'none') return;
  if (!align.targetProjStr) return; // Map tiles require geodetic reference
  
  try {
    const tlLocal = canvasToMap(0, 0);
    const brLocal = canvasToMap(alignmentCanvas.width, alignmentCanvas.height);
    
    // Convert local canvas boundaries to Web Mercator to find tile bounds
    const tlWebMerc = proj4(align.targetProjStr, 'EPSG:3857', [tlLocal.x, tlLocal.y]);
    const brWebMerc = proj4(align.targetProjStr, 'EPSG:3857', [brLocal.x, brLocal.y]);
    
    const minX = Math.min(tlWebMerc[0], brWebMerc[0]);
    const maxX = Math.max(tlWebMerc[0], brWebMerc[0]);
    const minY = Math.min(tlWebMerc[1], brWebMerc[1]);
    const maxY = Math.max(tlWebMerc[1], brWebMerc[1]);
    
    const earthCircumference = 40075016.68557849;
    
    // Calculate accurate Web Mercator zoom
    const webMercWidth = maxX - minX;
    let z = 0;
    if (webMercWidth > 0) {
      z = Math.round(Math.log2((earthCircumference * alignmentCanvas.width) / (webMercWidth * 256)));
    }
    z = Math.max(0, Math.min(19, z));
    
    const tileWidth = earthCircumference / Math.pow(2, z);
    
    const startXTile = Math.max(0, Math.floor((minX + earthCircumference / 2) / tileWidth));
    const endXTile = Math.min(Math.pow(2, z) - 1, Math.floor((maxX + earthCircumference / 2) / tileWidth));
    const startYTile = Math.max(0, Math.floor((earthCircumference / 2 - maxY) / tileWidth));
    const endYTile = Math.min(Math.pow(2, z) - 1, Math.floor((earthCircumference / 2 - minY) / tileWidth));
    
    const urls = {
      'esri': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      'osm': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      'carto': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'google': 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      'sentinel': 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg'
    };
    
    const maxTiles = 100;
    let tileCount = 0;
    
    for (let x = startXTile; x <= endXTile; x++) {
      for (let y = startYTile; y <= endYTile; y++) {
        if (tileCount++ > maxTiles) break;
        
        let url = '';
        if (state.mapSource === 'bing') {
          let quadKey = '';
          for (let i = z; i > 0; i--) {
            let digit = '0';
            const mask = 1 << (i - 1);
            if ((x & mask) !== 0) digit = String.fromCharCode(digit.charCodeAt(0) + 1);
            if ((y & mask) !== 0) digit = String.fromCharCode(digit.charCodeAt(0) + 2);
            quadKey += digit;
          }
          url = `https://ecn.t3.tiles.virtualearth.net/tiles/a${quadKey}.jpeg?g=1`;
        } else {
          url = urls[state.mapSource].replace('{z}', z).replace('{x}', x).replace('{y}', y);
        }

        let img = state.mapTileCache[url];
        
        if (!img) {
          img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = url;
          img.loaded = false;
          img.onload = () => {
            img.loaded = true;
            requestAnimationFrame(drawAlignment);
          };
          state.mapTileCache[url] = img;
        }
        
        if (img.loaded) {
          // Find bounds of this specific tile in Web Mercator
          const tileMinWMX = x * tileWidth - earthCircumference / 2;
          const tileMaxWMY = earthCircumference / 2 - y * tileWidth;
          const tileMaxWMX = tileMinWMX + tileWidth;
          const tileMinWMY = tileMaxWMY - tileWidth;
          
          // Project the bounds back to Local CRS
          const tlWM_Local = proj4('EPSG:3857', align.targetProjStr, [tileMinWMX, tileMaxWMY]);
          const brWM_Local = proj4('EPSG:3857', align.targetProjStr, [tileMaxWMX, tileMinWMY]);
          
          // Map to Canvas space
          const tlC = mapToCanvas(tlWM_Local[0], tlWM_Local[1]);
          const brC = mapToCanvas(brWM_Local[0], brWM_Local[1]);
          
          ctx.drawImage(img, tlC.x, tlC.y, brC.x - tlC.x, brC.y - tlC.y);
        }
      }
    }
  } catch (e) {
    console.warn('Map projection failed. Ensure Source Coordinate System is set.', e);
  }
}

// Exact clothoid integration using Fresnel integrals
function exactClothoidIntegration(s, curvStart, curvEnd, length, hdgStart) {
  const c = (curvEnd - curvStart) / length;
  const A = c / 2.0;
  const B = curvStart;
  const C_angle = hdgStart;
  
  if (Math.abs(A) < 1e-12) {
    if (Math.abs(B) < 1e-12) {
      return { dx: s * Math.cos(C_angle), dy: s * Math.sin(C_angle) };
    } else {
      return {
        dx: (Math.sin(C_angle + B * s) - Math.sin(C_angle)) / B,
        dy: (Math.cos(C_angle) - Math.cos(C_angle + B * s)) / B
      };
    }
  }
  
  const signA = Math.sign(A);
  const absA = Math.abs(A);
  const B_2A = B / (2.0 * A);
  const phi_0 = C_angle - (B * B) / (4.0 * A);
  const factor = Math.sqrt(Math.PI / (2.0 * absA));
  
  function evalV(u) {
    return Math.sqrt(2.0 * absA / Math.PI) * (u + B_2A);
  }
  
  const v0 = evalV(0);
  const vs = evalV(s);
  
  const f0 = fresnel(v0);
  const fs = fresnel(vs);
  
  const dC = fs[1] - f0[1];
  const dS = fs[0] - f0[0];
  
  const cosPhi = Math.cos(phi_0);
  const sinPhi = Math.sin(phi_0);
  
  const dx = factor * (cosPhi * dC - signA * sinPhi * dS);
  const dy = factor * (sinPhi * dC + signA * cosPhi * dS);
  
  return { dx, dy };
}

// Math function to draw clothoid spirals using exact analytical math
function getSpiralPoints(startX, startY, startHdg, length, curvStart, curvEnd, numSteps = 50) {
  const pts = [{ x: startX, y: startY }];
  const ds = length / numSteps;
  
  for (let i = 1; i <= numSteps; i++) {
    const s = i * ds;
    const delta = exactClothoidIntegration(s, curvStart, curvEnd, length, startHdg);
    pts.push({ x: startX + delta.dx, y: startY + delta.dy });
  }
  return pts;
}

// Main rendering routine
window.drawAlignment = function drawAlignment() {
  if (canvasPlaceholder.style.display !== 'none' && !alignmentCanvas.width) return;
  
  const ctx = alignmentCanvas.getContext('2d');
  
  // Clear Canvas
  ctx.clearRect(0, 0, alignmentCanvas.width, alignmentCanvas.height);
  
  // Check if alignment exists
  let align = state.transformedAlignment || state.alignments[state.activeAlignmentIndex];
  if (!align && state.surfaces.length === 0) return;
  const mapProjInfo = align || { targetProjStr: CRS_DEFINITIONS[state.surfaceCRSCode || 'wgs84_36n'] };
  
  // Get bounding box of coordinates to center
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  const alignmentsToDraw = state.transformedAlignments || state.alignments;
  // Removed early return to allow surface drawing
  
  alignmentsToDraw.forEach(al => {
    al.segments.forEach(seg => {
      const startP = seg.start;
      const endP = seg.end;
      
      [startP, endP].forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });
  });
  
  // Safe bounds calculation if array is empty
  if (minX === Infinity) {
    minX = -100; maxX = 100; minY = -100; maxY = 100;
  }
  
  const cx = minX + (maxX - minX) / 2;
  const cy = minY + (maxY - minY) / 2;
  
  // Math mapping from Map coordinate meters to Canvas coordinates
  function mapToCanvas(mx, my) {
    // Northing Y increases upwards in geodetic, but downward in canvas
    const x = alignmentCanvas.width / 2 + (mx - cx) * state.zoom + state.panX;
    const y = alignmentCanvas.height / 2 - (my - cy) * state.zoom + state.panY;
    return { x, y };
  }
  
  function canvasToMap(px, py) {
    const mx = cx + (px - alignmentCanvas.width / 2 - state.panX) / state.zoom;
    const my = cy - (py - alignmentCanvas.height / 2 - state.panY) / state.zoom;
    return { x: mx, y: my };
  }
  
  // 1. Draw Map Tiles
  drawMapTiles(ctx, cx, cy, canvasToMap, mapToCanvas, mapProjInfo);
  
  // 2. Draw Background Grid
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  
  const gridSize = 40;
  // Account for panning and zoom to draw dynamic grid
  const startGridX = Math.floor((-state.panX - alignmentCanvas.width / 2) / gridSize) * gridSize;
  const endGridX = Math.ceil((alignmentCanvas.width / 2 - state.panX) / gridSize) * gridSize;
  const startGridY = Math.floor((-state.panY - alignmentCanvas.height / 2) / gridSize) * gridSize;
  const endGridY = Math.ceil((alignmentCanvas.height / 2 - state.panY) / gridSize) * gridSize;
  
  for (let x = startGridX; x < endGridX; x += gridSize) {
    const drawX = alignmentCanvas.width / 2 + x + state.panX;
    ctx.beginPath();
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, alignmentCanvas.height);
    ctx.stroke();
  }
  for (let y = startGridY; y < endGridY; y += gridSize) {
    const drawY = alignmentCanvas.height / 2 + y + state.panY;
    ctx.beginPath();
    ctx.moveTo(0, drawY);
    ctx.lineTo(alignmentCanvas.width, drawY);
    ctx.stroke();
  }
  
  // Draw Coordinate Axis Center indicator
  const originCanvas = mapToCanvas(cx, cy);
  ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.1)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(originCanvas.x, 0); ctx.lineTo(originCanvas.x, alignmentCanvas.height);
  ctx.moveTo(0, originCanvas.y); ctx.lineTo(alignmentCanvas.width, originCanvas.y);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Display geodetic grid label coordinates at the origin intersection
  ctx.font = '10px var(--font-mono)';
  ctx.fillStyle = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.3)';
  if (align.isGeographic && align.targetProjStr) {
    try {
      const geoCenter = proj4('local_ref_crs', align.targetProjStr, [cx, cy]);
      ctx.fillText(`Center: Lon: ${geoCenter[0].toFixed(6)}°, Lat: ${geoCenter[1].toFixed(6)}°`, originCanvas.x + 8, originCanvas.y - 8);
    } catch (e) {
      ctx.fillText(`Center: X: ${cx.toFixed(1)} m, Y: ${cy.toFixed(1)} m`, originCanvas.x + 8, originCanvas.y - 8);
    }
  } else {
    ctx.fillText(`Center: X: ${cx.toFixed(1)} m, Y: ${cy.toFixed(1)} m`, originCanvas.x + 8, originCanvas.y - 8);
  }
  
  // Draw Alignment segments in loops
  alignmentsToDraw.forEach((al, alIdx) => {
    const isActive = (alIdx === state.activeAlignmentIndex);
    let currentHdg = null;
    let s_station = al.startStation;
    
    al.segments.forEach((seg, idx) => {
      const sPos = mapToCanvas(seg.start.x, seg.start.y);
      const ePos = mapToCanvas(seg.end.x, seg.end.y);
      
      // Set color based on geometry type
      if (seg.type === 'line') {
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-geom-line').trim();
      } else if (seg.type === 'curve') {
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-geom-curve').trim();
      } else {
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-geom-spiral').trim();
      }
      
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.globalAlpha = isActive ? 1.0 : 0.35;
      ctx.lineCap = 'round';
      
      if (seg.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(sPos.x, sPos.y);
        ctx.lineTo(ePos.x, ePos.y);
        ctx.stroke();
        
        currentHdg = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
      } 
      else if (seg.type === 'curve') {
        if (seg.center) {
          const cPos = mapToCanvas(seg.center.x, seg.center.y);
          const r_px = seg.radius * state.zoom;
          
          // Calculate angles
          const radialAngleStart = Math.atan2(seg.start.y - seg.center.y, seg.start.x - seg.center.x);
          const radialAngleEnd = Math.atan2(seg.end.y - seg.center.y, seg.end.x - seg.center.x);
          
          ctx.beginPath();
          const anticlockwise = seg.rot === 'CCW'; 
          
          ctx.arc(cPos.x, cPos.y, r_px, -radialAngleStart, -radialAngleEnd, anticlockwise);
          ctx.stroke();
          
          // Update current heading
          const radialAngle = Math.atan2(seg.start.y - seg.center.y, seg.start.x - seg.center.x);
          const heading = seg.rot === 'CW' ? radialAngle - Math.PI / 2 : radialAngle + Math.PI / 2;
          const angularSpan = seg.length / seg.radius;
          currentHdg = seg.rot === 'CW' ? heading - angularSpan : heading + angularSpan;
        } else {
          // Fallback simple line
          ctx.beginPath();
          ctx.moveTo(sPos.x, sPos.y);
          ctx.lineTo(ePos.x, ePos.y);
          ctx.stroke();
        }
      } 
      else if (seg.type === 'spiral') {
        // Draw spiral numerically by sampling clothoid points
        if (currentHdg === null) {
          currentHdg = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
        }
        
        // Curvature signs based on bending
        const tx = Math.cos(currentHdg);
        const ty = Math.sin(currentHdg);
        const vx = seg.end.x - seg.start.x;
        const vy = seg.end.y - seg.start.y;
        const cross = tx * vy - ty * vx;
        const sign = cross >= 0 ? 1 : -1;
        
        const cStart = sign * (isFinite(seg.radiusStart) ? 1.0 / seg.radiusStart : 0.0);
        const cEnd = sign * (isFinite(seg.radiusEnd) ? 1.0 / seg.radiusEnd : 0.0);
        
        // Sample spiral points in map meters space
        const numSamples = 30;
        const spiralPts = getSpiralPoints(seg.start.x, seg.start.y, currentHdg, seg.length, cStart, cEnd, numSamples);
        
        ctx.beginPath();
        const pStart = mapToCanvas(spiralPts[0].x, spiralPts[0].y);
        ctx.moveTo(pStart.x, pStart.y);
        
        for (let i = 1; i < spiralPts.length; i++) {
          const pNode = mapToCanvas(spiralPts[i].x, spiralPts[i].y);
          ctx.lineTo(pNode.x, pNode.y);
        }
        ctx.stroke();
        
        // Update heading
        currentHdg = currentHdg + (cStart + cEnd) * seg.length / 2.0;
      }
      
      // Only draw ticks for the active alignment
      if (isActive) {
        ctx.globalAlpha = 1.0;
        drawStationTicks(ctx, seg, s_station, mapToCanvas, currentHdg, isLight);
      }
      s_station += seg.length;
    });
    
    // Draw Start & End markers ONLY for active alignment
    if (isActive && al.segments.length > 0) {
      ctx.globalAlpha = 1.0;
      const startPt = al.segments[0].start;
      const endPt = al.segments[al.segments.length - 1].end;
      
      const startC = mapToCanvas(startPt.x, startPt.y);
      const endC = mapToCanvas(endPt.x, endPt.y);
      
      // Start Circle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(startC.x, startC.y, 6, 0, 2*Math.PI);
      ctx.fill();
      ctx.font = 'bold 11px var(--font-sans)';
      ctx.fillText("START (Sta 0.0)", startC.x + 10, startC.y + 4);
      
      // End Circle
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(endC.x, endC.y, 6, 0, 2*Math.PI);
      ctx.fill();
      ctx.fillText(`END (Sta ${al.length.toFixed(1)})`, endC.x + 10, endC.y + 4);
    }
  });
}

// Draw stationing ticks along road segments
function drawStationTicks(ctx, seg, startSta, mapToCanvas, heading, isLight) {
  // Let's draw a tick mark every 100m along the segment.
  // We can calculate the distance to the next multiple of 100m
  const interval = 100;
  const firstTick = Math.ceil(startSta / interval) * interval;
  
  ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
  ctx.strokeStyle = isLight ? '#475569' : '#94a3b8';
  ctx.lineWidth = 1;
  ctx.font = '9px var(--font-mono)';
  
  for (let s_val = firstTick; s_val <= startSta + seg.length; s_val += interval) {
    const distOnSeg = s_val - startSta;
    
    let px = 0, py = 0, hdg = 0;
    
    if (seg.type === 'line') {
      hdg = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
      px = seg.start.x + Math.cos(hdg) * distOnSeg;
      py = seg.start.y + Math.sin(hdg) * distOnSeg;
    } 
    else if (seg.type === 'curve') {
      if (!seg.center) continue;
      const r = seg.radius;
      const angleStart = Math.atan2(seg.start.y - seg.center.y, seg.start.x - seg.center.x);
      const angleSpan = distOnSeg / r;
      const angle = seg.rot === 'CW' ? angleStart - angleSpan : angleStart + angleSpan;
      
      px = seg.center.x + Math.cos(angle) * r;
      py = seg.center.y + Math.sin(angle) * r;
      hdg = seg.rot === 'CW' ? angle - Math.PI / 2 : angle + Math.PI / 2;
    } 
    else if (seg.type === 'spiral') {
      // Calculate position numerically
      const tx = Math.cos(heading);
      const ty = Math.sin(heading);
      const vx = seg.end.x - seg.start.x;
      const vy = seg.end.y - seg.start.y;
      const cross = tx * vy - ty * vx;
      const sign = cross >= 0 ? 1 : -1;
      
      const cStart = sign * (isFinite(seg.radiusStart) ? 1.0 / seg.radiusStart : 0.0);
      const cEnd = sign * (isFinite(seg.radiusEnd) ? 1.0 / seg.radiusEnd : 0.0);
      
      const pts = getSpiralPoints(seg.start.x, seg.start.y, heading, seg.length, cStart, cEnd, 30);
      
      // Interpolate along the sampled list
      const ratio = distOnSeg / seg.length;
      const idx = Math.min(pts.length - 2, Math.floor(ratio * (pts.length - 1)));
      const nextIdx = idx + 1;
      const rem = (ratio * (pts.length - 1)) - idx;
      
      px = pts[idx].x + (pts[nextIdx].x - pts[idx].x) * rem;
      py = pts[idx].y + (pts[nextIdx].y - pts[idx].y) * rem;
      
      const localCurv = cStart + (cEnd - cStart) * ratio;
      hdg = heading + cStart * distOnSeg + ((cEnd - cStart) / (2 * seg.length)) * distOnSeg**2;
    }
    
    // Perpendicular vector for tick lines
    const pX = -Math.sin(hdg);
    const pY = Math.cos(hdg);
    
    // Tick size in pixels
    const tickLen = 6;
    
    const centerC = mapToCanvas(px, py);
    const tickStart = {
      x: centerC.x - pX * tickLen,
      y: centerC.y + pY * tickLen
    };
    const tickEnd = {
      x: centerC.x + pX * tickLen,
      y: centerC.y - pY * tickLen
    };
    
    ctx.beginPath();
    ctx.moveTo(tickStart.x, tickStart.y);
    ctx.lineTo(tickEnd.x, tickEnd.y);
    ctx.stroke();
    
    // Text Label: "K0+100" style or just station value
    const text = `K${Math.floor(s_val / 1000)}+${String(s_val % 1000).padStart(3, '0')}`;
    // Position text offset
    ctx.fillText(text, tickEnd.x + 4, tickEnd.y - 4);
  }
}
log('Application ready. Load a LandXML file to start.');
