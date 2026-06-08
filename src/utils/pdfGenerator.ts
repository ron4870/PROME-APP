import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import DocumentSection from '../extensions/DocumentSection';

const getExtensions = () => [
  StarterKit,
  Underline,
  DocumentSection,
  Link.configure({ openOnClick: false }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table.configure({ resizable: true }),
  TableRow, TableHeader, TableCell,
];

export const generateDynamicPDF = async (selectedNodes: any[], docType: string, title: string) => {
  // 1. Create an off-screen container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = 'Inter, sans-serif';
  container.style.color = '#000000';
  document.body.appendChild(container);

  // 2. Add Cover Page if applicable
  if (docType === 'Manual' || docType === 'Procedure') {
    const cover = document.createElement('div');
    cover.style.height = '1123px'; // Full A4 page height
    cover.style.display = 'flex';
    cover.style.flexDirection = 'column';
    cover.style.justifyContent = 'center';
    cover.style.alignItems = 'center';
    cover.style.textAlign = 'center';
    cover.style.padding = '4rem';
    cover.innerHTML = `
      <img src="/prome.png" alt="PROME" style="width: 250px; margin-bottom: 3rem;" />
      <h1 style="font-size: 3rem; color: #bb0a0a; margin-bottom: 1rem; line-height: 1.2;">${title}</h1>
      <h2 style="font-size: 1.5rem; color: #475569; margin-bottom: 4rem; text-transform: uppercase; letter-spacing: 2px;">${docType} Document</h2>
      <div style="border-top: 2px solid #e2e8f0; width: 100%; max-width: 400px; margin: 0 auto 2rem auto;"></div>
      <p style="font-size: 1.1rem; color: #64748b; margin-bottom: 0.5rem;"><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
      <p style="font-size: 1.1rem; color: #64748b;"><strong>PROME Consultants Ltd.</strong></p>
    `;
    container.appendChild(cover);
  }

  // 3. Generate HTML for the selected sections
  // We wrap them in a pseudo-document to use generateHTML
  const contentWrapper = {
    type: 'doc',
    content: selectedNodes
  };

  const sectionsHtml = generateHTML(contentWrapper, getExtensions());

  const contentDiv = document.createElement('div');
  contentDiv.className = 'prose';
  contentDiv.style.padding = '4rem'; // Margin for the text
  // Inject some CSS inline for the sections since they won't have the editor CSS
  contentDiv.innerHTML = `
    <style>
      .prose h1 { font-size: 2rem; color: #0f172a; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
      .prose h2 { font-size: 1.5rem; color: #1e293b; margin-top: 1.5rem; margin-bottom: 0.75rem; }
      .prose p { margin-bottom: 1rem; line-height: 1.6; color: #334155; }
      .prose table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
      .prose th, .prose td { border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left; }
      .prose th { background-color: #f8fafc; font-weight: 600; color: #0f172a; }
      .prose ul, .prose ol { margin-left: 1.5rem; margin-bottom: 1rem; }
      .prose li { margin-bottom: 0.25rem; }
      
      /* Style our custom DocumentSections for print */
      div[data-type="document-section"] {
        margin-top: 2rem;
        margin-bottom: 2rem;
      }
    </style>
    ${sectionsHtml}
  `;
  container.appendChild(contentDiv);

  // Clean up UI-specific elements that might have sneaked into the HTML from the NodeView
  // generateHTML strictly uses `renderHTML`, which outputs pure HTML without the React NodeView.
  // This means the "Remove" button and the UI header are NOT present in the generated HTML!
  // BUT we do want the Section Title to be printed!
  
  // We need to inject the section titles into the HTML.
  const sectionDivs = contentDiv.querySelectorAll('div[data-type="document-section"]');
  sectionDivs.forEach((div: any, index: number) => {
    const nodeData = selectedNodes[index];
    if (nodeData && nodeData.attrs) {
      const header = document.createElement('h2');
      header.innerText = nodeData.attrs.sectionTitle;
      
      if (nodeData.attrs.sectionType === 'Procedure Step') {
        let details: any = {};
        try { details = JSON.parse(nodeData.attrs.sectionDetails); } catch(e){}
        const sub = document.createElement('div');
        sub.style.fontSize = '0.9rem';
        sub.style.color = '#64748b';
        sub.style.marginBottom = '1rem';
        sub.style.fontWeight = '600';
        sub.innerText = `Responsible Role: ${details.roleResponsible || 'N/A'}`;
        div.insertBefore(sub, div.firstChild);
      }
      
      div.insertBefore(header, div.firstChild);
    }
  });

  // 4. Render to Canvas
  try {
    const canvas = await html2canvas(container, { 
      scale: 2, // High resolution
      useCORS: true,
      logging: false
    });
    
    // 5. Build PDF with Headers & Footers
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate how many pages this canvas takes
    const canvasWidthInMm = pdfWidth;
    const canvasHeightInMm = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = canvasHeightInMm;
    let position = 0;
    let pageNumber = 1;
    
    // A4 dimensions in mm
    const pageHeight = 297;

    // Header & Footer Configuration
    const drawHeaderFooter = (pageNum: number) => {
      // Header
      pdf.setFillColor(241, 245, 249); // #f1f5f9
      pdf.rect(0, 0, pdfWidth, 15, 'F');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(title, 15, 10);
      pdf.text(docType, pdfWidth - 15, 10, { align: 'right' });
      
      // Footer
      pdf.setFillColor(241, 245, 249);
      pdf.rect(0, pdfHeight - 15, pdfWidth, 15, 'F');
      pdf.text('PROME Consultants Ltd.', 15, pdfHeight - 6);
      pdf.text(`Page ${pageNum}`, pdfWidth - 15, pdfHeight - 6, { align: 'right' });
    };

    // The first slice
    pdf.addImage(imgData, 'PNG', 0, position, canvasWidthInMm, canvasHeightInMm);
    drawHeaderFooter(pageNumber);
    heightLeft -= pageHeight;
    
    // Subsequent slices
    while (heightLeft > 0) {
      position -= pageHeight; // shift image up
      pdf.addPage();
      pageNumber++;
      pdf.addImage(imgData, 'PNG', 0, position, canvasWidthInMm, canvasHeightInMm);
      // To hide the overlap at the top of the new page, we can draw a white rectangle over the top margin
      // Actually, drawing the header covers the top 15mm.
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, 15, 'F'); // white out top margin
      pdf.rect(0, pdfHeight - 15, pdfWidth, 15, 'F'); // white out bottom margin
      drawHeaderFooter(pageNumber);
      
      heightLeft -= pageHeight;
    }
    
    pdf.save(`${title} - ${docType}.pdf`);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
};
