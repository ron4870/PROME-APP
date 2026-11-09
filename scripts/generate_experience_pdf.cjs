const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projects = require('../scratch_company_experience.json');

// Read logo as base64
const logoPath = path.join(__dirname, '../public/prome.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');
const logoDataUri = `data:image/png;base64,${logoBase64}`;

// Generate Code 128 Barcode as inline SVG
const code128Patterns = {
  0: [2,1,2,2,2,2], 1: [2,2,2,1,2,2], 2: [2,2,2,2,2,1], 3: [1,2,1,2,2,3], 4: [1,2,1,3,2,2],
  5: [1,3,1,2,2,2], 6: [1,2,2,2,1,3], 7: [1,2,2,3,1,2], 8: [1,3,2,2,1,2], 9: [2,2,1,2,1,3],
  10: [2,2,1,3,1,2], 11: [2,3,1,2,1,2], 12: [1,1,2,2,3,2], 13: [1,2,2,1,3,2], 14: [1,2,2,2,3,1],
  15: [1,1,3,2,2,2], 16: [1,2,3,1,2,2], 17: [1,2,3,2,2,1], 18: [2,2,3,2,1,1], 19: [2,2,1,1,3,2],
  20: [2,2,1,2,3,1], 21: [2,1,3,2,1,2], 22: [2,2,3,1,1,2], 23: [3,1,2,1,3,1], 24: [3,1,1,2,2,2],
  25: [3,2,1,1,2,2], 26: [3,2,1,2,2,1], 27: [3,1,2,2,1,2], 28: [3,2,2,1,1,2], 29: [3,2,2,2,1,1],
  30: [2,1,2,1,2,3], 31: [2,1,2,3,2,1], 32: [2,3,2,1,2,1], 33: [1,1,1,3,2,3], 34: [1,3,1,1,2,3],
  35: [1,3,1,3,2,1], 36: [1,1,2,3,1,3], 37: [1,3,2,1,1,3], 38: [1,3,2,3,1,1], 39: [2,1,1,3,1,3],
  40: [2,3,1,1,1,3], 41: [2,3,1,3,1,1], 42: [1,1,2,1,3,3], 43: [1,1,2,3,3,1], 44: [1,3,2,1,3,1],
  45: [1,1,3,1,2,3], 46: [1,1,3,3,2,1], 47: [1,3,3,1,2,1], 48: [3,1,3,1,2,1], 49: [2,1,1,3,3,1],
  50: [2,3,1,1,3,1], 51: [2,1,3,1,1,3], 52: [2,1,3,3,1,1], 53: [2,1,3,1,3,1], 54: [3,1,1,1,2,3],
  55: [3,1,1,3,2,1], 56: [3,3,1,1,2,1], 57: [3,1,2,1,1,3], 58: [3,1,2,3,1,1], 59: [3,3,2,1,1,1],
  60: [3,1,4,1,1,1], 61: [2,2,1,4,1,1], 62: [4,3,1,1,1,1], 63: [1,1,1,2,2,4], 64: [1,1,1,4,2,2],
  65: [1,2,1,1,2,4], 66: [1,2,1,4,2,1], 67: [1,4,1,1,2,2], 68: [1,4,1,2,2,1], 69: [1,1,2,2,1,4],
  70: [1,1,2,4,1,2], 71: [1,2,2,1,1,4], 72: [1,2,2,4,1,1], 73: [1,4,2,1,1,2], 74: [1,4,2,2,1,1],
  75: [2,4,1,2,1,1], 76: [2,2,1,1,1,4], 77: [4,1,3,1,1,1], 78: [2,4,1,1,1,2], 79: [1,3,4,1,1,1],
  80: [1,1,1,2,4,2], 81: [1,2,1,1,4,2], 82: [1,2,1,2,4,1], 83: [1,1,4,2,1,2], 84: [1,2,4,1,1,2],
  85: [1,2,4,2,1,1], 86: [4,1,1,2,1,2], 87: [4,2,1,1,1,2], 88: [4,2,1,2,1,1], 89: [2,1,2,1,4,1],
  90: [2,1,4,1,2,1], 91: [4,1,2,1,2,1], 92: [1,1,1,1,4,3], 93: [1,1,1,3,4,1], 94: [1,3,1,1,4,1],
  95: [1,1,4,1,1,3], 96: [1,1,4,3,1,1], 97: [4,1,1,1,1,3], 98: [4,1,1,3,1,1], 99: [1,1,3,1,4,1],
  100: [1,1,4,1,3,1], 101: [3,1,1,1,4,1], 102: [4,1,1,1,3,1], 103: [2,1,1,4,1,2], 104: [2,1,1,2,1,4],
  105: [2,1,1,2,3,2], 106: [2,3,3,1,1,1,2]
};

