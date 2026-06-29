// Coordinate Reference Systems
const CRS_DEFINITIONS = {
  'wgs84_ll': '+proj=longlat +datum=WGS84 +no_defs',
  'wgs84_35n': '+proj=utm +zone=35 +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  'wgs84_35s': '+proj=utm +zone=35 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  'wgs84_36n': '+proj=utm +zone=36 +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  'wgs84_36s': '+proj=utm +zone=36 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs'
};

// Register projections
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs');
Object.entries(CRS_DEFINITIONS).forEach(([code, def]) => {
  proj4.defs(code, def);
});

// App State
const state = {
  crs: 'wgs84_36n',
  mapSource: 'google',
  standard: 'aashto',
  roadType: 'arterial',
  ukdmrbRelaxation: 0,
  designSpeed: 80,
  eMax: 0.07,
  rMin: 252,
  
  mode: 'draw', // 'draw' or 'select'
  
  alignments: [], // Array of { name, pis }
  activeAlignmentIndex: -1,
  
  pis: [], // Points of active alignment
  selectedPiIndex: -1,
  
  panX: 0,
  panY: 0,
  zoom: 1.0, // pixels per meter
  
  isDragging: false,
  isPanning: false,
  lastMouseX: 0,
  lastMouseY: 0,
  
  mapTileCache: {},
  activeTab: 'pis'
};

// AASHTO Side Friction Factors (Green Book approximate values)
const AASHTO_FRICTION = {
  40: 0.16,
  50: 0.16,
  60: 0.15,
  80: 0.14,
  100: 0.13,
  120: 0.12
};

// Uganda MoW Side Friction Factors
const UGANDA_MOW_FRICTION = {
  40: 0.17,
  50: 0.16,
  60: 0.15,
  70: 0.15,
  80: 0.14,
  90: 0.135,
  100: 0.13,
  120: 0.11
};

// Uganda MoW Design Speed mappings (Design Class + Terrain -> Speed)
const UGANDA_MOW_SPEEDS = {
  'Ia': { 'level': 120, 'rolling': 100, 'mountainous': 80, 'escarpment': 70 },
  'Ib': { 'level': 100, 'rolling': 80, 'mountainous': 70, 'escarpment': 60 },
  'II': { 'level': 80, 'rolling': 70, 'mountainous': 60, 'escarpment': 50 },
  'III': { 'level': 70, 'rolling': 60, 'mountainous': 50, 'escarpment': 40 }
};

// Uganda MoW Relative Gradients (1/G) by Design Speed
const UGANDA_MOW_MAX_REL_GRADIENT = {
  40: 0.0070,
  50: 0.0065,
  60: 0.0060,
  70: 0.0055,
  80: 0.0050,
  90: 0.00475,
  100: 0.0045,
  120: 0.0040
};

// Uganda MoW Lane Width by Design Class (m)
const UGANDA_MOW_LANE_WIDTH = {
  'Ia': 3.5,
  'Ib': 3.5,
  'II': 3.5,
  'III': 3.0
};

// UK DMRB Desirable Minimum Radii (CD 109)
const UK_DMRB_RADII = {
  50: 90,
  60: 127,
  70: 255,
  85: 360,
  100: 510,
  120: 720
};

// DOM Elements
const canvas = document.getElementById('alignment-canvas');
const ctx = canvas.getContext('2d');
const coordDisplay = document.getElementById('coord-display');
const scaleDisplay = document.getElementById('scale-display');
const dataContainer = document.getElementById('data-container');


// --- Multiple Alignments Logic ---
function updateAlignmentDropdown() {
  const select = document.getElementById('active-alignment');
  if (state.alignments.length > 1) {
    select.style.display = 'block';
    select.innerHTML = '';
    state.alignments.forEach((aln, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = aln.name;
      if (idx === state.activeAlignmentIndex) opt.selected = true;
      select.appendChild(opt);
    });
  } else {
    select.style.display = 'none';
  }
}

document.getElementById('active-alignment').addEventListener('change', (e) => {
  // Save current pis to active alignment
  if (state.activeAlignmentIndex >= 0 && state.alignments[state.activeAlignmentIndex]) {
    state.alignments[state.activeAlignmentIndex].pis = [...state.pis];
  }
  
  state.activeAlignmentIndex = parseInt(e.target.value);
  state.pis = [...state.alignments[state.activeAlignmentIndex].pis];
  state.selectedPiIndex = -1;
  updateDataPanel();
  draw();
});

function syncActiveAlignment() {
  if (state.activeAlignmentIndex >= 0 && state.alignments[state.activeAlignmentIndex]) {
    state.alignments[state.activeAlignmentIndex].pis = [...state.pis];
  }
}

// Resize Canvas
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  draw();
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

// Design Criteria Calculator
function updateDesignCriteria() {
  const v = state.designSpeed;
  let rMin = 252;
  let f = 0.14;
  
  if (state.standard === 'aashto') {
    f = AASHTO_FRICTION[v] || 0.14;
    // R_min = V^2 / 127(e + f)
    rMin = (v * v) / (127 * (state.eMax + f));
    rMin = Math.ceil(rMin);
    
    document.getElementById('criteria-title').textContent = 'AASHTO Criteria Info';
    document.getElementById('info-f-row').style.display = 'flex';
    document.getElementById('info-f').textContent = f.toFixed(2);
    document.getElementById('info-emax').textContent = (state.eMax * 100) + '%';
  } 
  else if (state.standard === 'ukdmrb') {
    const speedSteps = [50, 60, 70, 85, 100, 120];
    let speedIndex = speedSteps.indexOf(v);
    if (speedIndex === -1) speedIndex = 3; // default to 85 if not found
    
    // Apply relaxation (step down)
    let relaxedIndex = speedIndex - state.ukdmrbRelaxation;
    if (relaxedIndex < 0) relaxedIndex = 0; // Cap at 50 km/h minimum radius
    
    const relaxedSpeed = speedSteps[relaxedIndex];
    rMin = UK_DMRB_RADII[relaxedSpeed] || 90;
    
    document.getElementById('criteria-title').textContent = 'UK DMRB (CD 109) Criteria Info';
    document.getElementById('info-f-row').style.display = 'none'; // Friction not directly tweaked
    document.getElementById('info-emax').textContent = (state.eMax * 100) + '% (Max)';
  }
  else if (state.standard === 'ugandamow') {
    f = UGANDA_MOW_FRICTION[v] || 0.14;
    rMin = (v * v) / (127 * (state.eMax + f));
    rMin = Math.ceil(rMin);
    
    document.getElementById('criteria-title').textContent = 'Uganda MoW Criteria Info';
    document.getElementById('info-f-row').style.display = 'flex';
    document.getElementById('info-f').textContent = f.toFixed(2);
    document.getElementById('info-emax').textContent = (state.eMax * 100) + '%';
  }
  
  state.rMin = rMin;
  document.getElementById('info-rmin').textContent = rMin + ' m';
  
  // Automatically update any PI that has a radius smaller than the new minimum (unless it's explicitly 0)
  let changed = false;
  state.pis.forEach(pi => {
    if (pi.r !== undefined && pi.r !== 0 && pi.r < rMin) {
      pi.r = rMin;
      changed = true;
    }
  });
  
  if (changed) {
    updateDataPanel();
    draw();
  }
}

// Event Listeners for Settings
document.getElementById('crs-select').addEventListener('change', (e) => {
  state.crs = e.target.value;
  state.mapTileCache = {};
  draw();
});

document.getElementById('map-source').addEventListener('change', (e) => {
  state.mapSource = e.target.value;
  draw();
});

// Standard Dropdown Logic
document.getElementById('design-standard').addEventListener('change', (e) => {
  const std = e.target.value;
  state.standard = std;
  
  // Hide all standard groups
  document.querySelectorAll('.standard-group').forEach(el => el.style.display = 'none');
  
  // Show selected standard group
  document.getElementById(`fields-${std}`).style.display = 'block';
  
  // Sync state values based on visible inputs
  if (std === 'aashto') {
    state.designSpeed = parseInt(document.getElementById('aashto-design-speed').value);
    state.eMax = parseInt(document.getElementById('aashto-emax').value) / 100;
  } else if (std === 'ukdmrb') {
    state.designSpeed = parseInt(document.getElementById('ukdmrb-design-speed').value);
    const env = document.getElementById('ukdmrb-env').value;
    state.eMax = env === 'rural' ? 0.07 : 0.05;
    state.ukdmrbRelaxation = parseInt(document.getElementById('ukdmrb-relaxation').value);
  } else if (std === 'ugandamow') {
    state.designSpeed = parseInt(document.getElementById('ugandamow-design-speed').value);
    state.eMax = parseInt(document.getElementById('ugandamow-emax').value) / 100;
  }
  
  updateDesignCriteria();
});

// Sync changes from specific fields
document.querySelectorAll('.ds-select').forEach(el => {
  el.addEventListener('change', (e) => {
    state.designSpeed = parseInt(e.target.value);
    updateDesignCriteria();
  });
});

document.getElementById('aashto-emax').addEventListener('change', (e) => {
  if (state.standard === 'aashto') {
    state.eMax = parseInt(e.target.value) / 100;
    updateDesignCriteria();
  }
});

document.getElementById('ugandamow-emax').addEventListener('change', (e) => {
  if (state.standard === 'ugandamow') {
    state.eMax = parseInt(e.target.value) / 100;
    updateDesignCriteria();
  }
});

document.getElementById('ukdmrb-env').addEventListener('change', (e) => {
  if (state.standard === 'ukdmrb') {
    state.eMax = e.target.value === 'rural' ? 0.07 : 0.05;
    updateDesignCriteria();
  }
});

document.getElementById('ukdmrb-relaxation').addEventListener('change', (e) => {
  if (state.standard === 'ukdmrb') {
    state.ukdmrbRelaxation = parseInt(e.target.value);
    updateDesignCriteria();
  }
});

// Uganda MoW auto-update Design Speed based on Design Class + Terrain
function handleMoWChange() {
  if (state.standard === 'ugandamow') {
    const dClass = document.getElementById('ugandamow-design-class').value;
    const terrain = document.getElementById('ugandamow-terrain').value;
    const suggestedSpeed = UGANDA_MOW_SPEEDS[dClass] && UGANDA_MOW_SPEEDS[dClass][terrain];
    
    if (suggestedSpeed) {
      document.getElementById('ugandamow-design-speed').value = suggestedSpeed;
      state.designSpeed = suggestedSpeed;
    }
    updateDesignCriteria();
  }
}

document.getElementById('ugandamow-design-class').addEventListener('change', handleMoWChange);
document.getElementById('ugandamow-terrain').addEventListener('change', handleMoWChange);

// Toolbar Listeners
document.getElementById('tool-draw').addEventListener('click', () => setMode('draw'));
document.getElementById('tool-select').addEventListener('click', () => setMode('select'));
document.getElementById('clear-btn').addEventListener('click', () => {
  if (confirm('Clear all alignment data?')) {
    state.pis = [];
    state.selectedPiIndex = -1;
    updateDataPanel();
    draw();
  }
});

function setMode(mode) {
  state.mode = mode;
  document.getElementById('tool-draw').style.background = mode === 'draw' ? 'var(--secondary-color)' : 'white';
  document.getElementById('tool-draw').style.borderColor = mode === 'draw' ? 'var(--primary-color)' : 'var(--border-color)';
  document.getElementById('tool-select').style.background = mode === 'select' ? 'var(--secondary-color)' : 'white';
  document.getElementById('tool-select').style.borderColor = mode === 'select' ? 'var(--primary-color)' : 'var(--border-color)';
  scaleDisplay.textContent = 'Mode: ' + (mode === 'draw' ? 'Draw PI' : 'Select/Move PI');
}

// Math Helpers
function canvasToMap(x, y) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: (x - cx) / state.zoom + state.panX,
    y: -(y - cy) / state.zoom + state.panY // inverted Y for CAD coords
  };
}

function mapToCanvas(mx, my) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: (mx - state.panX) * state.zoom + cx,
    y: -(my - state.panY) * state.zoom + cy
  };
}

