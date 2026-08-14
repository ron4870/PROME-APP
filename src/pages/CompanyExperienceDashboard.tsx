import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Award, CheckCircle2, Clock, Briefcase, Trash2, Printer, Building2, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CompanyExperience {
  id: number;
  projectNumber: string;
  projectName: string;
  client: string;
  sector: string;
  location: string;
  contractValue: string | null;
  role: string;
  startDate: string | null;
  completionDate: string | null;
  status: string;
  description?: string | null;
  scopeOfServices?: string | null;
  clientContact?: string | null;
  createdBy?: { id: number; name: string };
}

export const CompanyExperienceDashboard: React.FC = () => {
  const [experiences, setExperiences] = useState<CompanyExperience[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    try {
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

  const handleCreateExperience = async () => {
    try {
      const response = await fetch('/api/company-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          projectName: 'New Engineering Project Experience',
          client: 'Client / Employer Name',
          sector: 'Civil & Infrastructure',
          location: 'Uganda',
          role: 'Lead Consultant',
          status: 'Completed'
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

  const filteredExperiences = experiences.filter(exp => 
    exp.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    exp.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        regTitle.innerText = 'COMPANY EXPERIENCE REGISTER';
        regTitle.style.fontSize = '22px';
        regTitle.style.fontWeight = '800';
        regTitle.style.color = '#cc0000';

        const regMeta = document.createElement('div');
        regMeta.innerText = 'ISO 9001:2015 Clause 8.2 & Project Credentials';
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
          { label: 'TOTAL EXECUTED PROJECTS', val: filteredExperiences.length, color: '#b91c1c', border: '#fca5a5', bg: '#fef2f2' },
          { label: 'COMPLETED PROJECTS', val: filteredExperiences.filter(e => e.status === 'Completed').length, color: '#15803d', border: '#86efac', bg: '#f0fdf4' },
          { label: 'ONGOING PROJECTS', val: filteredExperiences.filter(e => e.status === 'Ongoing').length, color: '#0369a1', border: '#7dd3fc', bg: '#f0f9ff' },
          { label: 'PIPELINE / BIDDING', val: filteredExperiences.filter(e => e.status === 'Pipeline').length, color: '#d97706', border: '#fde68a', bg: '#fffbe6' }
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
          valDiv.style.fontSize = '22px';
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
        { text: 'NUMBER', w: '8%' },
        { text: 'PROJECT NAME &<br/>SECTOR', w: '24%' },
        { text: 'CLIENT / EMPLOYER', w: '16%' },
        { text: 'ROLE', w: '10%' },
        { text: 'LOCATION', w: '10%' },
        { text: 'CONTRACT VALUE', w: '11%', center: true },
        { text: 'DESCRIPTION / SCOPE', w: '15%' },
        { text: 'STATUS', w: '6%', center: true }
      ];

      const createTableHead = () => {
        const thead = document.createElement('thead');
        thead.style.backgroundColor = '#f1f5f9';
        thead.style.border = '1px solid #cbd5e1';

        const trHead = document.createElement('tr');
        headersList.forEach(h => {
          const th = document.createElement('th');
          th.innerHTML = h.text;
          th.style.width = h.w;
          th.style.padding = '8px 6px';
          th.style.fontWeight = '700';
          th.style.color = '#1e293b';
          th.style.fontSize = '8.5px';
          th.style.lineHeight = '1.25';
          th.style.verticalAlign = 'bottom';
          th.style.border = '1px solid #cbd5e1';
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

        const cells = [
          { text: exp.projectNumber || '-', bold: true, color: '#0f172a' },
          { text: exp.projectName || '-', sector: exp.sector },
          { text: exp.client || '-' },
          { text: exp.role || '-' },
          { text: exp.location || '-' },
          { text: exp.contractValue || '-', center: true, bold: true, color: '#047857' },
          { text: exp.description || exp.scopeOfServices || '-', fullText: true },
          { text: exp.status || '-', badge: true, isStatus: true }
        ];

        cells.forEach((cell) => {
          const td = document.createElement('td');
          td.style.padding = '6px 6px';
          td.style.border = '1px solid #cbd5e1';
          td.style.verticalAlign = 'top';
          td.style.fontSize = '9px';

          if (cell.bold) {
            td.style.fontWeight = '600';
          }
          if (cell.color) {
            td.style.color = cell.color;
          }
          if (cell.center) {
            td.style.textAlign = 'center';
          }

          if (cell.badge) {
            const span = document.createElement('span');
            span.innerText = cell.text;
            span.style.padding = '3px 6px';
            span.style.borderRadius = '4px';
            span.style.fontSize = '8px';
            span.style.fontWeight = 'bold';

            if (cell.isStatus) {
              span.style.backgroundColor = 
                cell.text === 'Completed' ? '#dcfce3' : 
                cell.text === 'Ongoing' ? '#e0f2fe' : '#fef9c3';
              span.style.color = 
                cell.text === 'Completed' ? '#166534' : 
                cell.text === 'Ongoing' ? '#0369a1' : '#854d0e';
            }
            td.appendChild(span);
          } else if (cell.sector !== undefined) {
            const titleNode = document.createElement('div');
            titleNode.innerText = cell.text;
            titleNode.style.fontWeight = '600';
            titleNode.style.color = '#1e293b';
            
            const sectorNode = document.createElement('div');
            sectorNode.innerText = cell.sector || 'Civil Engineering';
            sectorNode.style.fontSize = '8px';
            sectorNode.style.color = '#64748b';
            sectorNode.style.marginTop = '2px';
            td.appendChild(titleNode);
            td.appendChild(sectorNode);
          } else if (cell.fullText) {
            const textDiv = document.createElement('div');
            textDiv.innerText = cell.text;
            textDiv.style.whiteSpace = 'pre-wrap';
            textDiv.style.wordBreak = 'break-word';
            textDiv.style.lineHeight = '1.35';
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
        table.style.fontSize = '10px';

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
        leftFooter.innerText = `Report Date: ${new Date().toLocaleDateString()} | Confidential Credentials`;

        const centerFooter = document.createElement('div');
        centerFooter.innerText = 'PROME Consultants Ltd. - Corporate Experience Directory';

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

      pdf.save(`PROME_Company_Experience_Register_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('Error generating company experience register PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="layout-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award color="#cc0000" size={32} />
            Company Experience Register
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Comprehensive database of executed engineering projects, contracts, credentials, and client references</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Briefcase size={16} color="#cc0000" /> Total Executed Projects
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {experiences.length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#22c55e" /> Completed Projects
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {experiences.filter(e => e.status === 'Completed').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Clock size={16} color="#0ea5e9" /> Ongoing Projects
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {experiences.filter(e => e.status === 'Ongoing').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>
            <Building2 size={16} color="#eab308" /> Pipeline / Bidding
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {experiences.filter(e => e.status === 'Pipeline').length}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search by project name, client, sector, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading experience records...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Number</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Project Name</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Contract Value</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredExperiences.map((exp) => (
                  <tr 
                    key={exp.id} 
                    style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                    onClick={() => navigate(`/company-experience/${exp.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#111827' }}>
                      {exp.projectNumber}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '500', color: '#111827' }}>{exp.projectName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{exp.sector}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151' }}>
                      {exp.client}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                      {exp.role}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="#6b7280" /> {exp.location}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#047857' }}>
                      {exp.contractValue || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 
                          exp.status === 'Completed' ? '#dcfce3' : 
                          exp.status === 'Ongoing' ? '#e0f2fe' : '#fef9c3',
                        color: 
                          exp.status === 'Completed' ? '#166534' : 
                          exp.status === 'Ongoing' ? '#0369a1' : '#854d0e'
                      }}>
                        {exp.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
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
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No company experience records found.
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
            <span>Generating A3 Landscape PDF...</span>
          </div>
        </div>
      )}
    </div>
  );
};