function generateBarcodeSvg(text) {
  const codes = [104];
  let checksum = 104;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    codes.push(code);
    checksum += code * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106);

  let rects = [];
  let x = 10;
  codes.forEach(code => {
    const pattern = code128Patterns[code] || code128Patterns[0];
    let isBar = true;
    pattern.forEach(w => {
      const width = w * 1.5;
      if (isBar) {
        rects.push(`<rect x="${x}" y="0" width="${width}" height="28" fill="#1e293b" />`);
      }
      x += width;
      isBar = !isBar;
    });
  });
  return `<svg width="${x + 10}" height="28" viewBox="0 0 ${x + 10} 28" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`;
}

const barcodeSvg = generateBarcodeSvg('PROME-IMSR-CEXP-01');

// Helper to highlight terms
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightTerms(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped.replace(
    /(Topographic[a-z]*|Cadastral|Hydrolog[a-z]*)/gi,
    '<mark style="background-color: #fde047; color: #1e293b; font-weight: 700; padding: 0.5px 3px; border-radius: 2px;">$1</mark>'
  );
}

// KPI Data
const totalProjects = projects.length;
const completedCount = projects.filter(p => p.status === 'Completed').length;
const ongoingCount = projects.filter(p => p.status === 'Ongoing').length;
const countries = Array.from(new Set(projects.map(p => p.country))).filter(Boolean).join(', ') || 'Uganda, Ethiopia, Tanzania';

