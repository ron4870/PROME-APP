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

  // Optimized Column definitions: sum = 190mm
  const columns = [
    { key: 'document', title: 'DOCUMENT', width: 60, align: 'left' as const },
    { key: 'idNumber', title: 'I.D. Number', width: 44, align: 'left' as const },
    { key: 'revision', title: 'Revision No.', width: 16, align: 'center' as const },
    { key: 'date', title: 'Date of Revision', width: 22, align: 'center' as const },
    { key: 'department', title: 'Department', width: 24, align: 'left' as const },
    { key: 'retention', title: 'Retention Period', width: 24, align: 'center' as const },
  ];

  let yPos = 10;

  // Helper to clean internal disambiguation suffixes (e.g. PROME-QSR-AD-08-CA -> PROME-QSR-AD-08)
  function cleanDocNumber(num: string): string {
    if (!num) return '';
    return num.replace(/-(CA|TL|PA|SP|TR|TN|EO|TC)$/, '');
  }

  // Helper to draw Page 1 ISO Control of Records Header Box
  const drawIsoHeaderBox = () => {
    const boxX = marginX;
    const boxY = yPos;
    const boxW = tableWidth;
    const boxH = 34;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);

    // Outer rectangle
    doc.rect(boxX, boxY, boxW, boxH);

    // Row 1 (Title): height 11.5mm
    doc.line(boxX, boxY + 11.5, boxX + boxW, boxY + 11.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text('PROME CONSULTANTS LIMITED', boxX + boxW / 2, boxY + 5.0, { align: 'center' });
    doc.setFontSize(9.5);
    doc.text('DOCUMENT MASTERLIST', boxX + boxW / 2, boxY + 9.8, { align: 'center' });

    // Row 2 (ISO Clause & Dates): height 13.5mm (from y+11.5 to y+25.0)
    doc.line(boxX, boxY + 25.0, boxX + boxW, boxY + 25.0);
    const col2X1 = boxX + 88;
    const col2X2 = boxX + 152;
    doc.line(col2X1, boxY + 11.5, col2X1, boxY + 25.0);
    doc.line(col2X2, boxY + 11.5, col2X2, boxY + 25.0);

    // Col 2.1: ID and ISO Clause (width 88mm)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`I. D. No. ${cleanDocNumber(headerData.idNumber)}`, boxX + 3.0, boxY + 15.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('ISO CLAUSE: 4.2.4 Control of Records', boxX + 3.0, boxY + 19.3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('(ISO 9001:2015 Clause 7.5 Control of Documented Information)', boxX + 3.0, boxY + 23.0);

    // Col 2.2: Issue & Revision Dates (width 64mm)
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE OF ISSUE:', col2X1 + 3.0, boxY + 16.5);
    doc.setFont('helvetica', 'normal');
    doc.text(headerData.dateOfIssue, col2X1 + 27.0, boxY + 16.5);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE OF REVISION:', col2X1 + 3.0, boxY + 21.5);
    doc.setFont('helvetica', 'normal');
    doc.text(headerData.dateOfRevision, col2X1 + 32.0, boxY + 21.5);

    // Col 2.3: Version No. (width 38mm)
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.text('STATUS / VERSION:', col2X2 + 3.0, boxY + 16.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.text(headerData.versionNo, col2X2 + 3.0, boxY + 21.5);

    // Row 3 (Signatures): height 9mm (from y+25.0 to y+34.0)
    const col3X1 = boxX + 63.33;
    const col3X2 = boxX + 126.66;
    doc.line(col3X1, boxY + 25.0, col3X1, boxY + 34.0);
    doc.line(col3X2, boxY + 25.0, col3X2, boxY + 34.0);

    doc.setFontSize(7.0);
    doc.setFont('helvetica', 'bold');
    doc.text('WRITTEN BY:', boxX + 3.0, boxY + 30.5);
    doc.setFont('helvetica', 'normal');
    doc.text(headerData.writtenBy, boxX + 23.5, boxY + 30.5);

    doc.setFont('helvetica', 'bold');
    doc.text('REVIEWED BY:', col3X1 + 3.0, boxY + 30.5);
    doc.setFont('helvetica', 'normal');
    doc.text(headerData.reviewedBy, col3X1 + 24.5, boxY + 30.5);

    doc.setFont('helvetica', 'bold');
    doc.text('APPROVED BY:', col3X2 + 3.0, boxY + 30.5);
    doc.setFont('helvetica', 'normal');
    doc.text(headerData.approvedBy, col3X2 + 25.0, boxY + 30.5);

    yPos = boxY + boxH + 2.0;
  };

  // Helper to draw Table Header row
  const drawTableHeader = () => {
    const headerHeight = 8.5;
    doc.setFillColor(238, 242, 246);
    doc.rect(marginX, yPos, tableWidth, headerHeight, 'FD');

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);

    let curX = marginX;
    columns.forEach((col) => {
      doc.line(curX, yPos, curX, yPos + headerHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(17, 24, 39);

      if (col.key === 'document') {
        doc.text(col.title, curX + 2.5, yPos + 5.2);
      } else if (col.key === 'idNumber') {
        doc.text(col.title, curX + 2.5, yPos + 5.2);
      } else if (col.key === 'revision') {
        doc.text('Revision', curX + col.width / 2, yPos + 3.6, { align: 'center' });
        doc.text('No.', curX + col.width / 2, yPos + 6.8, { align: 'center' });
      } else if (col.key === 'date') {
        doc.text('Date of', curX + col.width / 2, yPos + 3.6, { align: 'center' });
        doc.text('Revision', curX + col.width / 2, yPos + 6.8, { align: 'center' });
      } else if (col.key === 'department') {
        doc.text(col.title, curX + 2.5, yPos + 5.2);
      } else if (col.key === 'retention') {
        doc.text('Retention', curX + col.width / 2, yPos + 3.6, { align: 'center' });
        doc.text('Period', curX + col.width / 2, yPos + 6.8, { align: 'center' });
      }

      curX += col.width;
    });
    doc.line(marginX + tableWidth, yPos, marginX + tableWidth, yPos + headerHeight);

    yPos += headerHeight;
  };

  // Helper to draw Category Header row (e.g. "1. Quality Manual")
  const drawCategoryHeader = (categoryLabel: string) => {
    const catHeight = 6.0;
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, yPos, tableWidth, catHeight, 'FD');

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.rect(marginX, yPos, tableWidth, catHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(15, 23, 42);
    doc.text(categoryLabel, marginX + 3.0, yPos + 4.2);

    yPos += catHeight;
  };

  // Helper to draw an item row
  const drawItemRow = (item: MasterDocumentItem) => {
    const fullTitle = item.prefix ? `${item.prefix} ${item.title}` : item.title;
    const formattedDocNum = cleanDocNumber(item.documentNumber).replace(/\s*\/\s*/g, ' / ');
    const rev = item.revision.startsWith('Ver-') ? item.revision : item.revision.startsWith('Ver') ? `Ver-${item.revision.replace('Ver', '')}` : `Ver-${item.revision}`;
    const revDate = item.dateOfRevision || (item.issueDate ? item.issueDate.substring(0, 7) : '-');
    const dept = item.department || '-';
    const ret = item.retentionPeriod || '-';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);

    const titleLines = doc.splitTextToSize(fullTitle, columns[0].width - 4.5);
    const numLines = doc.splitTextToSize(formattedDocNum, columns[1].width - 4.0);
    const deptLines = doc.splitTextToSize(dept, columns[4].width - 4.0);
    const retLines = doc.splitTextToSize(ret, columns[5].width - 4.0);

    const maxLines = Math.max(titleLines.length, numLines.length, deptLines.length, retLines.length, 1);
    const lineHeight = 3.1;
    const rowHeight = Math.max(6.0, maxLines * lineHeight + 2.8);

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

    // Col 1: Title
    doc.setFont('helvetica', 'normal');
    const titleStartY = rowY + (rowHeight - (titleLines.length * lineHeight)) / 2 + 2.3;
    titleLines.forEach((line: string, idx: number) => {
      doc.text(line, marginX + 2.5, titleStartY + idx * lineHeight);
    });

    // Col 2: ID Number
    const col2X = marginX + columns[0].width;
    doc.setFont('helvetica', 'bold');
    const numStartY = rowY + (rowHeight - (numLines.length * lineHeight)) / 2 + 2.3;
    numLines.forEach((line: string, idx: number) => {
      doc.text(line, col2X + 2.5, numStartY + idx * lineHeight);
    });

    // Col 3: Revision
    const col3X = col2X + columns[1].width;
    doc.setFont('helvetica', 'normal');
    doc.text(rev, col3X + columns[2].width / 2, rowY + rowHeight / 2 + 1.1, { align: 'center' });

    // Col 4: Date
    const col4X = col3X + columns[2].width;
    doc.text(revDate, col4X + columns[3].width / 2, rowY + rowHeight / 2 + 1.1, { align: 'center' });

    // Col 5: Department
    const col5X = col4X + columns[3].width;
    const deptStartY = rowY + (rowHeight - (deptLines.length * lineHeight)) / 2 + 2.3;
    deptLines.forEach((line: string, idx: number) => {
      doc.text(line, col5X + 2.5, deptStartY + idx * lineHeight);
    });

    // Col 6: Retention Period
    const col6X = col5X + columns[4].width;
    const retStartY = rowY + (rowHeight - (retLines.length * lineHeight)) / 2 + 2.3;
    retLines.forEach((line: string, idx: number) => {
      doc.text(line, col6X + columns[5].width / 2, retStartY + idx * lineHeight, { align: 'center' });
    });

    yPos += rowHeight;
  };

  // Draw Page 1 Top Header Box
  drawIsoHeaderBox();
  // Draw initial Table Header
  drawTableHeader();

  // Group documents by Category in order
  const categoryOrderList = PROME_MASTERLIST_CATEGORIES;

  categoryOrderList.forEach((cat) => {
    const catDocs = documents.filter((d) => d.category === cat.name);
    if (catDocs.length === 0) return;

    if (yPos + 15 > pageBottomLimit) {
      doc.addPage();
      yPos = 12;
      drawTableHeader();
    }

    drawCategoryHeader(cat.label);
    catDocs.forEach(drawItemRow);
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
    otherDocs.forEach(drawItemRow);
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