// Mouse Interaction
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  if (e.button === 1 || e.shiftKey) { // Middle click or shift = pan
    state.isPanning = true;
    state.lastMouseX = mx;
    state.lastMouseY = my;
    canvas.style.cursor = 'grabbing';
    return;
  }
  
  const mapCoords = canvasToMap(mx, my);
  
  if (state.mode === 'draw') {
    // Add new PI
    state.pis.push({
      id: 'PI-' + (state.pis.length + 1),
      x: mapCoords.x,
      y: mapCoords.y,
      r: state.pis.length > 0 ? state.rMin : undefined, // first and last PI don't need curve radius
      lsIn: 0, lsOut: 0
    });
    state.selectedPiIndex = state.pis.length - 1;
    updateDataPanel();
    draw();
  } else if (state.mode === 'select') {
    // Check if we clicked an existing PI
    let found = -1;
    const clickRadius = 10 / state.zoom; // 10 pixels tolerance
    for (let i = 0; i < state.pis.length; i++) {
      const pi = state.pis[i];
      const dx = pi.x - mapCoords.x;
      const dy = pi.y - mapCoords.y;
      if (Math.sqrt(dx*dx + dy*dy) < clickRadius) {
        found = i;
        break;
      }
    }
    
    if (found !== -1) {
      state.selectedPiIndex = found;
      state.isDragging = true;
    } else {
      state.selectedPiIndex = -1;
      // Start panning if clicked empty space
      state.isPanning = true;
      state.lastMouseX = mx;
      state.lastMouseY = my;
      canvas.style.cursor = 'grabbing';
    }
    updateDataPanel();
    draw();
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  const mapCoords = canvasToMap(mx, my);
  coordDisplay.textContent = `X: ${mapCoords.x.toFixed(3)}, Y: ${mapCoords.y.toFixed(3)}`;
  
  if (state.isPanning) {
    const dx = mx - state.lastMouseX;
    const dy = my - state.lastMouseY;
    state.panX -= dx / state.zoom;
    state.panY += dy / state.zoom; // Inverted Y
    state.lastMouseX = mx;
    state.lastMouseY = my;
    draw();
  } else if (state.isDragging && state.selectedPiIndex !== -1) {
    state.pis[state.selectedPiIndex].x = mapCoords.x;
    state.pis[state.selectedPiIndex].y = mapCoords.y;
    updateDataPanel();
    draw();
  }
});

canvas.addEventListener('mouseup', () => {
  state.isPanning = false;
  state.isDragging = false;
  canvas.style.cursor = state.mode === 'draw' ? 'crosshair' : 'default';
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  const zoomTarget = canvasToMap(mx, my);
  
  const zoomFactor = 1.1;
  if (e.deltaY < 0) {
    state.zoom *= zoomFactor; // zoom in
  } else {
    state.zoom /= zoomFactor; // zoom out
  }
  
  // Adjust pan so mouse stays at same point
  state.panX = zoomTarget.x - (mx - canvas.width / 2) / state.zoom;
  state.panY = zoomTarget.y + (my - canvas.height / 2) / state.zoom;
  
  draw();
});

// Zoom Controls
document.getElementById('zoom-in').addEventListener('click', () => {
  state.zoom *= 1.5; draw();
});
document.getElementById('zoom-out').addEventListener('click', () => {
  state.zoom /= 1.5; draw();
});
document.getElementById('zoom-fit').addEventListener('click', () => {
  if (state.pis.length === 0) return;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  state.pis.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  
  const w = maxX - minX || 100;
  const h = maxY - minY || 100;
  
  state.panX = minX + w/2;
  state.panY = minY + h/2;
  
  const padding = 0.8;
  const zoomX = (canvas.width * padding) / w;
  const zoomY = (canvas.height * padding) / h;
  state.zoom = Math.min(zoomX, zoomY);
  draw();
});

// Calculate Geometric Elements
function calculateGeometry() {
  const elements = [];
  
  if (state.pis.length < 2) return elements;
  
  for (let i = 0; i < state.pis.length - 1; i++) {
    const pi1 = state.pis[i];
    const pi2 = state.pis[i+1];
    
    // Tangent azimuth
    const dx = pi2.x - pi1.x;
    const dy = pi2.y - pi1.y;
    const length = Math.sqrt(dx*dx + dy*dy);
    const azimuth = Math.atan2(dx, dy); // math azimuth
    
    if (i === 0) {
      elements.push({ type: 'Point', x: pi1.x, y: pi1.y, name: 'POB' });
    }
    
    // Tangent Line
    elements.push({ type: 'Tangent', length: length, az: azimuth, piIndex: i });
    
    if (i < state.pis.length - 2) {
      const pi3 = state.pis[i+2];
      const dx2 = pi3.x - pi2.x;
      const dy2 = pi3.y - pi2.y;
      const azimuth2 = Math.atan2(dx2, dy2);
      
      let delta = azimuth2 - azimuth;
      if (delta > Math.PI) delta -= 2*Math.PI;
      if (delta < -Math.PI) delta += 2*Math.PI;
      
      const r = (pi2.r !== undefined && !isNaN(pi2.r) && pi2.r !== 0) ? pi2.r : state.rMin;
      const lsIn = r > 0 ? (pi2.lsIn || 0) : 0;
      const lsOut = r > 0 ? (pi2.lsOut || 0) : 0;
      const absDelta = Math.abs(delta);
      const rot = delta > 0 ? "cw" : "ccw";
      
      let theta_in = r > 0 && lsIn > 0 ? lsIn / (2 * r) : 0;
      let theta_out = r > 0 && lsOut > 0 ? lsOut / (2 * r) : 0;
      
      let p_in = r > 0 && lsIn > 0 ? (lsIn * lsIn) / (24 * r) : 0;
      let p_out = r > 0 && lsOut > 0 ? (lsOut * lsOut) / (24 * r) : 0;
      
      let k_in = r > 0 && lsIn > 0 ? (lsIn / 2) - (lsIn * lsIn * lsIn) / (240 * r * r) : 0;
      let k_out = r > 0 && lsOut > 0 ? (lsOut / 2) - (lsOut * lsOut * lsOut) / (240 * r * r) : 0;
      
      let T_in = r > 0 ? r * Math.tan(absDelta / 2) : 0;
      let T_out = r > 0 ? r * Math.tan(absDelta / 2) : 0;
      let Lc = r > 0 ? r * absDelta : 0;
      
      let valid_spirals = false;
      if (theta_in + theta_out < absDelta) {
          valid_spirals = true;
          if (lsIn > 0 || lsOut > 0) {
              T_in = k_in + (r + p_out - (r + p_in) * Math.cos(absDelta)) / Math.sin(absDelta);
              T_out = k_out + (r + p_in - (r + p_out) * Math.cos(absDelta)) / Math.sin(absDelta);
          }
          Lc = r > 0 ? r * (absDelta - theta_in - theta_out) : 0;
      } else {
          // Spirals overlap, revert to simple curve for visual
          theta_in = 0; theta_out = 0;
          p_in = 0; p_out = 0;
          k_in = 0; k_out = 0;
          T_in = r > 0 ? r * Math.tan(absDelta / 2) : 0;
          T_out = r > 0 ? r * Math.tan(absDelta / 2) : 0;
          Lc = r > 0 ? r * absDelta : 0;
      }
      
      const tsX = pi2.x - T_in * Math.sin(azimuth);
      const tsY = pi2.y - T_in * Math.cos(azimuth);
      
      const stX = pi2.x + T_out * Math.sin(azimuth2);
      const stY = pi2.y + T_out * Math.cos(azimuth2);
      
      let sc = null;
      let cs = null;
      let center = null;
      let az_sc = null;
      let az_cs = null;
      let rot_dir = rot === 'cw' ? 1 : -1;
      
      if (valid_spirals && (lsIn > 0 || lsOut > 0)) {
         const cx = tsX + k_in * Math.sin(azimuth) + (r + p_in) * Math.sin(azimuth + rot_dir * Math.PI/2);
         const cy = tsY + k_in * Math.cos(azimuth) + (r + p_in) * Math.cos(azimuth + rot_dir * Math.PI/2);
         center = {x: cx, y: cy};
         
         if (lsIn > 0) {
             az_sc = azimuth + rot_dir * theta_in;
             sc = {
                x: cx + r * Math.sin(az_sc - rot_dir * Math.PI/2),
                y: cy + r * Math.cos(az_sc - rot_dir * Math.PI/2)
             };
         }
         
         if (lsOut > 0) {
             az_cs = azimuth2 - rot_dir * theta_out;
             cs = {
                x: cx + r * Math.sin(az_cs - rot_dir * Math.PI/2),
                y: cy + r * Math.cos(az_cs - rot_dir * Math.PI/2)
             };
         }
      } else {
         const cx = tsX + (r > 0 ? r * Math.sin(azimuth + rot_dir * Math.PI/2) : 0);
         const cy = tsY + (r > 0 ? r * Math.cos(azimuth + rot_dir * Math.PI/2) : 0);
         center = r > 0 ? {x: cx, y: cy} : null;
      }
      
      elements.push({ 
        type: 'Curve', 
        radius: r, 
        delta: delta, 
        length: Lc,
        lsIn: valid_spirals ? lsIn : 0, lsOut: valid_spirals ? lsOut : 0,
        tLengthIn: T_in, tLengthOut: T_out,
        azIn: azimuth, azOut: azimuth2,
        pc: {x: tsX, y: tsY},
        pt: {x: stX, y: stY},
        sc: sc,
        cs: cs,
        center: center,
        az_sc: az_sc,
        az_cs: az_cs,
        piIndex: i + 1,
        pi: {x: pi2.x, y: pi2.y},
        rot: rot
      });
    } else {
      elements.push({ type: 'Point', x: pi2.x, y: pi2.y, name: 'POE' });
    }
  }
  
  // Post-pass: Calculate Stationing (Chainage)
  let currentStation = 0;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'Point' && el.name === 'POB') {
      el.station = currentStation;
    } else if (el.type === 'Curve') {
      // Find the previous tangent
      const prevTangent = elements[i-1];
      const prevCurve = elements[i-2] && elements[i-2].type === 'Curve' ? elements[i-2] : null;
      
      let t_out_prev = prevCurve ? prevCurve.tLengthOut : 0;
      let straightLen = prevTangent.length - t_out_prev - el.tLengthIn;
      
      prevTangent.actualLength = straightLen;
      prevTangent.startStation = currentStation;
      prevTangent.endStation = currentStation + straightLen;
      
      currentStation += straightLen;
      el.station_pc = currentStation;
      
      if (el.lsIn > 0) {
        currentStation += el.lsIn;
        el.station_sc = currentStation;
      }
      
      currentStation += el.length;
      if (el.lsIn > 0 || el.lsOut > 0) el.station_cs = currentStation;
      
      if (el.lsOut > 0) {
        currentStation += el.lsOut;
      }
      el.station_pt = currentStation; // PT or ST
    } else if (el.type === 'Point' && el.name === 'POE') {
      const prevTangent = elements[i-1];
      const prevCurve = elements[i-2] && elements[i-2].type === 'Curve' ? elements[i-2] : null;
      let t_out_prev = prevCurve ? prevCurve.tLengthOut : 0;
      let straightLen = prevTangent.length - t_out_prev;
      
      prevTangent.actualLength = straightLen;
      prevTangent.startStation = currentStation;
      prevTangent.endStation = currentStation + straightLen;
      
      currentStation += straightLen;
      el.station = currentStation;
    }
  }
  
  return elements;
}

