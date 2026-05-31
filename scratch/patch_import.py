import sys

with open('/Users/ronaldkibuuka/PROME APP/public/PROMEAlignmentDesign/app.js', 'r') as f:
    content = f.read()

# 1. Update state
content = content.replace(
"""  mode: 'draw', // 'draw' or 'select'
  
  pis: [], // Array of Points of Intersection: {id, x, y, r, lsIn, lsOut}
  selectedPiIndex: -1,""",
"""  mode: 'draw', // 'draw' or 'select'
  
  alignments: [], // Array of { name, pis }
  activeAlignmentIndex: -1,
  
  pis: [], // Points of active alignment
  selectedPiIndex: -1,""")

# 2. Add render dropdown function
dropdown_logic = """
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
"""

content = content.replace("// Resize Canvas\n", dropdown_logic + "\n// Resize Canvas\n")

# 3. Update the draw function to draw inactive alignments
draw_func_sig = "function draw() {\n  ctx.clearRect(0, 0, canvas.width, canvas.height);\n"
draw_func_repl = """function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
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
      const startPx = worldToScreen(currPt.x, currPt.y);
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
          const ptPx = worldToScreen(endPt.x, endPt.y);
          ctx.lineTo(ptPx.x, ptPx.y);
          currPt = endPt;
        } else if (el.type === 'Curve') {
          // Approximate curve for inactive
          const steps = 10;
          for(let s=1; s<=steps; s++){
            const frac = s/steps;
            const pt = getPointOnElement(el, frac * el.length);
            const ptPx = worldToScreen(pt.x, pt.y);
            ctx.lineTo(ptPx.x, ptPx.y);
          }
          currPt = el.pt;
        }
      }
      ctx.stroke();
      state.pis = originalPis;
    }
  });
"""
content = content.replace(draw_func_sig, draw_func_repl)

# 4. Modify the import XML logic to support multiple selections
import_logic_old = """      if (alignNodes.length === 1) {
        processAlignment(alignNodes[0]);
      } else {
        const modal = document.getElementById('import-modal');
        const select = document.getElementById('import-alignment-select');
        select.innerHTML = '';
        
        Array.from(alignNodes).forEach((node, idx) => {
          const name = node.getAttribute('name') || `Alignment ${idx + 1}`;
          const opt = document.createElement('option');
          opt.value = idx;
          opt.textContent = name;
          select.appendChild(opt);
        });
        
        modal.classList.add('active');
        
        const confirmBtn = document.getElementById('import-confirm-btn');
        const cancelBtn = document.getElementById('import-cancel-btn');
        
        // Remove old event listeners to prevent duplicates
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(newConfirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.replaceWith(newCancelBtn);
        
        newConfirmBtn.addEventListener('click', () => {
          modal.classList.remove('active');
          const selectedIdx = select.value;
          processAlignment(alignNodes[selectedIdx]);
        });
        
        newCancelBtn.addEventListener('click', () => {
          modal.classList.remove('active');
          e.target.value = '';
        });
      }"""

import_logic_new = """      if (alignNodes.length === 1) {
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
      }"""

content = content.replace(import_logic_old, import_logic_new)

# 5. Modify processAlignment to support extractPisFromAlignment
extract_func = """      function extractPisFromAlignment(alignNode) {
        const geom = alignNode.getElementsByTagName('CoordGeom')[0];
        if (!geom) return null;
        
        const children = geom.children;
        const newPis = [];
        
        const segments = [];
        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          if (el.tagName === 'Line') {
            const startNodes = el.getElementsByTagName('Start');
            const endNodes = el.getElementsByTagName('End');
            if (startNodes.length > 0 && endNodes.length > 0) {
              const start = startNodes[0].textContent.trim().split(/\\s+/);
              const end = endNodes[0].textContent.trim().split(/\\s+/);
              segments.push({
                type: 'Line',
                start: { x: parseFloat(start[1]), y: parseFloat(start[0]) },
                end: { x: parseFloat(end[1]), y: parseFloat(end[0]) }
              });
            }
          } else if (el.tagName === 'Spiral') {
            segments.push({
              type: 'Spiral',
              length: parseFloat(el.getAttribute('length')) || 0
            });
          } else if (el.tagName === 'Curve') {
            segments.push({
              type: 'Curve',
              radius: parseFloat(el.getAttribute('radius')) || state.rMin
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
          newPis.push({ x: lines[0].start.x, y: lines[0].start.y, r: 0, lsIn: 0, lsOut: 0 });
          
          let lineIdx = 0;
          for (let i = 0; i < segments.length; i++) {
            if (segments[i].type === 'Line') {
              if (lineIdx < lines.length - 1) {
                const currentLine = lines[lineIdx];
                const nextLine = lines[lineIdx + 1];
                const pi = getIntersection(currentLine, nextLine);
                if (pi) {
                  let r = state.rMin, lsIn = 0, lsOut = 0;
                  let j = i + 1;
                  let seenSpiral = false;
                  while (j < segments.length && segments[j].type !== 'Line') {
                    if (segments[j].type === 'Spiral') {
                      if (!seenSpiral) {
                        lsIn = segments[j].length;
                        seenSpiral = true;
                      } else {
                        lsOut = segments[j].length;
                      }
                    } else if (segments[j].type === 'Curve') {
                      r = segments[j].radius;
                    }
                    j++;
                  }
                  newPis.push({ x: pi.x, y: pi.y, r: r, lsIn: lsIn, lsOut: lsOut });
                }
              }
              lineIdx++;
            }
          }
          
          const lastLine = lines[lines.length - 1];
          newPis.push({ x: lastLine.end.x, y: lastLine.end.y, r: 0, lsIn: 0, lsOut: 0 });
        }
        
        return newPis;
      }
      
      const processAlignment = (alignNode) => {
        const name = alignNode.getAttribute('name') || "Imported Alignment";
        const newPis = extractPisFromAlignment(alignNode);
"""

