import type { jsPDF } from 'jspdf';
import jsPDFModule from 'jspdf';
const jsPDFConstructor = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default || jsPDFModule;
import {
  PROME_HEADER_LOGO_BASE64,
  MD_SIGNATURE_BASE64,
  CORE_FLOWCHART_BASE64,
  COMPANY_ORGANOGRAM_BASE64,
  IMS_STRUCTURE_BASE64
} from './promeDocumentImages';

export const generateScopeOfOrganizationPDF = (): jsPDF => {
  const doc: jsPDF = new jsPDFConstructor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  const totalPages = 6;

  // Colors
  const primaryRed = [153, 27, 27]; // #991b1b
  const darkNavy = [15, 23, 42]; // #0f172a
  const slateText = [51, 65, 85]; // #334155
  const mutedText = [100, 116, 139]; // #64748b
  const lightBg = [248, 250, 252]; // #f8fafc
  const linkBlue = [2, 132, 199]; // #0284c7
  const borderGray = [203, 213, 225]; // #cbd5e1

  // Draw Page Header & Control Box
  const drawPageHeader = (pageNum: number, sectionTitle: string) => {
    // Top banner border line
    doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.setLineWidth(1.2);
    doc.line(marginX, 10, marginX + contentWidth, 10);

    // Logo on the left
    try {
      doc.addImage(PROME_HEADER_LOGO_BASE64, 'JPEG', marginX, 13, 48, 14.5);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
      doc.text('PROME CONSULTANTS LTD', marginX, 22);
    }

    // Document Control Meta Box on the right
    const metaX = marginX + contentWidth - 88;
    const metaY = 12.5;
    const metaW = 88;
    const metaH = 16.5;

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.rect(metaX, metaY, metaW, metaH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('INTEGRATED MANAGEMENT SYSTEM (IMS)', metaX + 3, metaY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`Doc Ref: PROME-QSP-CSVM-18 | Page ${pageNum} of ${totalPages}`, metaX + 3, metaY + 8.2);
    doc.text('ISO 9001:2015 & ISO 45001:2018 (Clause 4.3)', metaX + 3, metaY + 12.0);
    doc.text(`Issue: Jan 2025 | Revision: Jan 2026 (Ver-2026)`, metaX + 3, metaY + 15.2);

    // Section breadcrumb banner
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, 30.5, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.text(sectionTitle.toUpperCase(), marginX + 3, 35);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('CONTROLLED DOCUMENT', marginX + contentWidth - 3, 35, { align: 'right' });
  };

  // Draw Page Footer
  const drawPageFooter = (pageNum: number) => {
    const footerY = pageHeight - 12;

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY, marginX + contentWidth, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('PROME Consultants Limited — Scope of the Organization (PROME-QSP-CSVM-18)', marginX, footerY + 4.5);
    doc.text(`Page ${pageNum} of ${totalPages}`, marginX + contentWidth, footerY + 4.5, { align: 'right' });

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Confidential — For Internal and ISO Third-Party Audit Use Only. Uncontrolled When Printed.', pageWidth / 2, footerY + 8.5, { align: 'center' });
  };

  // Helper for clickable hyperlink text
  const addClickableLink = (
    text: string,
    x: number,
    y: number,
    url: string,
    fontSize = 8.5,
    isBold = true
  ) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(linkBlue[0], linkBlue[1], linkBlue[2]);
    doc.text(text, x, y);
    const textWidth = doc.getTextWidth(text);
    // Draw underline
    doc.setDrawColor(linkBlue[0], linkBlue[1], linkBlue[2]);
    doc.setLineWidth(0.2);
    doc.line(x, y + 0.8, x + textWidth, y + 0.8);
    // Add clickable annotation link
    doc.link(x, y - fontSize * 0.35, textWidth, fontSize * 0.5, { url });
    return textWidth;
  };

  // =========================================================================
  // PAGE 1: SCOPE OF PRODUCTS & SERVICES, COMPANY PROFILE & EXCLUSIONS
  // =========================================================================
  drawPageHeader(1, '1. Scope of Products and Services & Company Profile');

  let curY = 43;

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('SCOPE OF THE ORGANIZATION', marginX, curY);
  curY += 6;

  doc.setFontSize(10.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('SCOPE OF PRODUCTS AND SERVICES (ISO 9001:2015 & ISO 45001:2018)', marginX, curY);
  curY += 8;

  // Lead Paragraph Callout
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(marginX, curY, contentWidth, 16, 'FD');
  doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.setLineWidth(1.5);
  doc.line(marginX, curY, marginX, curY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const scopeLead = 'The Integrated Management System consisting of the Quality Management System (QMS) and Occupational Health and Safety Management System (OHSMS) for PROME Consultants Limited covers multidisciplinary engineering consultancy, feasibility studies, detailed engineering design, and construction supervision in full compliance with ISO 9001:2015 and ISO 45001:2018.';
  const leadLines = doc.splitTextToSize(scopeLead, contentWidth - 8);
  doc.text(leadLines, marginX + 4, curY + 5.5);
  curY += 21;

  // Section: Company Profile
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('1.1 Company Profile & Background', marginX, curY);
  curY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);

  const p1 = 'Established in 1996, PROME Consultants Limited is a Multidisciplinary Engineering Consultancy and Project Management firm with its headquarters in Kampala, Uganda. The firm has 30 years of established professional experience. Through a dedicated team of qualified and widely experienced professionals—including Civil & Structural Engineers, Transportation Engineers, Water Resources Engineers, Architects, Land and Valuation Surveyors, Environmentalists, Sociologists, and HSE Specialists—PROME supplies technology-based intellectual services in the form of project planning, feasibility studies, detailed engineering design, and construction supervision management in the built and natural environment.';
  const p1Lines = doc.splitTextToSize(p1, contentWidth);
  doc.text(p1Lines, marginX, curY);
  curY += p1Lines.length * 3.6 + 3;

  const p2 = 'Service delivery projects are increasingly becoming more integrated and complex with stringent design and operational standards in light of the need to optimize construction costs while operating within tighter budgets and tighter implementation schedules. The legal, environmental, climate resilience, social, and occupational safety concerns, along with the need to build local capacity through technology transfer, are paramount. PROME Consultants Limited is dedicated to providing innovative, sustainable, value-for-money, technically sound, financially affordable, economically viable, socially acceptable, and environmentally friendly engineering services tailored to complete customer satisfaction.';
  const p2Lines = doc.splitTextToSize(p2, contentWidth);
  doc.text(p2Lines, marginX, curY);
  curY += p2Lines.length * 3.6 + 5;

  // Section: Head Office Location & Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('1.2 Physical Location & Operational Boundaries', marginX, curY);
  curY += 5;

  // Two columns: Head Office / Specialist Subsidiaries
  const colW = (contentWidth - 6) / 2;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.rect(marginX, curY, colW, 32, 'FD');
  doc.rect(marginX + colW + 6, curY, colW, 32, 'FD');

  // Col 1: Head Office
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('HEAD OFFICE (CENTRAL OPERATIONS):', marginX + 3, curY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Innovations House, Plot 7B, John Babiiha Avenue', marginX + 3, curY + 10.5);
  doc.text('P.O. Box 24934, Kampala, Uganda', marginX + 3, curY + 15);
  doc.text('Telephone: +256-414-345543 / 4', marginX + 3, curY + 19.5);
  doc.text('Official Email: info@promeconsult.com', marginX + 3, curY + 24);
  addClickableLink('Web: www.promeconsult.com', marginX + 3, curY + 28.5, 'https://www.promeconsult.com', 7.8);

  // Col 2: Specialist Subsidiary & Regional Offices
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('AFFILIATE SPECIALIST & FIELD SITES:', marginX + colW + 9, curY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('• Teclab Limited: Specialist Geotechnical Engineering', marginX + colW + 9, curY + 10.5);
  doc.text('  Soil mechanics, foundation analysis & material testing.', marginX + colW + 9, curY + 14.5);
  doc.text('• Field Supervision Resident Offices:', marginX + colW + 9, curY + 19);
  doc.text('  All active construction site resident engineer offices', marginX + colW + 9, curY + 23);
  doc.text('  established under client supervision contracts in Uganda.', marginX + colW + 9, curY + 27);
  curY += 37;

  // Section: Core Services Provided
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('1.3 Core Engineering & Advisory Services', marginX, curY);
  curY += 5;

  const services = [
    { title: 'Built Environment Engineering', desc: 'Civil, structural, transportation/highways, bridges, drainage, water supply, sanitation, and building services engineering design and supervision.' },
    { title: 'Physical & Urban Planning', desc: 'Regional, urban, and industrial development planning, master plan formulation, and secondary infrastructure facilities.' },
    { title: 'Topographical & Cadastral Surveys', desc: '3D spatial positioning using digital total stations, RTK GNSS receivers, laser scanning, and aerial drone mapping.' },
    { title: 'Geotechnical Engineering & Testing', desc: 'Sub-surface drilling, borehole logging, laboratory soil mechanics, and foundation stability assessments via Teclab Ltd.' },
  ];

  services.forEach((s) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(`• ${s.title}:`, marginX + 2, curY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);

    const dLines = doc.splitTextToSize(s.desc, contentWidth - 6);
    // Render first line right after title, and wrapped lines cleanly indented
    doc.text(dLines, marginX + 6, curY + 3.6);
    curY += dLines.length * 3.4 + 4.2;
  });
  curY += 2;

  // Section: Permissible Exclusions
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.rect(marginX, curY, contentWidth, 14, 'FD');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.2);
  doc.line(marginX, curY, marginX, curY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 64, 175);
  doc.text('PERMISSIBLE EXCLUSIONS (CLAUSE 4.3): ZERO EXCLUSIONS', marginX + 4, curY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('PROME Consultants Limited claims NO EXCLUSIONS from the requirements of ISO 9001:2015 and ISO 45001:2018.', marginX + 4, curY + 8.8);
  doc.text('Design and Development of Products and Services (Clause 8.3) is an essential, core competency of the firm.', marginX + 4, curY + 12.2);

  drawPageFooter(1);

  // =========================================================================
  // PAGE 2: INTEGRATED QUALITY, HEALTH & SAFETY POLICY STATEMENT
  // =========================================================================
  doc.addPage();
  drawPageHeader(2, '2. Integrated Quality & Occupational Health and Safety Policy');

  curY = 43;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('INTEGRATED MANAGEMENT SYSTEM (IMS) POLICY', marginX, curY);
  curY += 6;

  doc.setFontSize(9.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('QUALITY AND OCCUPATIONAL HEALTH & SAFETY POLICY STATEMENT (CLAUSE 5.2)', marginX, curY);
  curY += 8;

  // Major Policy Callout Box
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.setLineWidth(0.4);
  doc.rect(marginX, curY, contentWidth, 54, 'FD');
  doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.setLineWidth(2.5);
  doc.line(marginX, curY, marginX, curY + 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('“DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME”', marginX + 6, curY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const policyStatement = `PROME Consultants Limited is committed to pursuing excellence and customer satisfaction in its business, by:

“Doing the right things, in the right way, first time, while ensuring the health and safety of our customers, workers and other interested parties;

Through the establishment of Quality and Occupational Health and Safety (OHS) objectives, commitment to eliminating hazards and risks, innovation, continued improvement of its management system, objective consultation of customers and interested parties and participation of workers;

While integrating state of the art technology, a skilled and versatile human resource that exhibits a culture of quality and safety, and meeting applicable statutory, quality, OHS and legal and regulatory requirements, during our service delivery.”`;

  const policyLines = doc.splitTextToSize(policyStatement, contentWidth - 12);
  doc.text(policyLines, marginX + 6, curY + 14);
  curY += 60;

  // 4 Core Commitments Pillars
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('2.1 Key Commitments of the Policy Framework', marginX, curY);
  curY += 6;

  const pillars = [
    { title: '1. Quality Excellence & Customer Focus', text: 'Conforming strictly to client terms of reference, FIDIC contract conditions, and international standards, achieving >90% on-time delivery.' },
    { title: '2. Safe & Healthy Working Environment', text: 'Providing safe workplaces, preventing work-related injury and ill-health, achieving Zero Fatalities and Zero Lost Time Injuries (LTI).' },
    { title: '3. Hazard Elimination & Hierarchy of Controls', text: 'Proactively identifying hazards via HIRA and systematically applying elimination, substitution, engineering, and PPE controls.' },
    { title: '4. Worker Consultation & Participation', text: 'Empowering workers through the Joint Safety Committee, daily toolbox talks, and upholding Stop-Work Authority without fear of reprisal.' },
    { title: '5. Legal & Regulatory Compliance', text: 'Maintaining strict adherence to the Uganda Occupational Safety and Health Act 2006, Workers Compensation Act, and NEMA Regulations.' },
    { title: '6. Continual Improvement & Digital Innovation', text: 'Constantly refining processes via audits, lessons learned, modern BIM/CAD tools, and the online IMS Intranet management system.' },
  ];

  pillars.forEach((p) => {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.rect(marginX, curY, contentWidth, 12, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(p.title, marginX + 4, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(p.text, marginX + 4, curY + 9);
    curY += 14.5;
  });
  curY += 4;

  // Links to Full Standalone Signed Policy PDFs
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.rect(marginX, curY, contentWidth, 24, 'FD');
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(1.2);
  doc.line(marginX, curY, marginX, curY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text('OFFICIAL CONTROLLED POLICY DOCUMENTS & DIRECT DOWNLOAD LINKS:', marginX + 4, curY + 5.5);

  addClickableLink(
    '• View & Download Full Quality & OHS Policy PDF (PROME-POL-QOHS-2026, Signed Jan 2026)',
    marginX + 4,
    curY + 11.5,
    'https://ims.promeconsult.com/uploads/company-documents/Quality_policy__2026.pdf',
    8
  );

  addClickableLink(
    '• View & Download Dedicated Occupational Health & Safety Policy PDF (PROME-POL-OHS-2026)',
    marginX + 4,
    curY + 17.5,
    'https://ims.promeconsult.com/uploads/company-documents/OHS_policy__2026.pdf',
    8
  );

  drawPageFooter(2);

  // =========================================================================
  // PAGE 3: CORPORATE ORGANISATIONAL STRUCTURE (CLAUSE 5.3)
  // =========================================================================
  doc.addPage();
  drawPageHeader(3, '3. Corporate Governance & Organisational Structure');

  curY = 43;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('CORPORATE ORGANISATIONAL STRUCTURE', marginX, curY);
  curY += 5.5;

  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('DOCUMENT REF: PROME-DOC-ORG-01 (VER-2026) | ISO 9001 & ISO 45001 CLAUSE 5.3', marginX, curY);
  curY += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const p3Desc = 'Official PROME Consultants Limited Corporate Governance & Reporting Hierarchy from the Board of Directors through the Managing Director to the five operating divisions (PED, PMBDD, HR&AD, Finance, and QA/HSE).';
  const p3Lines = doc.splitTextToSize(p3Desc, contentWidth);
  doc.text(p3Lines, marginX, curY);
  curY += p3Lines.length * 3.6 + 3;

  // Embed High-Res Corporate Organogram Image
  const chartBoxH = 145;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.rect(marginX, curY, contentWidth, chartBoxH);

  try {
    doc.addImage(COMPANY_ORGANOGRAM_BASE64, 'PNG', marginX + 1, curY + 1, contentWidth - 2, chartBoxH - 2);
  } catch (e) {
    doc.setFont('helvetica', 'italic');
    doc.text('Organogram Image Embedded', marginX + 10, curY + 70);
  }
  curY += chartBoxH + 5;

  // Direct clickable link box to standalone PDF
  const linkBoxH = 15;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(marginX, curY, contentWidth, linkBoxH, 'FD');

  // Red accent indicator on left
  doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.rect(marginX, curY, 3, linkBoxH, 'F');

  // Badge
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(marginX + 6, curY + 2.8, 24, 4.6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('PDF DOWNLOAD', marginX + 18, curY + 6.0, { align: 'center' });

  // Action title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(linkBlue[0], linkBlue[1], linkBlue[2]);
  doc.text('Click to view and print the full high-resolution Corporate Organisational Chart PDF (PROME-DOC-ORG-01)', marginX + 33, curY + 6.0);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Roles, job descriptions, and delegated authorities are managed under PROME Master Document Register Section 5.', marginX + 6, curY + 11.5);

  // Make entire box clickable
  doc.link(marginX, curY, contentWidth, linkBoxH, { url: 'https://ims.promeconsult.com/uploads/company-documents/PROME_Company_Organisational_Chart.pdf' });

  drawPageFooter(3);

  // =========================================================================
  // PAGE 4: IMS IMPLEMENTATION GOVERNANCE STRUCTURE (CLAUSE 5.3 & 5.4)
  // =========================================================================
  doc.addPage();
  drawPageHeader(4, '4. IMS Implementation Governance Structure');

  curY = 43;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('ORGANISATIONAL STRUCTURE FOR IMS IMPLEMENTATION', marginX, curY);
  curY += 5.5;

  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('DOCUMENT REF: PROME-DOC-IMS-ORG-02 (VER-2026) | ISO 9001 & ISO 45001 CLAUSE 5.3 / 5.4', marginX, curY);
  curY += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const p4Desc = 'Dedicated IMS implementation governance structure establishing executive safety oversight, Management Representative delegations, Lead Internal Auditors, Safety & Health Committee, and 7 operational field safety roles.';
  const p4Lines = doc.splitTextToSize(p4Desc, contentWidth);
  doc.text(p4Lines, marginX, curY);
  curY += p4Lines.length * 3.6 + 3;

  // Embed High-Res IMS Structure Image
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.rect(marginX, curY, contentWidth, chartBoxH);

  try {
    doc.addImage(IMS_STRUCTURE_BASE64, 'PNG', marginX + 1, curY + 1, contentWidth - 2, chartBoxH - 2);
  } catch (e) {
    doc.setFont('helvetica', 'italic');
    doc.text('IMS Structure Image Embedded', marginX + 10, curY + 70);
  }
  curY += chartBoxH + 5;

  // Direct clickable link to standalone IMS PDF
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(marginX, curY, contentWidth, linkBoxH, 'FD');

  // Red accent indicator on left
  doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.rect(marginX, curY, 3, linkBoxH, 'F');

  // Badge
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(marginX + 6, curY + 2.8, 24, 4.6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('PDF DOWNLOAD', marginX + 18, curY + 6.0, { align: 'center' });

  // Action text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(linkBlue[0], linkBlue[1], linkBlue[2]);
  doc.text('Click to view and print the full high-resolution IMS Implementation Structure PDF (PROME-DOC-IMS-ORG-02)', marginX + 33, curY + 6.0);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Empowers Joint Safety Committee, Fire Marshals, Designated First Aiders, and Site Resident Safety Officers.', marginX + 6, curY + 11.5);

  // Make entire box clickable
  doc.link(marginX, curY, contentWidth, linkBoxH, { url: 'https://ims.promeconsult.com/uploads/company-documents/PROME_IMS_Organisational_Structure.pdf' });

  drawPageFooter(4);

  // =========================================================================
  // PAGE 5: CORE PROCESSES & INTERACTION FLOWCHART (CLAUSE 4.4)
  // =========================================================================
  doc.addPage();
  drawPageHeader(5, '5. Core Processes & Process Interaction Flowchart');

  curY = 43;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('CORE BUSINESS PROCESSES & INTERACTION FLOWCHART', marginX, curY);
  curY += 5.5;

  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('CLAUSE 4.4 QUALITY MANAGEMENT SYSTEM & ITS PROCESSES (PROME-QSP-CSVM-19)', marginX, curY);
  curY += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const p5Desc = 'The delivery of services encompasses 4 primary cyclic engineering phases supported by 24 corporate and occupational safety control processes:';
  const p5Lines = doc.splitTextToSize(p5Desc, contentWidth);
  doc.text(p5Lines, marginX, curY);
  curY += p5Lines.length * 3.6 + 3;

  // Embed Core Process Flowchart Image
  const flowH = 145;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.rect(marginX, curY, contentWidth, flowH);

  try {
    doc.addImage(CORE_FLOWCHART_BASE64, 'JPEG', marginX + 1, curY + 1, contentWidth - 2, flowH - 2);
  } catch (e) {
    doc.setFont('helvetica', 'italic');
    doc.text('Flowchart Image Embedded', marginX + 10, curY + 70);
  }
  curY += flowH + 5;

  // Direct link to Project Engineering Division Portal
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.rect(marginX, curY, contentWidth, linkBoxH, 'FD');

  // Blue accent indicator on left
  doc.setFillColor(linkBlue[0], linkBlue[1], linkBlue[2]);
  doc.rect(marginX, curY, 3, linkBoxH, 'F');

  // Badge
  doc.setFillColor(224, 242, 254);
  doc.roundedRect(marginX + 6, curY + 2.8, 24, 4.6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(linkBlue[0], linkBlue[1], linkBlue[2]);
  doc.text('APP PORTAL', marginX + 18, curY + 6.0, { align: 'center' });

  // Action text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(linkBlue[0], linkBlue[1], linkBlue[2]);
  doc.text('Click to open Project Engineering Division (PED) Operations Portal (Feasibility, Design, Supervision)', marginX + 33, curY + 6.0);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Track Project Quality Plans (PQP), Calculation Verification Sheets, Inspection RFIs, and As-Built deliverables.', marginX + 6, curY + 11.5);

  // Make entire box clickable
  doc.link(marginX, curY, contentWidth, linkBoxH, { url: 'https://ims.promeconsult.com/division/ped' });

  drawPageFooter(5);

  // =========================================================================
  // PAGE 6: IMS EVIDENCE MATRIX, APP DOCUMENT LINKS & FORMAL SIGN-OFF
  // =========================================================================
  doc.addPage();
  drawPageHeader(6, '6. IMS Evidence Matrix, Direct Portal Links & Sign-Off');

  curY = 43;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('INTEGRATED MANAGEMENT SYSTEM (IMS) EVIDENCE MATRIX', marginX, curY);
  curY += 5.5;

  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('LIVE INTRANET APP LINKS & DOCUMENT REFERENCES (CLAUSES 4 THROUGH 10)', marginX, curY);
  curY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('To maintain an agile, modern document without inflating file size, all detailed registers and records are accessible via the direct authenticated links below:', marginX, curY);
  curY += 6;

  // Evidence Table
  const evidenceItems = [
    { area: 'Context & Scope', code: 'PROME-QSP-CSVM-01/18', title: 'Organization Context & Boundaries', linkText: 'Open Context Portal', url: 'https://ims.promeconsult.com/organization-context' },
    { area: 'Interested Parties', code: 'PROME-QSP-CSVM-21', title: 'Stakeholder Needs & Prioritization', linkText: 'View Stakeholder Matrix', url: 'https://ims.promeconsult.com/organization-context' },
    { area: 'Risk Management', code: 'PROME-REG-RSK-01', title: 'Corporate Risks & Opportunities', linkText: 'Open Risk Register', url: 'https://ims.promeconsult.com/risks' },
    { area: 'HIRA Studies', code: 'PROME-REG-HIRA-01', title: 'Hazard Identification & Controls', linkText: 'Open HIRA Register', url: 'https://ims.promeconsult.com/risks' },
    { area: 'Strategic Objectives', code: 'PROME-QSR-OBJ-2025-26', title: 'Annual Corporate Objectives & KPIs', linkText: 'Open Objectives Portal', url: 'https://ims.promeconsult.com/objectives' },
    { area: 'Legal Obligations', code: 'PROME-REG-LEG-01', title: 'Uganda OSH Act 2006 & NEMA Regs', linkText: 'Open Legal Register', url: 'https://ims.promeconsult.com/hse' },
    { area: 'Emergency & Drills', code: 'PROME-ERP-2026', title: 'Emergency Plan & Evacuation Logs', linkText: 'Open Emergency Portal', url: 'https://ims.promeconsult.com/hse' },
    { area: 'Communication', code: 'PROME-QSR-AFD-20', title: 'Internal & External Comm Matrix', linkText: 'Open Comm Matrix', url: 'https://ims.promeconsult.com/communication' },
    { area: 'Document Control', code: 'PROME-QSR-HRAD-12', title: 'Masterlist of All 99 Documents', linkText: 'Open Document Masterlist', url: 'https://ims.promeconsult.com/documents' },
    { area: 'Internal Audits', code: 'PROME-AUD-2026-001', title: 'Integrated Audit Report & 5-Why RCA', linkText: 'Open Audit Module', url: 'https://ims.promeconsult.com/audits' },
    { area: 'Standards Wiki', code: 'ISO 9001 & 45001', title: 'Requirement Wikis & Evidence Links', linkText: 'Open ISO Standards Wiki', url: 'https://ims.promeconsult.com/wiki' },
  ];

  // Table header
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(marginX, curY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('IMS Focus Area', marginX + 3, curY + 4.8);
  doc.text('Document Ref', marginX + 38, curY + 4.8);
  doc.text('Official System Record Title', marginX + 80, curY + 4.8);
  doc.text('Direct App Link', marginX + 145, curY + 4.8);
  curY += 7;

  // Table rows
  evidenceItems.forEach((item, idx) => {
    const rowH = 7.5;
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.2);
    doc.rect(marginX, curY, contentWidth, rowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(item.area, marginX + 3, curY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(item.code, marginX + 38, curY + 5);
    doc.text(item.title, marginX + 80, curY + 5);

    addClickableLink(item.linkText, marginX + 145, curY + 5, item.url, 7.2, true);

    curY += rowH;
  });
  curY += 8;

  // Formal Sign-Off Box (Exact Template from attached doc)
  const signBoxH = 34;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.rect(marginX, curY, contentWidth, signBoxH, 'FD');

  // Divider
  doc.line(marginX + contentWidth / 2, curY, marginX + contentWidth / 2, curY + signBoxH);

  // Left: Prepared By
  const leftX = marginX + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('PREPARED BY:', leftX, curY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Stephanie Apio Canowira', leftX, curY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Document Controller / Lead Internal Auditor', leftX, curY + 16.5);
  doc.text('PROME Consultants Limited', leftX, curY + 20.5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Date: 04th January 2026 | Revision: January 2026', leftX, curY + 26);

  // Right: Approved By with Signature
  const rightX = marginX + contentWidth / 2 + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('APPROVED BY:', rightX, curY + 6.5);

  // Embed Signature Image
  try {
    doc.addImage(MD_SIGNATURE_BASE64, 'PNG', rightX + 50, curY + 3.5, 34, 22);
  } catch (e) {
    // fallback text
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Eng. Ronald Kibuuka', rightX, curY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Managing Director / Top Management', rightX, curY + 16.5);
  doc.text('PROME Consultants Limited', rightX, curY + 20.5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Date: 04th January 2026 | Revision: January 2026', rightX, curY + 26);

  drawPageFooter(6);

  return doc;
};
