import type { jsPDF } from 'jspdf';
import jsPDFModule from 'jspdf';
const jsPDFConstructor = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default || jsPDFModule;
import { PROME_HEADER_LOGO_BASE64, MD_SIGNATURE_BASE64 } from './promeDocumentImages';

export interface SupplierItemDef {
  supplierNumber: string;
  name: string;
  category: string | null;
  contactName?: string | null;
  phone?: string | null;
  status: string;
  nextEvaluationDate?: string | null;
}

export const generateSupplierMasterListPDF = (suppliers: SupplierItemDef[]): jsPDF => {
  const doc: jsPDF = new jsPDFConstructor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  const bottomLimit = pageHeight - 20;

  // Colors
  const primaryRed = [153, 27, 27]; // #991b1b
  const darkNavy = [15, 23, 42]; // #0f172a
  const slateText = [51, 65, 85]; // #334155
  const mutedText = [100, 116, 139]; // #64748b
  const lightBg = [248, 250, 252]; // #f8fafc
  const headerGray = [241, 245, 249]; // #f1f5f9
  const borderGray = [203, 213, 225]; // #cbd5e1

  let curPage = 1;

  // Draw Page Header Box
  const drawPageHeader = () => {
    // Top primary bar
    doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.setLineWidth(1.2);
    doc.line(marginX, 8, marginX + contentWidth, 8);

    const boxY = 9.5;
    const boxH = 22;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, boxY, contentWidth, boxH, 'FD');

    // Left: Logo
    const div1 = marginX + 46;
    const div2 = marginX + contentWidth - 48;
    doc.line(div1, boxY, div1, boxY + boxH);
    doc.line(div2, boxY, div2, boxY + boxH);

    try {
      doc.addImage(PROME_HEADER_LOGO_BASE64, 'JPEG', marginX + 3, boxY + 2.5, 40, 17);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
      doc.text('PROME CONSULTANTS', marginX + 3, boxY + 11);
    }

    // Center: Title & Document Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('MASTER LIST OF APPROVED SUPPLIERS', (div1 + div2) / 2, boxY + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.text('ISO 9001:2015 Clause 8.4 — Control of Externally Provided Processes', (div1 + div2) / 2, boxY + 12.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Document Ref: PROME-IMSR-TO-31 | Original: Dec 2023 | Revision: Jan 2026', (div1 + div2) / 2, boxY + 17.5, { align: 'center' });

    // Right: Control Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('CONTROLLED DOCUMENT', div2 + 3, boxY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Issue: Version 2026', div2 + 3, boxY + 9);
    doc.text('Approved: Eng. R. Kibuuka', div2 + 3, boxY + 13);
    doc.text('Status: Active / Approved', div2 + 3, boxY + 17);
    doc.text('Dept: PMBDD / Procurement', div2 + 3, boxY + 20.5);

    return boxY + boxH + 4;
  };

  const drawPageFooter = () => {
    const footerY = pageHeight - 10;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 2, marginX + contentWidth, footerY - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('PROME Consultants Limited — Master List of Approved Suppliers (PROME-IMSR-TO-31)', marginX, footerY + 2);
    doc.text('Confidential — Controlled IMS Record', pageWidth / 2, footerY + 2, { align: 'center' });
    doc.text(`Page ${curPage}`, marginX + contentWidth, footerY + 2, { align: 'right' });
  };

  // Table Columns (Total = 182mm)
  const cols = [
    { key: 'no', title: 'REF / NO.', width: 22 },
    { key: 'name', title: 'SUPPLIER NAME', width: 50 },
    { key: 'address', title: 'CONTACT ADDRESS', width: 50 },
    { key: 'phone', title: 'TELEPHONE & FAX', width: 36 },
    { key: 'status', title: 'STATUS', width: 24 },
  ];

  const drawTableHeader = (startY: number) => {
    doc.setFillColor(headerGray[0], headerGray[1], headerGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.rect(marginX, startY, contentWidth, 7, 'FD');

    let x = marginX;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

    cols.forEach((col, idx) => {
      if (idx > 0) doc.line(x, startY, x, startY + 7);
      doc.text(col.title, x + col.width / 2, startY + 4.8, { align: 'center' });
      x += col.width;
    });

    return startY + 7;
  };

  // Group suppliers by category
  const categoriesMap: { [cat: string]: SupplierItemDef[] } = {};
  suppliers.forEach(s => {
    const cat = s.category || 'General Suppliers';
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(s);
  });

  // Start rendering
  let y = drawPageHeader();
  y = drawTableHeader(y);

  Object.keys(categoriesMap).sort().forEach(catKey => {
    const group = categoriesMap[catKey];

    // Category section header banner
    if (y + 14 > bottomLimit) {
      drawPageFooter();
      doc.addPage();
      curPage++;
      y = drawPageHeader();
      y = drawTableHeader(y);
    }

    doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.rect(marginX, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(catKey.toUpperCase(), marginX + 4, y + 3.8);
    y += 5.5;

    group.forEach((item, rIdx) => {
      const noLines = doc.splitTextToSize(item.supplierNumber, cols[0].width - 3);
      const nameLines = doc.splitTextToSize(item.name, cols[1].width - 3);
      const addrLines = doc.splitTextToSize(item.contactName || 'Kampala, Uganda', cols[2].width - 3);
      const phoneLines = doc.splitTextToSize(item.phone || '-', cols[3].width - 3);

      const maxLines = Math.max(noLines.length, nameLines.length, addrLines.length, phoneLines.length, 1);
      const rowH = Math.max(maxLines * 3.4 + 3.0, 7.5);

      if (y + rowH > bottomLimit) {
        drawPageFooter();
        doc.addPage();
        curPage++;
        y = drawPageHeader();
        y = drawTableHeader(y);

        // Re-print category mini-banner on new page
        doc.setFillColor(headerGray[0], headerGray[1], headerGray[2]);
        doc.rect(marginX, y, contentWidth, 4.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
        doc.text(`${catKey} (Continued)`, marginX + 4, y + 3.2);
        y += 4.5;
      }

      // Alternate background
      doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.25);
      doc.rect(marginX, y, contentWidth, rowH, 'FD');

      let x = marginX;

      // Col 0: No
      doc.line(x + cols[0].width, y, x + cols[0].width, y + rowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
      doc.text(noLines, x + 2, y + 3.8);
      x += cols[0].width;

      // Col 1: Name
      doc.line(x + cols[1].width, y, x + cols[1].width, y + rowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(nameLines, x + 2, y + 3.8);
      x += cols[1].width;

      // Col 2: Address
      doc.line(x + cols[2].width, y, x + cols[2].width, y + rowH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      doc.text(addrLines, x + 2, y + 3.8);
      x += cols[2].width;

      // Col 3: Phone
      doc.line(x + cols[3].width, y, x + cols[3].width, y + rowH);
      doc.text(phoneLines, x + 2, y + 3.8);
      x += cols[3].width;

      // Col 4: Status Badge
      const st = item.status || 'Approved';
      doc.setFillColor(220, 252, 231); // green-100
      doc.roundedRect(x + 2, y + 2, cols[4].width - 4, 4.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(22, 101, 52); // green-800
      doc.text(st, x + cols[4].width / 2, y + 5.1, { align: 'center' });

      y += rowH;
    });
  });

  // Check space for Sign-off block
  if (y + 35 > bottomLimit) {
    drawPageFooter();
    doc.addPage();
    curPage++;
    y = drawPageHeader();
  }

  y += 5;

  // Sign-off Box
  const signH = 26;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.35);
  doc.rect(marginX, y, contentWidth, signH, 'FD');

  const half = contentWidth / 2;
  doc.line(marginX + half, y, marginX + half, y + signH);

  // Left: Verified by
  const lX = marginX + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('COMPILED & VERIFIED BY:', lX, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Stephanie Apio Canowira', lX, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Internal Auditor / Procurement Document Controller', lX, y + 14.5);
  doc.text('Date: 04th January 2026 | Ref: PROME-IMSR-TO-31', lX, y + 18.5);
  doc.text('Status: All listed vendors evaluated & confirmed compliant', lX, y + 22.5);

  // Right: Approved by
  const rX = marginX + half + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('APPROVED BY:', rX, y + 5.5);

  try {
    doc.addImage(MD_SIGNATURE_BASE64, 'PNG', rX + half - 42, y + 2.5, 30, 18);
  } catch (e) {
    // fallback
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('Eng. Ronald Kibuuka', rX, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Managing Director / Top Management', rX, y + 14.5);
  doc.text('Date: 04th January 2026 | Revision Date: January 2026', rX, y + 18.5);
  doc.text('Authorization: Approved for 2026 IMS Operations', rX, y + 22.5);

  drawPageFooter();

  return doc;
};
