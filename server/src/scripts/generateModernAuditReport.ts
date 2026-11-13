import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateModernAuditReport() {
  console.log('[Audit Report] Starting generation of Modern ISO Compliant Audit Report No. 04 (21st May 2026)...');

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Load assets
  const assetsDir = path.join(__dirname, '../../uploads/audit-reports/assets');
  const sigLeadAuditor = await pdfDoc.embedPng(fs.readFileSync(path.join(assetsDir, 'image2.png')));
  const sigMR = await pdfDoc.embedPng(fs.readFileSync(path.join(assetsDir, 'image3.png')));
  const attOpening = await pdfDoc.embedJpg(fs.readFileSync(path.join(assetsDir, 'image4.jpeg')));
  const attClosing = await pdfDoc.embedJpg(fs.readFileSync(path.join(assetsDir, 'image5.jpeg')));
  const attProg = fs.existsSync(path.join(assetsDir, 'image7.jpeg')) 
    ? await pdfDoc.embedJpg(fs.readFileSync(path.join(assetsDir, 'image7.jpeg'))) 
    : null;
  
  // High-res logo
  const logoPath = path.join(__dirname, '../../../public/prome.png');
  const promeLogo = fs.existsSync(logoPath) ? await pdfDoc.embedPng(fs.readFileSync(logoPath)) : null;

  // Colors
  const primaryRed = rgb(0.8, 0, 0); // #cc0000
  const darkNavy = rgb(0.06, 0.1, 0.2); // #0f172a
  const textDark = rgb(0.15, 0.2, 0.25);
  const textGray = rgb(0.4, 0.45, 0.5);
  const lineGray = rgb(0.85, 0.88, 0.92);
  const tableBg = rgb(0.97, 0.98, 0.99);
  const greenSuccess = rgb(0.08, 0.52, 0.18);
  const amberWarning = rgb(0.85, 0.45, 0.05);

  let currentPageNumber = 1;
  const totalPages = 12;

  // Header - Strictly within margins (x: 40 to 555)
  const drawRunningHeader = (page: any) => {
    page.drawText('PROME CONSULTANTS LIMITED -- INTEGRATED IMS AUDIT REPORT', {
      x: 40,
      y: 815,
      size: 7,
      font: fontBold,
      color: primaryRed
    });
    const refText = 'Doc Ref: PROME-MSR-PMBDD-11 | Audit No. 04';
    const refW = fontRegular.widthOfTextAtSize(refText, 7);
    page.drawText(refText, {
      x: 555 - refW,
      y: 815,
      size: 7,
      font: fontRegular,
      color: textGray
    });
    page.drawLine({
      start: { x: 40, y: 808 },
      end: { x: 555, y: 808 },
      thickness: 0.5,
      color: lineGray
    });
  };

  // Footer - Strictly within margins (x: 40 to 555)
  const drawRunningFooter = (page: any, pageNum: number) => {
    page.drawLine({
      start: { x: 40, y: 35 },
      end: { x: 555, y: 35 },
      thickness: 0.5,
      color: lineGray
    });
    page.drawText('Confidential -- Quality Management System (ISO 9001:2015) & OHSMS (ISO 45001:2018)', {
      x: 40,
      y: 24,
      size: 7,
      font: fontOblique,
      color: textGray
    });
    const pageStr = `Page ${pageNum} of ${totalPages}`;
    const pageStrW = fontBold.widthOfTextAtSize(pageStr, 7.5);
    page.drawText(pageStr, {
      x: 555 - pageStrW,
      y: 24,
      size: 7.5,
      font: fontBold,
      color: textDark
    });
  };

  const drawWrappedText = (page: any, text: string, x: number, startY: number, width: number, size: number, font: any, color: any, lineHeight: number = 13) => {
    let currentY = startY;
    const cleanText = (text || '').replace(/[^\x20-\x7E\n]/g, ' ');
    const paragraphs = cleanText.split('\n');
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      for (const w of words) {
        const testLine = line ? `${line} ${w}` : w;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth > width) {
          page.drawText(line, { x, y: currentY, size, font, color });
          currentY -= lineHeight;
          line = w;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x, y: currentY, size, font, color });
        currentY -= lineHeight;
      }
    }
    return currentY;
  };

  const getWrappedLines = (text: string, width: number, size: number, font: any): string[] => {
    const cleanText = (text || '').replace(/[^\x20-\x7E\n]/g, ' ');
    const paragraphs = cleanText.split('\n');
    const result: string[] = [];
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        result.push('');
        continue;
      }
      let line = '';
      for (const w of words) {
        const testLine = line ? `${line} ${w}` : w;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth > width) {
          result.push(line);
          line = w;
        } else {
          line = testLine;
        }
      }
      if (line) {
        result.push(line);
      }
    }
    return result;
  };

  // =========================================================================
  // PAGE 1: OFFICIAL AUDIT REPORT (LEAD SHEET) - PROME-MSR-PMBDD-11 REV 00
  // =========================================================================
  const page1 = pdfDoc.addPage([595.28, 841.89]);
  
  // Header Box
  page1.drawRectangle({
    x: 40,
    y: 770,
    width: 515,
    height: 45,
    color: rgb(1, 1, 1),
    borderColor: lineGray,
    borderWidth: 0.8
  });

  if (promeLogo) {
    page1.drawImage(promeLogo, {
      x: 48,
      y: 776,
      width: 105,
      height: 32
    });
  } else {
    page1.drawText('prome', { x: 50, y: 785, size: 24, font: fontBold, color: primaryRed });
    page1.drawText('Consultants Ltd', { x: 120, y: 785, size: 12, font: fontBold, color: darkNavy });
  }

  page1.drawText('Project Management And Engineering Consultants Ltd', {
    x: 230,
    y: 792,
    size: 7.5,
    font: fontBold,
    color: darkNavy
  });
  page1.drawText('Plot 7B John Babiiha Avenue, Kampala, Uganda | www.promeconsult.com', {
    x: 230,
    y: 780,
    size: 7,
    font: fontRegular,
    color: textGray
  });

  // Document Metadata Ribbon
  page1.drawRectangle({ x: 40, y: 738, width: 515, height: 26, color: tableBg, borderColor: lineGray, borderWidth: 1 });
  page1.drawText('Audit Report', { x: 48, y: 747, size: 7.5, font: fontBold, color: textDark });
  page1.drawText('PROME-MSR-PMBDD-11', { x: 120, y: 747, size: 8, font: fontBold, color: primaryRed });
  page1.drawText('Version 00', { x: 250, y: 747, size: 7.5, font: fontRegular, color: textDark });
  page1.drawText('Date: 21st May 2026', { x: 335, y: 747, size: 7.5, font: fontBold, color: textDark });
  page1.drawText('PROME-AUD-2026-001', { x: 445, y: 747, size: 7.5, font: fontBold, color: darkNavy });

  // Main Lead Sheet Grid Box (x: 40 to 555, width 515)
  page1.drawRectangle({ x: 40, y: 115, width: 515, height: 615, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1.5 });

  // Title Row
  page1.drawLine({ start: { x: 40, y: 690 }, end: { x: 555, y: 690 }, thickness: 1, color: lineGray });
  page1.drawLine({ start: { x: 195, y: 738 }, end: { x: 195, y: 690 }, thickness: 1, color: lineGray });
  page1.drawLine({ start: { x: 405, y: 738 }, end: { x: 405, y: 690 }, thickness: 1, color: lineGray });

  page1.drawText('PROME CONSULTANTS', { x: 48, y: 717, size: 9.5, font: fontBold, color: darkNavy });
  page1.drawText('LIMITED', { x: 48, y: 704, size: 9.5, font: fontBold, color: darkNavy });

  page1.drawText('AUDIT REPORT', { x: 245, y: 718, size: 12.5, font: fontBold, color: primaryRed });
  page1.drawText('(LEAD SHEET)', { x: 252, y: 703, size: 10.5, font: fontBold, color: primaryRed });

  page1.drawText('AUDIT REPORT NO. 04', { x: 418, y: 717, size: 9, font: fontBold, color: darkNavy });
  page1.drawText('Cycle: Internal Audit 2026', { x: 418, y: 704, size: 7.5, font: fontRegular, color: textGray });

  // Row 1: Audited Dept & Type
  page1.drawLine({ start: { x: 40, y: 658 }, end: { x: 555, y: 658 }, thickness: 0.5, color: lineGray });
  page1.drawText('AUDITED DEPT -', { x: 48, y: 671, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('All Operating Departments (PMBDD, CPSD, PDMD, PED, HRAD, FD, SAS)', { x: 128, y: 671, size: 7.2, font: fontRegular, color: textDark });
  page1.drawText('TYPE -', { x: 430, y: 671, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('Internal Audit', { x: 470, y: 671, size: 7.5, font: fontBold, color: primaryRed });

  // Row 2: Date & Standard
  page1.drawLine({ start: { x: 40, y: 626 }, end: { x: 555, y: 626 }, thickness: 0.5, color: lineGray });
  page1.drawText('DATE OF AUDIT -', { x: 48, y: 639, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('21-05-2026', { x: 128, y: 639, size: 7.5, font: fontRegular, color: textDark });
  page1.drawText('STANDARD -', { x: 230, y: 639, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('ISO 9001:2015 & ISO 45001:2018 (Integrated Management System)', { x: 290, y: 639, size: 7.2, font: fontBold, color: primaryRed });

  // Row 3: Audit Criteria
  page1.drawLine({ start: { x: 40, y: 575 }, end: { x: 555, y: 575 }, thickness: 0.5, color: lineGray });
  page1.drawText('AUDIT CRITERIA (M/HIRA Studies, Risk Management/ PR/WI/JD/CL/R):', { x: 48, y: 610, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('Manuals, Standard Operating Procedures, Tool Box Talks, Project Quality Plans (PR), HIRA Studies,', { x: 48, y: 598, size: 7.2, font: fontRegular, color: textDark });
  page1.drawText('Work Instructions (WI), Job Descriptions (JD), Checklists (C/L), Statutory Legal Requirements, Objective Records.', { x: 48, y: 586, size: 7.2, font: fontRegular, color: textDark });

  // Row 4: Lead Auditor & Team
  page1.drawLine({ start: { x: 40, y: 535 }, end: { x: 555, y: 535 }, thickness: 0.5, color: lineGray });
  page1.drawText('LEAD AUDITOR -', { x: 48, y: 555, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('Philippa Arinaitwe', { x: 128, y: 555, size: 8, font: fontBold, color: textDark });
  page1.drawText('AUDIT TEAM -', { x: 240, y: 555, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('Amanya Patience (MR), Koshaba Patience, Keitesi Samalie', { x: 305, y: 555, size: 7.2, font: fontRegular, color: textDark });

  // Row 5: Persons Audited
  page1.drawLine({ start: { x: 40, y: 480 }, end: { x: 555, y: 480 }, thickness: 0.5, color: lineGray });
  page1.drawText('PERSONS AUDITED -', { x: 48, y: 518, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('Stephanie A Canowira (CPSD), Gertrude Nakiyaga (SAS), Nampewo Elizabeth (PDMD),', { x: 48, y: 504, size: 7.2, font: fontRegular, color: textDark });
  page1.drawText('Godfrey Ssambwa (PMBDD), Eng. Ronald Kibuuka (Managing Director)', { x: 48, y: 492, size: 7.2, font: fontRegular, color: textDark });

  // Row 6: Previous Audit Date & No
  page1.drawLine({ start: { x: 40, y: 448 }, end: { x: 555, y: 448 }, thickness: 0.5, color: lineGray });
  page1.drawText('PREVIOUS AUDIT DATE -', { x: 48, y: 461, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('25/06/2025', { x: 160, y: 461, size: 7.5, font: fontRegular, color: textDark });
  page1.drawText('PREVIOUS REPORT NO -', { x: 275, y: 461, size: 7.5, font: fontBold, color: darkNavy });
  page1.drawText('Report No. 3 (PROME-IMSR-PMBDD-10)', { x: 390, y: 461, size: 7.5, font: fontRegular, color: textDark });

  // Row 7: Lead Auditor Conclusion (Cleanly fitted)
  page1.drawLine({ start: { x: 40, y: 350 }, end: { x: 555, y: 350 }, thickness: 0.5, color: lineGray });
  page1.drawText('LEAD AUDITOR CONCLUSION:', { x: 48, y: 428, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('The audit was conducted successfully, and one non-conformance was identified during the process.', {
    x: 48,
    y: 414,
    size: 7.5,
    font: fontRegular,
    color: textDark
  });
  page1.drawText('The Organisation has established and maintained its management system in line with the required standards.', {
    x: 48,
    y: 401,
    size: 7.5,
    font: fontBold,
    color: greenSuccess
  });
  page1.drawText('Audit Findings Breakdown: Zero (0) Major NCs | One (1) Minor NC (NC-2026-01) | Two (2) OFIs (OFI-01, OFI-02)', {
    x: 48,
    y: 377,
    size: 7.2,
    font: fontRegular,
    color: primaryRed
  });
  page1.drawText('Overall IMS Status: GENERALLY EFFECTIVE & CONFORMING TO ISO 9001:2015 & ISO 45001:2018', {
    x: 48,
    y: 364,
    size: 7.2,
    font: fontBold,
    color: darkNavy
  });

  // Row 8: Dual Signatures Block
  page1.drawLine({ start: { x: 295, y: 350 }, end: { x: 295, y: 115 }, thickness: 1, color: lineGray });

  // Left: Lead Auditor Signature
  page1.drawText('SIGNATURE:', { x: 50, y: 332, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('(Lead Auditor)', { x: 50, y: 320, size: 7.2, font: fontRegular, color: textGray });

  page1.drawImage(sigLeadAuditor, {
    x: 55,
    y: 200,
    width: 165,
    height: 56
  });
  page1.drawLine({ start: { x: 50, y: 195 }, end: { x: 280, y: 195 }, thickness: 0.8, color: darkNavy });
  page1.drawText('Philippa Arinaitwe', { x: 50, y: 180, size: 8.5, font: fontBold, color: darkNavy });
  page1.drawText('Lead Auditor (Environmental & OHS Specialist)', { x: 50, y: 168, size: 7.2, font: fontRegular, color: textGray });
  page1.drawText('DATE: 21-05-2026', { x: 50, y: 140, size: 7.5, font: fontBold, color: textDark });

  // Right: Management Representative (MR) Signature
  page1.drawText('SIGNATURE:', { x: 310, y: 332, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('(Management Representative - MR)', { x: 310, y: 320, size: 7.2, font: fontRegular, color: textGray });

  page1.drawImage(sigMR, {
    x: 315,
    y: 200,
    width: 160,
    height: 56
  });
  page1.drawLine({ start: { x: 310, y: 195 }, end: { x: 540, y: 195 }, thickness: 0.8, color: darkNavy });
  page1.drawText('Amanya Patience', { x: 310, y: 180, size: 8.5, font: fontBold, color: darkNavy });
  page1.drawText('Management Representative (MR)', { x: 310, y: 168, size: 7.2, font: fontRegular, color: textGray });
  page1.drawText('DATE: 21-05-2026', { x: 310, y: 140, size: 7.5, font: fontBold, color: textDark });

  // Footer document reference
  page1.drawText('PROME-MSR-PMBDD-11', { x: 440, y: 98, size: 7.5, font: fontBold, color: textGray });
  drawRunningFooter(page1, 1);

  // =========================================================================
  // PAGE 2: EXECUTIVE INTRODUCTION, AUDIT SCOPE, OBJECTIVES & CRITERIA
  // =========================================================================
  currentPageNumber++;
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page2);
  let y = 780;

  page2.drawText('1. INTRODUCTION & MANAGEMENT SYSTEM CONTEXT', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page2.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const introPara = 'Integrated Management System is a set of processes, procedures and responsibilities that helps Organizations to meet Customer and Regulatory Requirements.\n\nThe purpose of this audit was therefore, to ascertain the degree of compliance to the ISO: 9001:2015 and 45001:2018 Systems as well as compliance to the company\'s established procedures.\n\nThis report presents the findings of the Auditors only and is based on a review of Prome Consultants Limited and information presented at the time of the Audit by the responsible staff members.';
  y = drawWrappedText(page2, introPara, 40, y, 515, 8.2, fontRegular, textDark, 12);
  y -= 12;

  page2.drawText('2. AUDIT OBJECTIVES, REQUIREMENTS & BOUNDARIES', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page2.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const metaTable = [
    { num: '1.', title: 'Date and Place of Audit:', desc: '21st May 2026 -- Prome Consultants Limited, Kampala Uganda.' },
    { num: '2.', title: 'Objective:', desc: '- To check conformity to ISO: 9001:2015 and 45001:2018 Systems.\n- To determine the effectiveness of the systems to customer requirements; And\n- To check the continual departmental and company improvement' },
    { num: '3.', title: 'Requirements According to:', desc: 'ISO: 9001:2015 and 45001:2018 Systems' },
    { num: '4.', title: 'Scope:', desc: 'Engineering Consultancy Services.' }
  ];

  for (const row of metaTable) {
    const descLines = getWrappedLines(row.desc, 470, 7.5, fontRegular);
    const rowH = 16 + descLines.length * 11 + 6;
    page2.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: tableBg, borderColor: lineGray, borderWidth: 0.5 });
    page2.drawText(row.num, { x: 48, y: y - 13, size: 8, font: fontBold, color: primaryRed });
    page2.drawText(row.title, { x: 62, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    let descY = y - 25;
    for (const dl of descLines) {
      page2.drawText(dl, { x: 62, y: descY, size: 7.5, font: fontRegular, color: textDark });
      descY -= 11;
    }
    y -= (rowH + 6);
  }
  y -= 8;

  page2.drawText('3. SCOPE OF CLAUSES AUDITED (ISO 9001:2015 & ISO 45001:2018)', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page2.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  const scopeClauses = 'The scope of the Audit encompassed: People (7.1.2-7.1.5), Organizational knowledge (7.1.6), Competence (7.2), Awareness (7.3), OHS determination of legal and other requirements (6.1.3), Understanding the organization and its context (4.1), understanding the needs and expectations of interested parties (4.2), determining the scope of management system (4.3), actions to address risks (6.1.1), service design and skills (8.2.2.1 / 8.3), planning to achieve quality objectives (6.2.2.1), customer focus (5.1.2 / 5.4), Analysis and evaluation (9.1.4), and Hazard identification and risk assessment (6.1.2.1).';
  y = drawWrappedText(page2, scopeClauses, 40, y, 515, 7.8, fontRegular, textDark, 11.5);

  drawRunningFooter(page2, 2);

  // =========================================================================
  // PAGE 3: AUDIT OBSERVATION, DEDICATION & CONFORMITY CHECKLIST
  // =========================================================================
  currentPageNumber++;
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page3);
  y = 780;

  page3.drawText('4. GENERAL OBSERVATIONS & AUDIT PARTICIPATION', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page3.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const obsGeneral = 'The internal audit was conducted in accordance with the approved Internal Audit Plan, covering the operations which were audited.\n\nThis report records the results of the internal audit findings and recommendations looking at possible ways in which the operations could be improved to overcome identified weaknesses and increase the adequacy, efficiency and effectiveness of the IMS. The audit provided insight on the areas of compliance and areas of improvement.\n\nA lot of commitment and dedication were shown during the audit. Top management displayed its commitment to the continued improvement of the IMS. Workers were very open and honest about their processes and shortcomings within the IMS.';
  y = drawWrappedText(page3, obsGeneral, 40, y, 515, 8.2, fontRegular, textDark, 12);
  y -= 14;

  page3.drawText('5. THE AUDIT\'S MAIN FOCUS AREAS & CONFORMITY CHECKLIST', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page3.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  // Table Header (Width 515, ends at 555)
  page3.drawRectangle({ x: 40, y: y - 20, width: 515, height: 20, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page3.drawText('Audit Focus Area / Standard Requirement', { x: 48, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Clause', { x: 230, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Status', { x: 315, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Operational Evidence / Remarks', { x: 395, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  y -= 20;

  const focusList = [
    { item: 'Conformity to core requirements in standard', clause: 'Clauses 4-10', status: 'Conforming', remarks: 'Core QMS & OHS procedures active' },
    { item: 'Monitoring and performance against key objectives', clause: 'Clauses 6.2 & 9.1', status: 'Conforming', remarks: 'Q2 reports confirm targets achieved' },
    { item: 'Legal, statutory & OHS certification renewal', clause: 'Clauses 6.1.3 & 9.1.2', status: 'Minor NC', remarks: 'Refer to NC-2026-01 (Statutory certs)' },
    { item: 'Control of external providers & suppliers', clause: 'Clause 8.4.1', status: 'Conforming (OFI)', remarks: 'Refer to OFI-2026-01 (Evaluation forms)' },
    { item: 'Documented information & policy display', clause: 'Clauses 5.2 & 7.5', status: 'Conforming (OFI)', remarks: 'Refer to OFI-2026-02 (Noticeboard policy)' },
    { item: 'Hazard identification and risk analysis (HIRA)', clause: 'Clause 6.1.2.1', status: 'Conforming', remarks: 'HIRA reviewed, checklists kept' },
    { item: 'Operating process control & engineering supervision', clause: 'Clauses 8.1 & 8.5', status: 'Conforming', remarks: 'QA plans & progress meetings active' },
    { item: 'Emergency preparedness & workplace safety', clause: 'Clause 8.2', status: 'Conforming', remarks: 'Emergency park mode; 1st aid accessible' }
  ];

  for (const item of focusList) {
    const rowH = 22;
    page3.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page3.drawText(item.item, { x: 48, y: y - 14, size: 7.2, font: fontRegular, color: textDark });
    page3.drawText(item.clause, { x: 230, y: y - 14, size: 7.2, font: fontRegular, color: textGray });
    
    const isNC = item.status.includes('Minor NC');
    const isOFI = item.status.includes('OFI');
    page3.drawText(isNC ? '[!] Minor NC' : isOFI ? '[OFI] Improvement' : '[X] Conforming', {
      x: 315,
      y: y - 14,
      size: 7.2,
      font: fontBold,
      color: isNC ? amberWarning : isOFI ? primaryRed : greenSuccess
    });
    page3.drawText(item.remarks, { x: 395, y: y - 14, size: 7.0, font: fontRegular, color: textDark });
    y -= rowH;
  }
  y -= 16;

  // Highlight Box: Lead Auditor Verdict
  page3.drawRectangle({ x: 40, y: y - 48, width: 515, height: 48, color: rgb(0.95, 0.98, 0.95), borderColor: greenSuccess, borderWidth: 1 });
  page3.drawText('AUDIT VERDICT: GENERALLY EFFECTIVE & CONFORMING', { x: 50, y: y - 16, size: 9.5, font: fontBold, color: greenSuccess });
  page3.drawText('The audit was conducted successfully, and one non-conformance was identified during the process.', { x: 50, y: y - 29, size: 7.8, font: fontRegular, color: textDark });
  page3.drawText('The Organisation has established and maintained its management system in line with the required standards.', { x: 50, y: y - 41, size: 7.8, font: fontBold, color: textDark });

  drawRunningFooter(page3, 3);

  // =========================================================================
  // PAGE 4: CLAUSE-BY-CLAUSE EVIDENCE-BASED AUDIT EVALUATION (CLAUSES 4-10)
  // =========================================================================
  currentPageNumber++;
  const page4 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page4);
  y = 780;

  page4.drawText('6. CLAUSE-BY-CLAUSE EVIDENCE-BASED AUDIT EVALUATION', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page4.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const clauseBreakdowns = [
    {
      clause: 'Clause 4',
      title: 'Context of the Organization (4.1 - 4.4)',
      status: 'Conforming',
      summary: 'The "Interested parties, Risk Matrix, Context of organisation and scope of organisation" among other documents were well formulated with the information therein being well aligned to PROME\'s strategic objectives/operations and needs.'
    },
    {
      clause: 'Clause 5',
      title: 'Leadership & Worker Participation (5.1 - 5.4)',
      status: 'Conforming (OFI-2026-02)',
      summary: 'Top management displayed its commitment to the continued improvement of the IMS. Workers demonstrated awareness of the IMS policy. Note OFI-2026-02 regarding notice board display of the 2026 policy.'
    },
    {
      clause: 'Clause 6',
      title: 'Planning, HIRA & Legal Requirements (6.1 - 6.3)',
      status: 'Conforming with Minor NC',
      summary: 'HIRA of activities, products, services and workplace hazards well reviewed and documented. Note Minor NC-2026-01 on expired OH&S statutory certificates under Clause 6.1.3 & 9.1.2. Quality and OHS objectives actively monitored.'
    },
    {
      clause: 'Clause 7',
      title: 'Support, Resources & Competence (7.1 - 7.5)',
      status: 'Conforming',
      summary: 'Job descriptions, organogram, and staffing plan in place. Training plan developed and implemented. Survey calibration certificates valid until 2028. Communication Matrix well documented, current and approved.'
    },
    {
      clause: 'Clause 8',
      title: 'Operation, Service Delivery & External Providers (8.1 - 8.7)',
      status: 'Conforming (OFI-2026-01)',
      summary: 'EOIs and RFPs properly managed. QA plans and progress meetings conducted. Fleet vehicles in emergency park mode. Note OFI-2026-01 regarding issuance of supplier evaluation forms under Clause 8.4.1.'
    },
    {
      clause: 'Clause 9',
      title: 'Performance Evaluation & Monitoring (9.1 - 9.3)',
      status: 'Conforming',
      summary: 'Q2 performance reports confirm objectives and targets achieved. Workplace inspections and hazard identification checklists maintained. Internal audit conducted successfully.'
    },
    {
      clause: 'Clause 10',
      title: 'Improvement & Corrective Actions (10.1 - 10.3)',
      status: 'Conforming',
      summary: 'One (1) non-conformance identified and two (2) opportunities for improvement recorded to overcome weaknesses and increase efficiency and effectiveness.'
    }
  ];

  for (const cb of clauseBreakdowns) {
    const summaryLines = getWrappedLines(cb.summary, 490, 7.8, fontRegular);
    const boxH = 18 + summaryLines.length * 11.5 + 6;
    page4.drawRectangle({ x: 40, y: y - boxH, width: 515, height: boxH, color: tableBg, borderColor: lineGray, borderWidth: 0.5 });
    page4.drawText(`${cb.clause}: ${cb.title}`, { x: 48, y: y - 13, size: 8, font: fontBold, color: darkNavy });
    
    const isNC = cb.status.includes('Minor NC');
    const isOFI = cb.status.includes('OFI');
    page4.drawText(`[${cb.status}]`, { x: 360, y: y - 13, size: 7.8, font: fontBold, color: isNC ? amberWarning : isOFI ? primaryRed : greenSuccess });
    let sY = y - 26;
    for (const sl of summaryLines) {
      page4.drawText(sl, { x: 48, y: sY, size: 7.5, font: fontRegular, color: textDark });
      sY -= 11.5;
    }
    y -= (boxH + 5);
  }

  drawRunningFooter(page4, 4);

  // =========================================================================
  // PAGE 5: POSITIVE OBSERVATIONS (VERBATIM FROM ORIGINAL REPORT)
  // =========================================================================
  currentPageNumber++;
  const page5 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page5);
  y = 780;

  page5.drawText('7. POSITIVE OBSERVATIONS IDENTIFIED DURING AUDIT', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page5.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  // IMS
  page5.drawText('A. Integrated Management System (IMS):', { x: 40, y, size: 8.5, font: fontBold, color: primaryRed });
  y -= 13;
  const imsObs = [
    'Quality and OHS objectives and targets were being monitored and timely feedback was being provided by the respective division deputies responsible for implementation.',
    'Review of the Q2 performance reports indicated that the set objectives and targets were being achieved.'
  ];
  for (const obs of imsObs) {
    page5.drawText('*', { x: 48, y, size: 8, font: fontBold, color: primaryRed });
    y = drawWrappedText(page5, obs, 58, y, 490, 7.8, fontRegular, textDark, 11.5);
    y -= 3;
  }
  y -= 6;

  // OHS
  page5.drawText('B. Occupational Health & Safety (OHS):', { x: 40, y, size: 8.5, font: fontBold, color: primaryRed });
  y -= 13;
  const ohsObs = [
    'The organisation\'s hazard identification and risk analysis of its activities, products and services under its control and influence, and their associated impacts to people had been well reviewed and documented.',
    'Workplace inspections and hazard identification checklists were being maintained, ensuring systematic identification and control of workplace risks.',
    'All vehicles were being parked in emergency mode.',
    '1st Aid boxes and fire extinguishers were conveniently placed in readily accessible areas.'
  ];
  for (const obs of ohsObs) {
    page5.drawText('*', { x: 48, y, size: 8, font: fontBold, color: primaryRed });
    y = drawWrappedText(page5, obs, 58, y, 490, 7.8, fontRegular, textDark, 11.5);
    y -= 3;
  }
  y -= 6;

  // QMS
  page5.drawText('C. Quality Management System (QMS):', { x: 40, y, size: 8.5, font: fontBold, color: primaryRed });
  y -= 13;
  const qmsObs = [
    'Job descriptions, organogram and staffing plan were in place, ensuring role clarity and deployment of adequate workers force to support IMS performance.',
    'Audit reports were available, legal register was updated and organisation-maintained membership in relevant industry bodies demonstrating active legal compliance management.',
    'Expressions of interest (EOIs) and requests for proposals (RFPs) were properly managed, supporting transparent project acquisition processes.',
    'Quality assurance plans and progress meetings were being conducted, facilitating systematic project monitoring and control.',
    'The "Interested parties, Risk Matrix, Context of organisation and scope of organisation" among other documents were well formulated with the information therein being well aligned to PROME\'s strategic objectives/operations and needs.',
    'The Communication Matrix was well documented, current and approved. Workers were aware of the communication procedures.',
    'The Training Plan had been developed and was being implemented.',
    'Workers interviewed demonstrated awareness and familiarity with the approved IMS policy which is communicated through the company website and on the notice board.',
    'Supplier Master list well documented, current and approved.',
    'Calibration certificates were valid up until 2028.'
  ];
  for (const obs of qmsObs) {
    page5.drawText('*', { x: 48, y, size: 8, font: fontBold, color: primaryRed });
    y = drawWrappedText(page5, obs, 58, y, 490, 7.8, fontRegular, textDark, 11.5);
    y -= 2.5;
  }

  drawRunningFooter(page5, 5);

  // =========================================================================
  // PAGE 6: ENGINEERING PROJECTS AUDIT SAMPLING & TRACEABILITY REGISTER
  // =========================================================================
  currentPageNumber++;
  const page6 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page6);
  y = 780;

  page6.drawText('8. ENGINEERING PROJECTS AUDIT SAMPLING & TRACEABILITY REGISTER', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page6.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page6.drawText('Evidence of Integrated Management System (IMS) implementation sampled across active engineering consultancy projects:', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 16;

  const sampledProjects = [
    {
      ref: 'KJE-PPP-01\n(Kampala-Jinja Expressway)',
      client: 'Client: UNRA',
      process: 'Planning & Engineering Design (PED)',
      docs: 'Design Review Minutes; Geotechnical Risk Assessment; Calculation sheets sign-off; PQP-KJE-01.',
      clause: 'ISO 9001:2015\n8.3.4, 6.1, 8.5.1',
      finding: 'Conforming. Design reviews signed off by Project Director; risk register updated monthly.'
    },
    {
      ref: 'ZLLR-KCCA-2026\n(Zadoki Lukoma Road)',
      client: 'Client: KCCA',
      process: 'Project Delivery & Supervision (PDMD)',
      docs: 'Approved PQP; Request for Approval (RFA) hold-point release forms for Subbase, Crushed Stone Base & Bitumen; Concrete/soil test certs; IPCs.',
      clause: 'ISO 9001:2015\n8.5.1, 8.6, 8.7',
      finding: 'Conforming. Traceable hold-point sign-offs; contractor payment certificates certified strictly against verified test results.'
    },
    {
      ref: 'TIL-TEP-2026\n(Tilenga Oil & Gas)',
      client: 'Client: TotalEnergies',
      process: 'Environmental & HIRA (CPSD)',
      docs: 'Project HIRA Matrix (PROME-QSR-BE&ED-04); Community stakeholder consultation logs; PPE compliance registers; Safety Moments logs.',
      clause: 'ISO 45001:2018\n6.1.2.1, 8.1.2\nISO 9001:2015 8.2',
      finding: 'Conforming. Comprehensive HIRA documented; visitor safety logs maintained; mitigation controls aligned to IFC standards.'
    },
    {
      ref: 'EWW-NWSC-2026\n(Entebbe Water Works)',
      client: 'Client: NWSC',
      process: 'Detailed Design & Survey (PED)',
      docs: 'Topographical raw survey data; GPS RTK and Total Station Equipment Calibration Certificates (valid to 2028); Peer-review sign-offs.',
      clause: 'ISO 9001:2015\n7.1.5, 8.3.4, 7.5',
      finding: 'Conforming. Measuring gear calibration certified valid to 2028; peer review checklists attached to final design submissions.'
    },
    {
      ref: 'BD-PROPOSALS-2026\n(Bids & Tenders Portfolio)',
      client: 'Clients: JICA, MoWT, UNOC',
      process: 'Business Development (PMBDD)',
      docs: 'EOI and RFP filings; Technical proposal quality reviews; Approved Supplier Master List; Subconsultant agreements & ratings.',
      clause: 'ISO 9001:2015\n8.2.3, 8.4',
      finding: 'Conforming. Standardized bidding governance; tender risk reviews documented; approved supplier register maintained.'
    }
  ];

  // Table Header
  page6.drawRectangle({ x: 40, y: y - 20, width: 515, height: 20, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page6.drawText('Project Reference & Client', { x: 46, y: y - 14, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Process / Division', { x: 154, y: y - 14, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Sampled Documents & Records', { x: 248, y: y - 14, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Clause', { x: 392, y: y - 14, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Audit Finding', { x: 460, y: y - 14, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  y -= 20;

  for (const sp of sampledProjects) {
    const refLines = getWrappedLines(`${sp.ref}\n${sp.client}`, 102, 7.2, fontBold);
    const procLines = getWrappedLines(sp.process, 88, 7.2, fontRegular);
    const docLines = getWrappedLines(sp.docs, 138, 7.2, fontRegular);
    const clauseLines = getWrappedLines(sp.clause, 62, 7.2, fontBold);
    const findLines = getWrappedLines(sp.finding, 90, 7.2, fontRegular);
    
    const maxLines = Math.max(refLines.length, procLines.length, docLines.length, clauseLines.length, findLines.length);
    const rowH = Math.max(72, maxLines * 10.0 + 12);

    page6.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    
    let curY = y - 13;
    for (const l of refLines) { page6.drawText(l, { x: 46, y: curY, size: 7, font: fontBold, color: darkNavy }); curY -= 9.5; }
    
    curY = y - 13;
    for (const l of procLines) { page6.drawText(l, { x: 154, y: curY, size: 7, font: fontRegular, color: textDark }); curY -= 9.5; }
    
    curY = y - 13;
    for (const l of docLines) { page6.drawText(l, { x: 248, y: curY, size: 7, font: fontRegular, color: textDark }); curY -= 9.5; }
    
    curY = y - 13;
    for (const l of clauseLines) { page6.drawText(l, { x: 392, y: curY, size: 7, font: fontBold, color: primaryRed }); curY -= 9.5; }
    
    curY = y - 13;
    for (const l of findLines) { page6.drawText(l, { x: 460, y: curY, size: 7, font: fontRegular, color: textDark }); curY -= 9.5; }
    
    y -= rowH;
  }

  drawRunningFooter(page6, 6);

  // =========================================================================
  // PAGE 7: SECTION 9 - NONCONFORMITY REPORT FORM (ZERO OVERFLOW / 100% BOUNDED)
  // =========================================================================
  currentPageNumber++;
  const page7 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page7);

  // Top Title above Form Box
  page7.drawText('Non-conformance 1 of 1: Timely Renewal of Statutory OH&S Certificates', {
    x: 40,
    y: 778,
    size: 11.5,
    font: fontBold,
    color: darkNavy
  });

  const formTop = 765;
  const formLeft = 40;
  const formWidth = 515;

  // Box 1: System requirements (height 40, from 765 down to 725)
  page7.drawRectangle({ x: formLeft, y: 725, width: formWidth, height: 40, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1 });
  page7.drawRectangle({ x: formLeft, y: 747, width: formWidth, height: 18, color: tableBg, borderColor: lineGray, borderWidth: 0.5 });
  page7.drawText('System requirements:', { x: 48, y: 752, size: 8, font: fontBold, color: darkNavy });
  page7.drawText('ISO 45001:2018, requirements clause 6.1.3 (Legal and other requirements) and clause 9.1.2 (Evaluation of compliance)', {
    x: 48,
    y: 733,
    size: 7.5,
    font: fontRegular,
    color: textDark
  });

  // Box 2: Non-conformance statement (height 50, from 725 down to 675)
  // Left cell: Rust/Burgundy background
  page7.drawRectangle({ x: formLeft, y: 675, width: 120, height: 50, color: rgb(0.66, 0.20, 0.20), borderColor: darkNavy, borderWidth: 1 });
  page7.drawText('Non-', { x: 80, y: 703, size: 11, font: fontBold, color: rgb(1, 1, 1) });
  page7.drawText('conformance', { x: 55, y: 688, size: 11, font: fontBold, color: rgb(1, 1, 1) });

  // Right cell: Statement (Strictly wrapped within 380 pt)
  page7.drawRectangle({ x: formLeft + 120, y: 675, width: formWidth - 120, height: 50, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1 });
  page7.drawText('The OH&S certificates reviewed during the audit had expired, indicating', {
    x: 168,
    y: 708,
    size: 7.8,
    font: fontBold,
    color: darkNavy
  });
  page7.drawText('a lapse in the timely renewal and maintenance of statutory certification', {
    x: 168,
    y: 696,
    size: 7.8,
    font: fontBold,
    color: darkNavy
  });
  page7.drawText('requirements under the Integrated Management System.', {
    x: 168,
    y: 684,
    size: 7.8,
    font: fontBold,
    color: darkNavy
  });

  // Box 3: Observations / facts (height 75, from 675 down to 600)
  page7.drawRectangle({ x: formLeft, y: 600, width: formWidth, height: 75, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1 });
  page7.drawRectangle({ x: formLeft, y: 657, width: formWidth, height: 18, color: tableBg, borderColor: lineGray, borderWidth: 0.5 });
  page7.drawText('This is based on the following observations/facts:', { x: 48, y: 662, size: 8, font: fontBold, color: darkNavy });
  
  page7.drawText('At the time of the audit, statutory occupational health and safety certificates had exceeded their validity period', {
    x: 48,
    y: 642,
    size: 7.5,
    font: fontRegular,
    color: textDark
  });
  page7.drawText('without completed renewal evidence on file, showing a lapse in statutory compliance tracking and renewal lead time.', {
    x: 48,
    y: 630,
    size: 7.5,
    font: fontRegular,
    color: textDark
  });

  // Bottom row inside Box 3 (Due date & Lead auditor)
  page7.drawLine({ start: { x: formLeft, y: 618 }, end: { x: formLeft + formWidth, y: 618 }, thickness: 0.5, color: lineGray });
  page7.drawText('Due date:', { x: 80, y: 606, size: 7.5, font: fontBold, color: textDark });
  page7.drawRectangle({ x: 125, y: 603, width: 75, height: 13, color: rgb(0.93, 0.95, 0.97) });
  page7.drawText('2026-06-30', { x: 133, y: 606, size: 7.5, font: fontBold, color: primaryRed });

  page7.drawText('Lead auditor:', { x: 300, y: 606, size: 7.5, font: fontBold, color: textDark });
  page7.drawRectangle({ x: 360, y: 603, width: 120, height: 13, color: rgb(0.93, 0.95, 0.97) });
  page7.drawText('Philippa Arinaitwe', { x: 372, y: 606, size: 7.5, font: fontBold, color: darkNavy });

  // Heavy double dividing line
  page7.drawLine({ start: { x: formLeft, y: 600 }, end: { x: formLeft + formWidth, y: 600 }, thickness: 1.5, color: darkNavy });
  page7.drawLine({ start: { x: formLeft, y: 597 }, end: { x: formLeft + formWidth, y: 597 }, thickness: 1.5, color: darkNavy });

  // Box 4: What is the root cause (height 185, from 597 down to 412)
  page7.drawRectangle({ x: formLeft, y: 412, width: formWidth, height: 185, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1 });
  page7.drawRectangle({ x: formLeft, y: 567, width: formWidth, height: 30, color: rgb(0.90, 0.93, 0.96), borderColor: lineGray, borderWidth: 0.5 });
  page7.drawText('What is the root cause for the non-conformance: (For company use. The complete report shall be returned)', {
    x: 46,
    y: 585,
    size: 7.5,
    font: fontBold,
    color: darkNavy
  });
  page7.drawText('Describe the weakness of the management system leading to the nonconformity. Root cause is basis for corrective actions.', {
    x: 46,
    y: 573,
    size: 6.5,
    font: fontRegular,
    color: textGray
  });

  // Content inside Box 4: 5-Why Methodology (Strictly bounded)
  page7.drawText('Root Cause Analysis: 5-Why Methodology Applied', { x: 48, y: 554, size: 7.5, font: fontBold, color: rgb(0.1, 0.4, 0.7) });

  page7.drawText('Why 1 -', { x: 48, y: 541, size: 7.2, font: fontBold, color: primaryRed });
  page7.drawText('Answer: Expired OH&S certificates on file -- Renewal submissions were not initiated prior to expiration.', { x: 88, y: 541, size: 7.2, font: fontRegular, color: textDark });

  page7.drawText('Why 2 -', { x: 48, y: 527, size: 7.2, font: fontBold, color: primaryRed });
  page7.drawText('Answer: Renewals not initiated in advance -- Certificate expiry dates were not flagged with lead time.', { x: 88, y: 527, size: 7.2, font: fontRegular, color: textDark });

  page7.drawText('Why 3 -', { x: 48, y: 513, size: 7.2, font: fontBold, color: primaryRed });
  page7.drawText('Answer: Absence of advance reminders -- The statutory register lacked automated expiration notification intervals.', { x: 88, y: 513, size: 7.2, font: fontRegular, color: textDark });

  page7.drawText('Why 4 -', { x: 48, y: 499, size: 7.2, font: fontBold, color: primaryRed });
  page7.drawText('Answer: Absence of intervals -- Compliance procedure lacked mandatory lead-time windows for external processing.', { x: 88, y: 499, size: 7.2, font: fontRegular, color: textDark });

  page7.drawText('Why 5 -', { x: 48, y: 485, size: 7.2, font: fontBold, color: primaryRed });
  page7.drawText('Root Cause: The IMS lacked an automated statutory renewal tracking & early-warning alert trigger mechanism.', { x: 88, y: 485, size: 7.2, font: fontBold, color: darkNavy });

  page7.drawText('Historical practice: Tracking relied on ad-hoc manual reviews rather than automated calendar alert notifications.', {
    x: 48,
    y: 468,
    size: 7.0,
    font: fontOblique,
    color: textGray
  });

  // Box 5: Corrective actions implemented (height 145, from 412 down to 267)
  page7.drawRectangle({ x: formLeft, y: 267, width: formWidth, height: 145, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1 });
  page7.drawRectangle({ x: formLeft, y: 387, width: formWidth, height: 25, color: rgb(0.90, 0.93, 0.96), borderColor: lineGray, borderWidth: 0.5 });
  page7.drawText('Corrective actions implemented: (For company use. The complete report shall be returned)', {
    x: 46,
    y: 400,
    size: 7.5,
    font: fontBold,
    color: darkNavy
  });
  page7.drawText('Describe changes made in the management system preventing the nonconformity to recur', {
    x: 46,
    y: 390,
    size: 6.5,
    font: fontRegular,
    color: textGray
  });

  // Content inside Box 5:
  page7.drawText('Immediate action:', { x: 48, y: 375, size: 7.5, font: fontBold, color: primaryRed });
  page7.drawText('Submitted formal application and documentation for expedited renewal of all expired statutory OH&S certificates.', { x: 48, y: 363, size: 7.2, font: fontRegular, color: textDark });

  page7.drawText('Final action (Systemic):', { x: 48, y: 350, size: 7.5, font: fontBold, color: darkNavy });
  page7.drawText('Integrated statutory certificates into IMS compliance calendar with mandatory 60-day & 30-day renewal alerts.', { x: 48, y: 338, size: 7.2, font: fontRegular, color: textDark });

  page7.drawText('Future action (Preventive Action):', { x: 48, y: 325, size: 7.5, font: fontBold, color: darkNavy });
  page7.drawText('Instituted quarterly compliance evaluation audits (Clause 9.1.2) to verify validity of all permits prior to expiration.', { x: 48, y: 313, size: 7.2, font: fontRegular, color: textDark });

  // Sub-row inside Box 5: Date and Name
  page7.drawLine({ start: { x: formLeft, y: 287 }, end: { x: formLeft + formWidth, y: 287 }, thickness: 0.5, color: lineGray });
  page7.drawText('Date:', { x: 80, y: 274, size: 7.5, font: fontBold, color: textDark });
  page7.drawRectangle({ x: 110, y: 271, width: 75, height: 13, color: rgb(0.93, 0.95, 0.97) });
  page7.drawText('2026-06-30', { x: 120, y: 274, size: 7.5, font: fontBold, color: primaryRed });

  page7.drawText('Name:', { x: 260, y: 274, size: 7.5, font: fontBold, color: textDark });
  page7.drawRectangle({ x: 300, y: 271, width: 170, height: 13, color: rgb(0.93, 0.95, 0.97) });
  page7.drawText('Amanya Patience (MR) / OHS Officer', { x: 310, y: 274, size: 7.2, font: fontBold, color: darkNavy });

  // Heavy double dividing line
  page7.drawLine({ start: { x: formLeft, y: 267 }, end: { x: formLeft + formWidth, y: 267 }, thickness: 1.5, color: darkNavy });
  page7.drawLine({ start: { x: formLeft, y: 264 }, end: { x: formLeft + formWidth, y: 264 }, thickness: 1.5, color: darkNavy });

  // Box 6: Corrective actions verified by Lead auditor (height 75, from 264 down to 189)
  page7.drawRectangle({ x: formLeft, y: 189, width: formWidth, height: 75, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1 });
  page7.drawRectangle({ x: formLeft, y: 246, width: formWidth, height: 18, color: rgb(0.95, 0.95, 0.96), borderColor: lineGray, borderWidth: 0.5 });
  page7.drawText('Corrective actions verified by Lead auditor (for Lead Auditor):', { x: 46, y: 251, size: 7.5, font: fontBold, color: darkNavy });

  page7.drawText('Review of the identified causes and the corrective action are considered satisfactory verification to close', {
    x: 48,
    y: 233,
    size: 7.2,
    font: fontRegular,
    color: textDark
  });
  page7.drawText('the nonconformity. The effectiveness of the action will be verified in the next internal audit cycle.', {
    x: 48,
    y: 221,
    size: 7.2,
    font: fontRegular,
    color: textDark
  });

  // Bottom row inside Box 6: Approved & Lead auditor
  page7.drawLine({ start: { x: formLeft, y: 207 }, end: { x: formLeft + formWidth, y: 207 }, thickness: 0.5, color: lineGray });
  page7.drawText('Approved:', { x: 80, y: 195, size: 7.5, font: fontBold, color: textDark });
  page7.drawRectangle({ x: 130, y: 192, width: 75, height: 13, color: rgb(0.93, 0.95, 0.97) });
  page7.drawText('2026-05-21', { x: 140, y: 195, size: 7.5, font: fontBold, color: greenSuccess });

  page7.drawText('Lead auditor:', { x: 280, y: 195, size: 7.5, font: fontBold, color: textDark });
  page7.drawRectangle({ x: 345, y: 192, width: 120, height: 13, color: rgb(0.93, 0.95, 0.97) });
  page7.drawText('Philippa Arinaitwe', { x: 355, y: 195, size: 7.5, font: fontBold, color: darkNavy });

  // Outer frame boundary
  page7.drawRectangle({ x: formLeft, y: 189, width: formWidth, height: 576, borderColor: darkNavy, borderWidth: 1.5, opacity: 0 });

  drawRunningFooter(page7, 7);

  // =========================================================================
  // PAGE 8: SECTION 10 - IMS IMPROVEMENTS & OPPORTUNITIES FOR IMPROVEMENT (OFI)
  // =========================================================================
  currentPageNumber++;
  const page8 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page8);
  y = 780;

  page8.drawText('10. IMS IMPROVEMENTS & OPPORTUNITIES FOR IMPROVEMENT (OFI)', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page8.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page8.drawText('The audit identified two (2) targeted areas for improvement aimed at strengthening compliance and continual improvement:', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 18;

  const ofiItems = [
    {
      num: 'OFI-2026-01',
      title: 'Issuance of Supplier Performance Evaluation Forms',
      clause: 'ISO 9001:2015 Clause 8.4.1 (Evaluation and Control of External Providers)',
      dept: 'Procurement / Operational Support & Finance',
      target: '30 June 2026',
      finding: 'Supplier evaluation forms had not yet been issued to suppliers at the time of the audit, contrary to the requirements of ISO 9001:2015 Clause 8.4.1 regarding the evaluation and control of external providers.',
      recommendation: 'Issue supplier performance evaluation questionnaires to all 27 suppliers on the 2026 Approved Supplier Master List (PROME-IMSR-TO-31) and establish an annual supplier evaluation schedule due every November/December to systematically assess supplier reliability, quality, and delivery performance.'
    },
    {
      num: 'OFI-2026-02',
      title: 'Updating Physical Notice Board Display of Quality Policy',
      clause: 'ISO 9001:2015 Clause 7.5 (Documented Information) & Clause 5.2 (Policy)',
      dept: 'SAS / Administration & Human Resources',
      target: '31 May 2026',
      finding: 'The Quality Policy displayed on the notice board was an outdated 2025 version, indicating inadequate control and updating of documented information in line with the requirements of ISO 9001:2015 Clause 7.5 and ISO 9001:2015 Clause 5.2.',
      recommendation: 'Immediately remove the outdated 2025 version and display the approved 2026 Integrated Management System Policy signed by the Managing Director Ronald Kibuuka on all corporate notice boards and common areas; incorporate notice board content reviews into monthly 5S/IMS inspection checklists.'
    }
  ];

  for (const ofi of ofiItems) {
    const cardH = 145;
    page8.drawRectangle({ x: 40, y: y - cardH, width: 515, height: cardH, color: tableBg, borderColor: lineGray, borderWidth: 0.8 });
    
    // Top bar
    page8.drawRectangle({ x: 40, y: y - 24, width: 515, height: 24, color: rgb(0.93, 0.95, 0.98), borderColor: lineGray, borderWidth: 0.5 });
    page8.drawText(`${ofi.num}: ${ofi.title}`, { x: 48, y: y - 16, size: 8, font: fontBold, color: darkNavy });
    page8.drawText(`Target Date: ${ofi.target}`, { x: 410, y: y - 16, size: 7.5, font: fontBold, color: primaryRed });
    
    page8.drawText(`Standard Clause: ${ofi.clause}`, { x: 48, y: y - 38, size: 7.2, font: fontBold, color: primaryRed });
    page8.drawText(`Responsible: ${ofi.dept}`, { x: 330, y: y - 38, size: 7.2, font: fontRegular, color: textGray });

    page8.drawText('Observation / Context:', { x: 48, y: y - 54, size: 7.2, font: fontBold, color: textDark });
    drawWrappedText(page8, ofi.finding, 48, y - 66, 495, 7.2, fontRegular, textDark, 11);

    page8.drawText('Auditor Recommendation:', { x: 48, y: y - 88, size: 7.2, font: fontBold, color: greenSuccess });
    drawWrappedText(page8, ofi.recommendation, 48, y - 100, 495, 7.2, fontRegular, textDark, 11);

    y -= (cardH + 16);
  }

  // Guidance Box at bottom of Page 8
  page8.drawRectangle({ x: 40, y: y - 75, width: 515, height: 75, color: rgb(0.97, 0.98, 1), borderColor: darkNavy, borderWidth: 0.8 });
  page8.drawText('OFI IMPLEMENTATION & CONTINUAL IMPROVEMENT TRACKING:', { x: 48, y: y - 16, size: 8, font: fontBold, color: darkNavy });
  const ofiGuide = 'Opportunities for Improvement describe conditions that are currently conforming but where management system efficiency and operational control can be enhanced to prevent future non-conformance. Action plans and progress against these recommendations shall be reviewed by the Management Representative (MR) during forthcoming Management Review Meetings (MRM) to ensure continual system advancement in line with ISO 9001:2015 Clause 10.3.';
  drawWrappedText(page8, ofiGuide, 48, y - 30, 495, 7.2, fontRegular, textDark, 10.5);

  drawRunningFooter(page8, 8);

  // =========================================================================
  // PAGE 9: AUDIT CONCLUSION & APPENDIX 1 - AUDIT PLAN
  // =========================================================================
  currentPageNumber++;
  const page9 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page9);
  y = 780;

  page9.drawText('11. AUDIT CONCLUSION', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page9.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  const conclusionText = 'The audit identified a few areas for improvement and one non-conformance, aimed at strengthening compliance and continual improvement of the IMS.\n\nThis report therefore, records the results of the internal audit findings and recommendations, looking at possible ways in which the operations could be improved to overcome identified weaknesses so as to increase the efficiency and effectiveness of the System.';
  y = drawWrappedText(page9, conclusionText, 40, y, 515, 8, fontRegular, textDark, 12);
  y -= 16;

  page9.drawText('APPENDIX 1 -- INTERNAL AUDIT PLAN', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page9.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  // Timetable Table Header
  page9.drawRectangle({ x: 40, y: y - 20, width: 515, height: 20, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page9.drawText('Time', { x: 48, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page9.drawText('Subject', { x: 105, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page9.drawText('Participants', { x: 380, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  y -= 20;

  const planRows = [
    {
      time: '0900',
      subject: 'Opening Meeting',
      participants: 'All Prome workers'
    },
    {
      time: '10am',
      subject: 'Top Management\n- Leadership and commitment (qms) 5.1.1\n- Customer focus 5.1.2\n- Quality policy 5.2.1\n- Planning to achieve quality objectives 6.2.2.1\n- General improvement 10.1\n- Understanding the organisation and its context 4.1\n- Understanding the needs and expectations of interested parties 4.2\n- Actions to address risks and opportunities 6.1.1',
      participants: 'MD, Elizabeth (PDMD), Stephanie (CPSD)'
    },
    {
      time: '1100',
      subject: 'System Design and Control\n- Determining the scope of the QMS 4.3\n- Resources 7.1.1 - 7.1.6\n- Competence 7.2\n- Awareness 7.3\n- Communication 7.4',
      participants: 'Human Resource, RA'
    },
    {
      time: '1300',
      subject: 'Lunch',
      participants: 'All participants'
    },
    {
      time: '1400',
      subject: 'Operational Support\n- Organisational roles, responsibilities, authorities 5.3\n- People 7.1.2\n- Infrastructure 7.1.3\n- Environment 7.1.4\n- Organisational knowledge 7.1.6',
      participants: 'Human Resource, RA, Process Owners'
    },
    {
      time: '1600',
      subject: 'OHS\n- Leadership and worker participation 5.4\n- Identification of legal and other requirements 6.1.2.3\n- Hierarchy of controls 8.1.2\n- Evaluation of compliance 9.1.4',
      participants: 'Philippa Arinaitwe'
    },
    {
      time: '1800',
      subject: 'Closing meeting',
      participants: 'All Prome workers'
    }
  ];

  for (const pr of planRows) {
    const isBig = pr.subject.includes('\n');
    const rowH = pr.time === '10am' ? 100 : isBig ? 55 : 24;
    page9.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page9.drawText(pr.time, { x: 48, y: y - 15, size: 7.5, font: fontBold, color: primaryRed });
    drawWrappedText(page9, pr.subject, 105, y - 15, 265, 7.2, fontRegular, textDark, 10.5);
    drawWrappedText(page9, pr.participants, 380, y - 15, 170, 7.2, fontRegular, textDark, 10.5);
    y -= rowH;
  }

  drawRunningFooter(page9, 9);

  // =========================================================================
  // PAGE 10: APPENDIX 2 - OPENING MEETING ATTENDANCE RECORD (AUTHENTIC SCAN)
  // =========================================================================
  currentPageNumber++;
  const page10 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page10);
  y = 780;

  page10.drawText('APPENDIX 2 -- ATTENDANCE RECORD: OPENING MEETING (21 MAY 2026)', { x: 40, y, size: 10, font: fontBold, color: darkNavy });
  page10.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 14;

  page10.drawText('Form Ref: PROME-QSR-ADF-20 (Internal Audit Attendance Form, Version No: 00) -- Scanned Original', {
    x: 40,
    y,
    size: 7.2,
    font: fontOblique,
    color: textGray
  });
  y -= 12;

  // Fit image4.jpeg proportionally within width 460, height 680 (Centered)
  const maxScanW = 460;
  const maxScanH = 680;
  const aspectOp = attOpening.height / attOpening.width;
  let scanW = maxScanW;
  let scanH = scanW * aspectOp;
  if (scanH > maxScanH) {
    scanH = maxScanH;
    scanW = scanH / aspectOp;
  }
  const scanX = 40 + (515 - scanW) / 2;

  page10.drawImage(attOpening, {
    x: scanX,
    y: y - scanH,
    width: scanW,
    height: scanH
  });

  drawRunningFooter(page10, 10);

  // =========================================================================
  // PAGE 11: APPENDIX 2 - CLOSING MEETING ATTENDANCE RECORD (AUTHENTIC SCAN)
  // =========================================================================
  currentPageNumber++;
  const page11 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page11);
  y = 780;

  page11.drawText('APPENDIX 2 -- ATTENDANCE RECORD: CLOSING MEETING (21 MAY 2026)', { x: 40, y, size: 10, font: fontBold, color: darkNavy });
  page11.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 14;

  page11.drawText('Form Ref: PROME-QSR-ADF-20 (Internal Audit Attendance Form, Version No: 00) -- Scanned Original with Signatures', {
    x: 40,
    y,
    size: 7.2,
    font: fontOblique,
    color: textGray
  });
  y -= 12;

  // Fit image5.jpeg proportionally
  const aspectCl = attClosing.height / attClosing.width;
  let scanClW = maxScanW;
  let scanClH = scanClW * aspectCl;
  if (scanClH > maxScanH) {
    scanClH = maxScanH;
    scanClW = scanClH / aspectCl;
  }
  const scanClX = 40 + (515 - scanClW) / 2;

  page11.drawImage(attClosing, {
    x: scanClX,
    y: y - scanClH,
    width: scanClW,
    height: scanClH
  });

  drawRunningFooter(page11, 11);

  // =========================================================================
  // PAGE 12: APPENDIX 3 - INTEGRATED PROGRAMME & LEAD AUDITOR CERTIFICATION
  // =========================================================================
  currentPageNumber++;
  const page12 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page12);
  y = 780;

  page12.drawText('APPENDIX 3 -- INTEGRATED AUDIT PROGRAMME & VERIFICATION MATRIX', { x: 40, y, size: 10, font: fontBold, color: darkNavy });
  page12.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 14;

  page12.drawText('Master alignment of PROME core QMS/OHS processes against ISO 9001:2015 and ISO 45001:2018 criteria.', {
    x: 40,
    y,
    size: 7.2,
    font: fontOblique,
    color: textGray
  });
  y -= 14;

  // Table Header
  page12.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page12.drawText('Division / Department', { x: 46, y: y - 13, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  page12.drawText('Process / Focus Area', { x: 140, y: y - 13, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  page12.drawText('Applicable ISO Clauses', { x: 365, y: y - 13, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  page12.drawText('Audit Status', { x: 490, y: y - 13, size: 7.2, font: fontBold, color: rgb(1, 1, 1) });
  y -= 18;

  const app3Rows = [
    { div: 'Top Management', proc: 'Strategic Context, Policy, Objectives & MRM', clauses: '4.1, 4.2, 5.1, 5.2, 6.2, 9.3', status: 'Conforming' },
    { div: 'PMBDD', proc: 'Business Development, Proposals, EOIs & RFPs', clauses: '8.2, 8.4, 6.2.2, 7.4', status: 'Conforming' },
    { div: 'PDMD', proc: 'Project Planning, Site Supervision & Customer Focus', clauses: '5.1.2, 8.1, 8.5, 8.6, 8.7', status: 'Conforming' },
    { div: 'PED', proc: 'Detailed Engineering Design & Technical Verification', clauses: '8.3, 7.1.5, 7.1.6, 8.5', status: 'Conforming' },
    { div: 'CPSD', proc: 'HIRA Studies, ESIA, Environmental & Safety', clauses: '6.1.1, 6.1.2.1, 6.1.3, 5.4, 8.2', status: 'Conforming' },
    { div: 'HRAD & AFD', proc: 'Competence, Staffing, Infrastructure, Accounting', clauses: '5.3, 7.1.2, 7.1.3, 7.2, 7.3', status: 'Conforming' },
    { div: 'Quality & Audit', proc: 'Internal Auditing, CAPA & Continual Improvement', clauses: '9.2, 10.1, 10.2, 10.3', status: 'Conforming' },
    { div: 'Documentation (SAS)', proc: 'Document Control, Records Management & Masterlist', clauses: '7.5, 8.1', status: 'Conforming' }
  ];

  for (const row of app3Rows) {
    const rowH = 20;
    page12.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page12.drawText(row.div, { x: 46, y: y - 13, size: 7.0, font: fontBold, color: darkNavy });
    page12.drawText(row.proc, { x: 140, y: y - 13, size: 6.8, font: fontRegular, color: textDark });
    page12.drawText(row.clauses, { x: 365, y: y - 13, size: 6.8, font: fontRegular, color: textGray });
    page12.drawText(row.status, { x: 490, y: y - 13, size: 7.0, font: fontBold, color: greenSuccess });
    y -= rowH;
  }
  y -= 14;

  // Embed authentic scanned Audit Programme image if present
  if (attProg) {
    const progW = 480;
    const progH = (attProg.height / attProg.width) * progW;
    page12.drawImage(attProg, {
      x: 40 + (515 - progW) / 2,
      y: y - progH,
      width: progW,
      height: progH
    });
    y -= (progH + 14);
  }

  // Final Endorsement Box
  page12.drawRectangle({ x: 40, y: y - 90, width: 515, height: 90, color: tableBg, borderColor: darkNavy, borderWidth: 1 });
  page12.drawText('FORMAL LEAD AUDITOR CERTIFICATION STATEMENT', { x: 50, y: y - 16, size: 8.5, font: fontBold, color: darkNavy });
  
  const certStatement = 'The internal audit was conducted in accordance with ISO 19011:2018 guidelines and PROME\'s established audit procedures. Based on the evidence reviewed, PROME\'s Integrated Management System was found to be generally effective and conforming to the applicable requirements of ISO 9001:2015 and ISO 45001:2018.';
  drawWrappedText(page12, certStatement, 50, y - 30, 495, 7.5, fontRegular, textDark, 11);

  page12.drawText('Report Prepared By: Philippa Arinaitwe (Lead Auditor)', { x: 50, y: y - 66, size: 7.5, font: fontBold, color: primaryRed });
  page12.drawText('Endorsed By: Amanya Patience (Management Representative) & Eng. Ronald Kibuuka (Managing Director)', { x: 50, y: y - 79, size: 7.2, font: fontRegular, color: textDark });

  drawRunningFooter(page12, 12);

  // Save the master PDF locally
  const outDir = path.join(__dirname, '../../uploads/audit-reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const pdfFileName = 'PROME-AUD-2026-001_Modern_ISO_Audit_Report.pdf';
  const pdfAltFileName = 'PROME-IMSR-PMBDD-11_Audit_Report_04.pdf';
  const pdfOfficialFileName = 'PROME-MSR-PMBDD-11_Audit_Report_04.pdf';
  const outPath = path.join(outDir, pdfFileName);
  const outAltPath = path.join(outDir, pdfAltFileName);
  const outOfficialPath = path.join(outDir, pdfOfficialFileName);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPath, pdfBytes);
  fs.writeFileSync(outAltPath, pdfBytes);
  fs.writeFileSync(outOfficialPath, pdfBytes);

  // Also copy to public/uploads/audit-reports/ so static serving works seamlessly
  const publicOutDir = path.join(__dirname, '../../../public/uploads/audit-reports');
  if (!fs.existsSync(publicOutDir)) {
    fs.mkdirSync(publicOutDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicOutDir, pdfFileName), pdfBytes);
  fs.writeFileSync(path.join(publicOutDir, pdfAltFileName), pdfBytes);
  fs.writeFileSync(path.join(publicOutDir, pdfOfficialFileName), pdfBytes);

  console.log(`[Audit Report] Generated PDF successfully (${pdfBytes.length} bytes, ${totalPages} pages).`);
  console.log(`[Audit Report] Saved to: ${outPath}`);
  console.log(`[Audit Report] Saved to: ${outAltPath}`);

  return {
    pdfPath: outPath,
    pdfAltPath: outAltPath,
    reportPdfUrl: `/uploads/audit-reports/${pdfFileName}`,
    reportPdfAltUrl: `/uploads/audit-reports/${pdfAltFileName}`,
    reportPdfOfficialUrl: `/uploads/audit-reports/${pdfOfficialFileName}`,
    pdfBytesLength: pdfBytes.length
  };
}

if (require.main === module) {
  generateModernAuditReport().catch(console.error);
}
