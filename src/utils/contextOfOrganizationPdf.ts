import type { jsPDF } from 'jspdf';
import jsPDFModule from 'jspdf';
const jsPDFConstructor = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default || jsPDFModule;
import { PROME_HEADER_LOGO_BASE64, MD_SIGNATURE_BASE64 } from './promeDocumentImages';

export interface ContextItem {
  context: string;
  aspect: string;
  impact: string;
  mitigation: string;
  followUpBy: string;
  followUpDate: string;
  followUpResults: string;
  records: string;
  linkUrl?: string;
}

export const generateContextOfOrganizationPDF = (customItems?: any[]): jsPDF => {
  const doc: jsPDF = new jsPDFConstructor({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 277mm
  const bottomLimit = pageHeight - 16;

  // Colors
  const primaryRed = [153, 27, 27]; // #991b1b
  const darkNavy = [15, 23, 42]; // #0f172a
  const slateText = [51, 65, 85]; // #334155
  const mutedText = [100, 116, 139]; // #64748b
  const lightBg = [248, 250, 252]; // #f8fafc
  const headerGray = [241, 245, 249]; // #f1f5f9
  const borderGray = [203, 213, 225]; // #cbd5e1
  const linkBlue = [2, 132, 199]; // #0284c7

  // Column widths: Total = 277mm
  const cols = [
    { key: 'context', title: 'CONTEXT', width: 34 },
    { key: 'aspect', title: 'ASPECT FROM CONTEXT', width: 44 },
    { key: 'impact', title: 'IMPACT TO BUSINESS', width: 38 },
    { key: 'mitigation', title: 'MITIGATION ACTION', width: 50 },
    { key: 'followUpBy', title: 'FOLLOW UP & REVIEW BY', width: 32 },
    { key: 'followUpDate', title: 'FOLLOW UP DATE', width: 22 },
    { key: 'followUpResults', title: 'FOLLOW UP RESULTS', width: 27 },
    { key: 'records', title: 'RECORDS / EVIDENCE', width: 30 },
  ];

  let curPage = 1;

  // Draw Page Header Box
  const drawPageHeader = (tableTitle: string) => {
    // Red top border
    doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.setLineWidth(1.2);
    doc.line(marginX, 7, marginX + contentWidth, 7);

    // Box outer border
    const boxY = 8.5;
    const boxH = 20;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, boxY, contentWidth, boxH, 'FD');

    // Vertical dividers in header box
    const div1 = marginX + 64;
    const div2 = marginX + contentWidth - 84;
    doc.line(div1, boxY, div1, boxY + boxH);
    doc.line(div2, boxY, div2, boxY + boxH);

    // Left: Logo
    try {
      doc.addImage(PROME_HEADER_LOGO_BASE64, 'JPEG', marginX + 3, boxY + 2.5, 56, 15);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
      doc.text('PROME CONSULTANTS LTD', marginX + 4, boxY + 11);
    }

    // Center: Title & Document Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('ORGANISATION CONTEXT', (div1 + div2) / 2, boxY + 6.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.text('ISO QMS 9001:2015 & OHSMS 45001:2018 (Clause 4.1)', (div1 + div2) / 2, boxY + 11.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Identification No: PROME-IMSR-CPSD-25 | Original Issue Jan 2025 | Revision: January 2026', (div1 + div2) / 2, boxY + 16, { align: 'center' });

    // Right: Approval Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('CONTROLLED QUALITY RECORD', div2 + 3, boxY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Prepared by: Stephanie Apio Canowira', div2 + 3, boxY + 8.5);
    doc.text('Approved by: Eng. Ronald Kibuuka (MD)', div2 + 3, boxY + 12);
    doc.text('Retention: Permanent | Status: Approved', div2 + 3, boxY + 15.5);
    doc.text(`Doc Ref: PROME-QSP-CSVM-01 (Rev 06)`, div2 + 3, boxY + 18.8);

    // Section Category Banner
    const bannerY = boxY + boxH + 2;
    doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.rect(marginX, bannerY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(tableTitle.toUpperCase(), marginX + 4, bannerY + 4.3);

    return bannerY + 7.5;
  };

  // Draw Page Footer
  const drawPageFooter = () => {
    const footerY = pageHeight - 8;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 2, marginX + contentWidth, footerY - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('PROME Consultants Limited — Organization Context Register (PROME-IMSR-CPSD-25 / PROME-QSP-CSVM-01)', marginX, footerY + 2);
    doc.text('Confidential — Controlled IMS Document. Uncontrolled when printed.', pageWidth / 2, footerY + 2, { align: 'center' });
    doc.text(`Page ${curPage}`, marginX + contentWidth, footerY + 2, { align: 'right' });
  };

  // Draw Table Header
  const drawTableHeader = (startY: number) => {
    doc.setFillColor(headerGray[0], headerGray[1], headerGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.rect(marginX, startY, contentWidth, 7, 'FD');

    let x = marginX;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

    cols.forEach((col, idx) => {
      if (idx > 0) {
        doc.line(x, startY, x, startY + 7);
      }
      doc.text(col.title, x + col.width / 2, startY + 4.6, { align: 'center' });
      x += col.width;
    });

    return startY + 7;
  };

  // Helper to render table items with text wrapping & pagination
  const renderTableSection = (
    title: string,
    items: ContextItem[]
  ): number => {
    let y = drawPageHeader(title);
    y = drawTableHeader(y);

    items.forEach((item, rIdx) => {
      // Calculate wrapped lines for each cell
      const cLines = doc.splitTextToSize(item.context, cols[0].width - 3);
      const aLines = doc.splitTextToSize(item.aspect, cols[1].width - 3);
      const iLines = doc.splitTextToSize(item.impact, cols[2].width - 3);
      const mLines = doc.splitTextToSize(item.mitigation, cols[3].width - 3);
      const fLines = doc.splitTextToSize(item.followUpBy, cols[4].width - 3);
      const dLines = doc.splitTextToSize(item.followUpDate, cols[5].width - 3);
      const resLines = doc.splitTextToSize(item.followUpResults, cols[6].width - 3);
      const recLines = doc.splitTextToSize(item.records, cols[7].width - 3);

      const maxLines = Math.max(
        cLines.length,
        aLines.length,
        iLines.length,
        mLines.length,
        fLines.length,
        dLines.length,
        resLines.length,
        recLines.length,
        2
      );

      const rowH = Math.max(maxLines * 3.4 + 4, 10);

      // Check page overflow
      if (y + rowH > bottomLimit) {
        drawPageFooter();
        doc.addPage();
        curPage++;
        y = drawPageHeader(title + ' (Continued)');
        y = drawTableHeader(y);
      }

      // Alternate row backgrounds
      doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.25);
      doc.rect(marginX, y, contentWidth, rowH, 'FD');

      let x = marginX;

      // Draw cell borders & text
      cols.forEach((col, cIdx) => {
        if (cIdx > 0) {
          doc.line(x, y, x, y + rowH);
        }

        const textX = x + 1.5;
        const textY = y + 3.8;

        doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(slateText[0], slateText[1], slateText[2]);

        if (cIdx === 0) doc.text(cLines, textX, textY);
        else if (cIdx === 1) doc.text(aLines, textX, textY);
        else if (cIdx === 2) doc.text(iLines, textX, textY);
        else if (cIdx === 3) doc.text(mLines, textX, textY);
        else if (cIdx === 4) doc.text(fLines, textX, textY);
        else if (cIdx === 5) {
          doc.setFont('helvetica', 'bold');
          doc.text(dLines, textX, textY);
        } else if (cIdx === 6) doc.text(resLines, textX, textY);
        else if (cIdx === 7) {
          // Records with clickable links if available
          if (item.linkUrl) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(linkBlue[0], linkBlue[1], linkBlue[2]);
            doc.text(recLines, textX, textY);
            doc.link(x, y, col.width, rowH, { url: item.linkUrl });
          } else {
            doc.text(recLines, textX, textY);
          }
        }

        x += col.width;
      });

      y += rowH;
    });

    return y;
  };

  // =========================================================================
  // DATA DEFINITIONS (From User's Attached Document)
  // =========================================================================

  // Table 1: Combined QMS and OHS Context (Internal Factors)
  const internalFactors: ContextItem[] = [
    {
      context: '1-Organizational governance',
      aspect: '- IMS compliant Organization structure & chain of command\n- Appropriate procedures for decision making',
      impact: 'Effective Overall organization performance; Minimized health and safety incidences',
      mitigation: 'Update whenever the organizational context has changed',
      followUpBy: 'Eng. Godfrey Ssambwa / Gertrude Nakiyaga',
      followUpDate: '31st January 2026',
      followUpResults: 'Organogram was updated to include OHS management',
      records: 'Corporate and OHS Organogram (PROME-DOC-ORG-01 / 02)',
      linkUrl: 'https://ims.promeconsult.com/uploads/company-documents/PROME_Company_Organisational_Chart.pdf'
    },
    {
      context: '2. Workers Aspects',
      aspect: 'Majorly professional workers. Team leaders certified by relevant professional bodies (ERB/UIPE).',
      impact: 'Provision of value services; Minimized health and safety incidences; Enhanced competitiveness',
      mitigation: 'Regular enhancement of workers’ competence (training needs assessments, H&S trainings); Regular appraisals; Mentoring; Worker representation',
      followUpBy: 'Gertrude Nakiyaga / Stephanie Canowira / Philippa Arinaitwe',
      followUpDate: '31st January 2026',
      followUpResults: 'Training conducted through webinars and specialized seminars',
      records: 'Training Plan & Records; Performance Appraisals',
      linkUrl: 'https://ims.promeconsult.com/training'
    },
    {
      context: '3. Organizational and operational Opportunities',
      aspect: 'Largely IT-savvy workers; Existing modern and secure ICT infrastructure including Management Information System (MIS)',
      impact: 'Agility in provision of services; Secure digital information archives',
      mitigation: 'Continuous update of software and hardware; Ensure validity of professional licenses (AutoCAD, Civil 3D, Prokon, GIS)',
      followUpBy: 'Eng. Godfrey Ssambwa / Brian Kisembo',
      followUpDate: '31st January 2026',
      followUpResults: 'All software licenses valid; Cloud backup active',
      records: 'Work uploaded to MIS & Cloud Archives',
      linkUrl: 'https://ims.promeconsult.com'
    },
    {
      context: '4. Creativity and Innovation',
      aspect: 'Dynamic company that continually adapts to the ever-changing business environment and engineering standards',
      impact: 'Increased competitiveness and market share; Motivated staff',
      mitigation: 'Embracing state-of-the-art technology; Continuous staff training; Enhanced marketing through digital platforms & website',
      followUpBy: 'Cyrus Kibuuka / Jacinta Nakanwagi',
      followUpDate: '31st January 2026',
      followUpResults: 'Company website and intranet portal fully updated',
      records: 'Training Records; Company Website & Portals',
      linkUrl: 'https://ims.promeconsult.com/continual-improvement'
    },
    {
      context: '5. Workers’ Relation among themselves',
      aspect: 'Delivery of multidisciplinary services through synergized cross-functional engineering teams',
      impact: 'Enhanced productivity and provision of value services',
      mitigation: 'Team building; Mentoring sessions to guide and listen to grievances; Suggestion box; Annual staff satisfaction surveys',
      followUpBy: 'Team Leaders & Division Heads',
      followUpDate: '31st January 2026',
      followUpResults: 'Workers opinion survey conducted and results reviewed by management',
      records: 'Mentoring Records; Staff Satisfaction Survey Report; JDs',
      linkUrl: 'https://ims.promeconsult.com/customer-satisfaction'
    }
  ];

  // Table 2: Combined QMS and OHS Context (External Factors)
  const externalFactors: ContextItem[] = [
    {
      context: '1. Regulatory authorities & legal compliance',
      aspect: 'The organization has capacity to be compliant with statutory legal and regulatory requirements; Operates in regulated environment',
      impact: 'Increased competitiveness; Value services; Enhanced reputation; Systematic delivery',
      mitigation: 'Regular Internal Audits and Management Review meetings; Maintain updated legal compliance register; Monitor national policies & laws',
      followUpBy: 'Gertrude Nakiyaga / Hope Nahamya / Philippa Arinaitwe',
      followUpDate: 'Continuous',
      followUpResults: 'Legal register updated; Management Review held Dec 2025',
      records: 'Legal Compliance Register (PROME-REG-LEG-01); Audit Reports',
      linkUrl: 'https://ims.promeconsult.com/hse'
    },
    {
      context: '2. Political Factors (Local and Regional)',
      aspect: 'Area of operation covers East Africa and the Horn of Africa; Partners with international and regional firms',
      impact: 'Can affect business growth, funding flows, and project security either positively or negatively',
      mitigation: 'Seek business in stable regions; Continual assessment of political climate; Anticipate policy changes',
      followUpBy: 'Cyrus Kibuuka',
      followUpDate: 'Continuous',
      followUpResults: 'EOIs and technical proposals submitted in Tanzania, Rwanda, and Uganda',
      records: 'Submitted Bidding Proposals & EOI Records',
      linkUrl: 'https://ims.promeconsult.com/divisions/pmbdd'
    },
    {
      context: '3. Economic factors within our influence',
      aspect: 'Economic challenges resulting from international conflicts, inflation, and public infrastructure funding cutbacks',
      impact: 'Curtailment of public business volume and client cash flows',
      mitigation: 'Strategic restructuring; Seeking opportunities from private developers; Regional outreach into expanding economies',
      followUpBy: 'Cyrus Kibuuka',
      followUpDate: 'Continuous',
      followUpResults: 'Private sector clients engaged (e.g., Kinyara Sugar); Regional ventures explored',
      records: 'Private Client Contracts & Commercial Proposals',
      linkUrl: 'https://ims.promeconsult.com/projects'
    },
    {
      context: '4. Partner / Supplier Performance',
      aspect: 'The company partners with competent subconsultants, geotechnical drillers, material labs, and technical specialists',
      impact: 'Provision of value services; Enhancement of brand and operational profitability',
      mitigation: 'Continuous evaluation of suppliers; Strict review of partner deliverables; Enforcing Approved Vendor List (AVL)',
      followUpBy: 'Cyrus Kibuuka / Gertrude Nakiyaga',
      followUpDate: 'Continuous',
      followUpResults: 'All active suppliers evaluated and verified compliant for 2025/2026',
      records: 'Supplier Evaluation Matrix; Approved Vendor List (PROME-AVL)',
      linkUrl: 'https://ims.promeconsult.com/suppliers'
    },
    {
      context: '5. Environmental & Climate Factors',
      aspect: 'Clients and funding agencies (World Bank, AfDB) require climate resilience integration into all design assignments',
      impact: 'Provision of sustainable, climate-adapted designs and infrastructure',
      mitigation: 'Capacity building in climate resilience; Applying sustainable drainage and green engineering principles',
      followUpBy: 'Cyrus Kibuuka',
      followUpDate: 'Continuous',
      followUpResults: 'Staff attended specialized climate resilience & sustainability webinars',
      records: 'Climate Training Records & Environmental Checklists',
      linkUrl: 'https://ims.promeconsult.com/hse'
    },
    {
      context: '6. Technology Factors',
      aspect: 'Consultancy operations in built environment design and supervision are highly technology-based',
      impact: 'State-of-the-art tools enhance delivery speed, accuracy, and profitability',
      mitigation: 'Embracing new engineering software, digital drone surveys, GPS RTK, and cloud MIS tools',
      followUpBy: 'Ronald Kibuuka / Eng. Patrick Ludigo / Cyrus Kibuuka',
      followUpDate: 'Continuous',
      followUpResults: 'State-of-the-art survey stations, mobile surveys, and automated MIS deployed',
      records: 'Equipment Register; Simulation Logs; Customer Surveys',
      linkUrl: 'https://ims.promeconsult.com/documents'
    }
  ];

  // Table 3: OHS-Specific Context (Internal Factors)
  const ohsInternalFactors: ContextItem[] = [
    {
      context: '1. Documented roles & safe work instructions',
      aspect: 'Workers’ awareness of their safety roles, responsibilities, and safe working instructions on site and in office',
      impact: 'Provision of safe services; Minimized injuries; High worker confidence',
      mitigation: 'Regular review of Job descriptions; Periodic update of safety instructions; Toolbox talks on sites',
      followUpBy: 'Gertrude Nakiyaga / Heads of Divisions',
      followUpDate: '31st January 2026',
      followUpResults: 'Safety guidance and emergency evacuation plans displayed for all workers and visitors',
      records: 'Job Descriptions; Safety Instructions (PROME-WI-HSE-01/02)',
      linkUrl: 'https://ims.promeconsult.com/hse'
    },
    {
      context: '2. Operational environment, health & safety',
      aspect: 'Substantial investment in safe workplace environments, PPE, and site inspection safety protocols',
      impact: 'Minimized accidents, zero lost time injuries to workers, and zero damage to property',
      mitigation: 'Regular Hazard Identification & Risk Assessment (HIRA) studies; Routine safety inspections',
      followUpBy: 'Philippa Arinaitwe',
      followUpDate: '31st January 2026',
      followUpResults: 'Workplace registration certificate valid; Annual HIRA studies updated',
      records: 'HIRA Studies (PROME-REG-HIRA-01); Workplace Registration Cert',
      linkUrl: 'https://ims.promeconsult.com/risks'
    }
  ];

  // Table 4: OHS-Specific Context (External Factors)
  const ohsExternalFactors: ContextItem[] = [
    {
      context: '1. General health conditions & outbreaks',
      aspect: 'Adherence to standard operating procedures of WHO and Uganda Ministry of Health during epidemic outbreaks',
      impact: 'Protection of workforce health; Mitigating productivity losses during lockdowns',
      mitigation: 'Robust IT infrastructure enabling seamless remote working via cloud MIS; Health protocols in office',
      followUpBy: 'Gertrude Nakiyaga',
      followUpDate: 'Continuous',
      followUpResults: 'Cloud MIS fully operational; Staff can work securely from home or field',
      records: 'OHS Health Memos; Remote Working Procedures',
      linkUrl: 'https://ims.promeconsult.com'
    },
    {
      context: '2. Socio-Cultural Diversity Factors',
      aspect: 'Operations across diverse ethnic and cultural communities across Uganda and East Africa',
      impact: 'Multicultural approach provides a strong competitive edge and smooth community relations on project sites',
      mitigation: 'Non-discriminatory employment policy; Culturally sensitive stakeholder engagement; Partnering with local specialists',
      followUpBy: 'Eng. Godfrey Ssambwa',
      followUpDate: 'Continuous',
      followUpResults: 'Multicultural project teams deployed; Social impact mitigation integrated into site works',
      records: 'Employment Contracts; Stakeholder Consultation Records',
      linkUrl: 'https://ims.promeconsult.com/organization-context'
    }
  ];

  // =========================================================================
  // RENDER SECTIONS
  // =========================================================================

  let activeInternal = internalFactors;
  let activeExternal = externalFactors;

  if (customItems && customItems.length > 0) {
    const mapCustom = (i: any): ContextItem => ({
      context: i.context || i.title || '',
      aspect: i.aspectFromContext || i.aspect || i.description || '',
      impact: i.impactToBusiness || i.impact || '',
      mitigation: i.mitigationAction || i.mitigation || '',
      followUpBy: i.followUpAndReviewBy || i.followUpBy || '',
      followUpDate: i.followUpDate || 'Continuous',
      followUpResults: i.followUpResults || 'Compliant',
      records: i.records || 'PROME-QSP-CSVM-01 (Rev 06)',
      linkUrl: 'https://ims.promeconsult.com/organization-context'
    });

    const parsedInternal = customItems.filter(i => i.type === 'Internal').map(mapCustom);
    const parsedExternal = customItems.filter(i => i.type === 'External').map(mapCustom);

    if (parsedInternal.length > 0) activeInternal = parsedInternal;
    if (parsedExternal.length > 0) activeExternal = parsedExternal;
  }

  // Page 1: Internal Factors
  renderTableSection('1- Combined QMS and OHS Context (Internal Factors)', activeInternal);
  drawPageFooter();

  // Page 2: External Factors
  doc.addPage();
  curPage++;
  renderTableSection('2- Combined QMS and OHS Context (External Factors)', activeExternal);
  drawPageFooter();

  // Page 3: OHS Specific (Internal & External) & Sign-Off
  doc.addPage();
  curPage++;
  let nextY = renderTableSection('3- OHS-Specific Context (Internal Factors)', ohsInternalFactors);

  // If space permits on Page 3, add Table 4, otherwise new page
  if (nextY + 45 > bottomLimit - 35) {
    drawPageFooter();
    doc.addPage();
    curPage++;
    nextY = renderTableSection('4- OHS-Specific Context (External Factors)', ohsExternalFactors);
  } else {
    // Add banner for Section 4 on same page
    doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.rect(marginX, nextY + 3, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('4- OHS-SPECIFIC CONTEXT (EXTERNAL FACTORS)', marginX + 4, nextY + 6.8);

    let tblY = nextY + 9.5;
    tblY = drawTableHeader(tblY);

    ohsExternalFactors.forEach((item, rIdx) => {
      const cLines = doc.splitTextToSize(item.context, cols[0].width - 3);
      const aLines = doc.splitTextToSize(item.aspect, cols[1].width - 3);
      const iLines = doc.splitTextToSize(item.impact, cols[2].width - 3);
      const mLines = doc.splitTextToSize(item.mitigation, cols[3].width - 3);
      const fLines = doc.splitTextToSize(item.followUpBy, cols[4].width - 3);
      const dLines = doc.splitTextToSize(item.followUpDate, cols[5].width - 3);
      const resLines = doc.splitTextToSize(item.followUpResults, cols[6].width - 3);
      const recLines = doc.splitTextToSize(item.records, cols[7].width - 3);

      const maxLines = Math.max(cLines.length, aLines.length, iLines.length, mLines.length, fLines.length, dLines.length, resLines.length, recLines.length, 2);
      const rowH = Math.max(maxLines * 3.4 + 4, 10);

      doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.25);
      doc.rect(marginX, tblY, contentWidth, rowH, 'FD');

      let x = marginX;
      cols.forEach((col, cIdx) => {
        if (cIdx > 0) doc.line(x, tblY, x, tblY + rowH);
        const textX = x + 1.5;
        const textY = tblY + 3.8;

        doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(slateText[0], slateText[1], slateText[2]);

        if (cIdx === 0) doc.text(cLines, textX, textY);
        else if (cIdx === 1) doc.text(aLines, textX, textY);
        else if (cIdx === 2) doc.text(iLines, textX, textY);
        else if (cIdx === 3) doc.text(mLines, textX, textY);
        else if (cIdx === 4) doc.text(fLines, textX, textY);
        else if (cIdx === 5) {
          doc.setFont('helvetica', 'bold');
          doc.text(dLines, textX, textY);
        } else if (cIdx === 6) doc.text(resLines, textX, textY);
        else if (cIdx === 7) {
          if (item.linkUrl) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(linkBlue[0], linkBlue[1], linkBlue[2]);
            doc.text(recLines, textX, textY);
            doc.link(x, tblY, col.width, rowH, { url: item.linkUrl });
          } else {
            doc.text(recLines, textX, textY);
          }
        }
        x += col.width;
      });

      tblY += rowH;
    });

    nextY = tblY;
  }

  // Formal Sign-Off Box (Exact Template from attached doc)
  const signY = nextY + 4;
  const signH = 26;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.35);
  doc.rect(marginX, signY, contentWidth, signH, 'FD');

  doc.line(marginX + contentWidth / 2, signY, marginX + contentWidth / 2, signY + signH);

  // Left: Prepared by
  const lX = marginX + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('PREPARED BY:', lX, signY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Stephanie Apio Canowira', lX, signY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Document Controller / Internal Quality & OHS Auditor', lX, signY + 14.8);
  doc.text('Date: 04th January 2025 | Revision: January 2026', lX, signY + 19);

  // Right: Approved by with signature
  const rX = marginX + contentWidth / 2 + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('APPROVED BY:', rX, signY + 5.5);

  try {
    doc.addImage(MD_SIGNATURE_BASE64, 'PNG', rX + 70, signY + 2.5, 30, 20);
  } catch (e) {
    // fallback
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Eng. Ronald Kibuuka', rX, signY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Managing Director / Top Management', rX, signY + 14.8);
  doc.text('Date: 04th January 2025 | Revision: January 2026', rX, signY + 19);

  drawPageFooter();

  return doc;
};
