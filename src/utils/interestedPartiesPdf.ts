import type { jsPDF } from 'jspdf';
import jsPDFModule from 'jspdf';
const jsPDFConstructor = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default || jsPDFModule;
import { PROME_HEADER_LOGO_BASE64, MD_SIGNATURE_BASE64 } from './promeDocumentImages';

export interface InterestedPartyItemDef {
  party: string;
  needs: string;
  ipToCompany: string;
  companyToIp: string;
  prioritization: 'P1' | 'P2' | 'P3';
  action: string;
  followUpBy: string;
  followUpDate: string;
  followUpResults: string;
  records: string;
  linkUrl?: string;
}

export const generateInterestedPartiesPDF = (): jsPDF => {
  const doc: jsPDF = new jsPDFConstructor({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 277mm

  // Corporate Colors
  const primaryRed = [153, 27, 27]; // #991b1b
  const darkNavy = [15, 23, 42]; // #0f172a
  const slateText = [51, 65, 85]; // #334155
  const mutedText = [100, 116, 139]; // #64748b
  const lightBg = [248, 250, 252]; // #f8fafc
  const headerGray = [241, 245, 249]; // #f1f5f9
  const borderGray = [203, 213, 225]; // #cbd5e1
  const linkBlue = [2, 132, 199]; // #0284c7

  // Column definitions: Total = 277mm
  const cols = [
    { key: 'party', title: 'INTERESTED PARTY (IP)', sub: '', width: 28 },
    { key: 'needs', title: 'NEEDS AND EXPECTATIONS', sub: '', width: 42 },
    { key: 'ipToCompany', title: 'IP TO CO.', sub: '(Ctrl / Infl)', width: 18 },
    { key: 'companyToIp', title: 'CO. TO IP', sub: '(Ctrl / Infl)', width: 18 },
    { key: 'prioritization', title: 'PRIORITY', sub: '(P1, P2, P3)', width: 15 },
    { key: 'action', title: 'ACTION TO MANAGE IP', sub: '', width: 43 },
    { key: 'followUpBy', title: 'FOLLOW UP &', sub: 'REVIEW BY', width: 26 },
    { key: 'followUpDate', title: 'FOLLOW UP', sub: 'DATE', width: 16 },
    { key: 'followUpResults', title: 'FOLLOW UP RESULTS', sub: '', width: 34 },
    { key: 'records', title: 'RECORDS / APP EVIDENCE', sub: '', width: 37 },
  ];

  let curPage = 1;

  // Draw Page Header Box
  const drawPageHeader = (subtitle: string) => {
    // Red top border
    doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.setLineWidth(1.2);
    doc.line(marginX, 6.5, marginX + contentWidth, 6.5);

    // Box outer border
    const boxY = 8;
    const boxH = 18;
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
      doc.addImage(PROME_HEADER_LOGO_BASE64, 'JPEG', marginX + 3, boxY + 2, 56, 14);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
      doc.text('PROME CONSULTANTS LTD', marginX + 4, boxY + 10);
    }

    // Center: Title & Document Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('INTERESTED PARTY MAPPING', (div1 + div2) / 2, boxY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.text('ISO QMS 9001:2015 and OHSMS 45001:2018 Clause 4.2', (div1 + div2) / 2, boxY + 10.2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Identification No: PROME-IMSR-CPSD-25 | Date of Issue: January 2024 | Revision: January 2026', (div1 + div2) / 2, boxY + 14.8, { align: 'center' });

    // Right: Approval Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('CONTROLLED QUALITY RECORD', div2 + 3, boxY + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Prepared by: Stephanie Apio Canowira', div2 + 3, boxY + 7.8);
    doc.text('Approved by: Eng. Ronald Kibuuka (MD)', div2 + 3, boxY + 11.2);
    doc.text('Retention: Permanent | Status: Approved', div2 + 3, boxY + 14.4);
    doc.text('Doc Ref: PROME-IMSR-CPSD-25 / PROME-QSP-CSVM-21', div2 + 3, boxY + 17.2);

    // Section Category Banner
    const bannerY = boxY + boxH + 1.5;
    doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.rect(marginX, bannerY, contentWidth, 5.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);
    doc.text(subtitle.toUpperCase(), marginX + 4, bannerY + 3.8);

    return bannerY + 6.6;
  };

  // Draw Page Footer without overlaps
  const drawPageFooter = () => {
    const footerY = pageHeight - 7;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 2, marginX + contentWidth, footerY - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('PROME Consultants Limited — Interested Parties Register (PROME-IMSR-CPSD-25 / PROME-QSP-CSVM-21)', marginX, footerY + 2);
    doc.text('Confidential — Controlled IMS Document. Uncontrolled when printed.', marginX + 175, footerY + 2, { align: 'center' });
    doc.text(`Page ${curPage} of 2`, marginX + contentWidth, footerY + 2, { align: 'right' });
  };

  // Draw Table Header
  const drawTableHeader = (startY: number) => {
    doc.setFillColor(headerGray[0], headerGray[1], headerGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.rect(marginX, startY, contentWidth, 7, 'FD');

    let x = marginX;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

    cols.forEach((col, idx) => {
      if (idx > 0) {
        doc.line(x, startY, x, startY + 7);
      }
      if (!col.sub) {
        doc.text(col.title, x + col.width / 2, startY + 4.5, { align: 'center' });
      } else {
        doc.text(col.title, x + col.width / 2, startY + 2.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.6);
        doc.text(col.sub, x + col.width / 2, startY + 5.7, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
      }
      x += col.width;
    });

    return startY + 7;
  };

  // =========================================================================
  // DATA DEFINITIONS (Updated from User's Attached Document to Year 2026)
  // =========================================================================

  // External Interested Parties (7 Items)
  const externalParties: InterestedPartyItemDef[] = [
    {
      party: '1. Clients (like MOWT, UNRA, KCCA, ERA, MOLHUD)',
      needs: 'Services provided in accordance with contract and to the highest professional standards',
      ipToCompany: 'Control',
      companyToIp: 'Influence',
      prioritization: 'P1',
      action: '• Maintain focus to client’s requirements\n• Perform services to Client’s specification\n• Frequently monitor customer satisfaction',
      followUpBy: 'Cyrus Kibuuka\nEng. Godfrey Ssambwa\nEng. P.J. Ludigo',
      followUpDate: '31/1/2026',
      followUpResults: 'Customers were generally satisfied as per survey',
      records: 'Customer Satisfaction Surveys',
      linkUrl: 'https://ims.promeconsult.com/feedback'
    },
    {
      party: '2. Government Regulators / Enforcers',
      needs: 'Compliance with statutory & legal requirements:\n• KCCA: Occupational permits, waste mgt\n• MoL / Min. Gender: OHAS & workplace cert.\n• URA: Taxation | NSSF: Social security\n• Min. of Internal Affairs: Work permits',
      ipToCompany: 'Control',
      companyToIp: 'Influence',
      prioritization: 'P1',
      action: 'Compliance with Statutory & regulatory requirements (e.g. Work permits, registration certificates)',
      followUpBy: 'Gertrude Nakiyaga /\nPhilippa Arinaitwe',
      followUpDate: '31/1/2026',
      followUpResults: 'Compliance acheived',
      records: 'Compliance Register',
      linkUrl: 'https://ims.promeconsult.com/compliance'
    },
    {
      party: '3. Suppliers',
      needs: '• Business from the company\n• Compliance with supply contracts',
      ipToCompany: 'Influence',
      companyToIp: 'Control',
      prioritization: 'P2',
      action: '• Regular supplier evaluations\n• Adhoc engagements with suppliers\n• Compliance with contracts',
      followUpBy: 'Hope Nahamya',
      followUpDate: '31/1/2026',
      followUpResults: 'Suppliers fulfilled requirements',
      records: 'Supplier Evaluation',
      linkUrl: 'https://ims.promeconsult.com/suppliers'
    },
    {
      party: '4. Business Partners (Other Consultants local & intl) and Contractors',
      needs: '• Compliance with JV / Sub-consultancy obligations\n• Provision of OHS-compliant premises & facilities\n• Sustained commercial partnership',
      ipToCompany: 'Control & Infl.',
      companyToIp: 'Control & Infl.',
      prioritization: 'P2',
      action: '• Professional management of JV / sub-consultancy Contracts\n• Review of contractual performance of parties',
      followUpBy: 'Eng. Patrick Ludigo /\nJacinta Nakanwagi',
      followUpDate: 'Continuous',
      followUpResults: 'Partnerships were successful',
      records: 'JV & Sub-consultancy agreements;\nRecords of review; Payment Records',
      linkUrl: 'https://ims.promeconsult.com/division/ped'
    },
    {
      party: '5. Community',
      needs: '• Timely project delivery with minimal disruption\n• Minimized environmental pollution & noise\n• Local employment & business opportunities\n• Minimized accident risk & good waste disposal',
      ipToCompany: 'Influence',
      companyToIp: 'Influence',
      prioritization: 'P2',
      action: '• Proactive community engagement\n• Environmental and social safeguard surveillance to ensure contract health, safety & security compliance',
      followUpBy: 'Eng. PJ Ludigo /\nJacinta Nakanwagi',
      followUpDate: '31/1/2026',
      followUpResults: 'Community engaged; stakeholder opinions obtained',
      records: 'Safeguard surveillance records',
      linkUrl: 'https://ims.promeconsult.com/hse'
    },
    {
      party: '6. Professional Bodies & Trade Associations (FIDIC, UIPE, UACE)',
      needs: '• Conformance to legal and technical standards\n• Continuous professional development (CPD)\n• Ethical representation and industry lobbying',
      ipToCompany: 'Influence',
      companyToIp: 'Influence',
      prioritization: 'P2',
      action: '• Active participation in institutional activities\n• Operations strictly in accordance with professional engineering codes & recommendations',
      followUpBy: 'Cyrus Kibuuka',
      followUpDate: '31/1/2026',
      followUpResults: 'Suitably subscribed and engaged with professional bodies',
      records: 'Membership certificates;\nEngagement Records',
      linkUrl: 'https://ims.promeconsult.com/documents'
    },
    {
      party: '7. Company Visitors including Customers',
      needs: 'Personal health and safety while within our office and project site premises',
      ipToCompany: 'Influence',
      companyToIp: 'Control',
      prioritization: 'P2',
      action: '• Make PPEs and safety SOPs available to visitors\n• Brief visitors on emergency safety protocols upon arrival',
      followUpBy: 'Gertrude Nakiyaga',
      followUpDate: '31/1/2026',
      followUpResults: 'Safety ensured',
      records: 'Visitor’s Register;\nInformation boards;\nVisitor’s Safety Policy',
      linkUrl: 'https://ims.promeconsult.com/hse'
    }
  ];

  // Internal Interested Parties (2 Items)
  const internalParties: InterestedPartyItemDef[] = [
    {
      party: '1. Top Management',
      needs: '• Business Profitability\n• Business Continuity & Resilience\n• Brand enhancement & market leadership',
      ipToCompany: 'Control',
      companyToIp: 'Influence',
      prioritization: 'P1',
      action: 'Operational performance to meet set quality, engineering, and OHS performance targets.',
      followUpBy: 'Eng. Godfrey Ssambwa',
      followUpDate: 'Continuous',
      followUpResults: 'Expectations for the year were generally acheived',
      records: 'Company Performance review reports.',
      linkUrl: 'https://ims.promeconsult.com/management-reviews'
    },
    {
      party: '2. Workers',
      needs: '• Appropriate remuneration & recognition\n• Participation in decisions concerning workers\n• OHS compliant work environment & PPE\n• Prevention & control of occupational hazards\n• Structured career development & training',
      ipToCompany: 'Influence',
      companyToIp: 'Control',
      prioritization: 'P1',
      action: '• Effective Leadership & open-door policy\n• Staff welfare, health surveillance & safety training',
      followUpBy: 'Gertrude Nakiyaga',
      followUpDate: 'Continuous',
      followUpResults: 'Workers needs and feedback obtained and considered',
      records: 'Workers Opinion Survey; Executive Orders; Memos; PPE Distribution records; Training Records; Payroll; Accident/Incident Register; MRMs',
      linkUrl: 'https://ims.promeconsult.com/trainings'
    }
  ];

  // Helper to render table items with text wrapping & row borders
  const renderTableRows = (startY: number, items: InterestedPartyItemDef[]) => {
    let y = startY;

    items.forEach((item, rIdx) => {
      const pLines = doc.splitTextToSize(item.party, cols[0].width - 3);
      const nLines = doc.splitTextToSize(item.needs, cols[1].width - 3);
      const ipLines = doc.splitTextToSize(item.ipToCompany, cols[2].width - 2);
      const coLines = doc.splitTextToSize(item.companyToIp, cols[3].width - 2);
      const actLines = doc.splitTextToSize(item.action, cols[5].width - 3);
      const fLines = doc.splitTextToSize(item.followUpBy, cols[6].width - 3);
      const dLines = doc.splitTextToSize(item.followUpDate, cols[7].width - 2);
      const resLines = doc.splitTextToSize(item.followUpResults, cols[8].width - 3);
      const recLines = doc.splitTextToSize(item.records, cols[9].width - 3);

      const maxLines = Math.max(
        pLines.length,
        nLines.length,
        ipLines.length,
        coLines.length,
        actLines.length,
        fLines.length,
        dLines.length,
        resLines.length,
        recLines.length,
        2
      );

      const rowH = Math.max(maxLines * 3.0 + 3.2, 8.5);

      // Alternate row backgrounds
      doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.25);
      doc.rect(marginX, y, contentWidth, rowH, 'FD');

      let x = marginX;

      cols.forEach((col, cIdx) => {
        if (cIdx > 0) {
          doc.line(x, y, x, y + rowH);
        }

        const textX = x + 1.5;
        const textY = y + 3.5;

        doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(slateText[0], slateText[1], slateText[2]);

        if (cIdx === 0) {
          doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
          doc.text(pLines, textX, textY);
        } else if (cIdx === 1) {
          doc.text(nLines, textX, textY);
        } else if (cIdx === 2) {
          doc.text(ipLines, x + col.width / 2, textY, { align: 'center' });
        } else if (cIdx === 3) {
          doc.text(coLines, x + col.width / 2, textY, { align: 'center' });
        } else if (cIdx === 4) {
          // Priority Badge
          const pVal = item.prioritization;
          const bgCol = pVal === 'P1' ? [254, 226, 226] : pVal === 'P2' ? [224, 242, 254] : [241, 245, 249];
          const txtCol = pVal === 'P1' ? [185, 28, 28] : pVal === 'P2' ? [3, 105, 161] : [71, 85, 105];
          doc.setFillColor(bgCol[0], bgCol[1], bgCol[2]);
          doc.roundedRect(x + 2.5, y + 2, col.width - 5, 4.8, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(txtCol[0], txtCol[1], txtCol[2]);
          doc.text(pVal, x + col.width / 2, y + 5.3, { align: 'center' });
        } else if (cIdx === 5) {
          doc.text(actLines, textX, textY);
        } else if (cIdx === 6) {
          doc.text(fLines, textX, textY);
        } else if (cIdx === 7) {
          doc.setFont('helvetica', 'bold');
          doc.text(dLines, x + col.width / 2, textY, { align: 'center' });
        } else if (cIdx === 8) {
          doc.text(resLines, textX, textY);
        } else if (cIdx === 9) {
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
  // PAGE 1: DEFINITIONS & EXTERNAL INTERESTED PARTIES
  // =========================================================================
  let y = drawPageHeader('EXTERNAL INTERESTED PARTIES (ISO 9001:2015 & ISO 45001:2018 CLAUSE 4.2)');

  // Introductory Stakeholder Definition & Ranking Banner
  const defBoxH = 6.4;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.25);
  doc.rect(marginX, y, contentWidth, defBoxH, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.6);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('“Interested parties” are those stakeholders who receive our Services, who may be impacted by them, or those parties who may otherwise have a significant interest in our company.', marginX + 3, y + 2.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('(Ranking: P1 = High value; P2 = Medium value; P3 = Low value.)', marginX + 3, y + 5.4);

  y += defBoxH + 1.2;

  // Table header
  y = drawTableHeader(y);

  // Render 7 External Rows
  y = renderTableRows(y, externalParties);

  drawPageFooter();

  // =========================================================================
  // PAGE 2: INTERNAL INTERESTED PARTIES & FORMAL SIGN-OFF BLOCK
  // =========================================================================
  doc.addPage();
  curPage++;

  y = drawPageHeader('INTERNAL INTERESTED PARTIES (ISO 9001:2015 & ISO 45001:2018 CLAUSE 4.2)');

  // Table header
  y = drawTableHeader(y);

  // Render 2 Internal Rows
  y = renderTableRows(y, internalParties);

  // Spacing before Formal Sign-Off Box
  y += 6;

  // Formal Sign-Off Box (Exact Template from attached doc updated to 2026)
  const signH = 32;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.35);
  doc.rect(marginX, y, contentWidth, signH, 'FD');

  // Center vertical divider
  doc.line(marginX + contentWidth / 2, y, marginX + contentWidth / 2, y + signH);

  // Left: Prepared by
  const lX = marginX + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('PREPARED BY:', lX, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Stephanie Apio Canowira', lX, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Document Controller / Internal Quality & OHS Auditor', lX, y + 16.5);
  doc.text('Date: 04th January 2026 | Revision: January 2026', lX, y + 21.5);
  doc.text('IMS Compliance Verification: Confirmed & Up-to-Date', lX, y + 26);

  // Right: Approved by with signature
  const rX = marginX + contentWidth / 2 + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('APPROVED BY:', rX, y + 6);

  try {
    doc.addImage(MD_SIGNATURE_BASE64, 'PNG', rX + 75, y + 4, 34, 22);
  } catch (e) {
    // fallback
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Eng. Ronald Kibuuka', rX, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Managing Director / Top Management', rX, y + 16.5);
  doc.text('Date: 04th January 2026 | Revision: January 2026', rX, y + 21.5);
  doc.text('Executive Authorization: Approved for Annual Surveillance Audit', rX, y + 26);

  // ISO Clause 4.2 Compliance Note
  const noteY = y + signH + 4;
  doc.setFillColor(headerGray[0], headerGray[1], headerGray[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.25);
  doc.rect(marginX, noteY, contentWidth, 8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('CLAUSE 4.2 COMPLIANCE SUMMARY & ANNUAL MONITORING REVIEW:', marginX + 3, noteY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('The identified needs and expectations of both external and internal interested parties are reviewed annually during Management Review Meetings (MRMs) and continuously updated when statutory requirements, contracts, or stakeholder dynamics evolve.', marginX + 3, noteY + 6.4);

  drawPageFooter();

  return doc;
};
