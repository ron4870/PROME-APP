import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Award, CheckCircle2, Clock, Briefcase, Trash2, Printer, Building2, MapPin, RefreshCw, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CompanyExperience {
  id: number;
  itemNo?: number;
  projectNumber: string;
  projectName: string;
  category: string;
  duration?: string | null;
  client: string;
  funder?: string | null;
  clientAddress?: string | null;
  country: string;
  contractValue?: string | null;
  role: string;
  status: string;
  deliverables?: string | null;
  description?: string | null;
  scopeOfServices?: string | null;
  clientContact?: string | null;
  sector?: string | null;
  location?: string | null;
}

const CATEGORIES = [
  'All Categories',
  'A. Feasibility Studies and Design of Expressway Projects',
  'B. Feasibility Studies and Design of Highway Projects',
  'C. Feasibility Studies and Design of Bridges',
  'D. Feasibility Studies and Design of Urban/Town Road Projects',
  'E. Field Investigations and Data Collection Assignments',
  'F. Feasibility Studies and Design of Infrastructure Projects in Oil and GAS',
  'G. Feasibility Studies and Design of Building Projects',
  'H. Development and Management of Asset Management Systems',
  'I. Design Review and Construction Supervision'
];

export const CompanyExperienceDashboard: React.FC = () => {
  const [experiences, setExperiences] = useState<CompanyExperience[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/company-experience', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setExperiences(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReseedData = async () => {
    if (!window.confirm("This will replace all current experience records with the official 66 PDF project records. Proceed?")) return;
    setIsReseeding(true);
    try {
      const response = await fetch('/api/company-experience/reseed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExperiences(data.records);
        alert(`Successfully reseeded ${data.count} official infrastructure projects!`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to reseed database');
    } finally {
      setIsReseeding(false);
    }
  };

  const handleCreateExperience = async () => {
    try {
      const response = await fetch('/api/company-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          projectName: 'New Infrastructure Project Experience',
          client: 'Uganda National Roads Authority',
          category: selectedCategory !== 'All Categories' ? selectedCategory : 'B. Feasibility Studies and Design of Highway Projects',
          duration: '2025 to date',
          country: 'Uganda',
          role: 'Sole Consultant',
          status: 'Ongoing'
        })
      });
      if (response.ok) {
        const newRecord = await response.json();
        navigate(`/company-experience/${newRecord.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this experience record?")) return;
    
    try {
      const response = await fetch(`/api/company-experience/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        setExperiences(experiences.filter(exp => exp.id !== id));
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete record');
    }
  };

  const filteredExperiences = experiences.filter(exp => {
    const matchesCategory = selectedCategory === 'All Categories' || exp.category === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      exp.projectName.toLowerCase().includes(searchLower) || 
      exp.projectNumber.toLowerCase().includes(searchLower) ||
      exp.client.toLowerCase().includes(searchLower) ||
      (exp.deliverables && exp.deliverables.toLowerCase().includes(searchLower)) ||
      (exp.country && exp.country.toLowerCase().includes(searchLower)) ||
      (exp.role && exp.role.toLowerCase().includes(searchLower));
    return matchesCategory && matchesSearch;
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pagesToRender: HTMLDivElement[] = [];

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1587px';
      document.body.appendChild(container);

      const logoUrl = '/prome.png';
      const toBase64 = (url: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.setAttribute('crossOrigin', 'anonymous');
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(url);
            }
          };
          img.onerror = () => resolve(url);
          img.src = url;
        });
      };

      const base64Logo = await toBase64(logoUrl);

      const generateBarcodeDataUrl = (text: string): string => {
        const code128Patterns: { [key: number]: number[] } = {
          0: [2,1,2,2,2,2], 1: [2,2,2,1,2,2], 2: [2,2,2,2,2,1], 3: [1,2,1,2,2,3], 4: [1,2,1,3,2,2],
          5: [1,3,1,2,2,2], 6: [1,2,2,2,1,3], 7: [1,2,2,3,1,2], 8: [1,3,2,2,1,2], 9: [2,2,1,2,1,3],
          10: [2,2,1,3,1,2], 11: [2,3,1,2,1,2], 12: [1,1,2,2,3,2], 13: [1,2,2,1,3,2], 14: [1,2,2,2,3,1],
          15: [1,1,3,2,2,2], 16: [1,2,3,1,2,2], 17: [1,2,3,2,2,1], 18: [2,2,3,2,1,1], 19: [2,2,1,1,3,2],
          20: [2,2,1,2,3,1], 21: [2,1,3,2,1,2], 22: [2,2,3,1,1,2], 23: [3,1,2,1,3,1], 24: [3,1,1,2,2,2],
          25: [3,2,1,1,2,2], 26: [3,2,1,2,2,1], 27: [3,1,2,2,1,2], 28: [3,2,2,1,1,2], 29: [3,2,2,2,1,1],
          30: [2,1,2,1,2,3], 31: [2,1,2,3,2,1], 32: [2,3,2,1,2,1], 33: [1,1,1,3,2,3], 34: [1,3,1,1,2,3],
          35: [1,3,1,3,2,1], 36: [1,1,2,3,1,3], 37: [1,3,2,1,1,3], 38: [1,3,2,3,1,1], 39: [2,1,1,3,1,3],
          40: [2,3,1,1,1,3], 41: [2,3,1,3,1,1], 42: [1,1,2,1,3,3], 43: [1,1,2,3,3,1], 44: [1,3,2,1,3,1],
          45: [1,1,3,1,2,3], 46: [1,1,3,3,2,1], 47: [1,3,3,1,2,1], 48: [3,1,3,1,2,1], 49: [2,1,1,3,3,1],
          50: [2,3,1,1,3,1], 51: [2,1,3,1,1,3], 52: [2,1,3,3,1,1], 53: [2,1,3,1,3,1], 54: [3,1,1,1,2,3],
          55: [3,1,1,3,2,1], 56: [3,3,1,1,2,1], 57: [3,1,2,1,1,3], 58: [3,1,2,3,1,1], 59: [3,3,2,1,1,1],
          60: [3,1,4,1,1,1], 61: [2,2,1,4,1,1], 62: [4,3,1,1,1,1], 63: [1,1,1,2,2,4], 64: [1,1,1,4,2,2],
          65: [1,2,1,1,2,4], 66: [1,2,1,4,2,1], 67: [1,4,1,1,2,2], 68: [1,4,1,2,2,1], 69: [1,1,2,2,1,4],
          70: [1,1,2,4,1,2], 71: [1,2,2,1,1,4], 72: [1,2,2,4,1,1], 73: [1,4,2,1,1,2], 74: [1,4,2,2,1,1],
          75: [2,4,1,2,1,1], 76: [2,2,1,1,1,4], 77: [4,1,3,1,1,1], 78: [2,4,1,1,1,2], 79: [1,3,4,1,1,1],
          80: [1,1,1,2,4,2], 81: [1,2,1,1,4,2], 82: [1,2,1,2,4,1], 83: [1,1,4,2,1,2], 84: [1,2,4,1,1,2],
          85: [1,2,4,2,1,1], 86: [4,1,1,2,1,2], 87: [4,2,1,1,1,2], 88: [4,2,1,2,1,1], 89: [2,1,2,1,4,1],
          90: [2,1,4,1,2,1], 91: [4,1,2,1,2,1], 92: [1,1,1,1,4,3], 93: [1,1,1,3,4,1], 94: [1,3,1,1,4,1],
          95: [1,1,4,1,1,3], 96: [1,1,4,3,1,1], 97: [4,1,1,1,1,3], 98: [4,1,1,3,1,1], 99: [1,1,3,1,4,1],
          100: [1,1,4,1,3,1], 101: [3,1,1,1,4,1], 102: [4,1,1,1,3,1], 103: [2,1,1,4,1,2], 104: [2,1,1,2,1,4],
          105: [2,1,1,2,3,2], 106: [2,3,3,1,1,1,2]
        };

        const codes: number[] = [104];
        let checksum = 104;

        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i) - 32;
          codes.push(code);
          checksum += code * (i + 1);
        }

        codes.push(checksum % 103);
        codes.push(106);

        const quietZone = 10;
        let totalWidth = quietZone * 2;
        codes.forEach((code) => {
          const pattern = code128Patterns[code] || code128Patterns[0];
          pattern.forEach((w) => { totalWidth += w; });
        });

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth * 2;
        canvas.height = 36;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000000';
        let x = quietZone * 2;
        const barHeight = 36;

        codes.forEach((code) => {
          const pattern = code128Patterns[code] || code128Patterns[0];
          let isBar = true;
          pattern.forEach((w) => {
            const width = w * 2;
            if (isBar) {
              ctx.fillRect(x, 0, width, barHeight);
            }
            x += width;
            isBar = !isBar;
          });
        });

        return canvas.toDataURL('image/png');
      };

      const barcodeDataUrl = generateBarcodeDataUrl('PROME-IMSR-CEXP-01');

      const createPageHeader = () => {
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.borderBottom = '3px solid #cc0000';
        header.style.paddingBottom = '14px';
        header.style.marginBottom = '16px';

        const leftHeader = document.createElement('div');
        leftHeader.style.display = 'flex';
        leftHeader.style.alignItems = 'center';
        leftHeader.style.gap = '16px';
        leftHeader.style.flex = '1';

        const img = document.createElement('img');
        img.src = base64Logo;
        img.style.height = '46px';
        leftHeader.appendChild(img);

        const titleContainer = document.createElement('div');
        const mainTitle = document.createElement('div');
        mainTitle.innerText = 'PROME CONSULTANTS LTD';
        mainTitle.style.fontSize = '20px';
        mainTitle.style.fontWeight = 'bold';
        mainTitle.style.color = '#1e293b';

        const subTitle = document.createElement('div');
        subTitle.innerText = 'INTEGRATED MANAGEMENT SYSTEM (IMS)';
        subTitle.style.fontSize = '12px';
        subTitle.style.fontWeight = '600';
        subTitle.style.color = '#64748b';
        subTitle.style.marginTop = '2px';

        titleContainer.appendChild(mainTitle);
        titleContainer.appendChild(subTitle);
        leftHeader.appendChild(titleContainer);

        const middleHeader = document.createElement('div');
        middleHeader.style.display = 'flex';
        middleHeader.style.flexDirection = 'column';
        middleHeader.style.alignItems = 'center';
        middleHeader.style.justifyContent = 'center';
        middleHeader.style.flex = '1';

        const barcodeImg = document.createElement('img');
        barcodeImg.src = barcodeDataUrl;
        barcodeImg.style.height = '28px';
        barcodeImg.style.width = 'auto';
        barcodeImg.style.objectFit = 'contain';

        const barcodeText = document.createElement('div');
        barcodeText.innerText = 'PROME-IMSR-CEXP-01';
        barcodeText.style.fontSize = '10px';
        barcodeText.style.fontWeight = '700';
        barcodeText.style.color = '#334155';
        barcodeText.style.marginTop = '3px';
        barcodeText.style.letterSpacing = '1px';
        barcodeText.style.fontFamily = 'monospace, sans-serif';

        middleHeader.appendChild(barcodeImg);
        middleHeader.appendChild(barcodeText);

        const rightHeader = document.createElement('div');
        rightHeader.style.textAlign = 'right';
        rightHeader.style.flex = '1';

        const regTitle = document.createElement('div');
        regTitle.innerText = "PROME'S INFRASTRUCTURE EXPERIENCE";
        regTitle.style.fontSize = '20px';
        regTitle.style.fontWeight = '800';
        regTitle.style.color = '#cc0000';

        const regMeta = document.createElement('div');
        regMeta.innerText = 'Feasibility, Design & Construction Supervision Register';
        regMeta.style.fontSize = '11px';
        regMeta.style.fontWeight = '500';
        regMeta.style.color = '#475569';
        regMeta.style.marginTop = '4px';

        rightHeader.appendChild(regTitle);
        rightHeader.appendChild(regMeta);

        header.appendChild(leftHeader);
        header.appendChild(middleHeader);
        header.appendChild(rightHeader);
        return header;
      };

      const createSummaryCards = () => {
        const cardsContainer = document.createElement('div');
        cardsContainer.style.display = 'grid';
        cardsContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
        cardsContainer.style.gap = '14px';
        cardsContainer.style.marginBottom = '16px';

        const cardsData = [
          { label: 'TOTAL INFRASTRUCTURE PROJECTS', val: filteredExperiences.length, color: '#b91c1c', border: '#fca5a5', bg: '#fef2f2' },
          { label: 'COMPLETED ASSIGNMENTS', val: filteredExperiences.filter(e => e.status === 'Completed').length, color: '#15803d', border: '#86efac', bg: '#f0fdf4' },
          { label: 'ONGOING ASSIGNMENTS', val: filteredExperiences.filter(e => e.status === 'Ongoing').length, color: '#0369a1', border: '#7dd3fc', bg: '#f0f9ff' },
          { label: 'COUNTRIES OF OPERATION', val: Array.from(new Set(filteredExperiences.map(e => e.country))).join(', ') || 'Uganda, Ethiopia, Tanzania', color: '#d97706', border: '#fde68a', bg: '#fffbe6' }
        ];

        cardsData.forEach(c => {
          const card = document.createElement('div');
          card.style.backgroundColor = c.bg;
          card.style.border = `1px solid ${c.border}`;
          card.style.borderRadius = '6px';
          card.style.padding = '10px 14px';
          card.style.boxSizing = 'border-box';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.justifyContent = 'center';

          const labelDiv = document.createElement('div');
          labelDiv.innerText = c.label;
          labelDiv.style.fontSize = '8.5px';
          labelDiv.style.fontWeight = '700';
          labelDiv.style.color = '#475569';
          labelDiv.style.letterSpacing = '0.5px';

          const valDiv = document.createElement('div');
          valDiv.innerText = String(c.val);
          valDiv.style.fontSize = typeof c.val === 'string' && c.val.length > 10 ? '14px' : '22px';
          valDiv.style.fontWeight = '800';
          valDiv.style.color = c.color;
          valDiv.style.marginTop = '4px';

          card.appendChild(labelDiv);
          card.appendChild(valDiv);
          cardsContainer.appendChild(card);
        });

        return cardsContainer;
      };

      const headersList = [
        { text: 'ITEM<br/>NO', w: '4%', center: true },
        { text: 'PROJECT<br/>DURATION', w: '9%' },
        { text: 'PROJECT NAME', w: '22%' },
        { text: 'DESCRIPTION OF MAIN<br/>DELIVERABLES/OUTPUTS', w: '25%' },
        { text: 'CLIENT/EMPLOYER<br/>AND FUNDER', w: '17%' },
        { text: 'COUNTRY OF<br/>PROJECT EXECUTION', w: '7%', center: true },
        { text: 'CONTRACT VALUE<br/>(UGX/USD/ETB)', w: '9%', center: true },
        { text: 'ROLE IN<br/>ASSIGNMENT', w: '7%' }
      ];

      const createTableHead = () => {
        const thead = document.createElement('thead');
        thead.style.backgroundColor = '#991b1b';
        thead.style.color = '#ffffff';

        const trHead = document.createElement('tr');
        headersList.forEach(h => {
          const th = document.createElement('th');
          th.innerHTML = h.text;
          th.style.width = h.w;
          th.style.padding = '8px 4px';
          th.style.fontWeight = '700';
          th.style.color = '#ffffff';
          th.style.fontSize = '8.5px';
          th.style.lineHeight = '1.25';
          th.style.verticalAlign = 'middle';
          th.style.border = '1px solid #7f1d1d';
          if (h.center) {
            th.style.textAlign = 'center';
          } else {
            th.style.textAlign = 'left';
          }
          trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        return thead;
      };

      const createExperienceRow = (exp: CompanyExperience) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #cbd5e1';

        const clientText = `${exp.client}\n${exp.clientAddress ? `Address: ${exp.clientAddress}\n` : ''}${exp.funder ? `Funder: ${exp.funder}` : ''}`;

        const cells = [
          { text: String(exp.itemNo || exp.id), bold: true, center: true, color: '#991b1b' },
          { text: exp.duration || '-' },
          { text: exp.projectName || '-', bold: true },
          { text: exp.deliverables || exp.description || '-', fullText: true },
          { text: clientText, dualText: true },
          { text: exp.country || 'Uganda', center: true },
          { text: exp.contractValue || '-', center: true, bold: true, color: '#047857' },
          { text: exp.role || '-' }
        ];

        cells.forEach((cell) => {
          const td = document.createElement('td');
          td.style.padding = '6px 4px';
          td.style.border = '1px solid #cbd5e1';
          td.style.verticalAlign = 'top';
          td.style.fontSize = '8.5px';

          if (cell.bold) td.style.fontWeight = '600';
          if (cell.color) td.style.color = cell.color;
          if (cell.center) td.style.textAlign = 'center';

          if (cell.dualText) {
            const textDiv = document.createElement('div');
            textDiv.innerText = cell.text;
            textDiv.style.whiteSpace = 'pre-line';
            textDiv.style.lineHeight = '1.3';
            textDiv.style.color = '#1e293b';
            td.appendChild(textDiv);
          } else if (cell.fullText) {
            const textDiv = document.createElement('div');
            textDiv.innerText = cell.text;
            textDiv.style.whiteSpace = 'pre-wrap';
            textDiv.style.wordBreak = 'break-word';
            textDiv.style.lineHeight = '1.3';
            textDiv.style.color = '#334155';
            td.appendChild(textDiv);
          } else {
            td.innerText = cell.text;
          }

          tr.appendChild(td);
        });

        return tr;
      };

      let currentPage: HTMLDivElement | null = null;
      let currentTable: HTMLTableElement | null = null;
      let currentTbody: HTMLTableSectionElement | null = null;

      const startNewPage = () => {
        const isFirstPage = pagesToRender.length === 0;

        const page = document.createElement('div');
        page.style.width = '1587px';
        page.style.minHeight = '1123px';
        page.style.backgroundColor = '#ffffff';
        page.style.padding = '40px';
        page.style.boxSizing = 'border-box';
        page.style.display = 'flex';
        page.style.flexDirection = 'column';
        page.style.fontFamily = 'Inter, sans-serif';

        page.appendChild(createPageHeader());

        if (isFirstPage) {
          page.appendChild(createSummaryCards());
        }

        const tableContainer = document.createElement('div');
        tableContainer.style.flex = '1';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '9px';

        table.appendChild(createTableHead());

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        page.appendChild(tableContainer);

        container.appendChild(page);
        pagesToRender.push(page);

        currentPage = page;
        currentTable = table;
        currentTbody = tbody;
      };

      startNewPage();

      filteredExperiences.forEach((exp) => {
        const row = createExperienceRow(exp);
        currentTbody!.appendChild(row);

        const maxTableHeight = (pagesToRender.length === 1) ? 800 : 870;

        if (currentTable!.offsetHeight > maxTableHeight && currentTbody!.rows.length > 1) {
          currentTbody!.removeChild(row);
          currentPage!.style.height = '1123px';

          startNewPage();
          currentTbody!.appendChild(row);
        }
      });

      if (currentPage) {
        (currentPage as HTMLDivElement).style.height = '1123px';
      }

      // Append footers
      pagesToRender.forEach((page, index) => {
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';
        footer.style.borderTop = '1px solid #cbd5e1';
        footer.style.paddingTop = '10px';
        footer.style.marginTop = '12px';
        footer.style.fontSize = '10px';
        footer.style.color = '#64748b';

        const leftFooter = document.createElement('div');
        leftFooter.innerText = `www.promeconsult.com | ISO 9001:2015 Certified`;

        const centerFooter = document.createElement('div');
        centerFooter.innerText = 'PROME Consultants Ltd. - Feasibility, Design & Construction Supervision Experience';

        const rightFooter = document.createElement('div');
        rightFooter.innerText = `Page ${index + 1} of ${pagesToRender.length}`;

        footer.appendChild(leftFooter);
        footer.appendChild(centerFooter);
        footer.appendChild(rightFooter);

        page.appendChild(footer);
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      for (let i = 0; i < pagesToRender.length; i++) {
        if (i > 0) {
          pdf.addPage('a3', 'landscape');
        }

        const canvas = await html2canvas(pagesToRender[i], {
          scale: 2,
          useCORS: true,
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 420, 297, undefined, 'FAST');
      }

      pdf.save(`PROME_Infrastructure_Experience_Register_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('Error generating company experience register PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="layout-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award color="#cc0000" size={32} />
            Company Experience Register
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
            PROME’s Feasibility, Design and Construction Supervision Experience on Infrastructure Projects
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#d1d5db' }}
            onClick={handleReseedData}
            disabled={isReseeding}
            title="Reset & sync with official PDF dataset"
          >
            <RefreshCw size={16} className={isReseeding ? 'spin' : ''} /> {isReseeding ? 'Syncing...' : 'Sync Official PDF Data'}
          </button>
          <button 
            className="btn btn-outline no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <Printer size={18} /> {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button 
            className="btn btn-primary no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#cc0000' }}
            onClick={handleCreateExperience}
          >
            <Plus size={18} /> New Experience Record
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Briefcase size={16} color="#cc0000" /> Total Executed Projects
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {experiences.length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#22c55e" /> Completed Assignments
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {experiences.filter(e => e.status === 'Completed').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Clock size={16} color="#0ea5e9" /> Ongoing Assignments
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {experiences.filter(e => e.status === 'Ongoing').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Building2 size={16} color="#eab308" /> Key Clients & Funders
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#334155', marginTop: '0.5rem' }}>
            UNRA, KCCA, ERA, MLHUD, World Bank, JICA, AfDB, CNOOC
          </div>
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginRight: '0.5rem' }}>
          <Filter size={16} color="#cc0000" /> Filter Category:
        </span>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat;
          const count = cat === 'All Categories' ? experiences.length : experiences.filter(e => e.category === cat).length;
          
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                border: '1px solid',
                borderColor: isSelected ? '#cc0000' : '#e5e7eb',
                backgroundColor: isSelected ? '#fee2e2' : '#f9fafb',
                color: isSelected ? '#991b1b' : '#4b5563',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {cat === 'All Categories' ? `All (${experiences.length})` : `${cat.split('.')[0]}. ${cat.split('.')[1]?.trim().slice(0, 28)}... (${count})`}
            </button>
          );
        })}
      </div>

      {/* Search & Main Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search by project name, client, funder, deliverables, country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
            />
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
            Showing {filteredExperiences.length} of {experiences.length} Projects
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading PROME project records...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '60px', textAlign: 'center' }}>Item</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '130px' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Project Name & Category</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '220px' }}>Deliverables / Outputs</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '200px' }}>Client / Employer & Funder</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '90px' }}>Country</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '160px' }}>Contract Value</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '150px' }}>Role in Assignment</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right', width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredExperiences.map((exp) => (
                  <tr 
                    key={exp.id} 
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                    onClick={() => navigate(`/company-experience/${exp.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem', fontWeight: '800', color: '#991b1b', textAlign: 'center', backgroundColor: '#fef2f2' }}>
                      {exp.itemNo || exp.id}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '500' }}>
                      {exp.duration || '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem', lineHeight: '1.3' }}>{exp.projectName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '4px', fontWeight: '600' }}>{exp.category}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#334155', fontSize: '0.8rem', whiteSpace: 'pre-line', maxHeight: '100px', overflow: 'hidden' }}>
                      {exp.deliverables ? exp.deliverables.slice(0, 150) + (exp.deliverables.length > 150 ? '...' : '') : '-'}
                    </td>
                    <td style={{ padding: '1rem', color: '#334155', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{exp.client}</div>
                      {exp.funder && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Funder: {exp.funder}</div>}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                        <MapPin size={12} color="#6b7280" /> {exp.country}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#047857', fontSize: '0.8rem' }}>
                      {exp.contractValue || '-'}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '500' }}>
                      {exp.role}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={(e) => handleDelete(exp.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        title="Delete Record"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredExperiences.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                      No infrastructure projects found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isExporting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          color: 'white',
          fontSize: '1.25rem',
          fontWeight: '600',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '2rem 3rem',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#cc0000',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <span>Generating A3 Landscape Register PDF...</span>
          </div>
        </div>
      )}
    </div>
  );
};
