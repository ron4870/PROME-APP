import re

with open('public/PROMEHydrology/app.js', 'r') as f:
    content = f.read()

# 1. Remove the bad surface drawing block
bad_surface_block = r"""    // Draw Surfaces
    if \(state\.showSurface && state\.surfaces && state\.surfaces\.length > 0\) \{
      state\.surfaces\.forEach\(surf => \{
        // We will just draw wireframes of the triangles for performance
        ctx\.strokeStyle = 'rgba\(187, 10, 10, 0\.15\)';
        ctx\.lineWidth = 1 / state\.zoom;
        
        ctx\.beginPath\(\);
        surf\.triangles\.forEach\(tri => \{
           ctx\.moveTo\(tri\[0\]\.x, tri\[0\]\.y\);
           ctx\.lineTo\(tri\[1\]\.x, tri\[1\]\.y\);
           ctx\.lineTo\(tri\[2\]\.x, tri\[2\]\.y\);
           ctx\.lineTo\(tri\[0\]\.x, tri\[0\]\.y\);
        \}\);
        ctx\.stroke\(\);
      \}\);
    \}"""

content = re.sub(bad_surface_block, "", content)

# 2. Insert proper surface drawing block after drawMapTiles
good_surface_block = """  // 1. Draw Map Tiles
  drawMapTiles(ctx, cx, cy, canvasToMap, mapToCanvas, align);
  
  // 1.5 Draw Surfaces (TIN)
  if (state.showSurface && state.surfaces && state.surfaces.length > 0) {
    state.surfaces.forEach(surf => {
      ctx.strokeStyle = 'rgba(187, 10, 10, 0.25)';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      surf.triangles.forEach(tri => {
         const p0 = mapToCanvas(tri[0].x, tri[0].y);
         const p1 = mapToCanvas(tri[1].x, tri[1].y);
         const p2 = mapToCanvas(tri[2].x, tri[2].y);
         
         ctx.moveTo(p0.x, p0.y);
         ctx.lineTo(p1.x, p1.y);
         ctx.lineTo(p2.x, p2.y);
         ctx.lineTo(p0.x, p0.y);
      });
      ctx.stroke();
    });
  }"""

content = content.replace("  // 1. Draw Map Tiles\n  drawMapTiles(ctx, cx, cy, canvasToMap, mapToCanvas, align);", good_surface_block)

with open('public/PROMEHydrology/app.js', 'w') as f:
    f.write(content)