old_process = """      const processAlignment = (alignNode) => {
        const geom = alignNode.getElementsByTagName('CoordGeom')[0];
        if (!geom) {
          alert("No CoordGeom found in Alignment.");
          return;
        }      
        const children = geom.children;
        const newPis = [];
        
        const segments = [];
        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          if (el.tagName === 'Line') {
            const startNodes = el.getElementsByTagName('Start');
            const endNodes = el.getElementsByTagName('End');
            if (startNodes.length > 0 && endNodes.length > 0) {
              const start = startNodes[0].textContent.trim().split(/\\s+/);
              const end = endNodes[0].textContent.trim().split(/\\s+/);
              segments.push({
                type: 'Line',
                start: { x: parseFloat(start[1]), y: parseFloat(start[0]) }, // x=easting, y=northing
                end: { x: parseFloat(end[1]), y: parseFloat(end[0]) }
              });
            }
          } else if (el.tagName === 'Spiral') {
            segments.push({
              type: 'Spiral',
              length: parseFloat(el.getAttribute('length')) || 0
            });
          } else if (el.tagName === 'Curve') {
            segments.push({
              type: 'Curve',
              radius: parseFloat(el.getAttribute('radius')) || state.rMin
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
          newPis.push({ x: lines[0].start.x, y: lines[0].start.y, r: 0, lsIn: 0, lsOut: 0 });
          
          let lineIdx = 0;
          for (let i = 0; i < segments.length; i++) {
            if (segments[i].type === 'Line') {
              if (lineIdx < lines.length - 1) {
                const currentLine = lines[lineIdx];
                const nextLine = lines[lineIdx + 1];
                const pi = getIntersection(currentLine, nextLine);
                if (pi) {
                  let r = state.rMin, lsIn = 0, lsOut = 0;
                  let j = i + 1;
                  let seenSpiral = false;
                  while (j < segments.length && segments[j].type !== 'Line') {
                    if (segments[j].type === 'Spiral') {
                      if (!seenSpiral) {
                        lsIn = segments[j].length;
                        seenSpiral = true;
                      } else {
                        lsOut = segments[j].length;
                      }
                    } else if (segments[j].type === 'Curve') {
                      r = segments[j].radius;
                    }
                    j++;
                  }
                  newPis.push({ x: pi.x, y: pi.y, r: r, lsIn: lsIn, lsOut: lsOut });
                }
              }
              lineIdx++;
            }
          }
          
          const lastLine = lines[lines.length - 1];
          newPis.push({ x: lastLine.end.x, y: lastLine.end.y, r: 0, lsIn: 0, lsOut: 0 });
        }

        if (newPis.length > 0) {"""

process_new = extract_func + """
        if (newPis && newPis.length > 0) {
          state.alignments = [{ name: name, pis: newPis }];
          state.activeAlignmentIndex = 0;
          state.pis = [...newPis];
          updateAlignmentDropdown();
"""
content = content.replace(old_process, process_new)

# Clear all logic update
clear_all_old = """document.getElementById('clear-btn').addEventListener('click', () => {
  if(confirm("Are you sure you want to clear all points?")) {
    state.pis = [];
    state.selectedPiIndex = -1;
    updateDataPanel();
    draw();
  }
});"""
clear_all_new = """document.getElementById('clear-btn').addEventListener('click', () => {
  if(confirm("Are you sure you want to clear all points?")) {
    state.pis = [];
    state.alignments = [];
    state.activeAlignmentIndex = -1;
    state.selectedPiIndex = -1;
    updateAlignmentDropdown();
    updateDataPanel();
    draw();
  }
});"""
content = content.replace(clear_all_old, clear_all_new)

with open('/Users/ronaldkibuuka/PROME APP/public/PROMEAlignmentDesign/app.js', 'w') as f:
    f.write(content)
