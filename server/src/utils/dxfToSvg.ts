import DxfParser from 'dxf-parser';

// ACI Color table mapping for AutoCAD colors
const ACI_COLORS: { [key: number]: string } = {
  1: '#ff0000', // Red
  2: '#ffff00', // Yellow
  3: '#00ff00', // Green
  4: '#00ffff', // Cyan
  5: '#0000ff', // Blue
  6: '#ff00ff', // Magenta
  7: '#000000', // Black/White
  8: '#808080', // Dark Gray
  9: '#c0c0c0', // Light Gray
};

const getEntityColor = (entity: any, layerColor?: string): string => {
  if (entity.color !== undefined && entity.color !== 256) { // 256 = ByLayer
    return ACI_COLORS[entity.color] || '#000000';
  }
  return layerColor || '#000000';
};

const escapeXml = (str: string): string => {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const cleanMText = (rawStr: string): string => {
  if (!rawStr) return '';
  let s = rawStr;
  // Remove formatting codes like \fArial|b0|i0|c0|p34;, \A1;, \C7;, \W1.0; etc.
  s = s.replace(/\\[A-Za-z0-9|,-]+;/g, '');
  s = s.replace(/\\P/gi, '\n'); // Newline
  s = s.replace(/[{}]/g, '');   // Braces
  s = s.replace(/\\L/gi, '');   // Underline
  s = s.replace(/\\O/gi, '');   // Overline
  return s.trim();
};

export const convertDxfToSvg = (dxfString: string): string => {
  const parser = new DxfParser();
  let parsed: any;
  try {
    parsed = parser.parseSync(dxfString);
  } catch (err) {
    console.error('DXF Parser Error:', err);
    throw new Error('Failed to parse DXF structure');
  }

  if (!parsed) {
    throw new Error('Empty or invalid DXF file');
  }

  const blocks: { [key: string]: any } = {};
  if (parsed.blocks) {
    Object.keys(parsed.blocks).forEach((blockName) => {
      blocks[blockName] = parsed.blocks[blockName];
    });
  }

  const layers: { [key: string]: any } = {};
  if (parsed.tables && parsed.tables.layer && parsed.tables.layer.layers) {
    Object.keys(parsed.tables.layer.layers).forEach((layerName) => {
      layers[layerName] = parsed.tables.layer.layers[layerName];
    });
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const updateBBox = (x: number, y: number) => {
    if (isNaN(x) || isNaN(y)) return;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  // Convert arc bulge segment to SVG path commands
  const getBulgePathSegment = (p1: { x: number; y: number }, p2: { x: number; y: number }, bulge: number): string => {
    if (!bulge || Math.abs(bulge) < 1e-6) {
      return `L ${p2.x} ${p2.y}`;
    }
    const theta = 4 * Math.atan(bulge);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const chord = Math.sqrt(dx * dx + dy * dy);
    if (chord < 1e-6) return `L ${p2.x} ${p2.y}`;

    const radius = Math.abs(chord / (2 * Math.sin(theta / 2)));
    const largeArcFlag = Math.abs(theta) > Math.PI ? 1 : 0;
    const sweepFlag = bulge > 0 ? 1 : 0;

    return `A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${p2.x} ${p2.y}`;
  };

  const renderEntity = (entity: any, parentMatrix?: any): string => {
    if (!entity) return '';

    const layer = layers[entity.layer];
    const layerColor = layer && layer.color !== undefined ? ACI_COLORS[layer.color] : '#000000';
    const color = getEntityColor(entity, layerColor);

    switch (entity.type) {
      case 'LINE': {
        if (!entity.vertices || entity.vertices.length < 2) return '';
        const v1 = entity.vertices[0];
        const v2 = entity.vertices[1];
        updateBBox(v1.x, v1.y);
        updateBBox(v2.x, v2.y);
        return `<line x1="${v1.x}" y1="${v1.y}" x2="${v2.x}" y2="${v2.y}" stroke="${color}" stroke-width="0.03%" />\n`;
      }

      case 'LWPOLYLINE':
      case 'POLYLINE': {
        if (!entity.vertices || entity.vertices.length === 0) return '';
        let d = `M ${entity.vertices[0].x} ${entity.vertices[0].y}`;
        updateBBox(entity.vertices[0].x, entity.vertices[0].y);

        for (let i = 0; i < entity.vertices.length - 1; i++) {
          const curr = entity.vertices[i];
          const next = entity.vertices[i + 1];
          updateBBox(next.x, next.y);
          d += ' ' + getBulgePathSegment(curr, next, curr.bulge || 0);
        }

        if (entity.shape || entity.closed) {
          const last = entity.vertices[entity.vertices.length - 1];
          const first = entity.vertices[0];
          d += ' ' + getBulgePathSegment(last, first, last.bulge || 0);
          d += ' Z';
        }

        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="0.03%" />\n`;
      }

      case 'CIRCLE': {
        if (!entity.center || entity.radius === undefined) return '';
        const cx = entity.center.x;
        const cy = entity.center.y;
        const r = entity.radius;
        updateBBox(cx - r, cy - r);
        updateBBox(cx + r, cy + r);
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="0.03%" />\n`;
      }

      case 'ARC': {
        if (!entity.center || entity.radius === undefined) return '';
        const cx = entity.center.x;
        const cy = entity.center.y;
        const r = entity.radius;

        let startAngle = (entity.startAngle || 0) * (Math.PI / 180);
        let endAngle = (entity.endAngle || 0) * (Math.PI / 180);

        const startX = cx + r * Math.cos(startAngle);
        const startY = cy + r * Math.sin(startAngle);
        const endX = cx + r * Math.cos(endAngle);
        const endY = cy + r * Math.sin(endAngle);

        updateBBox(startX, startY);
        updateBBox(endX, endY);
        updateBBox(cx - r, cy - r);
        updateBBox(cx + r, cy + r);

        let angleDiff = endAngle - startAngle;
        if (angleDiff < 0) angleDiff += Math.PI * 2;
        const largeArcFlag = angleDiff > Math.PI ? 1 : 0;
        const sweepFlag = 1;

        const pathD = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
        return `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="0.03%" />\n`;
      }

      case 'ELLIPSE': {
        if (!entity.center || !entity.majorAxisEndPoint) return '';
        const cx = entity.center.x;
        const cy = entity.center.y;
        const mx = entity.majorAxisEndPoint.x;
        const my = entity.majorAxisEndPoint.y;
        const rx = Math.sqrt(mx * mx + my * my);
        const ry = rx * (entity.axisRatio || 1);
        const rotDeg = Math.atan2(my, mx) * (180 / Math.PI);

        updateBBox(cx - rx, cy - rx);
        updateBBox(cx + rx, cy + rx);

        return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rotDeg} ${cx} ${cy})" fill="none" stroke="${color}" stroke-width="0.03%" />\n`;
      }

      case 'SOLID':
      case '3DFACE': {
        if (!entity.vertices || entity.vertices.length < 3) return '';
        const pts = entity.vertices.map((v: any) => {
          updateBBox(v.x, v.y);
          return `${v.x},${v.y}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="${color}" stroke="${color}" stroke-width="0.03%" />\n`;
      }

      case 'TEXT':
      case 'MTEXT': {
        let textStr = cleanMText(entity.string || entity.text || '');
        if (!textStr) return '';

        const x = entity.position ? entity.position.x : (entity.x || 0);
        const y = entity.position ? entity.position.y : (entity.y || 0);
        const height = entity.textHeight || entity.nominalTextHeight || entity.height || 12;
        const rot = entity.rotation !== undefined ? entity.rotation : (entity.rotationAngle || 0);

        updateBBox(x, y);

        // Escape XML characters
        const safeText = escapeXml(textStr);

        // Handle multiline MTEXT
        const lines = safeText.split('\n');
        if (lines.length === 1) {
          // Single line text: use rotate(${-rot}) scale(1, -1) to keep text upright and accurately rotated
          return `<text transform="translate(${x}, ${y}) rotate(${-rot}) scale(1, -1)" fill="${color}" stroke="none" font-size="${height}" font-family="Arial, sans-serif">${lines[0]}</text>\n`;
        } else {
          // Multiline text: emit <tspan> lines
          let textGroup = `<text transform="translate(${x}, ${y}) rotate(${-rot}) scale(1, -1)" fill="${color}" stroke="none" font-size="${height}" font-family="Arial, sans-serif">\n`;
          lines.forEach((lineStr, idx) => {
            const dy = idx === 0 ? 0 : height * 1.2;
            textGroup += `  <tspan x="0" dy="${dy}">${lineStr}</tspan>\n`;
          });
          textGroup += `</text>\n`;
          return textGroup;
        }
      }

      case 'INSERT': {
        // Block Reference insertion
        const blockName = entity.name;
        const block = blocks[blockName];
        if (!block) return '';

        const px = entity.position ? entity.position.x : 0;
        const py = entity.position ? entity.position.y : 0;
        const sx = entity.xScale !== undefined ? entity.xScale : 1;
        const sy = entity.yScale !== undefined ? entity.yScale : 1;
        const rot = entity.rotation !== undefined ? entity.rotation : 0;

        const bx = block.position ? block.position.x : 0;
        const by = block.position ? block.position.y : 0;

        updateBBox(px, py);

        let blockSvg = `<g transform="translate(${px}, ${py}) rotate(${rot}) scale(${sx}, ${sy}) translate(${-bx}, ${-by})">\n`;
        if (block.entities) {
          block.entities.forEach((subEntity: any) => {
            blockSvg += renderEntity(subEntity, { px, py, sx, sy, rot });
          });
        }
        blockSvg += `</g>\n`;
        return blockSvg;
      }

      case 'DIMENSION': {
        let dimSvg = '';
        if (entity.textPosition) {
          updateBBox(entity.textPosition.x, entity.textPosition.y);
          const dimText = escapeXml(entity.text || '');
          if (dimText) {
            dimSvg += `<text transform="translate(${entity.textPosition.x}, ${entity.textPosition.y}) scale(1, -1)" fill="${color}" stroke="none" font-size="10" font-family="Arial, sans-serif">${dimText}</text>\n`;
          }
        }
        if (entity.anchorPoint) {
          updateBBox(entity.anchorPoint.x, entity.anchorPoint.y);
        }
        return dimSvg;
      }

      default:
        return '';
    }
  };

  let bodySvg = '';
  if (parsed.entities && Array.isArray(parsed.entities)) {
    parsed.entities.forEach((entity: any) => {
      bodySvg += renderEntity(entity);
    });
  }

  // Handle fallback if no bounding box coordinates were calculated
  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 1000;
  }

  // Add 5% padding around CAD drawing bounds
  const width = Math.max(maxX - minX, 10);
  const height = Math.max(maxY - minY, 10);
  const padX = width * 0.05;
  const padY = height * 0.05;

  const viewBoxMinX = minX - padX;
  const viewBoxMinY = -(maxY + padY); // Inverted for Y-flipped group
  const viewBoxW = width + padX * 2;
  const viewBoxH = height + padY * 2;

  const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxMinX} ${viewBoxMinY} ${viewBoxW} ${viewBoxH}" width="100%" height="100%">\n<g transform="matrix(1 0 0 -1 0 0)">\n`;
  const svgFooter = `</g>\n</svg>`;

  return svgHeader + bodySvg + svgFooter;
};