// Get coordinate at a given station
function getCoordinateAtStation(elements, st) {
  if (elements.length === 0) return null;
  if (st <= elements[0].station) return { x: elements[0].x, y: elements[0].y, az: elements.length > 1 ? elements[1].az : 0 };
  
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    
    if (el.type === 'Curve') {
      const prevEl = elements[i-2]; 
      const tangent = elements[i-1];
      let startSt = 0, startPt = null;
      if (prevEl) {
        if (prevEl.type === 'Point') { startSt = prevEl.station; startPt = { x: prevEl.x, y: prevEl.y }; }
        else if (prevEl.type === 'Curve') { startSt = prevEl.station_pt; startPt = prevEl.pt; }
      }
      const az = tangent.az;
      
      // Tangent before curve
      if (st >= startSt && st < el.station_pc) {
        const d = st - startSt;
        return { x: startPt.x + d * Math.sin(az), y: startPt.y + d * Math.cos(az), az: az };
      }
      
      // Spiral In
      if (el.lsIn > 0 && st >= el.station_pc && st < el.station_sc) {
        const l = st - el.station_pc;
        const r = el.radius;
        const ls = el.lsIn;
        const rot_dir = el.rot === 'cw' ? 1 : -1;
        const x_loc = l - Math.pow(l, 5) / (40 * r * r * ls * ls);
        const y_loc = Math.pow(l, 3) / (6 * r * ls) - Math.pow(l, 7) / (336 * Math.pow(r, 3) * Math.pow(ls, 3));
        const y_dir = rot_dir * y_loc;
        const ptAz = el.azIn + rot_dir * (l * l) / (2 * r * ls);
        return {
          x: el.pc.x + x_loc * Math.sin(el.azIn) + y_dir * Math.cos(el.azIn),
          y: el.pc.y + x_loc * Math.cos(el.azIn) - y_dir * Math.sin(el.azIn),
          az: ptAz
        };
      }
      
      // Circular Curve
      const startCircSt = el.lsIn > 0 ? el.station_sc : el.station_pc;
      const endCircSt = el.lsOut > 0 ? el.station_cs : el.station_pt;
      if (st >= startCircSt && st < endCircSt) {
        if (!el.center || el.radius <= 0 || isNaN(el.radius)) {
          return { x: el.pi.x, y: el.pi.y, az: el.azIn };
        }
        const startCircPt = el.lsIn > 0 ? el.sc : el.pc;
        const l = st - startCircSt;
        const r = el.radius;
        const rot_dir = el.rot === 'cw' ? 1 : -1;
        const theta = l / r; 
        const cx = el.center.x;
        const cy = el.center.y;
        const dx = startCircPt.x - cx;
        const dy = startCircPt.y - cy;
        const theta_rot = -rot_dir * theta;
        const x_new = cx + dx * Math.cos(theta_rot) - dy * Math.sin(theta_rot);
        const y_new = cy + dx * Math.sin(theta_rot) + dy * Math.cos(theta_rot);
        const startCircAz = el.lsIn > 0 ? el.az_sc : el.azIn;
        const ptAz = startCircAz + rot_dir * theta;
        return { x: x_new, y: y_new, az: ptAz };
      }
      
      // Spiral Out
      if (el.lsOut > 0 && st >= el.station_cs && st < el.station_pt) {
        const l_from_pt = el.station_pt - st; 
        const r = el.radius;
        const ls = el.lsOut;
        const rot_dir = el.rot === 'cw' ? 1 : -1;
        const x_loc = l_from_pt - Math.pow(l_from_pt, 5) / (40 * r * r * ls * ls);
        const y_loc = Math.pow(l_from_pt, 3) / (6 * r * ls) - Math.pow(l_from_pt, 7) / (336 * Math.pow(r, 3) * Math.pow(ls, 3));
        const effective_rot = -rot_dir;
        const y_dir = effective_rot * y_loc;
        const azBack = el.azOut + Math.PI;
        const ptAz = el.azOut - rot_dir * (l_from_pt * l_from_pt) / (2 * r * ls);
        return {
          x: el.pt.x + x_loc * Math.sin(azBack) + y_dir * Math.cos(azBack),
          y: el.pt.y + x_loc * Math.cos(azBack) - y_dir * Math.sin(azBack),
          az: ptAz
        };
      }
    } else if (el.type === 'Point' && el.name === 'POE') {
      const prevEl = elements[i-2];
      const tangent = elements[i-1];
      let startSt = 0, startPt = null;
      if (prevEl) {
        if (prevEl.type === 'Point') { startSt = prevEl.station; startPt = { x: prevEl.x, y: prevEl.y }; }
        else if (prevEl.type === 'Curve') { startSt = prevEl.station_pt; startPt = prevEl.pt; }
      }
      const az = tangent ? tangent.az : 0;
      if (st >= startSt && st <= el.station) {
        const d = st - startSt;
        return { x: startPt.x + d * Math.sin(az), y: startPt.y + d * Math.cos(az), az: az };
      }
    }
  }
  return null;
}

