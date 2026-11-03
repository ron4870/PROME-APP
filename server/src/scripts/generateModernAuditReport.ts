import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateModernAuditReport() {
  console.log('[Audit Report] Starting generation of Modern ISO Compliant Audit Report (Revised per Lead Auditor Review)...');

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
  const totalPages = 11;

  const drawRunningHeader = (page: any) => {
    page.drawText('PROME CONSULTANTS LIMITED -- INTEGRATED MANAGEMENT SYSTEM AUDIT REPORT', {
      x: 40,
      y: 815,
      size: 7.5,
      font: fontBold,
      color: primaryRed
    });
    page.drawText('Doc Ref: PROME-IMSR-PMBDD-11 | Audit No. 04 (PROME-AUD-2026-001)', {
      x: 320,
      y: 815,
      size: 7.5,
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
      size: 7.5,
      font: fontOblique,
      color: textGray
    });
    page.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: 500,
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

  // =========================================================================
  // PAGE 1: OFFICIAL AUDIT REPORT (LEAD SHEET) - PROME-IMSR-PMBDD-11 REV 00
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
      width: 110,
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
  page1.drawText('Audit Report', { x: 50, y: 747, size: 8, font: fontBold, color: textDark });
  page1.drawText('PROME-IMSR-PMBDD-11', { x: 135, y: 747, size: 8.5, font: fontBold, color: primaryRed });
  page1.drawText('Version 00', { x: 280, y: 747, size: 8, font: fontRegular, color: textDark });
  page1.drawText('Date: 27th Oct 2026', { x: 380, y: 747, size: 8, font: fontBold, color: textDark });
  page1.drawText('PROME-AUD-2026-001', { x: 468, y: 747, size: 7.5, font: fontBold, color: darkNavy });

  // Main Lead Sheet Grid Box
  page1.drawRectangle({ x: 40, y: 115, width: 515, height: 615, color: rgb(1, 1, 1), borderColor: darkNavy, borderWidth: 1.5 });

  // Title Row
  page1.drawLine({ start: { x: 40, y: 690 }, end: { x: 555, y: 690 }, thickness: 1, color: lineGray });
  page1.drawLine({ start: { x: 195, y: 738 }, end: { x: 195, y: 690 }, thickness: 1, color: lineGray });
  page1.drawLine({ start: { x: 405, y: 738 }, end: { x: 405, y: 690 }, thickness: 1, color: lineGray });

  page1.drawText('PROME CONSULTANTS', { x: 48, y: 717, size: 10, font: fontBold, color: darkNavy });
  page1.drawText('LIMITED', { x: 48, y: 704, size: 10, font: fontBold, color: darkNavy });

  page1.drawText('AUDIT REPORT', { x: 245, y: 718, size: 13, font: fontBold, color: primaryRed });
  page1.drawText('(LEAD SHEET)', { x: 250, y: 703, size: 11, font: fontBold, color: primaryRed });

  page1.drawText('AUDIT REPORT NO. 04', { x: 420, y: 717, size: 9.5, font: fontBold, color: darkNavy });
  page1.drawText('Cycle: Q4 2026 Internal', { x: 420, y: 704, size: 7.5, font: fontRegular, color: textGray });

  // Row 1: Audited Dept & Type
  page1.drawLine({ start: { x: 40, y: 658 }, end: { x: 555, y: 658 }, thickness: 0.5, color: lineGray });
  page1.drawText('AUDITED DEPT -', { x: 48, y: 671, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('All Departments (PMBDD, CPSD, PDMD, PED, HRAD, FD, SAS)', { x: 135, y: 671, size: 8, font: fontRegular, color: textDark });
  page1.drawText('TYPE OF AUDIT -', { x: 400, y: 671, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('Internal Audit', { x: 485, y: 671, size: 8, font: fontBold, color: primaryRed });

  // Row 2: Date & Standard
  page1.drawLine({ start: { x: 40, y: 626 }, end: { x: 555, y: 626 }, thickness: 0.5, color: lineGray });
  page1.drawText('DATE OF AUDIT -', { x: 48, y: 639, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('27-10-2026', { x: 135, y: 639, size: 8, font: fontRegular, color: textDark });
  page1.drawText('STANDARD -', { x: 240, y: 639, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('ISO 9001:2015 and 45001:2018 (Integrated Management System)', { x: 300, y: 639, size: 7.5, font: fontBold, color: primaryRed });

  // Row 3: Audit Criteria
  page1.drawLine({ start: { x: 40, y: 575 }, end: { x: 555, y: 575 }, thickness: 0.5, color: lineGray });
  page1.drawText('AUDIT CRITERIA (M/HIRA Studies, Risk Management/ PR/WI/JD/CL/R):', { x: 48, y: 610, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('Manuals, Standard Operating Procedures, Tool Box Talks, Project Quality Plans (PR), HIRA Studies,', { x: 48, y: 598, size: 7.5, font: fontRegular, color: textDark });
  page1.drawText('Work Instructions (WI), Job Descriptions (JD), Checklists (C/L), Statutory Legal Requirements, Objective Records.', { x: 48, y: 586, size: 7.5, font: fontRegular, color: textDark });

  // Row 4: Lead Auditor & Team
  page1.drawLine({ start: { x: 40, y: 535 }, end: { x: 555, y: 535 }, thickness: 0.5, color: lineGray });
  page1.drawText('LEAD AUDITOR -', { x: 48, y: 555, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('Philippa Arinaitwe', { x: 135, y: 555, size: 8.5, font: fontBold, color: textDark });
  page1.drawText('AUDIT TEAM -', { x: 260, y: 555, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('Amanya Patience (MR), Mugisha Benjamin, Keitesi Samalie', { x: 335, y: 555, size: 7.5, font: fontRegular, color: textDark });

  // Row 5: Persons Audited
  page1.drawLine({ start: { x: 40, y: 480 }, end: { x: 555, y: 480 }, thickness: 0.5, color: lineGray });
  page1.drawText('PERSONS AUDITED -', { x: 48, y: 518, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('Stephanie A Canowira (Deputy Head CPSD), Gertrude Nakiyaga (Head SAS), Nampewo Elizabeth (Deputy Head PDMD),', { x: 48, y: 504, size: 7.5, font: fontRegular, color: textDark });
  page1.drawText('Godfrey Ssambwa (Head PMBDD), Ronald Kibuuka (Managing Director), Joseph Kigozi (D. Head PMBDD)', { x: 48, y: 492, size: 7.5, font: fontRegular, color: textDark });

  // Row 6: Previous Audit Date & No
  page1.drawLine({ start: { x: 40, y: 448 }, end: { x: 555, y: 448 }, thickness: 0.5, color: lineGray });
  page1.drawText('PREVIOUS AUDIT DATE -', { x: 48, y: 461, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('21/05/2026', { x: 175, y: 461, size: 8, font: fontRegular, color: textDark });
  page1.drawText('PREVIOUS AUDIT REPORT NO -', { x: 300, y: 461, size: 8, font: fontBold, color: darkNavy });
  page1.drawText('3 (PROME-IMSR-PMBDD-10)', { x: 450, y: 461, size: 8, font: fontRegular, color: textDark });

  // Row 7: Lead Auditor Conclusion (Evidence-Based without percentages)
  page1.drawLine({ start: { x: 40, y: 350 }, end: { x: 555, y: 350 }, thickness: 0.5, color: lineGray });
  page1.drawText('LEAD AUDITOR CONCLUSION:', { x: 48, y: 428, size: 8.5, font: fontBold, color: darkNavy });
  page1.drawText('The audit was conducted successfully in accordance with ISO 19011:2018 guidelines and PROME established procedures.', {
    x: 48,
    y: 412,
    size: 7.5,
    font: fontRegular,
    color: textDark
  });
  page1.drawText('No major non-conformance was identified. One (1) minor non-conformity and two (2) opportunities for improvement were recorded.', {
    x: 48,
    y: 399,
    size: 7.5,
    font: fontBold,
    color: primaryRed
  });
  page1.drawText('Overall System Conformance: GENERALLY EFFECTIVE & CONFORMING TO ISO 9001:2015 & ISO 45001:2018', {
    x: 48,
    y: 376,
    size: 8,
    font: fontBold,
    color: greenSuccess
  });
  page1.drawText('Audit Findings Breakdown: Zero (0) Major NCs | One (1) Minor NC (NC-2026-01) | Two (2) OFIs (OFI-2026-01, OFI-2026-02)', {
    x: 48,
    y: 363,
    size: 7.5,
    font: fontRegular,
    color: textGray
  });

  // Row 8: Dual Signatures Block
  page1.drawLine({ start: { x: 295, y: 350 }, end: { x: 295, y: 115 }, thickness: 1, color: lineGray });

  // Left: Lead Auditor Signature
  page1.drawText('SIGNATURE:', { x: 50, y: 332, size: 8.5, font: fontBold, color: darkNavy });
  page1.drawText('(Lead Auditor)', { x: 50, y: 320, size: 7.5, font: fontRegular, color: textGray });

  // Draw authentic Lead Auditor signature image
  page1.drawImage(sigLeadAuditor, {
    x: 60,
    y: 200,
    width: 170,
    height: 58
  });
  page1.drawLine({ start: { x: 50, y: 195 }, end: { x: 280, y: 195 }, thickness: 0.8, color: darkNavy });
  page1.drawText('Philippa Arinaitwe', { x: 50, y: 180, size: 9, font: fontBold, color: darkNavy });
  page1.drawText('Lead Auditor (Environmental & OHS Specialist)', { x: 50, y: 168, size: 7.5, font: fontRegular, color: textGray });
  page1.drawText('DATE: 27-10-2026', { x: 50, y: 140, size: 8, font: fontBold, color: textDark });

  // Right: Management Representative (MR) Signature
  page1.drawText('SIGNATURE:', { x: 310, y: 332, size: 8.5, font: fontBold, color: darkNavy });
  page1.drawText('(Management Representative - MR)', { x: 310, y: 320, size: 7.5, font: fontRegular, color: textGray });

  // Draw authentic MR signature image
  page1.drawImage(sigMR, {
    x: 320,
    y: 200,
    width: 165,
    height: 58
  });
  page1.drawLine({ start: { x: 310, y: 195 }, end: { x: 540, y: 195 }, thickness: 0.8, color: darkNavy });
  page1.drawText('Amanya Patience', { x: 310, y: 180, size: 9, font: fontBold, color: darkNavy });
  page1.drawText('Management Representative (MR)', { x: 310, y: 168, size: 7.5, font: fontRegular, color: textGray });
  page1.drawText('DATE: 27-10-2026', { x: 310, y: 140, size: 8, font: fontBold, color: textDark });

  // Footer document reference
  page1.drawText('PROME-IMSR-PMBDD-11', { x: 440, y: 98, size: 7.5, font: fontBold, color: textGray });
  drawRunningFooter(page1, 1);

  // =========================================================================
  // PAGE 2: EXECUTIVE INTRODUCTION, AUDIT SCOPE, OBJECTIVES & CRITERIA
  // =========================================================================
  currentPageNumber++;
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page2);
  let y = 780;

  page2.drawText('1. INTRODUCTION & MANAGEMENT SYSTEM CONTEXT', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page2.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const introPara = 'An Integrated Management System (IMS) is a structured framework of processes, procedures, and responsibilities that enables an organization to consistently satisfy customer, statutory, and regulatory requirements while safeguarding the health and safety of its workforce. PROME Consultants Limited, incorporated in 1996 with over 28 years of industry-leading engineering practice, operates an Integrated Management System aligned to ISO 9001:2015 (Quality Management Systems) and ISO 45001:2018 (Occupational Health and Safety Management Systems).\n\nQuality Policy: "DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME, through innovation and continual improvement while integrating state-of-the-art technology, motivated human resource, and applicable regulatory requirements."';
  y = drawWrappedText(page2, introPara, 40, y, 515, 8, fontRegular, textDark, 12);
  y -= 12;

  page2.drawText('2. AUDIT OBJECTIVES, REQUIREMENTS & BOUNDARIES', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page2.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const metaTable = [
    { num: '1.', title: 'Date and Place of Audit:', desc: '27th October 2026 -- PROME Consultants Limited Head Office, Plot 7B John Babiiha Avenue, Kampala, Uganda.' },
    { num: '2.', title: 'Audit Objectives:', desc: 'To verify conformity to ISO 9001:2015 and ISO 45001:2018; to determine system effectiveness in meeting customer and statutory requirements; and to evaluate departmental and corporate continual improvement.' },
    { num: '3.', title: 'Requirements According to:', desc: 'ISO 9001:2015 Quality Management Systems and ISO 45001:2018 Occupational Health and Safety Management Systems.' },
    { num: '4.', title: 'Audit Scope & Exclusions:', desc: 'Provision of Project Management and Engineering Consultancy Services in the Built Environment. Zero (0) exclusions claimed (Design and Development under PED is fully audited).' }
  ];

  for (const row of metaTable) {
    page2.drawRectangle({ x: 40, y: y - 32, width: 515, height: 32, color: tableBg, borderColor: lineGray, borderWidth: 0.5 });
    page2.drawText(row.num, { x: 48, y: y - 14, size: 8, font: fontBold, color: primaryRed });
    page2.drawText(row.title, { x: 62, y: y - 14, size: 8, font: fontBold, color: darkNavy });
    drawWrappedText(page2, row.desc, 62, y - 24, 480, 7.5, fontRegular, textDark, 10);
    y -= 38;
  }
  y -= 8;

  page2.drawText('3. SCOPE OF CLAUSES AUDITED (ISO 9001:2015 & ISO 45001:2018)', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page2.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  const scopeClauses = 'The internal audit encompassed all clauses of ISO 9001:2015 and applicable clauses of ISO 45001:2018, covering: Understanding the Organisation and Its Context (4.1), Understanding the Needs and Expectations of Interested Parties (4.2), Determining the Scope of the Management System (4.3), Leadership and Commitment (5.1), Customer Focus (5.1.2), Quality Policy (5.2), Organisational Roles, Responsibilities and Authorities (5.3), Worker Participation (5.4), Actions to Address Risks and Opportunities (6.1.1), Hazard Identification and Risk Assessment (6.1.2.1), Determination of Legal and Other Requirements (6.1.3), Quality Objectives and Planning (6.2, 6.2.2), Planning of Changes (6.3), Resources (7.1.1-7.1.6), Competence (7.2), Awareness (7.3), Communication (7.4), Documented Information (7.5), Operational Planning and Control (8.1), Emergency Preparedness and Response (8.2), Design and Development (8.3), Control of External Providers (8.4), Service Provision (8.5), Release of Services (8.6), Control of Nonconforming Outputs (8.7), Monitoring and Evaluation (9.1), Evaluation of Compliance (9.1.2), Internal Audit (9.2), Management Review (9.3), Nonconformity and Corrective Action (10.2), and Continual Improvement (10.3).';
  y = drawWrappedText(page2, scopeClauses, 40, y, 515, 7.5, fontRegular, textDark, 11);

  drawRunningFooter(page2, 2);

  // =========================================================================
  // PAGE 3: AUDIT OBSERVATION, DEDICATION & NEMKO FOCUS AREAS CHECKLIST
  // =========================================================================
  currentPageNumber++;
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page3);
  y = 780;

  page3.drawText('4. GENERAL OBSERVATIONS & AUDIT PARTICIPATION', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page3.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const obsGeneral = 'The internal audit was conducted in full accordance with the approved Internal Audit Plan (Appendix 1), covering corporate divisions and operational engineering processes. A commendable level of commitment and dedication was displayed across the organization throughout the exercise. Top Management visibly demonstrated its commitment to the continual improvement of the Integrated Management System. Staff members across all interviewed divisions were open, transparent, and objective about their daily processes and identified areas of potential system enhancement.\n\nThis report records the evidence-based findings, positive observations, one minor nonconformity, and specific opportunities for improvement looking at practical ways in which PROME operations can be strengthened to maintain high operational standards and effectiveness.';
  y = drawWrappedText(page3, obsGeneral, 40, y, 515, 8, fontRegular, textDark, 12);
  y -= 14;

  page3.drawText('5. THE AUDIT\'S MAIN FOCUS AREAS & CONFORMITY CHECKLIST', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page3.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  // Table Header
  page3.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page3.drawText('Audit Focus Area / Standard Requirement', { x: 48, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Standard Clause', { x: 235, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Conformity Status', { x: 320, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Verified Operational Evidence / Remarks', { x: 395, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  y -= 18;

  const focusList = [
    { item: 'Conformity to core requirements in standard', clause: 'Clauses 4-10', status: 'Conforming', remarks: '16 Core QMS processes & OHS procedures active' },
    { item: 'Monitoring and performance against key objectives', clause: 'Clauses 6.2 & 9.1', status: 'Conforming', remarks: 'Q4 performance reports confirm targets achieved' },
    { item: 'Legal, statutory & contractual compliance obligations', clause: 'Clauses 4.1 & 6.1.3', status: 'Conforming', remarks: 'Statutory licenses verified; compliance log current' },
    { item: 'Absence of open non-conformances from authorities', clause: 'Clause 4.2', status: 'Conforming', remarks: 'Zero regulatory sanctions, penalties, or open notices' },
    { item: 'Operating process control & engineering supervision', clause: 'Clauses 8.1 & 8.5', status: 'Conforming', remarks: 'Quality assurance plans & progress meetings verified' },
    { item: 'Emergency preparedness arrangements & first aid', clause: 'Clause 8.2', status: 'Minor NC', remarks: 'Refer to NC-2026-01 (replenishment controls)' },
    { item: 'Internal auditing and management review', clause: 'Clauses 9.2 & 9.3', status: 'Conforming', remarks: 'Audit executed per plan; MRM minutes maintained' },
    { item: 'Management responsibility and quality policy', clause: 'Clauses 5.1 & 5.2', status: 'Conforming', remarks: 'Policy communicated on web/board; staff awareness verified' }
  ];

  for (const item of focusList) {
    const rowH = 22;
    page3.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page3.drawText(item.item, { x: 48, y: y - 14, size: 7, font: fontRegular, color: textDark });
    page3.drawText(item.clause, { x: 235, y: y - 14, size: 7, font: fontRegular, color: textGray });
    
    const isNC = item.status === 'Minor NC';
    page3.drawText(item.status === 'Minor NC' ? '[!] Minor NC' : '[X] Conforming', {
      x: 320,
      y: y - 14,
      size: 7,
      font: fontBold,
      color: isNC ? amberWarning : greenSuccess
    });
    page3.drawText(item.remarks, { x: 395, y: y - 14, size: 6.5, font: fontRegular, color: textDark });
    y -= rowH;
  }
  y -= 16;

  // Highlight Box: Lead Auditor Verdict (Evidence-based without percentages)
  page3.drawRectangle({ x: 40, y: y - 44, width: 515, height: 44, color: rgb(0.95, 0.98, 0.95), borderColor: greenSuccess, borderWidth: 1 });
  page3.drawText('AUDIT VERDICT: GENERALLY EFFECTIVE & CONFORMING', { x: 50, y: y - 16, size: 9.5, font: fontBold, color: greenSuccess });
  page3.drawText('Audit evidence obtained through document reviews, site inspections, and interviews revealed general conformity to ISO 9001:2015', { x: 50, y: y - 28, size: 7.5, font: fontRegular, color: textDark });
  page3.drawText('and ISO 45001:2018. One (1) minor nonconformity was identified concerning first-aid replenishment, and two (2) OFIs were noted.', { x: 50, y: y - 38, size: 7.5, font: fontRegular, color: textDark });

  drawRunningFooter(page3, 3);

  // =========================================================================
  // PAGE 4: CLAUSE-BY-CLAUSE EVIDENCE-BASED AUDIT EVALUATION (CLAUSES 4-10)
  // =========================================================================
  currentPageNumber++;
  const page4 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page4);
  y = 780;

  page4.drawText('6. CLAUSE-BY-CLAUSE EVIDENCE-BASED AUDIT EVALUATION', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page4.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 20;

  const clauseBreakdowns = [
    {
      clause: 'Clause 4',
      title: 'Context of the Organization (4.1 - 4.4)',
      status: 'Conforming',
      summary: 'Organization Context, Interested Parties Register, and Scope records are well formulated and aligned to strategic objectives. 16 core QMS processes established without exclusions.'
    },
    {
      clause: 'Clause 5',
      title: 'Leadership & Worker Participation (5.1 - 5.4)',
      status: 'Conforming',
      summary: 'Top Management actively demonstrated commitment to continual improvement. Approved IMS Policy is communicated via the website and noticeboard. Roles, responsibilities, and organogram clearly defined.'
    },
    {
      clause: 'Clause 6',
      title: 'Planning, HIRA & Quality Objectives (6.1 - 6.3)',
      status: 'Conforming',
      summary: 'HIRA studies, Risk Matrix, and legal register are systematically updated per Clause 6.1.3. Quality and OHS objectives/targets monitored with timely feedback per Clause 6.2.2; Q4 performance reports confirm targets achieved.'
    },
    {
      clause: 'Clause 7',
      title: 'Support, Resources & Competence (7.1 - 7.5)',
      status: 'Conforming',
      summary: 'Survey calibration certificates valid up until 2028 per Clause 7.1.5. Communication Matrix (PROME-QSR-AFD-20) current and approved. Job descriptions and staffing plans in place. Note OFI-2026-02 on digital document management.'
    },
    {
      clause: 'Clause 8',
      title: 'Operation, Service Delivery & OHS (8.1 - 8.7)',
      status: 'Conforming with Minor NC',
      summary: 'EOIs and RFPs properly managed. Quality assurance plans and progress meetings conducted. Emergency parking strictly enforced. Note Minor NC-2026-01 on first-aid replenishment controls, and OFI-2026-01 on escape map contacts.'
    },
    {
      clause: 'Clause 9',
      title: 'Performance Evaluation & Compliance (9.1 - 9.3)',
      status: 'Conforming',
      summary: 'Internal audit successfully executed per approved schedule. Evaluation of legal compliance conducted per Clause 9.1.2. Management review meetings conducted with recorded decisions and action items.'
    },
    {
      clause: 'Clause 10',
      title: 'Continual Improvement (10.1 - 10.3)',
      status: 'Conforming',
      summary: 'No major non-conformities identified. Corrective action mechanisms and two targeted opportunities for improvement registered to further strengthen the IMS.'
    }
  ];

  for (const cb of clauseBreakdowns) {
    page4.drawRectangle({ x: 40, y: y - 48, width: 515, height: 48, color: tableBg, borderColor: lineGray, borderWidth: 0.5 });
    page4.drawText(`${cb.clause}: ${cb.title}`, { x: 48, y: y - 14, size: 8.5, font: fontBold, color: darkNavy });
    
    const isNC = cb.status.includes('Minor NC');
    page4.drawText(`[${cb.status}]`, { x: 380, y: y - 14, size: 8, font: fontBold, color: isNC ? amberWarning : greenSuccess });
    drawWrappedText(page4, cb.summary, 48, y - 26, 495, 7.5, fontRegular, textDark, 11);
    y -= 54;
  }

  drawRunningFooter(page4, 4);

  // =========================================================================
  // PAGE 5: DETAILED POSITIVE OBSERVATIONS & STATUTORY COMPLIANCE EVIDENCE
  // =========================================================================
  currentPageNumber++;
  const page5 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page5);
  y = 780;

  page5.drawText('7. DETAILED POSITIVE OBSERVATIONS & STATUTORY COMPLIANCE', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page5.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  // IMS
  page5.drawText('A. Integrated Management System (IMS) Strengths:', { x: 40, y, size: 9, font: fontBold, color: primaryRed });
  y -= 14;
  const imsObs = [
    'Quality and OHS objectives and targets were actively monitored, with timely feedback provided by respective division deputies responsible for implementation.',
    'A review of the Q4 performance reports indicated that the set strategic and departmental objectives and targets were being achieved.',
    'Head office premises were maintained in clean and orderly condition, and the corporate compound was exceptionally well maintained.'
  ];
  for (const obs of imsObs) {
    page5.drawText('*', { x: 48, y, size: 8, font: fontBold, color: primaryRed });
    y = drawWrappedText(page5, obs, 58, y, 495, 7.5, fontRegular, textDark, 11);
    y -= 3;
  }
  y -= 8;

  // OHS
  page5.drawText('B. Occupational Health & Safety (OHS) Operational Strengths:', { x: 40, y, size: 9, font: fontBold, color: primaryRed });
  y -= 14;
  const ohsObs = [
    'The organisation\'s hazard identification and risk analysis (HIRA) of its activities, products, and services under its control and influence, along with associated impacts to people, had been thoroughly reviewed and documented per ISO 45001:2018 Clause 6.1.2.1.',
    'Workplace inspections and hazard identification checklists were systematically maintained, ensuring early identification and control of workplace risks.',
    'Fleet safety culture: All company and visitor vehicles were observed parked in emergency / reverse mode at all times.'
  ];
  for (const obs of ohsObs) {
    page5.drawText('*', { x: 48, y, size: 8, font: fontBold, color: primaryRed });
    y = drawWrappedText(page5, obs, 58, y, 495, 7.5, fontRegular, textDark, 11);
    y -= 3;
  }
  y -= 8;

  // QMS & Statutory Compliance Evidence
  page5.drawText('C. Quality Management & Statutory Compliance Obligations:', { x: 40, y, size: 9, font: fontBold, color: primaryRed });
  y -= 14;
  const qmsObs = [
    'Statutory Legal Compliance Obligations: Compliance with statutory obligations was verified through actual records and certificates, including: (1) Uganda Revenue Authority (URA) Tax Clearance Certificate (TCC); (2) Ministry of Gender, Labour and Social Development OHS Workplace Registration Certificate (Reg. No. OSH 22-00288); (3) Kampala Capital City Authority (KCCA) Annual Trading License (License No. 20231195983); (4) National Social Security Fund (NSSF) Clearance Certificate; (5) Public Procurement and Disposal of Public Assets (PPDA) Register of Providers; and (6) Regular evaluation of compliance records maintained under ISO 45001:2018 Clause 6.1.3 and Clause 9.1.2.',
    'Professional Industry Standing (Supporting Evidence): As supporting evidence of professional competence and industry standing, PROME maintained active corporate membership in the Uganda Association of Consulting Engineers (UACE) and individual staff registrations with the Engineers Registration Board (ERB).',
    'Job descriptions, corporate organogram, and staffing plan were in place, ensuring role clarity and deployment of an adequate workforce to support IMS performance.',
    'Expressions of interest (EOIs) and requests for proposals (RFPs) were properly managed, supporting transparent and structured project acquisition processes.',
    'Quality assurance plans and progress review meetings were regularly conducted, facilitating systematic project monitoring and quality control.',
    'The Interested Parties Register, Risk Matrix, Organization Context, and Scope were well formulated with information closely aligned to PROME\'s strategic objectives and operational needs.',
    'The Communication Matrix (PROME-QSR-AFD-20) was well documented, current, and approved. Workers demonstrated clear awareness of communication channels.',
    'Workers interviewed demonstrated awareness and familiarity with the approved IMS policy, which is openly communicated via the website and notice board.',
    'Supplier Master List was well documented, current, and approved.',
    'Survey and measuring equipment calibration certificates were verified to be valid up until 2028.'
  ];
  for (const obs of qmsObs) {
    page5.drawText('*', { x: 48, y, size: 8, font: fontBold, color: primaryRed });
    y = drawWrappedText(page5, obs, 58, y, 495, 7.5, fontRegular, textDark, 10.5);
    y -= 2;
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
  page6.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page6.drawText('Project Reference & Client', { x: 46, y: y - 13, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Process / Division', { x: 150, y: y - 13, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Sampled Documents & Records', { x: 250, y: y - 13, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Clause', { x: 405, y: y - 13, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page6.drawText('Audit Finding', { x: 450, y: y - 13, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  y -= 18;

  for (const sp of sampledProjects) {
    const rowH = 72;
    page6.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    
    // Project & Client
    drawWrappedText(page6, `${sp.ref}\n${sp.client}`, 46, y - 12, 100, 6.5, fontBold, darkNavy, 8.5);
    
    // Process
    drawWrappedText(page6, sp.process, 150, y - 12, 95, 6.5, fontRegular, textDark, 8.5);
    
    // Docs
    drawWrappedText(page6, sp.docs, 250, y - 12, 150, 6.5, fontRegular, textDark, 8.5);
    
    // Clause
    drawWrappedText(page6, sp.clause, 405, y - 12, 42, 6, fontBold, primaryRed, 7.5);
    
    // Finding
    drawWrappedText(page6, sp.finding, 450, y - 12, 100, 6.5, fontRegular, greenSuccess, 8.5);
    
    y -= rowH;
  }

  drawRunningFooter(page6, 6);

  // =========================================================================
  // PAGE 7: AUDIT FINDINGS: MINOR NONCONFORMITY (NC-2026-01) & OFI REGISTER
  // =========================================================================
  currentPageNumber++;
  const page7 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page7);
  y = 780;

  page7.drawText('9. AUDIT FINDINGS: MINOR NONCONFORMITY (NC-2026-01)', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page7.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page7.drawText('The audit identified zero (0) Major Nonconformities and one (1) Minor Nonconformity as detailed below:', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 16;

  // Minor NC Box
  page7.drawRectangle({ x: 40, y: y - 140, width: 515, height: 140, color: rgb(1, 0.99, 0.98), borderColor: amberWarning, borderWidth: 1.2 });
  
  // Header bar of NC box
  page7.drawRectangle({ x: 40, y: y - 20, width: 515, height: 20, color: amberWarning, borderColor: amberWarning, borderWidth: 1 });
  page7.drawText('NONCONFORMITY REPORT: NC-2026-01 [MINOR NONCONFORMITY]', { x: 48, y: y - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page7.drawText('Clause: ISO 45001:2018 Clause 8.2 (Emergency Preparedness)', { x: 320, y: y - 14, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });

  let ncY = y - 32;
  page7.drawText('Standard Requirement:', { x: 48, y: ncY, size: 7, font: fontBold, color: darkNavy });
  page7.drawText('"The organization shall establish, implement and maintain process(es) needed to prepare for and respond to potential emergency situations... including the provision of first aid." (ISO 45001:2018 Clause 8.2)', { x: 135, y: ncY, size: 6.5, font: fontOblique, color: textDark });

  ncY -= 18;
  page7.drawText('Audit Finding / Facts:', { x: 48, y: ncY, size: 7, font: fontBold, color: primaryRed });
  page7.drawText('During safety inspection of the head office facilities, expired first-aid supplies were found in the primary first-aid box.', { x: 135, y: ncY, size: 6.5, font: fontRegular, color: textDark });

  ncY -= 18;
  page7.drawText('Justification (Minor):', { x: 48, y: ncY, size: 7, font: fontBold, color: darkNavy });
  page7.drawText('Established emergency preparedness arrangements exist (kits present, designated first aiders appointed); this finding does not indicate that the entire emergency response system has failed, but represents an isolated control lapse in replenishment.', { x: 135, y: ncY, size: 6.5, font: fontRegular, color: textDark });

  ncY -= 22;
  page7.drawText('Corrective Action:', { x: 48, y: ncY, size: 7, font: fontBold, color: greenSuccess });
  page7.drawText('1. Dispose of expired supplies and immediately replenish with fresh, certified first-aid consumables.\n2. Institute a monthly documented First-Aid Box Inspection & Replenishment Checklist assigned to the OHS Officer.', { x: 135, y: ncY, size: 6.5, font: fontRegular, color: textDark });

  ncY -= 24;
  page7.drawText('Responsible: Administration & HR / OHS Officer', { x: 48, y: ncY, size: 7, font: fontBold, color: darkNavy });
  page7.drawText('Target Due Date: 15 November 2026', { x: 260, y: ncY, size: 7, font: fontBold, color: primaryRed });
  page7.drawText('Verification: Prior to Next Management Review', { x: 400, y: ncY, size: 7, font: fontRegular, color: textGray });

  y -= 155;

  page7.drawText('10. OPPORTUNITIES FOR IMPROVEMENT (OFI) REGISTER', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page7.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page7.drawText('The audit identified two (2) targeted opportunities for improvement to strengthen IMS implementation and efficiency:', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 16;

  const ofiItems = [
    {
      num: 'OFI-2026-01',
      title: 'Emergency Contact Information on Process / Escape Maps',
      clause: 'ISO 45001:2018 Clause 8.2 (Emergency Preparedness and Response)',
      dept: 'Administration & OHS / Facilities',
      target: '30 November 2026',
      finding: 'Emergency contact telephone numbers were not displayed on the process / escape evacuation route maps posted within the building.',
      recommendation: 'Including relevant emergency contact numbers (Police, Fire Brigade, Medical Emergency, Facilities Manager) on all escape routes will improve access to essential information and facilitate timely communication during emergency situations, in direct alignment with ISO 45001:2018 Clause 8.2.'
    },
    {
      num: 'OFI-2026-02',
      title: 'Transition from Printed Documents to Digital Document Management',
      clause: 'ISO 9001:2015 Clause 7.5 (Documented Information) & Clause 8.1 (Operational Planning)',
      dept: 'All Divisions / ICT & Quality Assurance',
      target: '15 December 2026',
      finding: 'Excessive reliance on printed documents was identified across operating divisions during daily routines.',
      recommendation: 'An opportunity exists to improve resource efficiency and operational speed by reducing paper consumption and progressively transitioning routine paper workflows to the PROME Intranet / IMS portal, introducing digital approvals, and enforcing electronic document distribution in line with ISO 9001:2015 Clause 7.5 and Clause 8.1.'
    }
  ];

  for (const ofi of ofiItems) {
    page7.drawRectangle({ x: 40, y: y - 82, width: 515, height: 82, color: tableBg, borderColor: lineGray, borderWidth: 0.8 });
    page7.drawText(`${ofi.num}: ${ofi.title}`, { x: 48, y: y - 14, size: 8, font: fontBold, color: darkNavy });
    page7.drawText(`Target Date: ${ofi.target}`, { x: 420, y: y - 14, size: 7.5, font: fontBold, color: primaryRed });
    
    page7.drawText(`Standard Clause: ${ofi.clause}`, { x: 48, y: y - 26, size: 7, font: fontBold, color: primaryRed });
    page7.drawText(`Responsible: ${ofi.dept}`, { x: 340, y: y - 26, size: 7, font: fontRegular, color: textGray });

    page7.drawText('Observation:', { x: 48, y: y - 38, size: 7, font: fontBold, color: textDark });
    drawWrappedText(page7, ofi.finding, 110, y - 38, 435, 7, fontRegular, textDark, 9);

    page7.drawText('Recommendation:', { x: 48, y: y - 56, size: 7, font: fontBold, color: greenSuccess });
    drawWrappedText(page7, ofi.recommendation, 125, y - 56, 420, 7, fontRegular, textDark, 9);

    y -= 90;
  }

  drawRunningFooter(page7, 7);

  // =========================================================================
  // PAGE 8: APPENDIX 1 - APPROVED INTERNAL AUDIT PLAN (CORRECTED CLAUSES)
  // =========================================================================
  currentPageNumber++;
  const page8 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page8);
  y = 780;

  page8.drawText('APPENDIX 1 -- INTERNAL AUDIT PLAN & TIMETABLE', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page8.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page8.drawText('Approved schedule for the Internal Audit conducted on 27th October 2026 at PROME Consultants Limited.', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 18;

  // Timetable Table Header
  page8.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page8.drawText('Time', { x: 48, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page8.drawText('Subject / ISO Clauses Evaluated', { x: 105, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page8.drawText('Auditees / Participants', { x: 380, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  y -= 18;

  const planRows = [
    {
      time: '0900 hrs',
      subject: 'Opening Meeting\n- Audit scope, objectives, methodology, and confirmation of schedule.',
      participants: 'All PROME Workers\nLead Auditor & Audit Team'
    },
    {
      time: '1000 hrs',
      subject: 'Top Management Session\n- Leadership and commitment (QMS) 5.1.1\n- Customer focus 5.1.2 | Quality policy 5.2.1\n- Planning to achieve quality objectives 6.2.2\n- General improvement 10.1\n- Understanding the organisation and its context 4.1\n- Understanding needs & expectations of interested parties 4.2\n- Actions to address risks and opportunities 6.1.1',
      participants: 'Eng. Ronald Kibuuka (MD)\nElizabeth Nampewo (PDMD)\nStephanie Canowira (CPSD)'
    },
    {
      time: '1100 hrs',
      subject: 'System Design and Control\n- Determining the scope of the QMS 4.3\n- Resources 7.1.1 - 7.1.6\n- Competence 7.2 | Awareness 7.3\n- Communication 7.4 | Documented Information 7.5',
      participants: 'Human Resource (HRAD)\nQuality & Regulatory Assurance\nDocument Controller'
    },
    {
      time: '1300 hrs',
      subject: 'Lunch Break & Auditor Preliminary Caucus',
      participants: 'All Staff / Audit Team'
    },
    {
      time: '1400 hrs',
      subject: 'Operational Support & Engineering Execution\n- Organisational roles, responsibilities, authorities 5.3\n- People 7.1.2 | Infrastructure 7.1.3 | Environment 7.1.4\n- Organisational knowledge 7.1.6 | Service delivery 8.5',
      participants: 'Human Resource, RA,\nDivision Process Owners,\nProject Engineers'
    },
    {
      time: '1600 hrs',
      subject: 'OHS & Legal Compliance Session\n- Leadership and worker participation 5.4\n- Identification of legal and other requirements 6.1.3\n- Hierarchy of controls 8.1.2 | Evaluation of compliance 9.1.2',
      participants: 'Philippa Arinaitwe (Lead Auditor)\nSafety Committee Members\nFacilities Officer'
    },
    {
      time: '1800 hrs',
      subject: 'Closing Meeting\n- Presentation of audit summary, positive observations, minor NC, and OFIs.\n- Formal lead auditor conclusion and management sign-off.',
      participants: 'All PROME Workers\nManaging Director & MR'
    }
  ];

  for (const pr of planRows) {
    const isBig = pr.subject.includes('\n');
    const rowH = pr.time === '1000 hrs' ? 88 : isBig ? 42 : 22;
    page8.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page8.drawText(pr.time, { x: 48, y: y - 14, size: 7.5, font: fontBold, color: primaryRed });
    drawWrappedText(page8, pr.subject, 105, y - 14, 265, 7, fontRegular, textDark, 9.5);
    drawWrappedText(page8, pr.participants, 380, y - 14, 170, 7, fontRegular, textDark, 9.5);
    y -= rowH;
  }

  drawRunningFooter(page8, 8);

  // =========================================================================
  // PAGE 9: APPENDIX 2 - OPENING MEETING ATTENDANCE RECORD (AUTHENTIC SCAN)
  // =========================================================================
  currentPageNumber++;
  const page9 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page9);
  y = 780;

  page9.drawText('APPENDIX 2 -- ATTENDANCE RECORD: OPENING MEETING (27 OCT 2026)', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page9.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 14;

  page9.drawText('Form Ref: PROME-QSR-ADF-20 (Internal Audit Attendance Form, Version No: 00) -- Scanned Original', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 12;

  // Embed image4.jpeg
  const attW = 515;
  const attH = (attOpening.height / attOpening.width) * attW;
  page9.drawImage(attOpening, {
    x: 40,
    y: y - Math.min(680, attH),
    width: attW,
    height: Math.min(680, attH)
  });

  drawRunningFooter(page9, 9);

  // =========================================================================
  // PAGE 10: APPENDIX 2 - CLOSING MEETING ATTENDANCE RECORD (AUTHENTIC SCAN)
  // =========================================================================
  currentPageNumber++;
  const page10 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page10);
  y = 780;

  page10.drawText('APPENDIX 2 -- ATTENDANCE RECORD: CLOSING MEETING (27 OCT 2026)', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page10.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 14;

  page10.drawText('Form Ref: PROME-QSR-ADF-20 (Internal Audit Attendance Form, Version No: 00) -- Scanned Original with MD Sign-off', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 12;

  // Embed image5.jpeg
  const attClH = (attClosing.height / attClosing.width) * attW;
  page10.drawImage(attClosing, {
    x: 40,
    y: y - Math.min(680, attClH),
    width: attW,
    height: Math.min(680, attClH)
  });

  drawRunningFooter(page10, 10);

  // =========================================================================
  // PAGE 11: APPENDIX 3 - INTEGRATED PROGRAMME & LEAD AUDITOR CERTIFICATION
  // =========================================================================
  currentPageNumber++;
  const page11 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page11);
  y = 780;

  page11.drawText('APPENDIX 3 -- INTEGRATED AUDIT PROGRAMME & VERIFICATION MATRIX', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page11.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page11.drawText('Master alignment of PROME core QMS/OHS processes against ISO 9001:2015 and ISO 45001:2018 criteria.', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 16;

  // Table Header
  page11.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page11.drawText('Division / Department', { x: 48, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page11.drawText('Process / Focus Area', { x: 165, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page11.drawText('Applicable ISO Clauses', { x: 320, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page11.drawText('Audit Status', { x: 460, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
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
    const rowH = 22;
    page11.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page11.drawText(row.div, { x: 48, y: y - 14, size: 7.5, font: fontBold, color: darkNavy });
    page11.drawText(row.proc, { x: 165, y: y - 14, size: 7, font: fontRegular, color: textDark });
    page11.drawText(row.clauses, { x: 320, y: y - 14, size: 7, font: fontRegular, color: textGray });
    page11.drawText(row.status, { x: 460, y: y - 14, size: 7.5, font: fontBold, color: greenSuccess });
    y -= rowH;
  }
  y -= 25;

  // Final Endorsement Box with User's Exact Approved Statement
  page11.drawRectangle({ x: 40, y: y - 120, width: 515, height: 120, color: tableBg, borderColor: darkNavy, borderWidth: 1 });
  page11.drawText('FORMAL LEAD AUDITOR CERTIFICATION STATEMENT', { x: 50, y: y - 18, size: 9, font: fontBold, color: darkNavy });
  
  const certStatement = 'The internal audit was conducted in accordance with ISO 19011:2018 guidelines and PROME\'s established audit procedures. Based on the evidence reviewed, PROME\'s Integrated Management System was found to be generally effective and conforming to the applicable requirements of ISO 9001:2015 and ISO 45001:2018.';
  drawWrappedText(page11, certStatement, 50, y - 34, 495, 8, fontRegular, textDark, 12);

  page11.drawText('Report Prepared By: Philippa Arinaitwe (Lead Auditor)', { x: 50, y: y - 88, size: 8, font: fontBold, color: primaryRed });
  page11.drawText('Endorsed By: Amanya Patience (Management Representative) & Eng. Ronald Kibuuka (Managing Director)', { x: 50, y: y - 102, size: 7.5, font: fontRegular, color: textDark });

  drawRunningFooter(page11, 11);

  // Save the master PDF locally
  const outDir = path.join(__dirname, '../../uploads/audit-reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const pdfFileName = 'PROME-AUD-2026-001_Modern_ISO_Audit_Report.pdf';
  const pdfAltFileName = 'PROME-IMSR-PMBDD-11_Audit_Report_04.pdf';
  const outPath = path.join(outDir, pdfFileName);
  const outAltPath = path.join(outDir, pdfAltFileName);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPath, pdfBytes);
  fs.writeFileSync(outAltPath, pdfBytes);

  console.log(`[Audit Report] Generated PDF successfully (${pdfBytes.length} bytes, ${totalPages} pages).`);
  console.log(`[Audit Report] Saved to: ${outPath}`);
  console.log(`[Audit Report] Saved to: ${outAltPath}`);

  return {
    pdfPath: outPath,
    pdfAltPath: outAltPath,
    reportPdfUrl: `/uploads/audit-reports/${pdfFileName}`,
    reportPdfAltUrl: `/uploads/audit-reports/${pdfAltFileName}`,
    pdfBytesLength: pdfBytes.length
  };
}

generateModernAuditReport().catch(console.error);
