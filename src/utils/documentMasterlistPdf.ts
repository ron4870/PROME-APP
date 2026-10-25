import jsPDF from 'jspdf';
import { type MasterDocumentItem, PROME_MASTERLIST_HEADER, PROME_MASTERLIST_CATEGORIES } from '../data/promeDocumentMasterlist';

interface MasterlistPdfOptions {
  documents: MasterDocumentItem[];
  headerData?: typeof PROME_MASTERLIST_HEADER;
  title?: string;
}

export const generateDocumentMasterlistPDF = (options: MasterlistPdfOptions): jsPDF => {
  const {
    documents,
    headerData = PROME_MASTERLIST_HEADER,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = 297;
  const marginX = 10;
  const tableWidth = 190;
  const pageBottomLimit = 280;

  // Column definitions: sum = 190mm
  const columns = [
    { key: 'document', title: 'DOCUMENT', width: 64, align: 'left' as const },
    { key: 'idNumber', title: 'I.D. Number', width: 44, align: 'left' as const },
    { key: 'revision', title: 'Revision No.', width: 18, align: 'center' as const },
    { key: 'date', title: 'Date of Revision', width: 20, align: 'center' as const },
    { key: 'department', title: 'Department', width: 26, align: 'left' as const },
    { key: 'retention', title: 'Retention Period', width: 18, align: 'center' as const },
  ];

  let yPos = 10;

  // Helper to draw Page 1 ISO Control of Records Header Box
  const drawIsoHeaderBox = () => {
    const boxX = marginX;
    const boxY = yPos;
    const boxW = tableWidth;
    const boxH = 32;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);

    // Outer rectangle
    doc.rect(boxX, boxY, boxW, boxH);

    // Row 1 (Title): height 11mm
    doc.line(boxX, boxY + 11, boxX + boxW, boxY + 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text('PROME CONSULTANTS LIMITED', boxX + boxW / 2, boxY + 4.8, { align: 'center' });
    doc.setFontSize(9.5);
    doc.text('DOCUMENT MASTERLIST', boxX + boxW / 2, boxY + 9.3, { align: 'center' });

    // Row 2 (ISO Clause & Dates): height 12mm (from y+11 to y+23)
    doc.line(boxX, boxY + 23, boxX + boxW, boxY + 23);
    const col2X1 = boxX + 75;
    const col2X2 = boxX + 145;
    doc.line(col2X1, boxY + 11, col2X1, boxY + 23);
    doc.line(col2X2, boxY + 11, col2X2, boxY + 23);

    // Col 2.1: ID and ISO Clause
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`I. D. No. ${cleanDocNumber(headerData.idNumber)}`, boxX + 2.5, boxY + 15.2);
    doc.setFont('helvetica', 'normal');
    doc.text(headerData.isoClause, boxX + 2.5, boxY + 20.2);

    // Col 2.2: Issue & Revision Dates
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE OF ISSUE: ${headerData.dateOfIssue}`, col2X1 + 2.5, boxY + 15.2);
    doc.text(`DATE OF REVISION: ${headerData.dateOfRevision}`, col2X1 + 2.5, boxY + 20.2);

    // Col 2.3: Version No.
    doc.setFont('helvetica', 'bold');
    doc.text(headerData.versionNo, col2X2 + 2.5, boxY + 17.5);

    // Row 3 (Signatures): height 9mm (from y+23 to y+32)
    const col3X1 = boxX + 63;
    const col3X2 = boxX + 128;
    doc.line(col3X1, boxY + 23, col3X1, boxY + 32);
    doc.line(col3X2, boxY + 23, col3X2, boxY + 32);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`WRITTEN BY: ${headerData.writtenBy}`, boxX + 2.5, boxY + 28.5);
    doc.text(`REVIEWED BY: ${headerData.reviewedBy}`, col3X1 + 2.5, boxY + 28.5);
    doc.text(`APPROVED BY: ${headerData.approvedBy}`, col3X2 + 2.5, boxY + 28.5);

    yPos = boxY + boxH;
  };

  // Helper to draw Table Header row
  const drawTableHeader = () => {
    const headerHeight = 7;
    doc.setFillColor(235, 238, 242);
    doc.rect(marginX, yPos, tableWidth, headerHeight, 'FD');

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);

    let curX = marginX;
    columns.forEach((col) => {
      // vertical divider
      doc.line(curX, yPos, curX, yPos + headerHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(17, 24, 39);

      if (col.align === 'center') {
        doc.text(col.title, curX + col.width / 2, yPos + 4.8, { align: 'center' });
      } else {
        doc.text(col.title, curX + 2, yPos + 4.8);
      }

      curX += col.width;
    });
    // final right line
    doc.line(marginX + tableWidth, yPos, marginX + tableWidth, yPos + headerHeight);

    yPos += headerHeight;
  };

  // Helper to draw Category Header row (e.g. "1. Quality Manual")
  const drawCategoryHeader = (categoryLabel: string) => {
    const catHeight = 6;
    doc.setFillColor(243, 244, 246);
    doc.rect(marginX, yPos, tableWidth, catHeight, 'FD');

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.rect(marginX, yPos, tableWidth, catHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(categoryLabel, marginX + 3, yPos + 4.2);

    yPos += catHeight;
  };

  // Helper to clean internal disambiguation suffixes (e.g. PROME-QSR-AD-08-CA -> PROME-QSR-AD-08)
  function cleanDocNumber(num: string): string {
    if (!num) return '';
    return num.replace(/-(CA|TL|PA|SP|TR|TN|EO|TC)$/, '');
  }

  // Draw Page 1 Top Header Box
  drawIsoHeaderBox();
  // Draw initial Table Header
  drawTableHeader();

  // Group documents by Category in order
  const categoryOrderList = PROME_MASTERLIST_CATEGORIES;

  categoryOrderList.forEach((cat) => {
    const catDocs = documents.filter((d) => d.category === cat.name);
    if (catDocs.length === 0) return;

    // Check if we have room for category header + at least 1 row (approx 15mm)
    if (yPos + 15 > pageBottomLimit) {
      doc.addPage();
      yPos = 12;
      drawTableHeader();
    }

    drawCategoryHeader(cat.label);

    catDocs.forEach((item) => {
      // Prepare text values
      const fullTitle = item.prefix ? `${item.prefix} ${item.title}` : item.title;
      const docNumClean = cleanDocNumber(item.documentNumber);
      const rev = item.revision.startsWith('Ver-') ? item.revision : item.revision.startsWith('Ver') ? `Ver-${item.revision.replace('Ver', '')}` : `Ver-${item.revision}`;
      const revDate = item.dateOfRevision || (item.issueDate ? item.issueDate.substring(0, 7) : '-');
      const dept = item.department || '-';
      const ret = item.retentionPeriod || '-';

      // Split text to calculate row height
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const titleLines = doc.splitTextToSize(fullTitle, columns[0].width - 3.5);
      const numLines = doc.splitTextToSize(docNumClean, columns[1].width - 3);
      const deptLines = doc.splitTextToSize(dept, columns[4].width - 3);

      const maxLines = Math.max(titleLines.length, numLines.length, deptLines.length, 1);
      const lineHeight = 3.0;
      const rowHeight = Math.max(5.2, maxLines * lineHeight + 2.2);

      // Page break check
      if (yPos + rowHeight > pageBottomLimit) {
        doc.addPage();
        yPos = 12;
        drawTableHeader();
      }

      const rowY = yPos;

      // Draw row outer rectangle
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(marginX, rowY, tableWidth, rowHeight);

      // Draw vertical column dividers
      let curX = marginX;
      columns.forEach((col) => {
        doc.line(curX, rowY, curX, rowY + rowHeight);
        curX += col.width;
      });
      doc.line(marginX + tableWidth, rowY, marginX + tableWidth, rowY + rowHeight);

      // Render cell text
      doc.setTextColor(0, 0, 0);

      // Col 1: Title
      doc.setFont('helvetica', 'normal');
      doc.text(titleLines, marginX + 2, rowY + 3.6);

      // Col 2: ID Number
      const col2X = marginX + columns[0].width;
      doc.setFont('helvetica', 'bold');
      doc.text(numLines, col2X + 2, rowY + 3.6);

      // Col 3: Revision
      const col3X = col2X + columns[1].width;
      doc.setFont('helvetica', 'normal');
      doc.text(rev, col3X + columns[2].width / 2, rowY + 3.6, { align: 'center' });

      // Col 4: Date
      const col4X = col3X + columns[2].width;
      doc.text(revDate, col4X + columns[3].width / 2, rowY + 3.6, { align: 'center' });

      // Col 5: Department
      const col5X = col4X + columns[3].width;
      doc.text(deptLines, col5X + 2, rowY + 3.6);

      // Col 6: Retention Period
      const col6X = col5X + columns[4].width;
      doc.text(ret, col6X + columns[5].width / 2, rowY + 3.6, { align: 'center' });

      yPos += rowHeight;
    });
  });

  // Handle any user-created documents that belong to 'Other' or uncategorized
  const otherDocs = documents.filter(
    (d) => !categoryOrderList.some((c) => c.name === d.category)
  );

  if (otherDocs.length > 0) {
    if (yPos + 15 > pageBottomLimit) {
      doc.addPage();
      yPos = 12;
      drawTableHeader();
    }

    drawCategoryHeader('6. Additional Registered Documents');

    otherDocs.forEach((item) => {
      const fullTitle = item.title;
      const docNumClean = cleanDocNumber(item.documentNumber);
      const rev = item.revision.startsWith('Ver-') ? item.revision : `Ver-${item.revision}`;
      const revDate = item.dateOfRevision || (item.issueDate ? item.issueDate.substring(0, 7) : '-');
      const dept = item.department || '-';
      const ret = item.retentionPeriod || '-';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const titleLines = doc.splitTextToSize(fullTitle, columns[0].width - 3.5);
      const numLines = doc.splitTextToSize(docNumClean, columns[1].width - 3);
      const deptLines = doc.splitTextToSize(dept, columns[4].width - 3);

      const maxLines = Math.max(titleLines.length, numLines.length, deptLines.length, 1);
      const lineHeight = 3.0;
      const rowHeight = Math.max(5.2, maxLines * lineHeight + 2.2);

      if (yPos + rowHeight > pageBottomLimit) {
        doc.addPage();
        yPos = 12;
        drawTableHeader();
      }

      const rowY = yPos;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(marginX, rowY, tableWidth, rowHeight);

      let curX = marginX;
      columns.forEach((col) => {
        doc.line(curX, rowY, curX, rowY + rowHeight);
        curX += col.width;
      });
      doc.line(marginX + tableWidth, rowY, marginX + tableWidth, rowY + rowHeight);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(titleLines, marginX + 2, rowY + 3.6);

      const col2X = marginX + columns[0].width;
      doc.setFont('helvetica', 'bold');
      doc.text(numLines, col2X + 2, rowY + 3.6);

      const col3X = col2X + columns[1].width;
      doc.setFont('helvetica', 'normal');
      doc.text(rev, col3X + columns[2].width / 2, rowY + 3.6, { align: 'center' });

      const col4X = col3X + columns[2].width;
      doc.text(revDate, col4X + columns[3].width / 2, rowY + 3.6, { align: 'center' });

      const col5X = col4X + columns[3].width;
      doc.text(deptLines, col5X + 2, rowY + 3.6);

      const col6X = col5X + columns[4].width;
      doc.text(ret, col6X + columns[5].width / 2, rowY + 3.6, { align: 'center' });

      yPos += rowHeight;
    });
  }

  // Draw Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 11, marginX + tableWidth, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'PROME Consultants Ltd.  |  Integrated Management System (ISO 9001:2015 / Clause 7.5 Control of Records)',
      marginX,
      pageHeight - 7.5
    );
    doc.text(`Page ${p} of ${totalPages}`, marginX + tableWidth, pageHeight - 7.5, { align: 'right' });
  }

  return doc;
};

export const downloadDocumentMasterlistPDF = (documents: MasterDocumentItem[]) => {
  const doc = generateDocumentMasterlistPDF({ documents });
  const filename = `PROME-Document-Masterlist-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};

export const printDocumentMasterlistPDF = (documents: MasterDocumentItem[]) => {
  const doc = generateDocumentMasterlistPDF({ documents });
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
};