// Drawing Logic
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawMapTiles();

  // Sync active before drawing
  syncActiveAlignment();

  // Draw inactive alignments in background
  state.alignments.forEach((aln, idx) => {
    if (idx !== state.activeAlignmentIndex && aln.pis.length >= 2) {
      const originalPis = state.pis;
      state.pis = aln.pis;
      const elements = calculateGeometry();
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#9ca3af'; // Gray for inactive
      ctx.beginPath();
      
      let currPt = { x: aln.pis[0].x, y: aln.pis[0].y };
      const startPx = mapToCanvas(currPt.x, currPt.y);
      ctx.moveTo(startPx.x, startPx.y);
      
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.type === 'Tangent') {
          let nextEl = elements[i+1];
          let endPt = null;
          if (nextEl && nextEl.type === 'Curve') {
            endPt = nextEl.pc;
          } else if (nextEl && nextEl.type === 'Point') {
            endPt = {x: nextEl.x, y: nextEl.y};
          } else {
            continue;
          }
          const ptPx = mapToCanvas(endPt.x, endPt.y);
          ctx.lineTo(ptPx.x, ptPx.y);
          currPt = endPt;
        } else if (el.type === 'Curve') {
          // Connect key points for inactive alignment
          if (el.sc) {
            const scPx = mapToCanvas(el.sc.x, el.sc.y);
            ctx.lineTo(scPx.x, scPx.y);
          }
          if (el.cs) {
            const csPx = mapToCanvas(el.cs.x, el.cs.y);
            ctx.lineTo(csPx.x, csPx.y);
          }
          const ptPx = mapToCanvas(el.pt.x, el.pt.y);
          ctx.lineTo(ptPx.x, ptPx.y);
          currPt = el.pt;
        }
      }
      ctx.stroke();
      state.pis = originalPis;
    }
  });
  
  const elements = calculateGeometry();
  
  // Draw Tangents (ghost lines to PIs)
  ctx.strokeStyle = '#94a3b8'; // light gray
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  state.pis.forEach((pi, i) => {
    const pt = mapToCanvas(pi.x, pi.y);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw True Geometry
  ctx.lineWidth = 3;
  
  let currentPt = null;
  
  for (let i = 0; i < state.pis.length; i++) {
    const pi = state.pis[i];
    
    if (i === 0) {
      currentPt = mapToCanvas(pi.x, pi.y);
      continue;
    }
    
    // Find if this PI has a curve
    const curve = elements.find(e => e.type === 'Curve' && e.piIndex === i);
    
    if (curve) {
      const pc = mapToCanvas(curve.pc.x, curve.pc.y);
      const pt = mapToCanvas(curve.pt.x, curve.pt.y);
      const piScreen = mapToCanvas(pi.x, pi.y);
      
      // Draw straight to TS
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6'; // Light Blue
      ctx.moveTo(currentPt.x, currentPt.y);
      ctx.lineTo(pc.x, pc.y);
      ctx.stroke();
      
      
      const rot_dir = curve.rot === 'cw' ? 1 : -1;
      
      // Function to generate discrete points along Euler spiral
      function getSpiralPoints(startX, startY, startAz, r, ls, rot_dir, isExit) {
          const points = [];
          const steps = 20;
          for (let j = 0; j <= steps; j++) {
              const l = (j / steps) * ls;
              // Taylor series approximation for clothoid coordinates
              const x_loc = l - Math.pow(l, 5) / (40 * r * r * ls * ls);
              const y_loc = Math.pow(l, 3) / (6 * r * ls) - Math.pow(l, 7) / (336 * Math.pow(r, 3) * Math.pow(ls, 3));
              
              // Apply rotation direction
              const effective_rot = isExit ? -rot_dir : rot_dir;
              const y_dir = effective_rot * y_loc;
              
              let az = startAz;
              if (isExit) {
                 az = startAz + Math.PI; // Look backward from ST
              }
              
              const x_glob = startX + x_loc * Math.sin(az) + y_dir * Math.cos(az);
              const y_glob = startY + x_loc * Math.cos(az) - y_dir * Math.sin(az);
              
              points.push(mapToCanvas(x_glob, y_glob));
          }
          if (isExit) points.reverse();
          return points;
      }

      if ((curve.lsIn > 0 || curve.lsOut > 0) && (curve.sc || curve.cs)) {
         
         // Draw Spiral In (TS to SC)
         if (curve.lsIn > 0 && curve.sc) {
             const spInPts = getSpiralPoints(curve.pc.x, curve.pc.y, curve.azIn, curve.radius, curve.lsIn, rot_dir, false);
             ctx.beginPath();
             ctx.strokeStyle = '#22c55e'; // Light Green
             ctx.moveTo(spInPts[0].x, spInPts[0].y);
             for(let k=1; k<spInPts.length; k++) ctx.lineTo(spInPts[k].x, spInPts[k].y);
             ctx.stroke();
         }
         
         // Draw Circular Curve (SC to CS)
         if (curve.length > 0) {
             const cx = curve.center.x;
             const cy = curve.center.y;
             const cScreen = mapToCanvas(cx, cy);
             const rScreen = curve.radius * state.zoom;
             
             // Canvas uses standard math angles where 0 is Right (East), PI/2 is Down (South).
             // Math.atan2(y, x) is perfect because Canvas Y points down.
             const startCurve = curve.lsIn > 0 && curve.sc ? curve.sc : curve.pc;
             const endCurve = curve.lsOut > 0 && curve.cs ? curve.cs : curve.pt;
             
             const startScreen = mapToCanvas(startCurve.x, startCurve.y);
             const endScreen = mapToCanvas(endCurve.x, endCurve.y);
             
             const startAngle = Math.atan2(startScreen.y - cScreen.y, startScreen.x - cScreen.x);
             const endAngle = Math.atan2(endScreen.y - cScreen.y, endScreen.x - cScreen.x);
             
             ctx.beginPath();
             ctx.strokeStyle = '#ef4444'; // Red
             // false for cw, true for ccw in Canvas API
             ctx.arc(cScreen.x, cScreen.y, rScreen, startAngle, endAngle, curve.rot === 'ccw');
             ctx.stroke();
         }
         
         // Draw Spiral Out (CS to ST)
         if (curve.lsOut > 0 && curve.cs) {
             const spOutPts = getSpiralPoints(curve.pt.x, curve.pt.y, curve.azOut, curve.radius, curve.lsOut, rot_dir, true);
             ctx.beginPath();
             ctx.strokeStyle = '#22c55e'; // Light Green
             ctx.moveTo(spOutPts[0].x, spOutPts[0].y);
             for(let k=1; k<spOutPts.length; k++) ctx.lineTo(spOutPts[k].x, spOutPts[k].y);
             ctx.stroke();
         }
      } else {
         // Draw purely Circular Curve (PC to PT)
         if (curve.length > 0) {
             const cx = curve.center.x;
             const cy = curve.center.y;
             const cScreen = mapToCanvas(cx, cy);
             const rScreen = curve.radius * state.zoom;
             
             const startScreen = mapToCanvas(curve.pc.x, curve.pc.y);
             const endScreen = mapToCanvas(curve.pt.x, curve.pt.y);
             
             const startAngle = Math.atan2(startScreen.y - cScreen.y, startScreen.x - cScreen.x);
             const endAngle = Math.atan2(endScreen.y - cScreen.y, endScreen.x - cScreen.x);
             
             ctx.beginPath();
             ctx.strokeStyle = '#ef4444'; // Red
             ctx.arc(cScreen.x, cScreen.y, rScreen, startAngle, endAngle, curve.rot === 'ccw');
             ctx.stroke();
         }
      }
      currentPt = pt;
    } else {
      const p = mapToCanvas(pi.x, pi.y);
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6'; // Light Blue
      ctx.moveTo(currentPt.x, currentPt.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      currentPt = p;
    }
  }
  
    // Draw PIs
  state.pis.forEach((pi, i) => {
    const pt = mapToCanvas(pi.x, pi.y);
    ctx.fillStyle = i === state.selectedPiIndex ? 'var(--accent-color)' : '#ffffff';
    ctx.strokeStyle = i === state.selectedPiIndex ? 'white' : 'var(--primary-color)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw Label
    ctx.fillStyle = '#0f172a';
    ctx.font = '12px Inter';
    ctx.fillText('PI ' + i, pt.x + 10, pt.y - 10);
  });
  
  // Format Station (e.g. 0+120.50)
  function formatStation(st) {
    if (st === undefined || isNaN(st)) return '';
    const km = Math.floor(st / 1000);
    const m = (st % 1000).toFixed(2);
    return `${km}+${m.padStart(6, '0')}`;
  }

  // Draw Station Labels (Referents)
  ctx.font = '11px Inter';
  ctx.fillStyle = '#1e293b';
  elements.forEach(el => {
    if (el.type === 'Point') {
      const pt = mapToCanvas(el.x, el.y);
      ctx.fillText(`${el.name}: ${formatStation(el.station)}`, pt.x + 10, pt.y + 15);
    } else if (el.type === 'Curve') {
      const pcLbl = el.lsIn > 0 ? 'TS' : 'PC';
      const ptLbl = el.lsOut > 0 ? 'ST' : 'PT';
      
      const pcSc = mapToCanvas(el.pc.x, el.pc.y);
      ctx.fillText(`${pcLbl}: ${formatStation(el.station_pc)}`, pcSc.x + 10, pcSc.y + 15);
      
      if (el.lsIn > 0 && el.sc) {
        const scSc = mapToCanvas(el.sc.x, el.sc.y);
        ctx.fillText(`SC: ${formatStation(el.station_sc)}`, scSc.x + 10, scSc.y + 15);
      }
      
      if (el.lsOut > 0 && el.cs) {
        const csSc = mapToCanvas(el.cs.x, el.cs.y);
        ctx.fillText(`CS: ${formatStation(el.station_cs)}`, csSc.x + 10, csSc.y + 15);
      } else if (el.lsIn > 0 && !el.lsOut && el.pt) {
        // Just CC to ST but only spiral in exists? Should be CS.
      }
      
      const ptSc = mapToCanvas(el.pt.x, el.pt.y);
      ctx.fillText(`${ptLbl}: ${formatStation(el.station_pt)}`, ptSc.x + 10, ptSc.y + 15);
    }
  });

  // Draw 100m Station Ticks
  const lastElement = elements[elements.length - 1];
  if (lastElement && lastElement.station > 0) {
    const maxSt = lastElement.station;
    ctx.font = '10px Inter';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    
    for (let st = 100; st <= maxSt; st += 100) {
      const coords = getCoordinateAtStation(elements, st);
      if (coords) {
        const pt = mapToCanvas(coords.x, coords.y);
        
        const tickLen = 6;
        const sDx = Math.sin(coords.az + Math.PI/2);
        const sDy = -Math.cos(coords.az + Math.PI/2);
        
        ctx.beginPath();
        ctx.moveTo(pt.x - sDx * tickLen, pt.y - sDy * tickLen);
        ctx.lineTo(pt.x + sDx * tickLen, pt.y + sDy * tickLen);
        ctx.stroke();
        
        const text = formatStation(st);
        ctx.fillText(text, pt.x + sDx * (tickLen + 2) + 2, pt.y + sDy * (tickLen + 2) + 4);
      }
    }
  }
}

// Map Tile Logic (From Hydrology App)
function drawMapTiles() {
  if (state.mapSource === 'none') return;
  const projStr = CRS_DEFINITIONS[state.crs];
  if (!projStr) return;
  
  const earthCircumference = 40075016.68557849;
  
  try {
    const tlLocal = canvasToMap(0, 0);
    const brLocal = canvasToMap(canvas.width, canvas.height);
    
    const tlWebMerc = proj4(state.crs, 'EPSG:3857', [tlLocal.x, tlLocal.y]);
    const brWebMerc = proj4(state.crs, 'EPSG:3857', [brLocal.x, brLocal.y]);
    
    const minX = Math.min(tlWebMerc[0], brWebMerc[0]);
    const maxX = Math.max(tlWebMerc[0], brWebMerc[0]);
    const minY = Math.min(tlWebMerc[1], brWebMerc[1]);
    const maxY = Math.max(tlWebMerc[1], brWebMerc[1]);
    
    const webMercWidth = maxX - minX;
    let z = 0;
    if (webMercWidth > 0) {
      z = Math.round(Math.log2((earthCircumference * canvas.width) / (webMercWidth * 256)));
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
      'bing': '' // handled separately
    };
    
    let tileCount = 0;
    const maxTiles = 60;
    
    for (let x = startXTile; x <= endXTile; x++) {
      for (let y = startYTile; y <= endYTile; y++) {
        if (tileCount++ > maxTiles) break;
        
        let url = urls[state.mapSource];
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
          url = url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
        }

        let img = state.mapTileCache[url];
        if (!img) {
          img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = url;
          img.loaded = false;
          img.onload = () => { img.loaded = true; draw(); };
          state.mapTileCache[url] = img;
        }
        
        if (img.loaded) {
          // Math to draw tile in correct position
          const tileMinXWebMerc = x * tileWidth - earthCircumference / 2;
          const tileMaxYWebMerc = earthCircumference / 2 - y * tileWidth;
          const tileMaxXWebMerc = tileMinXWebMerc + tileWidth;
          const tileMinYWebMerc = tileMaxYWebMerc - tileWidth;
          
          const tlProj = proj4('EPSG:3857', state.crs, [tileMinXWebMerc, tileMaxYWebMerc]);
          const brProj = proj4('EPSG:3857', state.crs, [tileMaxXWebMerc, tileMinYWebMerc]);
          
          const p1 = mapToCanvas(tlProj[0], tlProj[1]);
          const p2 = mapToCanvas(brProj[0], brProj[1]);
          
          ctx.drawImage(img, p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        }
      }
    }
  } catch (e) {
    console.log("Map render skip: " + e);
  }
}

// Data Panel Logic
function updateDataPanel() {
  const elements = calculateGeometry();
  renderAlignmentTable(elements);
  
  if (window.activeInspectorRow !== undefined && window.currentTableData && window.currentTableData[window.activeInspectorRow]) {
    window.selectTableRow(window.activeInspectorRow);
  }

  if (state.pis.length === 0) {
    dataContainer.innerHTML = '<div class="empty-state">No alignment defined.<br><br>Click on the map to start placing Points of Intersection (PIs).</div>';
    return;
  }
  
  if (state.activeTab === 'pis') {
    let html = '';
    state.pis.forEach((pi, i) => {
      html += `
        <div class="element-card" ${i === state.selectedPiIndex ? 'style="border-color: var(--primary-color); box-shadow: 0 0 0 1px var(--primary-color);"' : ''}>
          <div class="element-header">
            <span>PI ${i}</span>
            <button class="btn" style="padding: 2px 6px; font-size: 0.75rem;" onclick="removePI(${i})">Remove</button>
          </div>
          <div class="element-row">
            <label>Easting (X)</label>
            <input type="number" step="0.001" value="${pi.x.toFixed(3)}" onchange="updatePI(${i}, 'x', this.value)">
          </div>
          <div class="element-row">
            <label>Northing (Y)</label>
            <input type="number" step="0.001" value="${pi.y.toFixed(3)}" onchange="updatePI(${i}, 'y', this.value)">
          </div>
        </div>
      `;
    });
    dataContainer.innerHTML = html;
  } else if (state.activeTab === 'curves') {
    let html = '';
    const curves = elements.filter(e => e.type === 'Curve');
    
    if (curves.length === 0) {
      dataContainer.innerHTML = '<div class="empty-state">No curves generated yet. Need at least 3 PIs to form a curve.</div>';
      return;
    }
    
    curves.forEach((c) => {
      const piIndex = c.piIndex;
      const degDelta = Math.abs(c.delta * 180 / Math.PI).toFixed(2);
      
      // Calculate standard-specific minimums
      const v = state.designSpeed;
      const r = c.radius !== undefined ? c.radius : state.rMin;
      let lsMin = v / 1.8; // Default 2 seconds rule (Uganda MoW base)
      let pThreshold = 0.20; // default for AASHTO
      
      if (r === 0) {
        lsMin = 0;
        pThreshold = 0;
      } else if (state.standard === 'aashto') {
        lsMin = Math.max((v * v * v) / (46.7 * r), v / 1.8);
        pThreshold = 0.20;
      } else if (state.standard === 'ukdmrb') {
        lsMin = (v * v * v) / (14 * r);
        pThreshold = 0.25;
      } else if (state.standard === 'ugandamow') {
        const dClass = document.getElementById('ugandamow-design-class').value;
        const w = UGANDA_MOW_LANE_WIDTH[dClass] || 3.5;
        const g = UGANDA_MOW_MAX_REL_GRADIENT[v] || 0.005;
        
        const lComfort = (v * v * v) / (46.7 * r);
        const lRunoff = (w * state.eMax) / g;
        const lTime = v / 1.8;
        
        lsMin = Math.max(lComfort, lRunoff, lTime);
        pThreshold = 0.25;
      }
      
      let pShift = 0;
      if (r > 0) {
        pShift = (lsMin * lsMin) / (24 * r);
      }
      
      if (pShift < pThreshold || r === 0) {
        lsMin = 0;
      } else {
        lsMin = Math.ceil(lsMin);
      }
      
      const rMin = state.rMin;
      
      html += `
        <div class="element-card">
          <div class="element-header">Curve at PI ${piIndex}</div>
          <div class="element-row">
            <label>Radius (R)</label>
            <div style="text-align: right;">
              <input type="number" step="1" value="${c.radius}" onchange="updatePI(${piIndex}, 'r', this.value)" style="width: 80px;">
              <div style="font-size: 0.65rem; color: #888; margin-top: 2px;">Min: ${rMin}m</div>
            </div>
          </div>
          <div class="element-row">
            <label>Spiral In (Ls)</label>
            <div style="text-align: right;">
              <input type="number" step="1" value="${c.lsIn || 0}" onchange="updatePI(${piIndex}, 'lsIn', this.value)" style="width: 80px;">
              <div style="font-size: 0.65rem; color: #888; margin-top: 2px;">Min: ${lsMin}m</div>
            </div>
          </div>
          <div class="element-row">
            <label>Deflection (Δ)</label>
            <span>${degDelta}°</span>
          </div>
          <div class="element-row">
            <label>Arc Length (Lc)</label>
            <span>${c.length.toFixed(2)} m</span>
          </div>
          <div class="element-row">
            <label>Tangent In (Ts)</label>
            <span>${c.tLengthIn.toFixed(2)} m</span>
          </div>
          <div class="element-row">
            <label>Tangent Out (Ts)</label>
            <span>${c.tLengthOut.toFixed(2)} m</span>
          </div>
          <div class="element-row">
            <label>Spiral Out (Ls)</label>
            <div style="text-align: right;">
              <input type="number" step="1" value="${c.lsOut || 0}" onchange="updatePI(${piIndex}, 'lsOut', this.value)" style="width: 80px;">
              <div style="font-size: 0.65rem; color: #888; margin-top: 2px;">Min: ${lsMin}m</div>
            </div>
          </div>
        </div>
      `;
    });
    dataContainer.innerHTML = html;
  }
}

document.getElementById('tab-pis').addEventListener('click', () => {
  state.activeTab = 'pis';
  document.getElementById('tab-pis').classList.add('active');
  document.getElementById('tab-curves').classList.remove('active');
  document.getElementById('tab-ai').classList.remove('active');
  document.getElementById('data-container').style.display = 'block';
  document.getElementById('ai-container').style.display = 'none';
  updateDataPanel();
});

document.getElementById('tab-curves').addEventListener('click', () => {
  state.activeTab = 'curves';
  document.getElementById('tab-curves').classList.add('active');
  document.getElementById('tab-pis').classList.remove('active');
  document.getElementById('tab-ai').classList.remove('active');
  document.getElementById('data-container').style.display = 'block';
  document.getElementById('ai-container').style.display = 'none';
  updateDataPanel();
});

// Global functions for inline HTML event handlers
window.updatePI = function(index, field, value) {
  const val = parseFloat(value);
  if (!isNaN(val)) {
    state.pis[index][field] = val;
    draw();
    if (field === 'x' || field === 'y' || field === 'r') {
      updateDataPanel(); // Re-render to show updated curve data if in curve tab
    }
  }
};

window.removePI = function(index) {
  state.pis.splice(index, 1);
  if (state.selectedPiIndex === index) state.selectedPiIndex = -1;
  else if (state.selectedPiIndex > index) state.selectedPiIndex--;
  updateDataPanel();
  draw();
};

// Initial Setup
updateDesignCriteria();

// --- LandXML Import / Export ---

document.getElementById('import-xml').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const xmlStr = evt.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
      
      const alignNodes = xmlDoc.getElementsByTagName('Alignment');
      if (alignNodes.length === 0) {
        alert("No Alignment found in LandXML file.");
        return;
      }
      
      function getTagsCaseInsensitive(parent, tagName) {
        const lower = tagName.toLowerCase();
        const results = [];
        const all = parent.getElementsByTagName('*');
        for (let i = 0; i < all.length; i++) {
          if (all[i].tagName.toLowerCase() === lower || all[i].tagName.toLowerCase().endsWith(':' + lower)) {
            results.push(all[i]);
          }
        }
        return results;
      }

      // Auto-detect coordinate system from the XML
      let detectedCrs = null;
      const coordSystemNodes = getTagsCaseInsensitive(xmlDoc, 'coordinatesystem');
      if (coordSystemNodes.length > 0) {
        const epsg = coordSystemNodes[0].getAttribute('epsgCode');
        if (epsg) {
          if (epsg === '32636') detectedCrs = 'wgs84_36n';
          else if (epsg === '32736') detectedCrs = 'wgs84_36s';
          else if (epsg === '32635') detectedCrs = 'wgs84_35n';
          else if (epsg === '32735') detectedCrs = 'wgs84_35s';
          else if (epsg === '4326') detectedCrs = 'wgs84_ll';
        }
        if (!detectedCrs) {
          const desc = (coordSystemNodes[0].getAttribute('desc') || '').toLowerCase();
          if (desc.includes('36n') || desc.includes('36 north')) detectedCrs = 'wgs84_36n';
          else if (desc.includes('36s') || desc.includes('36 south')) detectedCrs = 'wgs84_36s';
          else if (desc.includes('35n') || desc.includes('35 north')) detectedCrs = 'wgs84_35n';
          else if (desc.includes('35s') || desc.includes('35 south')) detectedCrs = 'wgs84_35s';
          else if (desc.includes('wgs84') || desc.includes('geographic')) detectedCrs = 'wgs84_ll';
        }
      }

      function adjustCoordinatesToSelectedCRS(x, y) {
        const xmlSourceSelect = document.getElementById('xml-source-crs').value;
        let sourceCrs = state.crs; // Default to same as project/world settings
        
        if (xmlSourceSelect === 'auto') {
          if (detectedCrs) {
            sourceCrs = detectedCrs;
          } else {
            const isGeographic = Math.abs(x) < 360 && Math.abs(y) < 360;
            if (isGeographic) {
              sourceCrs = 'wgs84_ll';
            } else {
              sourceCrs = state.crs;
            }
          }
        } else {
          sourceCrs = xmlSourceSelect;
        }

        if (sourceCrs === state.crs) {
          return { x, y };
        }

        try {
          const projected = proj4(sourceCrs, state.crs, [x, y]);
          return { x: projected[0], y: projected[1] };
        } catch (err) {
          console.error("Proj4 conversion from " + sourceCrs + " to " + state.crs + " failed:", err);
          return { x, y };
        }
      }

      function extractPisFromAlignment(alignNode) {
        let geom = getTagsCaseInsensitive(alignNode, 'coordgeom')[0];
        const newPis = [];
        
        if (geom) {
          const children = geom.children;
          const segments = [];
          for (let i = 0; i < children.length; i++) {
            const el = children[i];
            const tagName = el.tagName.toLowerCase().replace(/.*:/, ''); // Strip potential namespaces
            if (tagName === 'line') {
              const startNodes = getTagsCaseInsensitive(el, 'start');
              const endNodes = getTagsCaseInsensitive(el, 'end');
              if (startNodes.length > 0 && endNodes.length > 0) {
                const start = startNodes[0].textContent.trim().split(/[\s,]+/);
                const end = endNodes[0].textContent.trim().split(/[\s,]+/);
                const isXY = document.getElementById('xml-coord-order').value === 'xy';
                
                const rawStart = {
                  x: parseFloat(isXY ? start[0] : start[1]),
                  y: parseFloat(isXY ? start[1] : start[0])
                };
                const rawEnd = {
                  x: parseFloat(isXY ? end[0] : end[1]),
                  y: parseFloat(isXY ? end[1] : end[0])
                };

                const startCoords = adjustCoordinatesToSelectedCRS(rawStart.x, rawStart.y);
                const endCoords = adjustCoordinatesToSelectedCRS(rawEnd.x, rawEnd.y);

                segments.push({
                  type: 'Line',
                  start: startCoords,
                  end: endCoords
                });
              }
            } else if (tagName === 'spiral') {
              segments.push({
                type: 'Spiral',
                length: parseFloat(el.getAttribute('length')) || 0
              });
            } else if (tagName === 'curve') {
              segments.push({
                type: 'Curve',
                radius: parseFloat(el.getAttribute('radius')) || 0
              });
            }
          }

          function getIntersection(l1, l2) {
            const p1 = l1.start, p2 = l1.end;
            const p3 = l2.start, p4 = l2.end;
            const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
            const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
            const denom = d1x * d2y - d1y * d2x;
            if (Math.abs(denom) < 1e-6) return null;
            const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
            return { x: p1.x + t * d1x, y: p1.y + t * d1y };
          }

          const lines = segments.filter(s => s.type === 'Line');
          
          if (lines.length > 0) {
            newPis.push({ x: lines[0].start.x, y: lines[0].start.y, r: state.rMin, lsIn: 0, lsOut: 0 });
            
            let lineIdx = 0;
            for (let i = 0; i < segments.length; i++) {
              if (segments[i].type === 'Line') {
                if (lineIdx < lines.length - 1) {
                  const currentLine = lines[lineIdx];
                  const nextLine = lines[lineIdx + 1];
                  const pi = getIntersection(currentLine, nextLine);
                  if (pi) {
                    let r = 0, lsIn = 0, lsOut = 0;
                    let j = i + 1;
                    let seenSpiral = false;
                    while (j < segments.length && segments[j].type !== 'Line') {
                      if (segments[j].type === 'Spiral') {
                        if (!seenSpiral) {
                          lsIn = segments[j].length || 0;
                          seenSpiral = true;
                        } else {
                          lsOut = segments[j].length || 0;
                        }
                      } else if (segments[j].type === 'Curve') {
                        r = segments[j].radius || 0;
                      }
                      j++;
                    }
                    if (r === 0 || isNaN(r)) {
                      r = state.rMin;
                    }
                    newPis.push({ x: pi.x, y: pi.y, r: r, lsIn: lsIn, lsOut: lsOut });
                  }
                }
                lineIdx++;
              }
            }
            
            const lastLine = lines[lines.length - 1];
            newPis.push({ x: lastLine.end.x, y: lastLine.end.y, r: state.rMin, lsIn: 0, lsOut: 0 });
          }
        } else {
          // Fallback: Parse using PIs element (sequence of point intersections)
          const pisElement = getTagsCaseInsensitive(alignNode, 'pis')[0];
          if (pisElement) {
            const piNodes = getTagsCaseInsensitive(pisElement, 'pi');
            const isXY = document.getElementById('xml-coord-order').value === 'xy';
            for (let i = 0; i < piNodes.length; i++) {
              const el = piNodes[i];
              const coords = el.textContent.trim().split(/[\s,]+/);
              if (coords.length >= 2) {
                const rawX = parseFloat(isXY ? coords[0] : coords[1]);
                const rawY = parseFloat(isXY ? coords[1] : coords[0]);
                const radius = parseFloat(el.getAttribute('radius')) || 0;
                
                const adjusted = adjustCoordinatesToSelectedCRS(rawX, rawY);
                newPis.push({
                  x: adjusted.x,
                  y: adjusted.y,
                  r: (radius === 0 || isNaN(radius)) ? state.rMin : radius,
                  lsIn: 0,
                  lsOut: 0
                });
              }
            }
          }
        }
        
        return newPis;
      }
      
      const processAlignment = (alignNode) => {
        const name = alignNode.getAttribute('name') || "Imported Alignment";
        const newPis = extractPisFromAlignment(alignNode);

        if (newPis && newPis.length > 0) {
          state.alignments = [{ name: name, pis: newPis }];
          state.activeAlignmentIndex = 0;
          state.pis = [...newPis];
          updateAlignmentDropdown();

          state.pis = newPis;
          state.selectedPiIndex = -1;
          updateDataPanel();
          
          // Fit bounds to new PIs
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          state.pis.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
          const w = maxX - minX || 100;
          const h = maxY - minY || 100;
          state.panX = minX + w/2;
          state.panY = minY + h/2;
          state.zoom = Math.min((canvas.width * 0.8) / w, (canvas.height * 0.8) / h);
          
          draw();
        } else {
          alert("Could not extract PIs from file.");
        }
        
        e.target.value = ''; // Reset input so same file can be loaded again
      };

      if (alignNodes.length === 1) {
        processAlignment(alignNodes[0]);
      } else {
        const modal = document.getElementById('import-modal');
        const list = document.getElementById('import-alignment-list');
        list.innerHTML = '';
        
        Array.from(alignNodes).forEach((node, idx) => {
          const name = node.getAttribute('name') || `Alignment ${idx + 1}`;
          
          const label = document.createElement('label');
          label.style.display = 'flex';
          label.style.alignItems = 'center';
          label.style.gap = '8px';
          label.style.cursor = 'pointer';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = idx;
          checkbox.checked = true; // Default all selected
          
          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(name));
          list.appendChild(label);
        });
        
        modal.classList.add('active');
        
        const confirmBtn = document.getElementById('import-confirm-btn');
        const cancelBtn = document.getElementById('import-cancel-btn');
        
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(newConfirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.replaceWith(newCancelBtn);
        
        newConfirmBtn.addEventListener('click', () => {
          modal.classList.remove('active');
          
          const checkboxes = list.querySelectorAll('input[type="checkbox"]:checked');
          if (checkboxes.length === 0) {
            e.target.value = '';
            return;
          }
          
          // Clear current alignments if importing multiple? Or append?
          // Let's replace state.alignments with the newly imported ones.
          state.alignments = [];
          state.activeAlignmentIndex = -1;
          
          let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
          let foundAny = false;
          
          checkboxes.forEach((cb, i) => {
            const idx = parseInt(cb.value);
            const node = alignNodes[idx];
            const name = node.getAttribute('name') || `Alignment ${idx + 1}`;
            
            // Re-use processAlignment but modify it to return PIs instead of setting state
            const newPis = extractPisFromAlignment(node);
            if (newPis && newPis.length > 0) {
              state.alignments.push({ name: name, pis: newPis });
              
              newPis.forEach(p => {
                if (p.x < bounds.minX) bounds.minX = p.x;
                if (p.x > bounds.maxX) bounds.maxX = p.x;
                if (p.y < bounds.minY) bounds.minY = p.y;
                if (p.y > bounds.maxY) bounds.maxY = p.y;
              });
              foundAny = true;
            }
          });
          
          if (state.alignments.length > 0) {
            state.activeAlignmentIndex = 0;
            state.pis = [...state.alignments[0].pis];
            state.selectedPiIndex = -1;
            
            updateAlignmentDropdown();
            updateDataPanel();
            
            // Fit bounds
            if (foundAny) {
              const w = bounds.maxX - bounds.minX || 100;
              const h = bounds.maxY - bounds.minY || 100;
              state.panX = bounds.minX + w/2;
              state.panY = bounds.minY + h/2;
              state.zoom = Math.min((canvas.width * 0.8) / w, (canvas.height * 0.8) / h);
            }
            
            draw();
          } else {
            alert("No valid alignments extracted.");
          }
          
          e.target.value = '';
        });
        
        newCancelBtn.addEventListener('click', () => {
          modal.classList.remove('active');
          e.target.value = '';
        });
      }

    } catch(err) {
      alert("Error parsing LandXML: " + err);
      e.target.value = '';
    }
  };
  reader.readAsText(file);
});

