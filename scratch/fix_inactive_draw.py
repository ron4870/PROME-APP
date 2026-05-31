import sys

with open('/Users/ronaldkibuuka/PROME APP/public/PROMEAlignmentDesign/app.js', 'r') as f:
    content = f.read()

old_curve_draw = """        } else if (el.type === 'Curve') {
          // Approximate curve for inactive
          const steps = 10;
          for(let s=1; s<=steps; s++){
            const frac = s/steps;
            const pt = getPointOnElement(el, frac * el.length);
            const ptPx = mapToCanvas(pt.x, pt.y);
            ctx.lineTo(ptPx.x, ptPx.y);
          }
          currPt = el.pt;
        }"""

new_curve_draw = """        } else if (el.type === 'Curve') {
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
        }"""

content = content.replace(old_curve_draw, new_curve_draw)

old_update_pi = """window.updatePI = function(index, field, value) {
  const val = parseFloat(value);
  if (!isNaN(val)) {
    state.pis[index][field] = val;
    draw();
    if (field === 'x' || field === 'y') {
      updateDataPanel(); // Re-render to show updated curve data if in curve tab
    }
  }
};"""

new_update_pi = """window.updatePI = function(index, field, value) {
  const val = parseFloat(value);
  if (!isNaN(val)) {
    state.pis[index][field] = val;
    draw();
    if (field === 'x' || field === 'y' || field === 'r') {
      updateDataPanel(); // Re-render to show updated curve data if in curve tab
    }
  }
};"""

content = content.replace(old_update_pi, new_update_pi)

with open('/Users/ronaldkibuuka/PROME APP/public/PROMEAlignmentDesign/app.js', 'w') as f:
    f.write(content)
