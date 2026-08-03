import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, AlertTriangle, Target, Printer, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Risk {
  id: number;
  riskNumber: string;
  title: string;
  type: string;
  category: string;
  description: string;
  status: string;
  likelihood: number | null;
  impact: number | null;
  score: number | null;
  mitigationPlan?: string | null;
  residualLikelihood?: number | null;
  residualImpact?: number | null;
  residualScore: number | null;
  actionDeadline?: string | null;
  createdAt: string;
  owner?: { id: number; name: string };
}

const RiskDashboard: React.FC = () => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      const response = await fetch('/api/risks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch risks');
      const data = await response.json();
      setRisks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRisk = async (type: 'Risk' | 'Opportunity') => {
    try {
      const response = await fetch('/api/risks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: `New ${type}`,
          type,
          category: 'Operational',
          description: '',
          ownerId: user?.id
        })
      });
      if (response.ok) {
        const newRisk = await response.json();
        navigate(`/risks/${newRisk.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this risk/opportunity?")) return;
    
    try {
      const response = await fetch(`/api/risks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        setRisks(risks.filter(r => r.id !== id));
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete risk');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete risk');
    }
  };

  const filteredRisks = risks.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.riskNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number | null) => {
    if (!score) return '#e5e7eb';
    if (score >= 15) return '#fee2e2'; // Red
    if (score >= 8) return '#fef3c7';  // Yellow
    return '#dcfce3'; // Green
  };

  const getScoreTextClass = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 15) return 'text-red-700 font-bold';
    if (score >= 8) return 'text-yellow-700 font-bold';
    return 'text-green-700 font-bold';
  };

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

      const createPageHeader = () => {
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.borderBottom = '3px solid #b91c1c';
        header.style.paddingBottom = '14px';
        header.style.marginBottom = '16px';

        const leftHeader = document.createElement('div');
        leftHeader.style.display = 'flex';
        leftHeader.style.alignItems = 'center';
        leftHeader.style.gap = '16px';

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

        const rightHeader = document.createElement('div');
        rightHeader.style.textAlign = 'right';

        const regTitle = document.createElement('div');
        regTitle.innerText = 'RISK & OPPORTUNITY REGISTER';
        regTitle.style.fontSize = '22px';
        regTitle.style.fontWeight = '800';
        regTitle.style.color = '#b91c1c';

        const regMeta = document.createElement('div');
        regMeta.innerText = 'ISO 9001:2015 Clause 6.1 Compliance';
        regMeta.style.fontSize = '11px';
        regMeta.style.fontWeight = '500';
        regMeta.style.color = '#475569';
        regMeta.style.marginTop = '4px';

        rightHeader.appendChild(regTitle);
        rightHeader.appendChild(regMeta);

        header.appendChild(leftHeader);
        header.appendChild(rightHeader);
        return header;
      };

      const headersList = [
        { text: 'NUMBER', w: '6%' },
        { text: 'TYPE', w: '4%' },
        { text: 'TITLE &<br/>CATEGORY', w: '11%' },
        { text: 'DESCRIPTION', w: '18%' },
        { text: 'OWNER', w: '7%' },
        { text: 'INITIAL<br/>LIKELIHOOD', w: '4.5%', center: true },
        { text: 'INITIAL<br/>IMPACT', w: '4.5%', center: true },
        { text: 'INITIAL<br/>SCORE', w: '4.5%', center: true },
        { text: 'ACTION<br/>PLAN', w: '18%' },
        { text: 'RESIDUAL<br/>LIKELIHOOD', w: '4.5%', center: true },
        { text: 'RESIDUAL<br/>IMPACT', w: '4.5%', center: true },
        { text: 'RESIDUAL<br/>SCORE', w: '4.5%', center: true },
        { text: 'STATUS', w: '4.5%' },
        { text: 'DEADLINE', w: '5.5%' }
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
          th.style.padding = '8px 4px';
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

      const createRiskRow = (risk: any) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #cbd5e1';

        const cells = [
          { text: risk.riskNumber || '-', bold: true, color: '#0f172a' },
          { text: risk.type || '-', badge: true, isType: true },
          { text: risk.title || '-', category: risk.category },
          { text: risk.description || '-', fullText: true },
          { text: risk.owner?.name || 'Unassigned' },
          { text: String(risk.likelihood ?? '-'), center: true },
          { text: String(risk.impact ?? '-'), center: true },
          { text: String(risk.score ?? '-'), scoreBadge: true, score: risk.score },
          { text: risk.mitigationPlan || '-', fullText: true },
          { text: String(risk.residualLikelihood ?? '-'), center: true },
          { text: String(risk.residualImpact ?? '-'), center: true },
          { text: String(risk.residualScore ?? '-'), scoreBadge: true, score: risk.residualScore },
          { text: risk.status || '-', badge: true, isStatus: true },
          { text: risk.actionDeadline ? new Date(risk.actionDeadline).toLocaleDateString() : '-' }
        ];

        cells.forEach((cell) => {
          const td = document.createElement('td');
          td.style.padding = '6px 5px';
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
            span.style.padding = '2px 5px';
            span.style.borderRadius = '4px';
            span.style.fontSize = '8px';
            span.style.fontWeight = 'bold';

            if (cell.isType) {
              span.style.backgroundColor = cell.text === 'Risk' ? '#fee2e2' : '#e0f2fe';
              span.style.color = cell.text === 'Risk' ? '#991b1b' : '#0369a1';
            } else if (cell.isStatus) {
              span.style.backgroundColor = 
                cell.text === 'Closed' || cell.text === 'Mitigated' ? '#dcfce3' : 
                cell.text === 'Realized' ? '#fee2e2' : '#f3f4f6';
              span.style.color = 
                cell.text === 'Closed' || cell.text === 'Mitigated' ? '#166534' : 
                cell.text === 'Realized' ? '#991b1b' : '#374151';
            }
            td.appendChild(span);
          } else if (cell.scoreBadge) {
            const val = cell.score;
            const span = document.createElement('span');
            span.innerText = cell.text;
            span.style.display = 'inline-block';
            span.style.padding = '2px 7px';
            span.style.borderRadius = '4px';
            span.style.fontWeight = 'bold';
            span.style.fontSize = '9px';

            const getScoreColorAndClass = (s: number | null) => {
              if (!s) return { bg: '#f3f4f6', text: '#64748b' };
              if (s >= 15) return { bg: '#fee2e2', text: '#b91c1c' };
              if (s >= 8) return { bg: '#fef9c3', text: '#a16207' };
              return { bg: '#dcfce3', text: '#15803d' };
            };

            const styling = getScoreColorAndClass(val);
            span.style.backgroundColor = styling.bg;
            span.style.color = styling.text;
            td.appendChild(span);
          } else if (cell.category) {
            const textNode = document.createElement('div');
            textNode.innerText = cell.text;
            textNode.style.fontWeight = '600';
            textNode.style.color = '#1e293b';
            
            const catDiv = document.createElement('div');
            catDiv.innerText = cell.category;
            catDiv.style.fontSize = '8px';
            catDiv.style.color = '#64748b';
            catDiv.style.marginTop = '2px';
            td.appendChild(textNode);
            td.appendChild(catDiv);
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

      filteredRisks.forEach((risk) => {
        const row = createRiskRow(risk);
        currentTbody!.appendChild(row);

        // Check if table height exceeds printable vertical area for table (~870px)
        if (currentTable!.offsetHeight > 870 && currentTbody!.rows.length > 1) {
          currentTbody!.removeChild(row);
          currentPage!.style.height = '1123px';

          startNewPage();
          currentTbody!.appendChild(row);
        }
      });

      if (currentPage) {
        (currentPage as HTMLDivElement).style.height = '1123px';
      }

      // Append footers with updated page numbers
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
        leftFooter.innerText = `Report Date: ${new Date().toLocaleDateString()} | Confidential`;

        const centerFooter = document.createElement('div');
        centerFooter.innerText = 'PROME Consultants Ltd. - ISO Certified Quality Management System';

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

      pdf.save(`PROME_Risk_Register_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('Error generating risk register PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="layout-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Risk & Opportunity Register
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Manage corporate and project risks according to ISO 9001:2015 Clause 6.1</p>
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
            className="btn btn-outline no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#0ea5e9', color: '#0ea5e9' }}
            onClick={() => handleCreateRisk('Opportunity')}
          >
            <Target size={18} /> New Opportunity
          </button>
          <button 
            className="btn btn-primary no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e11d48' }}
            onClick={() => handleCreateRisk('Risk')}
          >
            <AlertTriangle size={18} /> New Risk
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Total Risks</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {risks.filter(r => r.type === 'Risk').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Total Opportunities</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
            {risks.filter(r => r.type === 'Opportunity').length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>High Risks (Score ≥ 15)</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e11d48', marginTop: '0.5rem' }}>
            {risks.filter(r => r.type === 'Risk' && r.score && r.score >= 15).length}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Mitigated</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669', marginTop: '0.5rem' }}>
            {risks.filter(r => r.status === 'Mitigated').length}
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
              placeholder="Search risks & opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading register...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Number</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Initial Likelihood</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Initial Impact</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Initial Score</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action Plan</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Residual Likelihood</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Residual Impact</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Residual</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action Deadline</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredRisks.map((risk) => (
                  <tr 
                    key={risk.id} 
                    style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                    onClick={() => navigate(`/risks/${risk.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#111827' }}>
                      {risk.riskNumber}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem',
                        backgroundColor: risk.type === 'Risk' ? '#fee2e2' : '#e0f2fe',
                        color: risk.type === 'Risk' ? '#991b1b' : '#0369a1',
                        fontWeight: '600'
                      }}>
                        {risk.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151' }}>
                      {risk.title}
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{risk.category}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {risk.description || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                      {risk.owner?.name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151', textAlign: 'center' }}>
                      {risk.likelihood || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151', textAlign: 'center' }}>
                      {risk.impact || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span 
                        className={getScoreTextClass(risk.score)}
                        style={{ 
                          display: 'inline-block',
                          padding: '4px 12px', 
                          borderRadius: '4px',
                          backgroundColor: getScoreColor(risk.score)
                        }}>
                        {risk.score || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {risk.mitigationPlan || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151', textAlign: 'center' }}>
                      {risk.residualLikelihood || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#374151', textAlign: 'center' }}>
                      {risk.residualImpact || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span 
                        className={getScoreTextClass(risk.residualScore)}
                        style={{ 
                          display: 'inline-block',
                          padding: '4px 12px', 
                          borderRadius: '4px',
                          backgroundColor: getScoreColor(risk.residualScore)
                        }}>
                        {risk.residualScore || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 
                        risk.status === 'Closed' || risk.status === 'Mitigated' ? '#dcfce3' : 
                        risk.status === 'Realized' ? '#fee2e2' : '#f3f4f6',
                        color: 
                        risk.status === 'Closed' || risk.status === 'Mitigated' ? '#166534' : 
                        risk.status === 'Realized' ? '#991b1b' : '#374151'
                      }}>
                        {risk.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                      {risk.actionDeadline ? new Date(risk.actionDeadline).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={(e) => handleDelete(risk.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        title="Delete Risk/Opportunity"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRisks.length === 0 && (
                  <tr>
                    <td colSpan={15} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No risks or opportunities found.
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
              borderTopColor: '#ef4444',
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

export default RiskDashboard;
