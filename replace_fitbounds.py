import re

with open('public/PROMEHydrology/app.js', 'r') as f:
    content = f.read()

pattern = r"document\.getElementById\('reset-view-btn'\)\.addEventListener\('click', resetCanvasView\);.*?function resetCanvasView\(\) \{.*?(?=\n// --- Map Tile Rendering ---)"

new_code = """document.getElementById('reset-view-btn').addEventListener('click', fitBounds);

window.fitBounds = function fitBounds() {
  state.panX = 0;
  state.panY = 0;
  state.zoom = 1.0;
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const alignmentsToDraw = state.transformedAlignments || state.alignments;
  
  // Calculate bounds for alignments
  if (alignmentsToDraw && alignmentsToDraw.length > 0) {
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
  }

  // Calculate bounds for surfaces
  if (state.surfaces && state.surfaces.length > 0) {
    state.surfaces.forEach(surf => {
      surf.triangles.forEach(tri => {
        tri.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
      });
    });
  }
  
  if (minX === Infinity) {
    // Nothing to draw
    drawAlignment();
    return;
  }
  
  const w = maxX - minX;
  const h = maxY - minY;
  
  // Padding around bounds
  const pad = 40;
  const scaleX = (alignmentCanvas.width - pad) / (w || 1);
  const scaleY = (alignmentCanvas.height - pad) / (h || 1);
  
  state.zoom = Math.min(scaleX, scaleY);
  // Cap zoom
  if (state.zoom > 10) state.zoom = 10;
  if (state.zoom < 0.001) state.zoom = 0.001;
  
  drawAlignment();
}"""

# re.DOTALL is needed for .* to match newlines
new_content, count = re.subn(pattern, new_code, content, flags=re.DOTALL)

if count > 0:
    with open('public/PROMEHydrology/app.js', 'w') as f:
        f.write(new_content)
    print(f"Replaced {count} instances.")
else:
    print("Pattern not found!")

