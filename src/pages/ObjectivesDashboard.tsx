import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Target, Activity, CheckCircle2, TrendingUp, Trash2, Printer, 
  Calendar, FileText, LayoutGrid, List, Check, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QualityObjectiveIsoSheet, type QualityObjectiveData } from '../components/QualityObjectiveIsoSheet';

interface QualityObjective {
  id: number;
  objectiveNumber: string;
  title: string;
  description?: string | null;
  division: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string | null;
  status: string;
  owner?: { id: number; name: string };
  corporateStrategicObjective?: string | null;
  departmentalQualityObjective?: string | null;
  strategyMethodology?: string | null;
  measurementMethod?: string | null;
  frequencyOfReview?: number | null;
  kpiTargetPrevious?: string | null;
  statusPreviousYear?: string | null;
  kpiTargetCurrent?: string | null;
  q1Status?: string | null;
  q2Status?: string | null;
  q3Status?: string | null;
  q4Status?: string | null;
  comments?: string | null;
  records?: string | null;
  departmentHeadApproval?: string | null;
  departmentHeadDate?: string | null;
  managingDirectorApproval?: string | null;
  managingDirectorDate?: string | null;
}

const ObjectivesDashboard: React.FC = () => {
  const [objectives, setObjectives] = useState<QualityObjective[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'matrix' | 'registry'>('matrix');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  // ISO Sheet Modal state
  const [activeIsoSheet, setActiveIsoSheet] = useState<QualityObjectiveData | null>(null);
  const [isIsoSheetOpen, setIsIsoSheetOpen] = useState(false);

  // Quick Quarter Update Modal state
  const [quarterModalObj, setQuarterModalObj] = useState<QualityObjective | null>(null);
  const [isQuarterModalOpen, setIsQuarterModalOpen] = useState(false);
  const [selectedQuarterToEdit, setSelectedQuarterToEdit] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ALL'>('ALL');
  const [quarterFormData, setQuarterFormData] = useState({
    q1Status: '',
    q2Status: '',
    q3Status: '',
    q4Status: '',
    comments: '',
    records: '',
    currentValue: 0,
    targetValue: 0,
    unit: '',
    status: 'Active'
  });
  const [isSavingQuarter, setIsSavingQuarter] = useState(false);

  useEffect(() => {
    fetchObjectives();
  }, []);

  const fetchObjectives = async () => {
    try {
      const response = await fetch('/api/objectives', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setObjectives(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateObjective = async () => {
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: 'New Quality Objective',
          targetValue: 100,
          unit: '%',
          frequencyOfReview: 4
        })
      });
      if (response.ok) {
        const newObj = await response.json();
        navigate(`/objectives/${newObj.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this objective?")) return;
    
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        setObjectives(objectives.filter(o => o.id !== id));
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete objective');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete objective');
    }
  };

  const handleOpenIsoSheet = (obj: QualityObjective, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIsoSheet(obj as QualityObjectiveData);
    setIsIsoSheetOpen(true);
  };

  const handleSaveIsoSheet = async (updated: QualityObjectiveData) => {
    if (!updated.id) return;
    try {
      const res = await fetch(`/api/objectives/${updated.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const saved = await res.json();
        setObjectives(prev => prev.map(o => o.id === saved.id ? saved : o));
        setActiveIsoSheet(saved);
      }
    } catch (err) {
      console.error('Error saving ISO sheet:', err);
      throw err;
    }
  };

  const handleOpenQuarterModal = (obj: QualityObjective, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ALL' = 'ALL', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuarterModalObj(obj);
    setSelectedQuarterToEdit(quarter);
    setQuarterFormData({
      q1Status: obj.q1Status || '',
      q2Status: obj.q2Status || '',
      q3Status: obj.q3Status || '',
      q4Status: obj.q4Status || '',
      comments: obj.comments || '',
      records: obj.records || '',
      currentValue: obj.currentValue,
      targetValue: obj.targetValue,
      unit: obj.unit || '%',
      status: obj.status || 'Active'
    });
    setIsQuarterModalOpen(true);
  };

  const handleSaveQuarterModal = async () => {
    if (!quarterModalObj) return;
    setIsSavingQuarter(true);
    try {
      const res = await fetch(`/api/objectives/${quarterModalObj.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...quarterModalObj,
          q1Status: quarterFormData.q1Status,
          q2Status: quarterFormData.q2Status,
          q3Status: quarterFormData.q3Status,
          q4Status: quarterFormData.q4Status,
          comments: quarterFormData.comments,
          records: quarterFormData.records,
          currentValue: quarterFormData.currentValue,
          targetValue: quarterFormData.targetValue,
          unit: quarterFormData.unit,
          status: quarterFormData.status
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setObjectives(prev => prev.map(o => o.id === saved.id ? saved : o));
        setIsQuarterModalOpen(false);
        setQuarterModalObj(null);
      } else {
        alert('Failed to save quarterly updates');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving quarterly updates');
    } finally {
      setIsSavingQuarter(false);
    }
  };

  // Divisions filter
  const divisions = ['ALL', ...Array.from(new Set(objectives.map(o => o.division).filter(Boolean) as string[]))];

  const filteredObjectives = objectives.filter(o => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      o.title.toLowerCase().includes(term) || 
      o.objectiveNumber.toLowerCase().includes(term) ||
      (o.division && o.division.toLowerCase().includes(term)) ||
      (o.corporateStrategicObjective && o.corporateStrategicObjective.toLowerCase().includes(term)) ||
      (o.departmentalQualityObjective && o.departmentalQualityObjective.toLowerCase().includes(term));
    
    const matchesDivision = selectedDivision === 'ALL' || o.division === selectedDivision;
    return matchesSearch && matchesDivision;
  });

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    const progress = (current / target) * 100;
    return Math.min(Math.max(progress, 0), 100);
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

      const barcodeDataUrl = generateBarcodeDataUrl('PROME-IMSR-QOBJ-01');

      const createPageHeader = () => {
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.borderBottom = '3px solid #8b5cf6';
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

        const rightHeader = document.createElement('div');
        rightHeader.style.display = 'flex';
        rightHeader.style.flexDirection = 'column';
        rightHeader.style.alignItems = 'flex-end';
        rightHeader.style.gap = '4px';

        if (barcodeDataUrl) {
          const barcodeImg = document.createElement('img');
          barcodeImg.src = barcodeDataUrl;
          barcodeImg.style.height = '28px';
          rightHeader.appendChild(barcodeImg);
        }

        const docRef = document.createElement('div');
        docRef.innerText = 'PROME-IMSR-QOBJ-01 | Rev 03';
        docRef.style.fontSize = '10px';
        docRef.style.fontWeight = 'bold';
        docRef.style.color = '#475569';
        docRef.style.letterSpacing = '0.5px';
        rightHeader.appendChild(docRef);

        const printDate = document.createElement('div');
        printDate.innerText = `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        printDate.style.fontSize = '10px';
        printDate.style.color = '#64748b';
        rightHeader.appendChild(printDate);

        header.appendChild(leftHeader);
        header.appendChild(rightHeader);
        return header;
      };

      const itemsPerPage = 8;
      const totalPages = Math.ceil(filteredObjectives.length / itemsPerPage) || 1;

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const page = document.createElement('div');
        page.style.width = '1587px';
        page.style.height = '1122px';
        page.style.padding = '40px';
        page.style.backgroundColor = '#ffffff';
        page.style.boxSizing = 'border-box';
        page.style.position = 'relative';
        page.style.fontFamily = 'Inter, sans-serif';

        page.appendChild(createPageHeader());

        const subTitleBar = document.createElement('div');
        subTitleBar.style.backgroundColor = '#f8fafc';
        subTitleBar.style.padding = '10px 16px';
        subTitleBar.style.borderRadius = '6px';
        subTitleBar.style.marginBottom = '16px';
        subTitleBar.style.display = 'flex';
        subTitleBar.style.justifyContent = 'space-between';
        subTitleBar.style.alignItems = 'center';

        const titleText = document.createElement('div');
        titleText.innerText = 'CORPORATE & DIVISIONAL QUALITY OBJECTIVES REGISTER (ISO 9001:2015)';
        titleText.style.fontWeight = 'bold';
        titleText.style.fontSize = '14px';
        titleText.style.color = '#1e293b';

        const pageCountText = document.createElement('div');
        pageCountText.innerText = `Page ${pageIdx + 1} of ${totalPages}`;
        pageCountText.style.fontSize = '12px';
        pageCountText.style.color = '#64748b';

        subTitleBar.appendChild(titleText);
        subTitleBar.appendChild(pageCountText);
        page.appendChild(subTitleBar);

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '11px';

        const thead = document.createElement('thead');
        thead.innerHTML = `
          <tr style="background-color: #7c3aed; color: #ffffff;">
            <th style="padding: 10px; text-align: left; border: 1px solid #6d28d9; width: 140px;">Objective No.</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #6d28d9; width: 260px;">Strategic / Quality Objective</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #6d28d9; width: 160px;">Division</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #6d28d9; width: 180px;">Measurement Method</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 70px;">2025 Target</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 70px;">End 2025</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 70px;">2026 Target</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 60px;">Q1</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 60px;">Q2</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 60px;">Q3</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 60px;">Q4</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #6d28d9; width: 80px;">Status</th>
          </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const pageItems = filteredObjectives.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);

        pageItems.forEach((obj, idx) => {
          const tr = document.createElement('tr');
          tr.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

          tr.innerHTML = `
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${obj.objectiveNumber}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">
              <div style="font-weight: 600; color: #0f172a;">${obj.title}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${obj.corporateStrategicObjective || obj.description || '-'}</div>
            </td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #475569;">${obj.division || 'Company-Wide'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #475569;">${obj.measurementMethod || '-'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${obj.kpiTargetPrevious || '-'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${obj.statusPreviousYear || '-'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${obj.kpiTargetCurrent || (obj.targetValue + ' ' + obj.unit)}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: ${obj.q1Status && obj.q1Status !== '0' && obj.q1Status !== '0%' ? '#166534' : '#64748b'};">${obj.q1Status || '-'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: ${obj.q2Status && obj.q2Status !== '0' && obj.q2Status !== '0%' ? '#166534' : '#64748b'};">${obj.q2Status || '-'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: ${obj.q3Status && obj.q3Status !== '0' && obj.q3Status !== '0%' ? '#166534' : '#64748b'};">${obj.q3Status || '-'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: ${obj.q4Status && obj.q4Status !== '0' && obj.q4Status !== '0%' ? '#166534' : '#64748b'};">${obj.q4Status || '-'}</td>
            <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">
              <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; background-color: ${obj.status === 'Achieved' ? '#dcfce7' : obj.status === 'Off-Track' ? '#fee2e2' : '#e0f2fe'}; color: ${obj.status === 'Achieved' ? '#166534' : obj.status === 'Off-Track' ? '#991b1b' : '#0369a1'};">
                ${obj.status}
              </span>
            </td>
          `;
          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        page.appendChild(table);

        const footer = document.createElement('div');
        footer.style.position = 'absolute';
        footer.style.bottom = '30px';
        footer.style.left = '40px';
        footer.style.right = '40px';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.borderTop = '1px solid #e2e8f0';
        footer.style.paddingTop = '12px';
        footer.style.fontSize = '10px';
        footer.style.color = '#64748b';

        footer.innerHTML = `
          <div>Form No: PROME-IMSR-QOBJ-01 | Issue Date: 08/04/2026 | Version: 3.0</div>
          <div>PROME Consultants Ltd. - ISO Certified Quality Management System (Clause 6.2)</div>
          <div>Page ${pageIdx + 1} of ${totalPages}</div>
        `;
        page.appendChild(footer);

        container.appendChild(page);
        pagesToRender.push(page);
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      for (let i = 0; i < pagesToRender.length; i++) {
        if (i > 0) pdf.addPage('a3', 'landscape');
        const canvas = await html2canvas(pagesToRender[i], { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 420, 297, undefined, 'FAST');
      }

      pdf.save(`PROME_Quality_Objectives_Register_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('Error generating quality objectives register PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="layout-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              Quality Objectives & Quarterly Reviews
            </h1>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              backgroundColor: '#fee2e2', 
              color: '#991b1b', 
              padding: '4px 8px', 
              borderRadius: '4px',
              border: '1px solid #fecaca'
            }}>
              ISO 9001:2015 Clause 6.2 (Ver 3.0)
            </span>
          </div>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
            Monitor corporate and divisional quality targets, update quarterly progress, and print official ISO review sheets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => setViewMode('matrix')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'matrix' ? '#ffffff' : 'transparent',
                color: viewMode === 'matrix' ? '#7c3aed' : '#64748b',
                boxShadow: viewMode === 'matrix' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <LayoutGrid size={16} /> Quarterly Scorecard
            </button>
            <button
              onClick={() => setViewMode('registry')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'registry' ? '#ffffff' : 'transparent',
                color: viewMode === 'registry' ? '#7c3aed' : '#64748b',
                boxShadow: viewMode === 'registry' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <List size={16} /> Registry Table
            </button>
          </div>

          <button 
            className="btn btn-outline no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <Printer size={18} /> {isExporting ? 'Exporting...' : 'Export Register PDF'}
          </button>
          <button 
            className="btn btn-primary no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#7c3aed', color: 'white' }}
            onClick={handleCreateObjective}
          >
            <Plus size={18} /> New Objective
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: '600' }}>
            <Target size={16} color="#7c3aed" /> Total Objectives
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginTop: '0.25rem' }}>
            {objectives.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Across all departments</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #0ea5e9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: '600' }}>
            <Activity size={16} color="#0ea5e9" /> In Progress / Active
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginTop: '0.25rem' }}>
            {objectives.filter(o => o.status === 'Active').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Review frequency: Quarterly</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: '600' }}>
            <CheckCircle2 size={16} color="#22c55e" /> Target Achieved
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginTop: '0.25rem' }}>
            {objectives.filter(o => o.status === 'Achieved').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>100% KPI completion</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: '600' }}>
            <TrendingUp size={16} color="#ef4444" /> Off-Track / Action Needed
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginTop: '0.25rem' }}>
            {objectives.filter(o => o.status === 'Off-Track').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Requires remedial action</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px 8px 0 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search strategic objectives, departmental goals, codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.55rem 0.75rem 0.55rem 2.5rem', fontSize: '0.875rem' }}
            />
          </div>

          {/* Division Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Division:</span>
            {divisions.map(div => {
              const isSelected = selectedDivision === div;
              let label = div === 'ALL' ? 'All Divisions' : div;
              if (div.includes('PMBDD')) label = 'PMBDD';
              if (div.includes('BE&ED')) label = 'BE&ED';
              if (div.includes('FINANCE')) label = 'F&A';
              
              return (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? '700' : '500',
                    border: '1px solid',
                    borderColor: isSelected ? '#7c3aed' : '#e2e8f0',
                    backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                    color: isSelected ? '#7c3aed' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ backgroundColor: 'white', borderRadius: '0 0 8px 8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading quality objectives...</div>
        ) : viewMode === 'matrix' ? (
          /* ========================================================================= */
          /* QUARTERLY SCORECARD / ISO 9001:2015 MATRIX VIEW                          */
          /* ========================================================================= */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
              <thead>
                <tr style={{ backgroundColor: '#b91c1c', color: '#ffffff', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 14px', border: '1px solid #991b1b', width: '220px' }}>Strategic & Departmental Objective</th>
                  <th style={{ padding: '12px 14px', border: '1px solid #991b1b', width: '200px' }}>Strategy / Methodology</th>
                  <th style={{ padding: '12px 14px', border: '1px solid #991b1b', width: '130px' }}>Measurement Method</th>
                  <th style={{ padding: '12px 10px', border: '1px solid #991b1b', width: '60px', textAlign: 'center' }}>Freq</th>
                  <th style={{ padding: '12px 10px', border: '1px solid #991b1b', width: '65px', textAlign: 'center' }}>Target 2025</th>
                  <th style={{ padding: '12px 10px', border: '1px solid #991b1b', width: '65px', textAlign: 'center' }}>End 2025</th>
                  <th style={{ padding: '12px 10px', border: '1px solid #991b1b', width: '65px', textAlign: 'center' }}>Target 2026</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #991b1b', width: '70px', textAlign: 'center', backgroundColor: '#991b1b' }}>Q1</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #991b1b', width: '70px', textAlign: 'center', backgroundColor: '#991b1b' }}>Q2</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #991b1b', width: '70px', textAlign: 'center', backgroundColor: '#991b1b' }}>Q3</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #991b1b', width: '70px', textAlign: 'center', backgroundColor: '#991b1b' }}>Q4</th>
                  <th style={{ padding: '12px 14px', border: '1px solid #991b1b', width: '160px' }}>Comments / Records</th>
                  <th style={{ padding: '12px 14px', border: '1px solid #991b1b', width: '140px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.8125rem' }}>
                {filteredObjectives.map((obj, idx) => {
                  return (
                    <tr 
                      key={obj.id} 
                      style={{ 
                        borderBottom: '1px solid #e5e7eb', 
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd'
                      }}
                    >
                      {/* Strategic & Departmental Objective */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: '700', 
                            color: '#b91c1c', 
                            backgroundColor: '#fee2e2', 
                            padding: '2px 6px', 
                            borderRadius: '3px' 
                          }}>
                            {obj.objectiveNumber}
                          </span>
                        </div>
                        <div style={{ fontWeight: '700', color: '#1e293b', lineHeight: '1.3' }}>
                          {obj.corporateStrategicObjective || obj.title}
                        </div>
                        {obj.departmentalQualityObjective && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '6px', fontStyle: 'italic', lineHeight: '1.3' }}>
                            {obj.departmentalQualityObjective}
                          </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                          {obj.division || 'Company-Wide'}
                        </div>
                      </td>

                      {/* Strategy / Methodology */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top', color: '#334155', borderRight: '1px solid #e5e7eb', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                        {obj.strategyMethodology || obj.description || '-'}
                      </td>

                      {/* Measurement Method */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top', color: '#475569', borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>
                          {obj.measurementMethod || '-'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                          Unit: {obj.unit}
                        </div>
                      </td>

                      {/* Review Frequency */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'top', textAlign: 'center', color: '#475569', borderRight: '1px solid #e5e7eb', fontWeight: '600' }}>
                        {obj.frequencyOfReview || 4}
                      </td>

                      {/* 2025 Target */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'top', textAlign: 'center', color: '#475569', borderRight: '1px solid #e5e7eb' }}>
                        {obj.kpiTargetPrevious || '-'}
                      </td>

                      {/* End 2025 */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'top', textAlign: 'center', color: '#475569', borderRight: '1px solid #e5e7eb' }}>
                        {obj.statusPreviousYear || '-'}
                      </td>

                      {/* 2026 Target */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'top', textAlign: 'center', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #e5e7eb' }}>
                        {obj.kpiTargetCurrent || (obj.targetValue ? `${obj.targetValue} ${obj.unit}` : '-')}
                      </td>

                      {/* Q1 Status */}
                      <td 
                        onClick={() => handleOpenQuarterModal(obj, 'Q1')}
                        style={{ 
                          padding: '12px 8px', 
                          verticalAlign: 'top', 
                          textAlign: 'center', 
                          borderRight: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          backgroundColor: obj.q1Status && obj.q1Status !== '0' && obj.q1Status !== '0%' ? '#f0fdf4' : '#fafafa'
                        }}
                        title="Click to update Q1 status"
                      >
                        <div style={{ 
                          fontWeight: '700', 
                          fontSize: '0.85rem',
                          color: obj.q1Status && obj.q1Status !== '0' && obj.q1Status !== '0%' ? '#15803d' : '#64748b' 
                        }}>
                          {obj.q1Status || '0'}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Edit</span>
                      </td>

                      {/* Q2 Status */}
                      <td 
                        onClick={() => handleOpenQuarterModal(obj, 'Q2')}
                        style={{ 
                          padding: '12px 8px', 
                          verticalAlign: 'top', 
                          textAlign: 'center', 
                          borderRight: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          backgroundColor: obj.q2Status && obj.q2Status !== '0' && obj.q2Status !== '0%' ? '#f0fdf4' : '#fafafa'
                        }}
                        title="Click to update Q2 status"
                      >
                        <div style={{ 
                          fontWeight: '700', 
                          fontSize: '0.85rem',
                          color: obj.q2Status && obj.q2Status !== '0' && obj.q2Status !== '0%' ? '#15803d' : '#64748b' 
                        }}>
                          {obj.q2Status || '0'}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Edit</span>
                      </td>

                      {/* Q3 Status */}
                      <td 
                        onClick={() => handleOpenQuarterModal(obj, 'Q3')}
                        style={{ 
                          padding: '12px 8px', 
                          verticalAlign: 'top', 
                          textAlign: 'center', 
                          borderRight: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          backgroundColor: obj.q3Status && obj.q3Status !== '0' && obj.q3Status !== '0%' ? '#f0fdf4' : '#fafafa'
                        }}
                        title="Click to update Q3 status"
                      >
                        <div style={{ 
                          fontWeight: '700', 
                          fontSize: '0.85rem',
                          color: obj.q3Status && obj.q3Status !== '0' && obj.q3Status !== '0%' ? '#15803d' : '#64748b' 
                        }}>
                          {obj.q3Status || '0'}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Edit</span>
                      </td>

                      {/* Q4 Status */}
                      <td 
                        onClick={() => handleOpenQuarterModal(obj, 'Q4')}
                        style={{ 
                          padding: '12px 8px', 
                          verticalAlign: 'top', 
                          textAlign: 'center', 
                          borderRight: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          backgroundColor: obj.q4Status && obj.q4Status !== '0' && obj.q4Status !== '0%' ? '#f0fdf4' : '#fafafa'
                        }}
                        title="Click to update Q4 status"
                      >
                        <div style={{ 
                          fontWeight: '700', 
                          fontSize: '0.85rem',
                          color: obj.q4Status && obj.q4Status !== '0' && obj.q4Status !== '0%' ? '#15803d' : '#64748b' 
                        }}>
                          {obj.q4Status || '0'}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Edit</span>
                      </td>

                      {/* Comments / Records */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top', borderRight: '1px solid #e5e7eb', fontSize: '0.75rem' }}>
                        {obj.comments && (
                          <div style={{ color: '#334155', marginBottom: '4px' }}>
                            <strong style={{ color: '#0f172a' }}>Comment:</strong> {obj.comments}
                          </div>
                        )}
                        {obj.records && (
                          <div style={{ color: '#64748b' }}>
                            <strong style={{ color: '#475569' }}>Records:</strong> {obj.records}
                          </div>
                        )}
                        {!obj.comments && !obj.records && (
                          <span style={{ color: '#94a3b8' }}>No comments logged yet.</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                          {/* ISO Sheet Modal Button */}
                          <button
                            onClick={(e) => handleOpenIsoSheet(obj, e)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              cursor: 'pointer'
                            }}
                            title="View / Print ISO 9001:2015 Official Sheet (Version 3.0)"
                          >
                            <FileText size={13} /> ISO Sheet (V3.0)
                          </button>

                          {/* Quick Quarter Update Button */}
                          <button
                            onClick={(e) => handleOpenQuarterModal(obj, 'ALL', e)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: '#f5f3ff',
                              color: '#7c3aed',
                              border: '1px solid #ddd6fe',
                              cursor: 'pointer'
                            }}
                            title="Update Quarterly Progress & Comments"
                          >
                            <Calendar size={13} /> Update Quarter
                          </button>

                          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                            <button
                              onClick={() => navigate(`/objectives/${obj.id}`)}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer'
                              }}
                              title="Full Objective Details"
                            >
                              Details
                            </button>
                            <button
                              onClick={(e) => handleDelete(obj.id, e)}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: '#ef4444',
                                border: '1px solid #fecaca',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer'
                              }}
                              title="Delete Objective"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredObjectives.length === 0 && (
                  <tr>
                    <td colSpan={13} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      No quality objectives found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========================================================================= */
          /* STANDARD REGISTRY TABLE VIEW                                             */
          /* ========================================================================= */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Number</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Objective</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Progress</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Quarterly (Q1 - Q4)</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Target Date</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredObjectives.map((obj) => {
                  const progressPct = calculateProgress(obj.currentValue, obj.targetValue);
                  
                  return (
                    <tr 
                      key={obj.id} 
                      style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                      onClick={() => navigate(`/objectives/${obj.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#111827' }}>
                        {obj.objectiveNumber}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>{obj.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{obj.division || 'Company-Wide'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, backgroundColor: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${progressPct}%`, 
                              height: '100%', 
                              backgroundColor: progressPct >= 100 ? '#22c55e' : '#8b5cf6',
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', minWidth: '40px' }}>
                            {obj.currentValue} / {obj.targetValue} {obj.unit}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: obj.q1Status && obj.q1Status !== '0' && obj.q1Status !== '0%' ? '#dcfce7' : '#f1f5f9', color: obj.q1Status && obj.q1Status !== '0' && obj.q1Status !== '0%' ? '#166534' : '#64748b', fontWeight: '700' }}>Q1: {obj.q1Status || '0'}</span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: obj.q2Status && obj.q2Status !== '0' && obj.q2Status !== '0%' ? '#dcfce7' : '#f1f5f9', color: obj.q2Status && obj.q2Status !== '0' && obj.q2Status !== '0%' ? '#166534' : '#64748b', fontWeight: '700' }}>Q2: {obj.q2Status || '0'}</span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: obj.q3Status && obj.q3Status !== '0' && obj.q3Status !== '0%' ? '#dcfce7' : '#f1f5f9', color: obj.q3Status && obj.q3Status !== '0' && obj.q3Status !== '0%' ? '#166534' : '#64748b', fontWeight: '700' }}>Q3: {obj.q3Status || '0'}</span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: obj.q4Status && obj.q4Status !== '0' && obj.q4Status !== '0%' ? '#dcfce7' : '#f1f5f9', color: obj.q4Status && obj.q4Status !== '0' && obj.q4Status !== '0%' ? '#166534' : '#64748b', fontWeight: '700' }}>Q4: {obj.q4Status || '0'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                        {obj.targetDate ? new Date(obj.targetDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: 
                            obj.status === 'Achieved' ? '#dcfce3' : 
                            obj.status === 'Off-Track' ? '#fee2e2' : 
                            obj.status === 'Draft' ? '#f3f4f6' : '#e0f2fe',
                          color: 
                            obj.status === 'Achieved' ? '#166534' : 
                            obj.status === 'Off-Track' ? '#991b1b' : 
                            obj.status === 'Draft' ? '#374151' : '#0369a1'
                        }}>
                          {obj.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={(e) => handleOpenIsoSheet(obj, e)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#991b1b', borderColor: '#fecaca' }}
                            title="Print / View ISO Sheet"
                          >
                            <FileText size={14} /> Sheet
                          </button>
                          <button 
                            onClick={(e) => handleDelete(obj.id, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                            title="Delete Objective"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredObjectives.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      No objectives found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* QUICK QUARTER UPDATE MODAL                                                */}
      {/* ========================================================================= */}
      {isQuarterModalOpen && quarterModalObj && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#b91c1c',
              color: '#ffffff',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
                  ISO 9001:2015 Quarterly Review Update
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '2px' }}>
                  {quarterModalObj.objectiveNumber} - Quarterly Review
                </div>
              </div>
              <button
                onClick={() => setIsQuarterModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{quarterModalObj.title}</div>
                {quarterModalObj.corporateStrategicObjective && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    {quarterModalObj.corporateStrategicObjective}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '8px', fontSize: '0.75rem', color: '#475569' }}>
                  <span><strong>Method:</strong> {quarterModalObj.measurementMethod || '-'}</span>
                  <span><strong>2026 Target:</strong> {quarterModalObj.kpiTargetCurrent || `${quarterModalObj.targetValue} ${quarterModalObj.unit}`}</span>
                </div>
              </div>

              {/* Quarter Selector Tabs */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Select Quarter to Update:
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSelectedQuarterToEdit(q)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        border: '1px solid',
                        borderColor: selectedQuarterToEdit === q ? '#b91c1c' : '#cbd5e1',
                        backgroundColor: selectedQuarterToEdit === q ? '#fee2e2' : '#ffffff',
                        color: selectedQuarterToEdit === q ? '#991b1b' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {q === 'ALL' ? 'All Quarters' : `${q} Review`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Quarterly Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, idx) => {
                  const key = `q${idx + 1}Status` as 'q1Status' | 'q2Status' | 'q3Status' | 'q4Status';
                  const isHighlighted = selectedQuarterToEdit === 'ALL' || selectedQuarterToEdit === q;

                  return (
                    <div 
                      key={q}
                      style={{
                        border: '1px solid',
                        borderColor: isHighlighted ? '#b91c1c' : '#e2e8f0',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        backgroundColor: isHighlighted ? '#fff' : '#f8fafc',
                        opacity: isHighlighted ? 1 : 0.6
                      }}
                    >
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#b91c1c', marginBottom: '4px' }}>
                        {q} Status
                      </label>
                      <input
                        type="text"
                        value={quarterFormData[key]}
                        onChange={(e) => setQuarterFormData({ ...quarterFormData, [key]: e.target.value })}
                        placeholder="e.g. 100%, 4, 1"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Current Progress & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Current Total Value ({quarterFormData.unit || quarterModalObj.unit})
                  </label>
                  <input
                    type="number"
                    value={quarterFormData.currentValue}
                    onChange={(e) => setQuarterFormData({ ...quarterFormData, currentValue: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Objective Status
                  </label>
                  <select
                    value={quarterFormData.status}
                    onChange={(e) => setQuarterFormData({ ...quarterFormData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Achieved">Achieved</option>
                    <option value="Off-Track">Off-Track</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Comments */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Quarterly Comments & Remarks
                </label>
                <textarea
                  rows={3}
                  value={quarterFormData.comments}
                  onChange={(e) => setQuarterFormData({ ...quarterFormData, comments: e.target.value })}
                  placeholder="e.g. All projects have MIS access. Document control and change management procedures are followed."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Records */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Evidence / Verification Records
                </label>
                <input
                  type="text"
                  value={quarterFormData.records}
                  onChange={(e) => setQuarterFormData({ ...quarterFormData, records: e.target.value })}
                  placeholder="e.g. MIS Access Log, Project Technical Audit Reports, Training Reports"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => setIsQuarterModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuarterModal}
                disabled={isSavingQuarter}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  backgroundColor: '#b91c1c',
                  color: '#ffffff',
                  cursor: isSavingQuarter ? 'not-allowed' : 'pointer'
                }}
              >
                <Check size={16} /> {isSavingQuarter ? 'Saving...' : 'Save Quarterly Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ISO SHEET MODAL (VERSION 3.0 REPLICA WITH PDF EXPORT & FULL EDITING)      */}
      {/* ========================================================================= */}
      {isIsoSheetOpen && activeIsoSheet && (
        <QualityObjectiveIsoSheet
          objective={activeIsoSheet}
          isOpen={isIsoSheetOpen}
          onClose={() => {
            setIsIsoSheetOpen(false);
            setActiveIsoSheet(null);
          }}
          onSave={handleSaveIsoSheet}
          editable={true}
        />
      )}

      {/* Exporting Loading Overlay */}
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
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
              borderTopColor: '#8b5cf6',
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

export default ObjectivesDashboard;