document.getElementById('export-pdf-btn').addEventListener('click', async () => {
  if (state.pis.length < 2) {
    alert("Not enough points to export a report.");
    return;
  }
  
  const type = document.getElementById('export-pdf-type').value;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Load Logo
  let logoData = null;
  try {
    const response = await fetch('/prome.png');
    const blob = await response.blob();
    const reader = new FileReader();
    logoData = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Could not load logo", e);
  }

  const addHeader = (title) => {
    if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 10, 40, 15);
    }
    doc.setFontSize(16);
    doc.text(title, 14, 35);
    doc.setFontSize(10);
    doc.text(`Design Standard: ${document.getElementById('design-standard').options[document.getElementById('design-standard').selectedIndex].text}`, 14, 42);
    doc.text(`Design Speed: ${state.designSpeed} km/h | e-Max: ${state.eMax*100}%`, 14, 47);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 52);
  };

  const elements = calculateGeometry();

  if (type === 'schedule') {
    addHeader('Horizontal Alignment Schedule Report');
    const tableBody = [];
    window.currentTableData.forEach(row => {
      const startCoord = getCoordinateAtStation(elements, row.startStation);
      const endCoord = getCoordinateAtStation(elements, row.endStation);
      tableBody.push([
        row.id, 
        row.type, 
        formatStation(row.startStation), 
        formatStation(row.endStation),
        startCoord ? startCoord.x.toFixed(3) : '-',
        startCoord ? startCoord.y.toFixed(3) : '-',
        row.length.toFixed(3),
        row.radius,
        row.startAngle || '-'
      ]);
    });
    
    doc.autoTable({
      startY: 58,
      head: [['No.', 'Element', 'Start Station', 'End Station', 'Easting', 'Northing', 'Length (m)', 'Radius (m)', 'Direction']],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 76, 129] }
    });
    doc.save('Horizontal_Schedule_Report.pdf');

  } else if (type === 'stakeout') {
    addHeader('Stakeout Coordinates Report');
    const tableBody = [];
    let currentSt = 0;
    const maxSt = elements[elements.length-1].station || elements[elements.length-1].endStation;
    
    // Generate stakeout points every 20m and at key geometric points
    const stations = new Set();
    while (currentSt <= maxSt) {
      stations.add(Math.round(currentSt * 1000) / 1000);
      currentSt += 20;
    }
    window.currentTableData.forEach(row => {
      stations.add(Math.round(row.startStation * 1000) / 1000);
      stations.add(Math.round(row.endStation * 1000) / 1000);
    });
    
    const sortedStations = Array.from(stations).sort((a,b) => a - b);
    
    sortedStations.forEach(st => {
      const coord = getCoordinateAtStation(elements, st);
      if (coord) {
        tableBody.push([
          formatStation(st),
          coord.x.toFixed(3),
          coord.y.toFixed(3),
          coord.azimuth ? (coord.azimuth * 180 / Math.PI).toFixed(4) + '°' : '-'
        ]);
      }
    });

    doc.autoTable({
      startY: 58,
      head: [['Station', 'Easting (X)', 'Northing (Y)', 'Tangent Azimuth']],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 76, 129] }
    });
    doc.save('Stakeout_Coordinates_Report.pdf');

  } else if (type === 'audit') {
    addHeader('Geometric Audit Report');
    const tableBody = [];
    
    window.currentTableData.forEach(row => {
      let status = getOverallCompliance(row) ? 'PASS' : 'FAIL';
      let details = '';
      const c = row.compliance;
      if (row.type === 'Straight') {
        details = `Req. Transition: ${c.reqStraight}m | Provided: ${row.length.toFixed(1)}m`;
      } else if (row.type === 'Circular Curve') {
        details = `Rmin: ${c.rMin}m | R: ${row.radius} | MinLen: ${c.minCurveLen}m`;
      } else if (row.type.includes('Clothoid')) {
        details = `L_comfort: ${c.lComfort}m | L_runoff: ${c.lRunoff}m | L_provided: ${row.length.toFixed(1)}m`;
      }
      
      tableBody.push([
        row.id,
        row.type,
        formatStation(row.startStation),
        row.length.toFixed(2),
        details,
        status
      ]);
    });

    doc.autoTable({
      startY: 58,
      head: [['No.', 'Element', 'Start Station', 'Length (m)', 'Compliance Details', 'Status']],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 76, 129] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'PASS') data.cell.styles.textColor = [16, 185, 129];
          if (data.cell.raw === 'FAIL') data.cell.styles.textColor = [239, 68, 68];
        }
      }
    });
    doc.save('Geometric_Audit_Report.pdf');
  }
});