// Generate rows
const rowsHtml = projects.map(exp => {
  const clientText = `${exp.client || ''}${exp.clientAddress ? `\nAddress: ${exp.clientAddress}` : ''}${exp.funder ? `\nFunder: ${exp.funder}` : ''}`;
  
  return `
    <tr>
      <td style="text-align: center; font-weight: 700; color: #991b1b;">${escapeHtml(String(exp.itemNo || exp.id))}</td>
      <td>${escapeHtml(exp.duration || '-')}</td>
      <td style="font-weight: 600; color: #0f172a;">${highlightTerms(exp.projectName || '-')}</td>
      <td style="white-space: pre-line; line-height: 1.35; color: #334155;">${highlightTerms(exp.deliverables || exp.description || '-')}</td>
      <td style="white-space: pre-line; line-height: 1.3; color: #1e293b;">${highlightTerms(clientText || '-')}</td>
      <td style="text-align: center;">${escapeHtml(exp.country || 'Uganda')}</td>
      <td style="text-align: center; font-weight: 700; color: #047857;">${escapeHtml(exp.contractValue || '-')}</td>
      <td>${escapeHtml(exp.role || '-')}</td>
    </tr>
  `;
}).join('\n');

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PROME Infrastructure Experience Register</title>
  <style>
    @page {
      size: A3 landscape;
      margin: 12mm 15mm 15mm 15mm;
      @bottom-left {
        content: "www.promeconsult.com | ISO 9001:2015 Certified";
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
      @bottom-center {
        content: "PROME Consultants Ltd. - Feasibility, Design & Construction Supervision Experience";
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: #1e293b;
      background-color: #ffffff;
      font-size: 9px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #cc0000;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
    }
    .header-left img {
      height: 44px;
      width: auto;
      object-fit: contain;
    }
    .header-title {
      font-size: 19px;
      font-weight: 800;
      color: #1e293b;
      line-height: 1.1;
    }
    .header-sub {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 3px;
    }
    .header-middle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
    }
    .barcode-caption {
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
      letter-spacing: 1px;
      font-family: monospace, sans-serif;
    }
    .header-right {
      text-align: right;
      flex: 1;
    }
    .reg-title {
      font-size: 19px;
      font-weight: 800;
      color: #cc0000;
      line-height: 1.1;
    }
    .reg-meta {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 3px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }
    .card {
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .card-label {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #475569;
    }
    .card-val {
      font-size: 20px;
      font-weight: 800;
      margin-top: 2px;
    }
    .table-container {
      width: 100%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background-color: #991b1b !important;
      color: #ffffff !important;
      padding: 7px 4px;
      font-weight: 700;
      font-size: 8.5px;
      line-height: 1.25;
      vertical-align: middle;
      border: 1px solid #7f1d1d;
    }
    td {
      padding: 5px 4px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      font-size: 8.5px;
    }
    mark {
      background-color: #fde047 !important;
      color: #1e293b !important;
      font-weight: 700 !important;
      padding: 0.5px 3px;
      border-radius: 2px;
    }
    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 10px;
      font-size: 9px;
      color: #64748b;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <img src="${logoDataUri}" alt="PROME Logo" />
      <div>
        <div class="header-title">PROME CONSULTANTS LTD</div>
        <div class="header-sub">INTEGRATED MANAGEMENT SYSTEM (IMS)</div>
      </div>
    </div>
    <div class="header-middle">
      ${barcodeSvg}
      <div class="barcode-caption">PROME-IMSR-CEXP-01</div>
    </div>
    <div class="header-right">
      <div class="reg-title">PROME'S INFRASTRUCTURE EXPERIENCE</div>
      <div class="reg-meta">Feasibility, Design & Construction Supervision Register</div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="card" style="background-color: #fef2f2; border: 1px solid #fca5a5;">
      <div class="card-label">MAJOR INFRASTRUCTURE PROJECTS</div>
      <div class="card-val" style="color: #b91c1c;">${totalProjects}</div>
    </div>
    <div class="card" style="background-color: #f0fdf4; border: 1px solid #86efac;">
      <div class="card-label">COMPLETED ASSIGNMENTS</div>
      <div class="card-val" style="color: #15803d;">${completedCount}</div>
    </div>
    <div class="card" style="background-color: #f0f9ff; border: 1px solid #7dd3fc;">
      <div class="card-label">ONGOING ASSIGNMENTS</div>
      <div class="card-val" style="color: #0369a1;">${ongoingCount}</div>
    </div>
    <div class="card" style="background-color: #fffbe6; border: 1px solid #fde68a;">
      <div class="card-label">COUNTRIES OF OPERATION</div>
      <div class="card-val" style="color: #d97706; font-size: 13px;">${countries}</div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">ITEM<br/>NO</th>
          <th style="width: 9%; text-align: left;">PROJECT<br/>DURATION</th>
          <th style="width: 22%; text-align: left;">PROJECT NAME</th>
          <th style="width: 25%; text-align: left;">DESCRIPTION OF MAIN<br/>DELIVERABLES/OUTPUTS</th>
          <th style="width: 17%; text-align: left;">CLIENT/EMPLOYER<br/>AND FUNDER</th>
          <th style="width: 7%; text-align: center;">COUNTRY OF<br/>PROJECT EXECUTION</th>
          <th style="width: 9%; text-align: center;">CONTRACT VALUE<br/>(UGX/USD/ETB)</th>
          <th style="width: 7%; text-align: left;">ROLE IN<br/>ASSIGNMENT</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>

  <div class="footer-bar">
    <div>www.promeconsult.com | ISO 9001:2015 Certified</div>
    <div>PROME Consultants Ltd. - Feasibility, Design & Construction Supervision Experience</div>
    <div>PROME-IMSR-CEXP-01</div>
  </div>

</body>
</html>`;

const htmlPath = path.join(__dirname, '../scratch/experience_register.html');
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('HTML written to:', htmlPath);

const outputPdf = path.join(__dirname, '../scratch/PROME_Infrastructure_Experience_Register.pdf');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const cmd = `"${chromePath}" --headless=new --disable-gpu --no-sandbox --user-data-dir=/tmp/chrome-exp-data --no-pdf-header-footer --print-to-pdf="${outputPdf}" "file://${htmlPath}"`;

console.log('Rendering PDF via Chrome headless...');
execSync(cmd, { stdio: 'inherit' });
console.log('PDF successfully generated at:', outputPdf);

const stats = fs.statSync(outputPdf);
console.log(`PDF file size: ${(stats.size / 1024).toFixed(1)} KB`);
