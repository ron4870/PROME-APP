const { JSDOM } = require("jsdom");

const xmlString = `<?xml version="1.0"?>
<LandXML>
  <Alignments>
    <Alignment name="A1">
      <CoordGeom>
        <Line><Start>100 200</Start><End>150 250</End></Line>
      </CoordGeom>
    </Alignment>
    <Alignment name="A2">
      <CoordGeom>
        <Line><Start>300 400</Start><End>350 450</End></Line>
      </CoordGeom>
    </Alignment>
  </Alignments>
</LandXML>
`;

const dom = new JSDOM(xmlString, { contentType: "text/xml" });
const document = dom.window.document;
const alignNodes = document.getElementsByTagName('Alignment');

const state = { rMin: 100 };

function extractPisFromAlignment(alignNode) {
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
            const start = startNodes[0].textContent.trim().split(/\s+/);
            const end = endNodes[0].textContent.trim().split(/\s+/);
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

Array.from(alignNodes).forEach((node, idx) => {
    console.log(extractPisFromAlignment(node));
});
