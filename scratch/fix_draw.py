import sys

with open('/Users/ronaldkibuuka/PROME APP/public/PROMEAlignmentDesign/app.js', 'r') as f:
    content = f.read()

# 1. Fix draw order and worldToScreen
old_draw = """function draw() {
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
  drawMapTiles();"""

new_draw = """function draw() {
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
          // Approximate curve for inactive
          const steps = 10;
          for(let s=1; s<=steps; s++){
            const frac = s/steps;
            const pt = getPointOnElement(el, frac * el.length);
            const ptPx = mapToCanvas(pt.x, pt.y);
            ctx.lineTo(ptPx.x, ptPx.y);
          }
          currPt = el.pt;
        }
      }
      ctx.stroke();
      state.pis = originalPis;
    }
  });"""

content = content.replace(old_draw, new_draw)

with open('/Users/ronaldkibuuka/PROME APP/public/PROMEAlignmentDesign/app.js', 'w') as f:
    f.write(content)