// --- INTERACTIVE ALIGNMENT TABLE AND COMPLIANCE CHECKS ---

function formatStation(st) {
  if (st === undefined || st === null) return '-';
  const km = Math.floor(st / 1000);
  const m = st % 1000;
  return `${km}+${m.toFixed(3).padStart(7, '0')}`;
}

function renderAlignmentTable(elements) {
  const tbody = document.getElementById('alignment-table-body');
  if (!tbody) return;
  
  if (!elements || elements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">No alignment generated. Draw PIs to generate alignment table.</td></tr>';
    document.getElementById('inspector-content').innerHTML = '<div style="text-align:center; color:#64748b; margin-top:20px;">Select an element from the table to view details.</div>';
    document.getElementById('inspector-element-id').textContent = '';
    return;
  }

  let html = '';
  let rowId = 1;
  const tableData = [];

  elements.forEach((el, index) => {
    if (el.type === 'Point' && el.name === 'POB') return; // Skip POB as its own row
    if (el.type === 'Point' && el.name === 'POE') return; // Skip POE

    if (el.type === 'Tangent') {
      const length = el.actualLength || 0;
      if (length <= 0 && index > 1 && index < elements.length - 2) return; // skip 0-length internal tangents
      
      const prevCurve = index > 1 && elements[index-1].type === 'Curve' ? elements[index-1] : null;
      const nextCurve = index < elements.length - 1 && elements[index+1].type === 'Curve' ? elements[index+1] : null;
      
      // Calculate required straight length for runout/runoff
      const v = state.designSpeed;
      const dClass = document.getElementById('ugandamow-design-class')?.value || 'II';
      const w = UGANDA_MOW_LANE_WIDTH[dClass] || 3.5;
      const g = UGANDA_MOW_MAX_REL_GRADIENT[v] || 0.005;
      const eMax = state.eMax;
      const normalCrown = 0.025; // 2.5% normal crossfall
      
      let reqStraight = 0;
      let lRunoff = (w * eMax) / g;
      let lRunout = (w * normalCrown) / g;
      
      // If previous curve had no spiral out, 2/3 runoff + runout falls on this straight
      if (prevCurve && prevCurve.lsOut === 0) {
        reqStraight += (0.67 * lRunoff) + lRunout;
      }
      // If next curve has no spiral in, 2/3 runoff + runout falls on this straight
      if (nextCurve && nextCurve.lsIn === 0) {
        reqStraight += (0.67 * lRunoff) + lRunout;
      }
      
      const isCompliant = length >= reqStraight;
      
      tableData.push({
        id: rowId,
        type: 'Straight',
        startStation: el.startStation,
        endStation: el.endStation,
        length: length,
        radius: '-',
        clockwise: '-',
        startAngle: (el.az * 180 / Math.PI).toFixed(2) + '°',
        compliance: {
          reqStraight: reqStraight.toFixed(1),
          lRunoff: lRunoff.toFixed(1),
          lRunout: lRunout.toFixed(1),
          isCompliant: isCompliant
        },
        index: index
      });
      rowId++;
    } 
    else if (el.type === 'Curve') {
      const v = state.designSpeed;
      const r = el.radius !== undefined ? el.radius : state.rMin;
      const dClass = document.getElementById('ugandamow-design-class')?.value || 'II';
      const w = UGANDA_MOW_LANE_WIDTH[dClass] || 3.5;
      const g = UGANDA_MOW_MAX_REL_GRADIENT[v] || 0.005;
      
      // Circular Curve properties
      const isRadiusCompliant = r >= state.rMin;
      const reqSpiralRadius = (v * v * v) / 432;
      const spiralRequired = r <= reqSpiralRadius;
      const hasSpirals = el.lsIn > 0 || el.lsOut > 0;
      const isSpiralCompliant = !spiralRequired || hasSpirals;
      const minCurveLen = 3 * v;
      const isLengthCompliant = el.length >= minCurveLen;
      
      // Clothoid properties
      const lComfort = (v * v * v) / (46.7 * r);
      const lRunoff = (w * state.eMax) / g;
      const lAashtoMax = Math.sqrt(24 * 1.0 * r); // p=1.0m
      const lDesirable = Math.max(lComfort, lRunoff, v / 1.8);
      
      if (el.lsIn > 0) {
        const isComfortCompliantIn = el.lsIn >= lComfort;
        const isRunoffCompliantIn = el.lsIn >= lRunoff;
        const isMaxCompliantIn = el.lsIn <= lAashtoMax;
        
        tableData.push({
          id: rowId,
          type: 'Clothoid (In)',
          startStation: el.station_pc,
          endStation: el.station_sc,
          length: el.lsIn,
          radius: '∞ \u2192 ' + r,
          clockwise: el.rot.toUpperCase(),
          startAngle: '-',
          compliance: {
            lComfort: lComfort.toFixed(1),
            lRunoff: lRunoff.toFixed(1),
            lAashtoMax: lAashtoMax.toFixed(1),
            lDesirable: lDesirable.toFixed(1),
            isComfortCompliant: isComfortCompliantIn,
            isRunoffCompliant: isRunoffCompliantIn,
            isMaxCompliant: isMaxCompliantIn
          },
          index: index
        });
        rowId++;
      }
      
      tableData.push({
        id: rowId,
        type: 'Circular Curve',
        startStation: el.lsIn > 0 ? el.station_sc : el.station_pc,
        endStation: el.lsOut > 0 ? el.station_cs : (el.lsIn > 0 ? el.station_cs : el.station_pt),
        length: el.length,
        radius: r,
        clockwise: el.rot.toUpperCase(),
        startAngle: '-',
        compliance: {
          rMin: state.rMin.toFixed(1),
          isRadiusCompliant: isRadiusCompliant,
          reqSpiralRadius: reqSpiralRadius.toFixed(1),
          spiralRequired: spiralRequired,
          isSpiralCompliant: isSpiralCompliant,
          minCurveLen: minCurveLen.toFixed(1),
          isLengthCompliant: isLengthCompliant
        },
        index: index
      });
      rowId++;
      
      if (el.lsOut > 0) {
        const isComfortCompliantOut = el.lsOut >= lComfort;
        const isRunoffCompliantOut = el.lsOut >= lRunoff;
        const isMaxCompliantOut = el.lsOut <= lAashtoMax;
        
        tableData.push({
          id: rowId,
          type: 'Clothoid (Out)',
          startStation: el.station_cs,
          endStation: el.station_pt,
          length: el.lsOut,
          radius: r + ' \u2192 ∞',
          clockwise: el.rot.toUpperCase(),
          startAngle: '-',
          compliance: {
            lComfort: lComfort.toFixed(1),
            lRunoff: lRunoff.toFixed(1),
            lAashtoMax: lAashtoMax.toFixed(1),
            lDesirable: lDesirable.toFixed(1),
            isComfortCompliant: isComfortCompliantOut,
            isRunoffCompliant: isRunoffCompliantOut,
            isMaxCompliant: isMaxCompliantOut
          },
          index: index
        });
        rowId++;
      }
    }
  });

  tableData.forEach((row, i) => {
    const startCoord = getCoordinateAtStation(elements, row.startStation);
    const endCoord = getCoordinateAtStation(elements, row.endStation);
    
    const e1 = startCoord ? startCoord.x.toFixed(1) : '-';
    const n1 = startCoord ? startCoord.y.toFixed(1) : '-';
    const e2 = endCoord ? endCoord.x.toFixed(1) : '-';
    const n2 = endCoord ? endCoord.y.toFixed(1) : '-';

    const lengthInput = `<span style="color:#10b981; font-weight:600;">${row.length.toFixed(2)}</span>`;
    
    let radiusContent = row.radius;
    if (row.type === 'Circular Curve') {
      radiusContent = `<span style="color:#eab308; font-weight:600;">${row.radius}</span>`;
    }

    html += `
      <tr data-rowid="${row.id}" onclick="selectTableRow(${i})">
        <td style="color:#f59e0b; font-weight:bold;">${row.id}</td>
        <td>${row.type}</td>
        <td>${formatStation(row.startStation)}</td>
        <td>${formatStation(row.endStation)}</td>
        <td>${e1}</td>
        <td>${n1}</td>
        <td>${e2}</td>
        <td>${n2}</td>
        <td>${lengthInput}</td>
        <td>${radiusContent}</td>
        <td>${row.clockwise}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  window.currentTableData = tableData;
}

let dragBaseState = null;

window.previewAlignmentProperty = function(dataIndex, field, value) {
  const tableData = window.currentTableData;
  if (!tableData || !tableData[dataIndex]) return;
  
  if (!dragBaseState) {
    dragBaseState = JSON.stringify(state.pis);
  }
  state.pis = JSON.parse(dragBaseState);
  
  const row = tableData[dataIndex];
  // Calculate geometry again for the preview elements, since we just mutated state.pis
  const elements = calculateGeometry(); 
  const el = elements[row.index];
  const val = parseFloat(value);
  
  if (isNaN(val) || !el || el.piIndex === undefined) return;

  if (field === 'length') {
    if (row.type === 'Straight') {
      const dx = (val - el.actualLength) * Math.cos(el.startAngle);
      const dy = (val - el.actualLength) * Math.sin(el.startAngle);
      
      for (let j = el.piIndex + 1; j < state.pis.length; j++) {
        state.pis[j].x += dx;
        state.pis[j].y += dy;
      }
    } else if (row.type === 'Clothoid (In)') {
      state.pis[el.piIndex].lsIn = val;
    } else if (row.type === 'Clothoid (Out)') {
      state.pis[el.piIndex].lsOut = val;
    } else if (row.type === 'Circular Curve') {
      if (el.radius > 0 && el.length > 0) {
        const delta = el.length / el.radius;
        state.pis[el.piIndex].r = val / delta;
      }
    }
  } else if (field === 'radius') {
    if (row.type === 'Circular Curve') {
      state.pis[el.piIndex].r = val;
    }
  }

  draw();
};

window.updateAlignmentProperty = function(dataIndex, field, value) {
  const tableData = window.currentTableData;
  if (!tableData || !tableData[dataIndex]) return;
  
  if (dragBaseState) {
    state.pis = JSON.parse(dragBaseState);
    dragBaseState = null;
  }
  
  const row = tableData[dataIndex];
  const elements = calculateGeometry();
  const el = elements[row.index];
  const val = parseFloat(value);
  
  if (isNaN(val) || !el || el.piIndex === undefined) return;

  if (field === 'length') {
    if (row.type === 'Straight') {
      const dx = (val - el.actualLength) * Math.cos(el.startAngle);
      const dy = (val - el.actualLength) * Math.sin(el.startAngle);
      
      for (let j = el.piIndex + 1; j < state.pis.length; j++) {
        state.pis[j].x += dx;
        state.pis[j].y += dy;
      }
    } else if (row.type === 'Clothoid (In)') {
      state.pis[el.piIndex].lsIn = val;
    } else if (row.type === 'Clothoid (Out)') {
      state.pis[el.piIndex].lsOut = val;
    } else if (row.type === 'Circular Curve') {
      if (el.radius > 0 && el.length > 0) {
        const delta = el.length / el.radius;
        state.pis[el.piIndex].r = val / delta;
      }
    }
  } else if (field === 'radius') {
    if (row.type === 'Circular Curve') {
      state.pis[el.piIndex].r = val;
    }
  }

  // Save state and re-render
  saveHistory();
  updateDataPanel();
  draw();
};

window.selectTableRow = function(dataIndex) {
  const tableData = window.currentTableData;
  if (!tableData || !tableData[dataIndex]) return;
  
  window.activeInspectorRow = dataIndex;
  
  // Highlight row
  const rows = document.getElementById('alignment-table-body').querySelectorAll('tr');
  rows.forEach(r => r.classList.remove('active'));
  if (rows[dataIndex]) rows[dataIndex].classList.add('active');
  
  const row = tableData[dataIndex];
  document.getElementById('inspector-element-id').textContent = `Row #${row.id} Parameters`;
  
  const inspector = document.getElementById('inspector-content');
  let contentHtml = '';
  
  contentHtml += `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
      <span style="color:#94a3b8; font-size:0.8rem;">Segment type:</span>
      <select style="background:#1a1e23; color:#e2e8f0; border:1px solid #334155; padding:4px 8px; border-radius:4px; font-weight:600; font-size:0.8rem; width:120px;" disabled>
        <option>${row.type}</option>
      </select>
    </div>
    
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <span style="color:#94a3b8; font-size:0.8rem;">Length:</span>
      <span style="color:#10b981; font-weight:600; font-size:0.9rem;">${row.length.toFixed(2)} m</span>
    </div>
  `;
  
  if (row.type === 'Circular Curve') {
    contentHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <span style="color:#94a3b8; font-size:0.8rem;">Radius:</span>
        <span style="color:#eab308; font-weight:600; font-size:0.9rem;">${row.radius} m</span>
      </div>
    `;
  }

  contentHtml += `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; margin-top:20px;">
      <span style="color:#94a3b8; font-size:0.8rem;">Start station:</span>
      <span style="color:#e2e8f0; font-size:0.8rem;">${formatStation(row.startStation)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <span style="color:#94a3b8; font-size:0.8rem;">End station:</span>
      <span style="color:#e2e8f0; font-size:0.8rem;">${formatStation(row.endStation)}</span>
    </div>
  `;

  contentHtml += `<div class="compliance-box"><div class="compliance-title">Uganda MoW Standard Criteria <span class="compliance-badge ${getOverallCompliance(row) ? 'pass' : 'fail'}">${getOverallCompliance(row) ? '✔ COMPLIANT' : '✖ NON-COMPLIANT'}</span></div>`;
  contentHtml += `<div style="font-size:0.75rem; color:#94a3b8; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #1e293b;">Speed: <span style="color:#cbd5e1; font-weight:bold;">${state.designSpeed} km/h</span> &nbsp;|&nbsp; e-Max: <span style="color:#cbd5e1; font-weight:bold;">${state.eMax*100}%</span></div>`;

  if (row.type === 'Straight') {
    const c = row.compliance;
    contentHtml += `
      <div class="compliance-row"><span>Required Tangent for Transition:</span> <span class="${c.isCompliant ? 'val-pass' : 'val-fail'}">${c.reqStraight} m</span></div>
      <div class="compliance-row"><span>Runoff Length (Lr):</span> <span>${c.lRunoff} m</span></div>
      <div class="compliance-row"><span>Runout Length (Lt):</span> <span>${c.lRunout} m</span></div>
    `;
  } else if (row.type === 'Circular Curve') {
    const c = row.compliance;
    contentHtml += `
      <div class="compliance-row"><span>Min. Radius (Rmin):</span> <span class="${c.isRadiusCompliant ? 'val-pass' : 'val-fail'}">${c.rMin} m</span></div>
      <div class="compliance-row"><span>Radius Requires Spiral (R < ${c.reqSpiralRadius}m):</span> <span class="${c.isSpiralCompliant ? 'val-pass' : 'val-fail'}">${c.spiralRequired ? 'Yes' : 'No'}</span></div>
      <div class="compliance-row"><span>Min. Curve Length (3 x V):</span> <span class="${c.isLengthCompliant ? 'val-pass' : 'val-fail'}">${c.minCurveLen} m</span></div>
    `;
  } else if (row.type.includes('Clothoid')) {
    const c = row.compliance;
    contentHtml += `
      <div class="compliance-row"><span>Min. Comfort Length:</span> <span class="${c.isComfortCompliant ? 'val-pass' : 'val-fail'}">${c.lComfort} m</span></div>
      <div class="compliance-row"><span>Min. Superelevation Runoff:</span> <span class="${c.isRunoffCompliant ? 'val-pass' : 'val-fail'}">${c.lRunoff} m</span></div>
      <div class="compliance-row"><span>AASHTO Max Length:</span> <span class="${c.isMaxCompliant ? 'val-pass' : 'val-fail'}">${c.lAashtoMax} m</span></div>
      <div class="compliance-row"><span>Desirable Length:</span> <span>${c.lDesirable} m</span></div>
    `;
  }
  contentHtml += `</div>`;
  
  inspector.innerHTML = contentHtml;
};

function getOverallCompliance(row) {
  if (row.type === 'Straight') return row.compliance.isCompliant;
  if (row.type === 'Circular Curve') return row.compliance.isRadiusCompliant && row.compliance.isSpiralCompliant && row.compliance.isLengthCompliant;
  if (row.type.includes('Clothoid')) return row.compliance.isComfortCompliant && row.compliance.isRunoffCompliant && row.compliance.isMaxCompliant;
  return true;
}

document.getElementById('export-btn').addEventListener('click', async () => {
  if (state.pis.length < 2) {
    alert("Not enough points to export an alignment.");
    return;
  }
  
  const elements = calculateGeometry();
  let length = 0;
  
  let coordGeomStr = '';
  let currPt = { x: state.pis[0].x, y: state.pis[0].y };
  
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'Tangent') {
      let nextEl = elements[i+1];
      let endPt = null;
      if (nextEl && nextEl.type === 'Curve') {
        endPt = nextEl.pc;
      } else if (nextEl && nextEl.type === 'Point') {
        endPt = {x: nextEl.x, y: nextEl.y};
      } else {
        continue;
      }
      
      const dx = endPt.x - currPt.x;
      const dy = endPt.y - currPt.y;
      const l = Math.sqrt(dx*dx + dy*dy);
      const dir = Math.atan2(dx, dy);
      let dir_deg = dir * 180 / Math.PI;
      if (dir_deg < 0) dir_deg += 360;
      
      coordGeomStr += `
        <Line length="${l.toFixed(4)}" dir="${dir_deg.toFixed(4)}">
          <Start>${currPt.y.toFixed(4)} ${currPt.x.toFixed(4)}</Start>
          <End>${endPt.y.toFixed(4)} ${endPt.x.toFixed(4)}</End>
        </Line>`;
      length += l;
      currPt = endPt;
    } else if (el.type === 'Curve') {
      const pc = currPt;
      const pt = el.pt;
      const sc = el.sc || pc;
      const cs = el.cs || pt;
      
      if (el.lsIn > 0) {
        // Output TS -> SC Spiral
        coordGeomStr += `
        <Spiral length="${el.lsIn.toFixed(4)}" radiusEnd="${el.radius.toFixed(4)}" radiusStart="INF" rot="${el.rot}" spiType="clothoid">
          <Start>${pc.y.toFixed(4)} ${pc.x.toFixed(4)}</Start>
          <End>${sc.y.toFixed(4)} ${sc.x.toFixed(4)}</End>
        </Spiral>`;
        length += el.lsIn;
      }
      
      coordGeomStr += `
        <Curve crvType="arc" length="${el.length.toFixed(4)}" radius="${el.radius.toFixed(4)}" rot="${el.rot}">
          <Start>${sc.y.toFixed(4)} ${sc.x.toFixed(4)}</Start>
          <Center>${el.center.y.toFixed(4)} ${el.center.x.toFixed(4)}</Center>
          <End>${cs.y.toFixed(4)} ${cs.x.toFixed(4)}</End>
        </Curve>`;
      length += el.length;
      
      if (el.lsOut > 0) {
        // Output CS -> ST Spiral
        coordGeomStr += `
        <Spiral length="${el.lsOut.toFixed(4)}" radiusEnd="INF" radiusStart="${el.radius.toFixed(4)}" rot="${el.rot}" spiType="clothoid">
          <Start>${cs.y.toFixed(4)} ${cs.x.toFixed(4)}</Start>
          <End>${pt.y.toFixed(4)} ${pt.x.toFixed(4)}</End>
        </Spiral>`;
        length += el.lsOut;
      }
      
      currPt = pt;
    }
  }

  // Construct XML
  const dateStr = new Date().toISOString().split('T')[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.landxml.org/schema/LandXML-1.2 http://www.landxml.org/schema/LandXML-1.2/LandXML-1.2.xsd" version="1.2" date="${dateStr}">
  <Units>
    <Metric areaUnit="squareMeter" linearUnit="meter" volumeUnit="cubicMeter" temperatureUnit="celsius" pressureUnit="mmHG" />
  </Units>
  <Application name="PROME Alignment Designer" manufacturer="PROME" version="1.0" />
  <Project name="PROME Horizontal Alignment Designer" />
  <Alignments>
    <Alignment name="Designed_Alignment_1" length="${length.toFixed(4)}" staStart="0.0">
      <CoordGeom>${coordGeomStr}
      </CoordGeom>
    </Alignment>
  </Alignments>
</LandXML>`;

  // Use the File System Access API if supported
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'Alignment_Export.xml',
        types: [{
          description: 'LandXML File',
          accept: { 'application/xml': ['.xml'] },
        }],
      });
      const writable = await handle.createWritable();
      const blob = new Blob([xml], { type: 'application/xml' });
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn("showSaveFilePicker failed or was cancelled, falling back:", err);
    }
  }

  // Fallback for older browsers
  let fileName = prompt("Enter file name for export:", "Alignment_Export.xml");
  if (!fileName) return; // User cancelled
  if (!fileName.endsWith('.xml')) fileName += '.xml';

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// --- AI Road Planner Integration ---
let aiSessionId = null;

// Tab switcher logic
document.getElementById('tab-ai').addEventListener('click', () => {
  state.activeTab = 'ai';
  document.getElementById('tab-ai').classList.add('active');
  document.getElementById('tab-pis').classList.remove('active');
  document.getElementById('tab-curves').classList.remove('active');
  document.getElementById('data-container').style.display = 'none';
  document.getElementById('ai-container').style.display = 'flex';
  scrollToBottom();
});

// Helper: Scroll chat log to bottom
function scrollToBottom() {
  const chatLog = document.getElementById('ai-chat-log');
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Helper: Download OpenDrive File
window.downloadOpenDrive = function(xml) {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Road_Alignment_OpenDrive.xodr';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Helper: Append a message to the chat log
function appendAiChatMessage(role, text) {
  const chatLog = document.getElementById('ai-chat-log');
  const msgDiv = document.createElement('div');
  
  if (role === 'user') {
    msgDiv.style.background = '#374151';
    msgDiv.style.padding = '8px 10px';
    msgDiv.style.borderRadius = '6px';
    msgDiv.style.alignSelf = 'flex-end';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.color = '#fff';
    msgDiv.style.marginLeft = 'auto';
    msgDiv.textContent = text;
  } else {
    msgDiv.style.background = '#1f2937';
    msgDiv.style.padding = '10px';
    msgDiv.style.borderRadius = '6px';
    msgDiv.style.alignSelf = 'flex-start';
    msgDiv.style.maxWidth = '90%';
    msgDiv.style.color = '#cbd5e1';
    msgDiv.style.lineHeight = '1.5';
    msgDiv.style.marginRight = 'auto';
    
    // Check if the response contains an OpenDrive XML block
    const xmlRegex = /<\?xml[\s\S]*?<\/openDRIVE>/i;
    const match = text.match(xmlRegex);
    
    if (match) {
      const xmlBlock = match[0];
      const otherText = text.replace(xmlBlock, '');
      
      const textSpan = document.createElement('span');
      textSpan.textContent = otherText;
      msgDiv.appendChild(textSpan);
      
      const xmlContainer = document.createElement('div');
      xmlContainer.style.background = '#111827';
      xmlContainer.style.padding = '8px';
      xmlContainer.style.borderRadius = '4px';
      xmlContainer.style.border = '1px solid #374151';
      xmlContainer.style.marginTop = '8px';
      
      const pre = document.createElement('pre');
      pre.style.overflowX = 'auto';
      pre.style.fontFamily = 'monospace';
      pre.style.fontSize = '0.75rem';
      pre.style.color = '#34d399';
      pre.style.maxHeight = '150px';
      pre.style.whiteSpace = 'pre';
      pre.textContent = xmlBlock;
      xmlContainer.appendChild(pre);
      
      const btnContainer = document.createElement('div');
      btnContainer.style.marginTop = '6px';
      btnContainer.style.display = 'flex';
      btnContainer.style.gap = '6px';
      
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy XML';
      copyBtn.className = 'btn';
      copyBtn.style.fontSize = '0.7rem';
      copyBtn.style.padding = '3px 6px';
      copyBtn.style.background = '#374151';
      copyBtn.style.color = '#fff';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(xmlBlock);
        alert('XML copied to clipboard!');
      };
      
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download .xodr';
      downloadBtn.className = 'btn primary';
      downloadBtn.style.fontSize = '0.7rem';
      downloadBtn.style.padding = '3px 6px';
      downloadBtn.style.background = '#cc0000';
      downloadBtn.style.borderColor = '#cc0000';
      downloadBtn.style.color = '#fff';
      downloadBtn.onclick = () => {
        window.downloadOpenDrive(xmlBlock);
      };
      
      btnContainer.appendChild(copyBtn);
      btnContainer.appendChild(downloadBtn);
      xmlContainer.appendChild(btnContainer);
      msgDiv.appendChild(xmlContainer);
    } else {
      msgDiv.textContent = text;
    }
  }
  
  chatLog.appendChild(msgDiv);
  scrollToBottom();
}

// Function to send a message to backend AI route
async function sendAiMessage(messageText) {
  const token = localStorage.getItem('token');
  if (!token) {
    appendAiChatMessage('model', 'Error: You must be logged in to use the AI Copilot.');
    return;
  }
  
  // Prepare active alignment data if checkmark is checked
  let enrichedMessage = messageText;
  const useRefLine = document.getElementById('ai-use-ref-line').checked;
  if (useRefLine && state.pis && state.pis.length > 0) {
    enrichedMessage = `
[REFERENCE ALIGNMENT GEOMETRY]
CRS: ${state.crs}
Design Speed: ${state.designSpeed} km/h
Design Standard: ${state.standard}
Points of Intersection (PIs):
${JSON.stringify(state.pis.map(p => ({ id: p.id, x: p.x, y: p.y, r: p.r, lsIn: p.lsIn, lsOut: p.lsOut })), null, 2)}

User request:
${messageText}
`;
  }
  
  // Show spinner / loading state
  const chatLog = document.getElementById('ai-chat-log');
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'ai-loading-indicator';
  loadingDiv.style.alignSelf = 'flex-start';
  loadingDiv.style.color = '#9ca3af';
  loadingDiv.style.fontSize = '0.8rem';
  loadingDiv.textContent = 'PROME Copilot is planning...';
  chatLog.appendChild(loadingDiv);
  scrollToBottom();
  
  try {
    // 1. Create session if none exists
    if (!aiSessionId) {
      const sessionRes = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'Alignment Copilot Chat' })
      });
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        aiSessionId = sessionData.id;
      }
    }
    
    // 2. Post Chat message
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        sessionId: aiSessionId,
        message: enrichedMessage
      })
    });
    
    // Remove loading indicator
    const indicator = document.getElementById('ai-loading-indicator');
    if (indicator) indicator.remove();
    
    if (response.ok) {
      const responseData = await response.json();
      // Fetch latest messages
      const sessionDetailRes = await fetch(`/api/ai/sessions/${aiSessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sessionDetailRes.ok) {
        const sessionDetail = await sessionDetailRes.json();
        const latestMsg = sessionDetail.messages[sessionDetail.messages.length - 1];
        if (latestMsg && latestMsg.role === 'model') {
          appendAiChatMessage('model', latestMsg.content);
        }
      }
    } else {
      appendAiChatMessage('model', 'Failed to communicate with AI Assistant. Ensure you have proper permissions.');
    }
  } catch (err) {
    const indicator = document.getElementById('ai-loading-indicator');
    if (indicator) indicator.remove();
    console.error(err);
    appendAiChatMessage('model', 'An error occurred while connecting to the AI service.');
  }
}

// Event Listeners for Chat Inputs
document.getElementById('ai-send-btn').addEventListener('click', () => {
  const inputEl = document.getElementById('ai-chat-input');
  const text = inputEl.value.trim();
  if (text) {
    appendAiChatMessage('user', text);
    inputEl.value = '';
    sendAiMessage(text);
  }
});

document.getElementById('ai-chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('ai-send-btn').click();
  }
});

// Preset Buttons Event Listeners
document.getElementById('preset-opendrive').addEventListener('click', () => {
  if (!state.pis || state.pis.length === 0) {
    alert("Please place alignment points on the map first.");
    return;
  }
  appendAiChatMessage('user', 'Generate ASAM OpenDrive (.xodr) road network along this reference line alignment.');
  sendAiMessage('Generate ASAM OpenDrive (.xodr) road network along this reference line alignment. Make sure the output XML is complete, valid, and contains proper lane widths, lanes, and planView parameters matching the reference coordinate points.');
});

document.getElementById('preset-lanes').addEventListener('click', () => {
  if (!state.pis || state.pis.length === 0) {
    alert("Please place alignment points on the map first.");
    return;
  }
  appendAiChatMessage('user', 'Design a 2-lane road with road markings along the reference line.');
  sendAiMessage('Design a 2-lane road with specific lane widths, lane markings, and shoulder features along the alignment reference line. Generate the corresponding ASAM OpenDrive XML containing these design features.');
});

document.getElementById('preset-check').addEventListener('click', () => {
  if (!state.pis || state.pis.length === 0) {
    alert("Please place alignment points on the map first.");
    return;
  }
  appendAiChatMessage('user', 'Perform a geometric safety check on the alignment.');
  sendAiMessage('Perform a geometric safety check on the alignment. Analyze curvature, radii, and spiral transitions relative to AASHTO or Uganda design speed parameters and report any issues or feedback.');
});

// Distance helper: project point p onto segment ab
function distanceToSegment(p, a, b) {
  const A = p.x - a.x;
  const B = p.y - a.y;
  const C = b.x - a.x;
  const D = b.y - a.y;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  let xx, yy;
  if (param < 0) {
    xx = a.x;
    yy = a.y;
  } else if (param > 1) {
    xx = b.x;
    yy = b.y;
  } else {
    xx = a.x + param * C;
    yy = a.y + param * D;
  }
  const dx = p.x - xx;
  const dy = p.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Modern Toast Notification Overlay
function showToast(message) {
  const existing = document.getElementById('prome-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'prome-toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = '#cc0000';
  toast.style.color = 'white';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  toast.style.zIndex = '10000';
  toast.style.fontSize = '0.9rem';
  toast.style.fontWeight = '600';
  toast.style.pointerEvents = 'none';
  toast.style.transition = 'opacity 0.2s ease-in-out';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// Canvas Double Click Alignment Activation
canvas.addEventListener('dblclick', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const mapCoords = canvasToMap(mx, my);
  
  // Convert 15px double-click boundary zone into map units
  const tolerance = 15 / state.zoom;
  let foundIndex = -1;
  
  // Find which inactive alignment segment was double-clicked
  for (let idx = 0; idx < state.alignments.length; idx++) {
    const aln = state.alignments[idx];
    if (aln.pis.length < 2) continue;
    for (let i = 0; i < aln.pis.length - 1; i++) {
      const dist = distanceToSegment(mapCoords, aln.pis[i], aln.pis[i+1]);
      if (dist < tolerance) {
        foundIndex = idx;
        break;
      }
    }
    if (foundIndex !== -1) break;
  }
  
  if (foundIndex !== -1 && foundIndex !== state.activeAlignmentIndex) {
    // Sync current alignment points
    syncActiveAlignment();
    
    // Switch to double-clicked alignment
    state.activeAlignmentIndex = foundIndex;
    state.pis = [...state.alignments[foundIndex].pis];
    state.selectedPiIndex = -1;
    
    updateAlignmentDropdown();
    updateDataPanel();
    draw();
    
    showToast(`Switched active alignment to: ${state.alignments[foundIndex].name}`);
  }
});

// Recenter Map View Helper
function recenterMapView() {
  if (state.pis.length === 0) return;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  state.pis.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  const w = maxX - minX || 100;
  const h = maxY - minY || 100;
  state.panX = minX + w/2;
  state.panY = minY + h/2;
  state.zoom = Math.min((canvas.width * 0.8) / w, (canvas.height * 0.8) / h);
}

// Swap coordinate button click handler
document.getElementById('swap-coor-btn').addEventListener('click', () => {
  if (state.pis.length === 0) {
    showToast("No active alignment coordinates to swap");
    return;
  }
  state.pis = state.pis.map(p => ({
    ...p,
    x: p.y,
    y: p.x
  }));
  syncActiveAlignment();
  recenterMapView();
  updateDataPanel();
  draw();
  showToast("Swapped X and Y coordinates");
});

