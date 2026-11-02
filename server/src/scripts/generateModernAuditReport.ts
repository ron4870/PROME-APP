import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateModernAuditReport() {
  console.log('[Audit Report] Starting generation of Modern ISO Compliant Audit Report...');

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
  const totalPages = 10;

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
  page1.drawText('Work Instructions (WI), Job Descriptions (JD), Checklists (C/L), Legal & Regulatory Requirements, Objective Records.', { x: 48, y: 586, size: 7.5, font: fontRegular, color: textDark });

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

  // Row 7: Lead Auditor Conclusion
  page1.drawLine({ start: { x: 40, y: 350 }, end: { x: 555, y: 350 }, thickness: 0.5, color: lineGray });
  page1.drawText('LEAD AUDITOR CONCLUSION:', { x: 48, y: 428, size: 8.5, font: fontBold, color: darkNavy });
  page1.drawText('The audit was conducted successfully, and no non-conformance was identified during the process.', {
    x: 48,
    y: 412,
    size: 8,
    font: fontBold,
    color: primaryRed
  });
  page1.drawText('The Organisation has established and maintained its management system in line with the required standards.', {
    x: 48,
    y: 398,
    size: 8,
    font: fontRegular,
    color: textDark
  });
  page1.drawText('Overall System Compliance Rating: 98% [PASSED / FULL SYSTEM CONFORMANCE]', {
    x: 48,
    y: 375,
    size: 8.5,
    font: fontBold,
    color: greenSuccess
  });
  page1.drawText('Zero (0) Major NCs | Zero (0) Minor NCs | Three (3) Opportunities for Improvement (OFIs)', {
    x: 48,
    y: 362,
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

  const introPara = 'An Integrated Management System (IMS) is a structured framework of processes, procedures, and responsibilities that enables an organization to consistently satisfy customer, statutory, and regulatory requirements while safeguarding the health and safety of its workforce. PROME Consultants Limited, incorporated in 1996 with over 28 years of industry-leading engineering practice, operates an Integrated Management System certified to ISO 9001:2015 (Quality Management Systems) and compliant with ISO 45001:2018 (Occupational Health and Safety Management Systems).\n\nQuality Policy: "DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME, through innovation and continual improvement while integrating state-of-the-art technology, motivated human resource, and applicable regulatory requirements."';
  y = drawWrappedText(page2, introPara, 40, y, 515, 8, fontRegular, textDark, 12);
  y -= 12;

  page2.drawText('2. AUDIT OBJECTIVES, REQUIREMENTS & BOUNDARIES', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page2.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  // 4 Table Items
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

  const scopeClauses = 'The internal audit encompassed all clauses of ISO 9001:2015 and applicable clauses of ISO 45001:2018, covering: Understanding the Organisation and Its Context (4.1), Understanding the Needs and Expectations of Interested Parties (4.2), Determining the Scope of the Management System (4.3), Leadership and Commitment (5.1), Customer Focus (5.1.2), Quality Policy (5.2), Organisational Roles, Responsibilities and Authorities (5.3), Worker Participation (5.4), Actions to Address Risks and Opportunities (6.1.1), Hazard Identification and Risk Assessment (6.1.2.1), Legal and Other Requirements (6.1.3), Quality Objectives and Planning (6.2), Planning of Changes (6.3), Resources (7.1.1-7.1.6), Competence (7.2), Awareness (7.3), Communication (7.4), Documented Information (7.5), Operational Planning and Control (8.1), Emergency Preparedness and Response (8.2), Design and Development (8.3), Control of External Providers (8.4), Service Provision (8.5), Release of Services (8.6), Control of Nonconforming Outputs (8.7), Monitoring and Evaluation (9.1), Internal Audit (9.2), Management Review (9.3), Nonconformity and Corrective Action (10.2), and Continual Improvement (10.3).';
  y = drawWrappedText(page2, scopeClauses, 40, y, 515, 7.5, fontRegular, textDark, 11);

  drawRunningFooter(page2, 2);

  // =========================================================================
  // PAGE 3: AUDIT OBSERVATION, DEDICATION & NEMKO FOCUS AREAS TABLE
  // =========================================================================
  currentPageNumber++;
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page3);
  y = 780;

  page3.drawText('4. GENERAL OBSERVATIONS & AUDIT PARTICIPATION', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page3.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  const obsGeneral = 'The internal audit was conducted in full accordance with the approved Internal Audit Plan (Appendix 1), covering all corporate divisions and operational processes. A commendable level of commitment and dedication was displayed across the organization throughout the exercise. Top Management visibly demonstrated its commitment to the continual improvement of the Integrated Management System. Staff members across all interviewed divisions were open, transparent, and objective about their daily processes and identified areas of potential system enhancement.\n\nThis report records the findings, positive observations, and specific recommendations looking at practical ways in which PROME operations can be strengthened to eliminate minor vulnerabilities and continually enhance the efficiency, adequacy, and effectiveness of the IMS.';
  y = drawWrappedText(page3, obsGeneral, 40, y, 515, 8, fontRegular, textDark, 12);
  y -= 14;

  page3.drawText('5. THE AUDIT\'S MAIN FOCUS AREAS & CONFORMITY CHECKLIST', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page3.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  // Table Header
  page3.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page3.drawText('Audit Focus Area / Standard Requirement', { x: 48, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Standard Clause', { x: 235, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Conformity', { x: 325, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText('Verified Operational Evidence / Remarks', { x: 395, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  y -= 18;

  const focusList = [
    { item: 'Conformity to all requirements in standard', clause: 'Clauses 4-10', compliant: true, remarks: '16 Core QMS processes & OHS procedures active' },
    { item: 'Monitoring and performance against key objectives', clause: 'Clauses 6.2 & 9.1', compliant: true, remarks: 'Q4 performance reports confirm targets achieved' },
    { item: 'Legal and contractual statutory compliance', clause: 'Clauses 4.1 & 6.1.3', compliant: true, remarks: 'Legal register updated; memberships in order' },
    { item: 'Absence of open non-conformances from authorities', clause: 'Clause 4.2', compliant: true, remarks: 'Zero regulatory sanctions, fines, or open notices' },
    { item: 'Operating process control & site supervision', clause: 'Clauses 8.1 & 8.5', compliant: true, remarks: 'Quality assurance plans & progress meetings verified' },
    { item: 'Internal auditing and management review', clause: 'Clauses 9.2 & 9.3', compliant: true, remarks: 'Audit executed per plan; MRM minutes maintained' },
    { item: 'Management responsibility and quality policy', clause: 'Clauses 5.1 & 5.2', compliant: true, remarks: 'Policy communicated on web/board; staff awareness verified' }
  ];

  for (const item of focusList) {
    const rowH = 24;
    page3.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page3.drawText(item.item, { x: 48, y: y - 15, size: 7, font: fontRegular, color: textDark });
    page3.drawText(item.clause, { x: 235, y: y - 15, size: 7, font: fontRegular, color: textGray });
    page3.drawText('[X] YES  [ ] NO', { x: 325, y: y - 15, size: 7, font: fontBold, color: greenSuccess });
    page3.drawText(item.remarks, { x: 395, y: y - 15, size: 6.5, font: fontRegular, color: textDark });
    y -= rowH;
  }
  y -= 18;

  // Highlight Box: Lead Auditor Verdict
  page3.drawRectangle({ x: 40, y: y - 42, width: 515, height: 42, color: rgb(0.95, 0.98, 0.95), borderColor: greenSuccess, borderWidth: 1 });
  page3.drawText('AUDIT VERDICT: FULL SYSTEM CONFORMANCE (SCORE: 98%)', { x: 50, y: y - 16, size: 9.5, font: fontBold, color: greenSuccess });
  page3.drawText('Audit evidence obtained through document reviews, site inspections, and interviews revealed NO non-conformances.', { x: 50, y: y - 28, size: 7.5, font: fontRegular, color: textDark });
  page3.drawText('The management system meets all requirements of ISO 9001:2015 and ISO 45001:2018.', { x: 50, y: y - 38, size: 7.5, font: fontRegular, color: textDark });

  drawRunningFooter(page3, 3);

  // =========================================================================
  // PAGE 4: CLAUSE-BY-CLAUSE AUDIT EVALUATION (CLAUSES 4-10)
  // =========================================================================
  currentPageNumber++;
  const page4 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page4);
  y = 780;

  page4.drawText('6. CLAUSE-BY-CLAUSE QUANTITATIVE AUDIT EVALUATION', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page4.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 20;

  const clauseBreakdowns = [
    {
      clause: 'Clause 4',
      title: 'Context of the Organization (4.1 - 4.4)',
      status: 'Conforming',
      score: '98%',
      summary: 'Organization Context, Interested Parties Register, and Scope records are well formulated and aligned to strategic objectives. 16 core QMS processes established without exclusions.'
    },
    {
      clause: 'Clause 5',
      title: 'Leadership & Worker Participation (5.1 - 5.4)',
      status: 'Conforming',
      score: '99%',
      summary: 'Top Management actively demonstrated commitment to continual improvement. Approved IMS Policy is communicated via the website and noticeboard. Roles, responsibilities, and organogram clearly defined.'
    },
    {
      clause: 'Clause 6',
      title: 'Planning, HIRA & Quality Objectives (6.1 - 6.3)',
      status: 'Conforming',
      score: '97%',
      summary: 'HIRA studies, Risk Matrix, and legal register are systematically updated. Quality and OHS objectives/targets monitored with timely feedback; Q4 performance reports confirm targets achieved.'
    },
    {
      clause: 'Clause 7',
      title: 'Support, Resources & Competence (7.1 - 7.5)',
      status: 'Conforming',
      score: '97%',
      summary: 'Survey calibration certificates valid up until 2028. Communication Matrix (PROME-QSR-AFD-20) current and approved. Job descriptions and staffing plans in place. Note OFI on digital document transition.'
    },
    {
      clause: 'Clause 8',
      title: 'Operation, Service Delivery & OHS (8.1 - 8.7)',
      status: 'Conforming',
      score: '96%',
      summary: 'EOIs and RFPs properly managed. Quality assurance plans and progress meetings conducted. Emergency parking strictly enforced. Note OFIs on escape map emergency contacts and first-aid replenishment.'
    },
    {
      clause: 'Clause 9',
      title: 'Performance Evaluation & Auditing (9.1 - 9.3)',
      status: 'Conforming',
      score: '98%',
      summary: 'Internal audit successfully executed per approved schedule. Management review meetings conducted and monitored. Key performance metrics systematically reviewed.'
    },
    {
      clause: 'Clause 10',
      title: 'Continual Improvement (10.1 - 10.3)',
      status: 'Conforming',
      score: '99%',
      summary: 'Zero non-conformities identified. Corrective action mechanisms and three targeted opportunities for improvement registered to further strengthen the IMS.'
    }
  ];

  for (const cb of clauseBreakdowns) {
    page4.drawRectangle({ x: 40, y: y - 48, width: 515, height: 48, color: tableBg, borderColor: lineGray, borderWidth: 0.5 });
    page4.drawText(`${cb.clause}: ${cb.title}`, { x: 48, y: y - 14, size: 8.5, font: fontBold, color: darkNavy });
    page4.drawText(`[${cb.status}] -- Score: ${cb.score}`, { x: 410, y: y - 14, size: 8, font: fontBold, color: greenSuccess });
    drawWrappedText(page4, cb.summary, 48, y - 26, 495, 7.5, fontRegular, textDark, 11);
    y -= 54;
  }

  drawRunningFooter(page4, 4);

  // =========================================================================
  // PAGE 5: DETAILED POSITIVE OBSERVATIONS ACROSS IMS, OHS & QMS
  // =========================================================================
  currentPageNumber++;
  const page5 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page5);
  y = 780;

  page5.drawText('7. DETAILED POSITIVE OBSERVATIONS & OPERATIONAL STRENGTHS', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
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
    'The organisation\'s hazard identification and risk analysis (HIRA) of its activities, products, and services under its control and influence, along with associated impacts to people, had been thoroughly reviewed and documented.',
    'Workplace inspections and hazard identification checklists were systematically maintained, ensuring early identification and control of workplace risks.',
    'Fleet safety culture: All company and visitor vehicles were observed parked in emergency / reverse mode at all times.'
  ];
  for (const obs of ohsObs) {
    page5.drawText('*', { x: 48, y, size: 8, font: fontBold, color: primaryRed });
    y = drawWrappedText(page5, obs, 58, y, 495, 7.5, fontRegular, textDark, 11);
    y -= 3;
  }
  y -= 8;

  // QMS
  page5.drawText('C. Quality Management System (QMS) Operational Strengths:', { x: 40, y, size: 9, font: fontBold, color: primaryRed });
  y -= 14;
  const qmsObs = [
    'Job descriptions, corporate organogram, and staffing plan were in place, ensuring role clarity and deployment of an adequate workforce to support IMS performance.',
    'Audit reports were available, the legal register was updated, and the company maintained active memberships in relevant professional industry bodies, demonstrating active legal compliance.',
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
    y = drawWrappedText(page5, obs, 58, y, 495, 7.5, fontRegular, textDark, 11);
    y -= 2;
  }

  drawRunningFooter(page5, 5);

  // =========================================================================
  // PAGE 6: NON-CONFORMANCE STATEMENT & OPPORTUNITIES FOR IMPROVEMENT (OFI)
  // =========================================================================
  currentPageNumber++;
  const page6 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page6);
  y = 780;

  page6.drawText('8. NON-CONFORMANCES EVALUATION (ZERO IDENTIFIED)', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page6.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  page6.drawRectangle({ x: 40, y: y - 55, width: 515, height: 55, color: rgb(0.95, 0.98, 0.95), borderColor: greenSuccess, borderWidth: 1 });
  page6.drawText('CERTIFICATE OF CONFORMITY -- NO NON-CONFORMANCES IDENTIFIED', { x: 50, y: y - 18, size: 9, font: fontBold, color: greenSuccess });
  page6.drawText('No non-conformities were identified during the audit, as the processes, activities, and documented information reviewed', { x: 50, y: y - 32, size: 7.5, font: fontRegular, color: textDark });
  page6.drawText('were found to be in conformity with the applicable requirements of ISO 9001:2015 and ISO 45001:2018.', { x: 50, y: y - 44, size: 7.5, font: fontRegular, color: textDark });
  y -= 70;

  page6.drawText('9. OPPORTUNITIES FOR IMPROVEMENT (OFI) REGISTER', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page6.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page6.drawText('The audit identified three (3) targeted opportunities for improvement to strengthen IMS implementation, support continual improvement, and increase efficiency and effectiveness.', {
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
      title: 'Emergency Contact Information on Process / Escape Maps',
      clause: 'ISO 45001:2018 Clause 8.2 (Emergency Preparedness and Response)',
      dept: 'Administration & OHS / Facilities',
      target: '30 November 2026',
      finding: 'Emergency contact information was not displayed on the process / escape maps posted within the building.',
      recommendation: 'Including relevant emergency contact numbers (Police, Fire Brigade, Medical Emergency, Facilities Manager) on all escape routes will improve access to essential information and facilitate timely communication during emergency situations, in direct alignment with ISO 45001:2018 Clause 8.2.'
    },
    {
      num: 'OFI-2026-02',
      title: 'Transition from Printed Documents to Digital Document Management',
      clause: 'ISO 14001:2015 Clause 8.1 / ISO 9001:2015 Clause 7.5 (Documented Information)',
      dept: 'All Divisions / ICT & Quality Assurance',
      target: '15 December 2026',
      finding: 'Excessive reliance on printed documents was identified across operating divisions during daily routines.',
      recommendation: 'An opportunity exists to improve resource efficiency and operational speed by reducing paper consumption and progressively transitioning to digital document management, digital approvals, and intranet transmittals via the PROME IMS portal, in line with Clause 8.1 and Clause 7.5.'
    },
    {
      num: 'OFI-2026-03',
      title: 'First-Aid Supplies Monitoring & Expiration Date Replenishment',
      clause: 'ISO 45001:2018 Clause 8.2 (Emergency Preparedness and Response)',
      dept: 'OHS Officer / Administration',
      target: '15 November 2026',
      finding: 'Expired first-aid supplies were found in the first-aid box during safety inspection of the facilities.',
      recommendation: 'First-aid supplies must be adequately monitored, inspected monthly against a signed checklist, and replaced promptly to ensure availability and efficacy during workplace emergencies, contrary to ISO 45001:2018 Clause 8.2.'
    }
  ];

  for (const ofi of ofiItems) {
    page6.drawRectangle({ x: 40, y: y - 82, width: 515, height: 82, color: tableBg, borderColor: lineGray, borderWidth: 0.8 });
    page6.drawText(`${ofi.num}: ${ofi.title}`, { x: 48, y: y - 14, size: 8, font: fontBold, color: darkNavy });
    page6.drawText(`Target Date: ${ofi.target}`, { x: 420, y: y - 14, size: 7.5, font: fontBold, color: primaryRed });
    
    page6.drawText(`Standard Clause: ${ofi.clause}`, { x: 48, y: y - 26, size: 7, font: fontBold, color: primaryRed });
    page6.drawText(`Responsible: ${ofi.dept}`, { x: 340, y: y - 26, size: 7, font: fontRegular, color: textGray });

    page6.drawText('Observation:', { x: 48, y: y - 38, size: 7, font: fontBold, color: textDark });
    drawWrappedText(page6, ofi.finding, 110, y - 38, 435, 7, fontRegular, textDark, 9);

    page6.drawText('Recommendation:', { x: 48, y: y - 56, size: 7, font: fontBold, color: greenSuccess });
    drawWrappedText(page6, ofi.recommendation, 125, y - 56, 420, 7, fontRegular, textDark, 9);

    y -= 90;
  }

  drawRunningFooter(page6, 6);

  // =========================================================================
  // PAGE 7: APPENDIX 1 - APPROVED INTERNAL AUDIT PLAN
  // =========================================================================
  currentPageNumber++;
  const page7 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page7);
  y = 780;

  page7.drawText('APPENDIX 1 -- INTERNAL AUDIT PLAN & TIMETABLE', { x: 40, y, size: 11, font: fontBold, color: darkNavy });
  page7.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page7.drawText('Approved schedule for the Internal Audit conducted on 27th October 2026 at PROME Consultants Limited.', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 18;

  // Timetable Table Header
  page7.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page7.drawText('Time', { x: 48, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page7.drawText('Subject / ISO Clauses Evaluated', { x: 105, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page7.drawText('Auditees / Participants', { x: 380, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  y -= 18;

  const planRows = [
    {
      time: '0900 hrs',
      subject: 'Opening Meeting\n- Audit scope, objectives, methodology, and confirmation of schedule.',
      participants: 'All PROME Workers\nLead Auditor & Audit Team'
    },
    {
      time: '1000 hrs',
      subject: 'Top Management Session\n- Leadership and commitment (QMS) 5.1.1\n- Customer focus 5.1.2 | Quality policy 5.2.1\n- Planning to achieve quality objectives 6.2.2.1\n- General improvement 10.1\n- Understanding the organisation and its context 4.1\n- Understanding needs & expectations of interested parties 4.2\n- Actions to address risks and opportunities 6.1.1',
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
      subject: 'OHS & Legal Compliance Session\n- Leadership and worker participation 5.4\n- Identification of legal and other requirements 6.1.2.3\n- Hierarchy of controls 8.1.2 | Evaluation of compliance 9.1.4',
      participants: 'Philippa Arinaitwe (Lead Auditor)\nSafety Committee Members\nFacilities Officer'
    },
    {
      time: '1800 hrs',
      subject: 'Closing Meeting\n- Presentation of audit summary, positive observations, and OFIs.\n- Formal lead auditor conclusion and management sign-off.',
      participants: 'All PROME Workers\nManaging Director & MR'
    }
  ];

  for (const pr of planRows) {
    const isBig = pr.subject.includes('\n');
    const rowH = pr.time === '1000 hrs' ? 88 : isBig ? 42 : 22;
    page7.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page7.drawText(pr.time, { x: 48, y: y - 14, size: 7.5, font: fontBold, color: primaryRed });
    drawWrappedText(page7, pr.subject, 105, y - 14, 265, 7, fontRegular, textDark, 9.5);
    drawWrappedText(page7, pr.participants, 380, y - 14, 170, 7, fontRegular, textDark, 9.5);
    y -= rowH;
  }

  drawRunningFooter(page7, 7);

  // =========================================================================
  // PAGE 8: APPENDIX 2 - OPENING MEETING ATTENDANCE RECORD (AUTHENTIC SCAN)
  // =========================================================================
  currentPageNumber++;
  const page8 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page8);
  y = 780;

  page8.drawText('APPENDIX 2 -- ATTENDANCE RECORD: OPENING MEETING (27 OCT 2026)', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page8.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 14;

  page8.drawText('Form Ref: PROME-QSR-ADF-20 (Internal Audit Attendance Form, Version No: 00) -- Scanned Original', {
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
  page8.drawImage(attOpening, {
    x: 40,
    y: y - Math.min(680, attH),
    width: attW,
    height: Math.min(680, attH)
  });

  drawRunningFooter(page8, 8);

  // =========================================================================
  // PAGE 9: APPENDIX 2 - CLOSING MEETING ATTENDANCE RECORD (AUTHENTIC SCAN)
  // =========================================================================
  currentPageNumber++;
  const page9 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page9);
  y = 780;

  page9.drawText('APPENDIX 2 -- ATTENDANCE RECORD: CLOSING MEETING (27 OCT 2026)', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page9.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 14;

  page9.drawText('Form Ref: PROME-QSR-ADF-20 (Internal Audit Attendance Form, Version No: 00) -- Scanned Original with MD Sign-off', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 12;

  // Embed image5.jpeg
  const attClH = (attClosing.height / attClosing.width) * attW;
  page9.drawImage(attClosing, {
    x: 40,
    y: y - Math.min(680, attClH),
    width: attW,
    height: Math.min(680, attClH)
  });

  drawRunningFooter(page9, 9);

  // =========================================================================
  // PAGE 10: APPENDIX 3 - INTEGRATED AUDIT PROGRAMME & VERIFICATION MATRIX
  // =========================================================================
  currentPageNumber++;
  const page10 = pdfDoc.addPage([595.28, 841.89]);
  drawRunningHeader(page10);
  y = 780;

  page10.drawText('APPENDIX 3 -- INTEGRATED AUDIT PROGRAMME & VERIFICATION MATRIX', { x: 40, y, size: 10.5, font: fontBold, color: darkNavy });
  page10.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 16;

  page10.drawText('Master alignment of PROME core QMS/OHS processes against ISO 9001:2015 and ISO 45001:2018 criteria.', {
    x: 40,
    y,
    size: 7.5,
    font: fontOblique,
    color: textGray
  });
  y -= 16;

  // Table Header
  page10.drawRectangle({ x: 40, y: y - 18, width: 515, height: 18, color: darkNavy, borderColor: darkNavy, borderWidth: 1 });
  page10.drawText('Division / Department', { x: 48, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page10.drawText('Process / Focus Area', { x: 165, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page10.drawText('Applicable ISO Clauses', { x: 320, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page10.drawText('Audit Status', { x: 460, y: y - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  y -= 18;

  const app3Rows = [
    { div: 'Top Management', proc: 'Strategic Context, Policy, Objectives & MRM', clauses: '4.1, 4.2, 5.1, 5.2, 6.2, 9.3', status: 'Conforming' },
    { div: 'PMBDD', proc: 'Business Development, Proposals, EOIs & RFPs', clauses: '8.2, 8.4, 6.2.2.1, 7.4', status: 'Conforming' },
    { div: 'PDMD', proc: 'Project Planning, Site Supervision & Customer Focus', clauses: '5.1.2, 8.1, 8.5, 8.6, 8.7', status: 'Conforming' },
    { div: 'PED', proc: 'Detailed Engineering Design & Technical Verification', clauses: '8.3, 7.1.5, 7.1.6, 8.5', status: 'Conforming' },
    { div: 'CPSD', proc: 'HIRA Studies, ESIA, Environmental & Safety', clauses: '6.1.1, 6.1.2.1, 6.1.3, 5.4, 8.2', status: 'Conforming' },
    { div: 'HRAD & AFD', proc: 'Competence, Staffing, Infrastructure, Accounting', clauses: '5.3, 7.1.2, 7.1.3, 7.2, 7.3', status: 'Conforming' },
    { div: 'Quality & Audit', proc: 'Internal Auditing, CAPA & Continual Improvement', clauses: '9.2, 10.1, 10.2, 10.3', status: 'Conforming' },
    { div: 'Documentation (SAS)', proc: 'Document Control, Records Management & Masterlist', clauses: '7.5, 8.1', status: 'Conforming' }
  ];

  for (const row of app3Rows) {
    const rowH = 22;
    page10.drawRectangle({ x: 40, y: y - rowH, width: 515, height: rowH, color: rgb(1, 1, 1), borderColor: lineGray, borderWidth: 0.5 });
    page10.drawText(row.div, { x: 48, y: y - 14, size: 7.5, font: fontBold, color: darkNavy });
    page10.drawText(row.proc, { x: 165, y: y - 14, size: 7, font: fontRegular, color: textDark });
    page10.drawText(row.clauses, { x: 320, y: y - 14, size: 7, font: fontRegular, color: textGray });
    page10.drawText(row.status, { x: 460, y: y - 14, size: 7.5, font: fontBold, color: greenSuccess });
    y -= rowH;
  }
  y -= 25;

  // Final Endorsement Box
  page10.drawRectangle({ x: 40, y: y - 120, width: 515, height: 120, color: tableBg, borderColor: darkNavy, borderWidth: 1 });
  page10.drawText('FORMAL LEAD AUDITOR CERTIFICATION STATEMENT', { x: 50, y: y - 18, size: 9, font: fontBold, color: darkNavy });
  const certStatement = 'This audit report has been compiled in accordance with the principles and guidelines of ISO 19011:2018 (Guidelines for auditing management systems) and PROME Quality System Procedure PROME-QSP-CSVM-04. The evidence gathered confirms that PROME Consultants Limited has effectively established, documented, implemented, and maintained an Integrated Management System meeting the requirements of ISO 9001:2015 and ISO 45001:2018. Continued certification status and operational effectiveness are hereby endorsed without reservation.';
  drawWrappedText(page10, certStatement, 50, y - 32, 495, 7.5, fontRegular, textDark, 11);

  page10.drawText('Report Prepared By: Philippa Arinaitwe (Lead Auditor)', { x: 50, y: y - 92, size: 8, font: fontBold, color: primaryRed });
  page10.drawText('Endorsed By: Amanya Patience (Management Representative) & Eng. Ronald Kibuuka (Managing Director)', { x: 50, y: y - 106, size: 7.5, font: fontRegular, color: textDark });

  drawRunningFooter(page10, 10);

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
