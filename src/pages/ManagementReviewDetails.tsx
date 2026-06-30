import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface User {
  id: number;
  name: string;
}

interface ActionItem {
  id?: number;
  description: string;
  assignedToId: number | null;
  assignedTo?: User;
  dueDate: string | null;
  status: string;
  sectionKey?: string | null;
}

interface ManagementReview {
  id: number;
  meetingNumber: string;
  scheduledDate: string | null;
  conductedDate: string | null;
  status: string;
  chairpersonId: number;
  attendees: User[];
  auditResultsSummary: string;
  capaSummary: string;
  riskSummary: string;
  generalNotes: string;
  decisions: string;
  previousActionsStatus: string;
  changesInIssues: string;
  customerFeedbackSummary: string;
  qualityObjectivesSummary: string;
  monitoringResults: string;
  providerPerformanceSummary: string;
  adequacyOfResources: string;
  policyReviewSummary: string;
  processPerformanceProductConformitySummary: string;
  continualImprovementSummary: string;
  organizationContextScope: string;
  documentManagementStructure: string;
  trainingCompetence: string;
  emergencyPreparedness: string;
  workerConsultationParticipation: string;
  purpose: string;
  conclusion: string;
  approvedByName: string;
  approvedDate: string;
  cardOrder: string[] | null;
  cardOutputs: Record<string, string> | null;
  actionItems: ActionItem[];
}

interface GuidanceBlock {
  title: string;
  items: string[];
}

interface SectionDefinition {
  key: string;
  label: string;
  placeholderInput: string;
  placeholderOutput: string;
  guidance?: GuidanceBlock[];
}

const DEFAULT_SECTIONS: SectionDefinition[] = [
  {
    key: 'previousActionsStatus',
    label: 'Status of actions from previous meetings',
    placeholderInput: 'Status of actions from previous management review meetings...',
    placeholderOutput: 'Decisions/Actions on previous actions...',
    guidance: [
      {
        title: 'Prior Action Items Review:',
        items: [
          'Management review action log;',
          'Actions from the previous meeting (open/closed).'
        ]
      },
      {
        title: 'Prior Meeting Minutes Review:',
        items: [
          'Minutes from previous management review meeting;',
          'Age profile of open actions, e.g., 3 months, 6 months, greater than 1 year.'
        ]
      }
    ]
  },
  {
    key: 'changesInIssues',
    label: 'Changes in external and internal issues',
    placeholderInput: 'Changes in external and internal issues relevant to the QMS...',
    placeholderOutput: 'Decisions/Actions on changes in external/internal issues...',
    guidance: [
      {
        title: 'Internal Issues Review:',
        items: [
          'Changes in organizational structure, key personnel, or core processes;',
          'Strategic direction alignment and internal SWOT factors.'
        ]
      },
      {
        title: 'External Issues Review:',
        items: [
          'Market trends, legal/regulatory developments, and technological changes;',
          'Economic factors and competitor activities affecting the QMS.'
        ]
      }
    ]
  },
  {
    key: 'customerFeedbackSummary',
    label: 'Customer feedback and interested party feedback',
    placeholderInput: 'Information on the performance and effectiveness of the QMS, including customer feedback and interested party feedback...',
    placeholderOutput: 'Decisions/Actions on customer and interested party feedback...',
    guidance: [
      {
        title: 'Customer Satisfaction Review:',
        items: [
          'Customer survey scores, compliments, and key complaints;',
          'Client retention rates and service delivery feedback.'
        ]
      },
      {
        title: 'Interested Parties Review:',
        items: [
          'Feedback from regulatory bodies, partners, and key stakeholders;',
          'Changing needs and expectations of interested parties.'
        ]
      }
    ]
  },
  {
    key: 'qualityObjectivesSummary',
    label: 'Quality objectives and KPIs',
    placeholderInput: 'The extent to which quality objectives and KPIs have been met...',
    placeholderOutput: 'Decisions/Actions on quality objectives and KPIs...',
    guidance: [
      {
        title: 'Objective Tracking:',
        items: [
          'Status of company-wide and division-specific quality objectives;',
          'Performance trends against target benchmarks.'
        ]
      },
      {
        title: 'KPI Measurements:',
        items: [
          'Monitoring data from engineering, project, and administrative divisions;',
          'Identification of off-track metrics requiring corrective actions.'
        ]
      }
    ]
  },
  {
    key: 'auditResultsSummary',
    label: 'Audit Results Summary',
    placeholderInput: 'Summary of internal and external audit findings...',
    placeholderOutput: 'Decisions/Actions on audit results...',
    guidance: [
      {
        title: 'Internal Audits:',
        items: [
          'Findings from scheduled internal audits and system reviews;',
          'Number of minor and major non-conformities identified.'
        ]
      },
      {
        title: 'External Audits:',
        items: [
          'Certification body assessments and client audits;',
          'Opportunities for improvement (OFIs) and compliance status.'
        ]
      }
    ]
  },
  {
    key: 'capaSummary',
    label: 'Non-Conformities & CAPA',
    placeholderInput: 'Status of corrective and preventive actions...',
    placeholderOutput: 'Decisions/Actions on non-conformities & CAPA...',
    guidance: [
      {
        title: 'Non-Conformities:',
        items: [
          'Product or service non-conformities logged during the period;',
          'Analysis of recurring issues and root causes.'
        ]
      },
      {
        title: 'Corrective Actions:',
        items: [
          'Implementation status of Corrective and Preventive Actions (CAPAs);',
          'Verification of effectiveness for closed actions.'
        ]
      }
    ]
  },
  {
    key: 'monitoringResults',
    label: 'Monitoring and measurement results',
    placeholderInput: 'Monitoring and measurement results...',
    placeholderOutput: 'Decisions/Actions on monitoring and measurement results...',
    guidance: [
      {
        title: 'Process Performance:',
        items: [
          'Product/service conformance metrics and inspection logs;',
          'Verification and validation records from active projects.'
        ]
      },
      {
        title: 'Equipment & Systems:',
        items: [
          'Calibration status and maintenance records of measuring equipment;',
          'Software and system performance metrics.'
        ]
      }
    ]
  },
  {
    key: 'providerPerformanceSummary',
    label: 'Performance of external providers',
    placeholderInput: 'Performance of external providers (suppliers, contractors)...',
    placeholderOutput: 'Decisions/Actions on performance of external providers...',
    guidance: [
      {
        title: 'Supplier Evaluations:',
        items: [
          'Supplier scorecards (quality, delivery, responsiveness);',
          'Status of critical subcontractors and materials providers.'
        ]
      },
      {
        title: 'External Services:',
        items: [
          'Performance reviews of outsourced design or testing agencies;',
          'Issues/claims relating to external providers.'
        ]
      }
    ]
  },
  {
    key: 'adequacyOfResources',
    label: 'Adequacy of resources',
    placeholderInput: 'The adequacy of resources...',
    placeholderOutput: 'Decisions/Actions on adequacy of resources...',
    guidance: [
      {
        title: 'Human Resources:',
        items: [
          'Staff competence, training history, and resource constraints;',
          'Personnel allocations to key projects and roles.'
        ]
      },
      {
        title: 'Infrastructure & Environment:',
        items: [
          'Adequacy of physical facilities, IT systems, and design software;',
          'Workspace conditions and support resources.'
        ]
      }
    ]
  },
  {
    key: 'riskSummary',
    label: 'Risks & Opportunities',
    placeholderInput: 'Effectiveness of actions taken to address risks and opportunities...',
    placeholderOutput: 'Decisions/Actions on risks & opportunities...',
    guidance: [
      {
        title: 'Actions on Risks:',
        items: [
          'Effectiveness of mitigation plans for identified operational risks;',
          'Review of newly identified threats and threat levels.'
        ]
      },
      {
        title: 'Actions on Opportunities:',
        items: [
          'Status of QMS improvement initiatives and market opportunities;',
          'Realized benefits from proactive changes.'
        ]
      }
    ]
  },
  {
    key: 'policyReviewSummary',
    label: 'Review of Policy for the IMS',
    placeholderInput: 'Review of Quality, HSE, and other IMS policies suitability and effectiveness...',
    placeholderOutput: 'Decisions/Actions on IMS Policy...',
    guidance: [
      {
        title: 'Policy Suitability:',
        items: [
          'Review of the Quality Policy, HSE Policy, and other IMS policies suitability and effectiveness;',
          'Alignment of policies with organizational goals and context.'
        ]
      },
      {
        title: 'Policy Awareness:',
        items: [
          'Policy communication and understanding among employees and stakeholders.'
        ]
      }
    ]
  },
  {
    key: 'processPerformanceProductConformitySummary',
    label: 'Process performance & Product conformity for IMS',
    placeholderInput: 'Process performance indicators, product and service conformity logs...',
    placeholderOutput: 'Decisions/Actions on process performance & product conformity...',
    guidance: [
      {
        title: 'Process Performance:',
        items: [
          'Key process indicators, performance bottlenecks, and efficiency metrics;',
          'Conformity of design deliverables, reports, and service outcomes.'
        ]
      },
      {
        title: 'Product Conformity:',
        items: [
          'Project quality logs, non-conformance trends, and inspection reports.'
        ]
      }
    ]
  },
  {
    key: 'continualImprovementSummary',
    label: 'Recommendations for improvement / Opportunities for continual improvement',
    placeholderInput: 'Opportunities for continual improvement and recommendations...',
    placeholderOutput: 'Decisions/Actions on continual improvement and recommendations...',
    guidance: [
      {
        title: 'Continual Improvement:',
        items: [
          'Suggestions and recommendations from audits, personnel, or management;',
          'Preventive actions and process optimization opportunities.'
        ]
      },
      {
        title: 'Innovations:',
        items: [
          'Adoption of new design tools, AI planning copilots, or updated QMS guidelines.'
        ]
      }
    ]
  },
  {
    key: 'organizationContextScope',
    label: 'Context and Scope of the Organization',
    placeholderInput: 'Review context and scope of the organization, external/internal issues...',
    placeholderOutput: 'Decisions/Actions on Organization Context & Scope...',
    guidance: [
      {
        title: 'Organization Context Scope:',
        items: [
          'Review scope boundaries and applicability of QMS;',
          'Review issues and conditions that affect organization strategic direction.'
        ]
      }
    ]
  },
  {
    key: 'documentManagementStructure',
    label: 'Structure of Document Management System',
    placeholderInput: 'Review structure, control, and update history of Document Management System...',
    placeholderOutput: 'Decisions/Actions on Document Management System...',
    guidance: [
      {
        title: 'DMS Structure & Control:',
        items: [
          'Adequacy and structure of QMS documentation;',
          'Effectiveness of control, access, and storage of documents.'
        ]
      }
    ]
  },
  {
    key: 'trainingCompetence',
    label: 'Training & Competence',
    placeholderInput: 'Review training needs, competence assessments, and educational logs...',
    placeholderOutput: 'Decisions/Actions on training & competence...',
    guidance: [
      {
        title: 'Personnel Competence:',
        items: [
          'Assess requirements for education, training, and experience;',
          'Status of training programs and skill matrix gaps.'
        ]
      }
    ]
  },
  {
    key: 'emergencyPreparedness',
    label: 'Emergency Preparedness',
    placeholderInput: 'Review emergency plans, drills feedback, and preparedness logs...',
    placeholderOutput: 'Decisions/Actions on emergency preparedness...',
    guidance: [
      {
        title: 'Emergency Plans & Response:',
        items: [
          'Verify currency of emergency plans and contact numbers;',
          'Review reports from emergency drill exercises.'
        ]
      }
    ]
  },
  {
    key: 'workerConsultationParticipation',
    label: 'Consultation and participation of workers',
    placeholderInput: 'Consultation outcomes, worker feedback, safety committee minutes...',
    placeholderOutput: 'Decisions/Actions on worker consultation & participation...',
    guidance: [
      {
        title: 'Worker Consultation:',
        items: [
          'Effectiveness of feedback channels and safety committees;',
          'Worker participation in hazard identification and audits.'
        ]
      }
    ]
  },
  {
    key: 'generalNotes',
    label: 'General Notes & Other Inputs',
    placeholderInput: 'Other general notes or inputs...',
    placeholderOutput: 'Decisions/Actions on other general notes or inputs...',
    guidance: [
      {
        title: 'Other Input Sources:',
        items: [
          'General notes, miscellaneous observations, or external recommendations;',
          'Safety or health-related topics brought up during the review.'
        ]
      }
    ]
  }
];

const ManagementReviewDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ManagementReview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Section-specific Action states
  const [newActions, setNewActions] = useState<Record<string, ActionItem>>({});
  // General (Global) Action state
  const [generalNewAction, setGeneralNewAction] = useState<ActionItem>({ description: '', assignedToId: null, dueDate: '', status: 'Open' });

  useEffect(() => {
    fetchReview();
    fetchUsers();
  }, [id]);

  const fetchReview = async () => {
    try {
      const response = await fetch(`/api/management-reviews/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && !data.purpose) {
          data.purpose = 'To evaluate overall QMS effectiveness and to enable evidence-based decision-making and the establishment of actions to achieve desired results. Actions arising from the management review are recorded as Action Items.';
        }
        if (data && !data.conclusion) {
          data.conclusion = 'Top Management concluded that the QMS remains suitable, adequate, and effective in meeting the company\'s strategic goals and the requirements of ISO';
        }
        if (data && !data.approvedByName) {
          data.approvedByName = 'Managing Director';
        }
        if (data && !data.approvedDate) {
          data.approvedDate = new Date().toISOString().split('T')[0];
        }
        setReview(data);
      }
      else navigate('/management-reviews');
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setUsers(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!review) return;
    setIsSaving(true);
    try {
      const attendeeIds = review.attendees.map(a => a.id);
      const response = await fetch(`/api/management-reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...review, attendeeIds })
      });
      if (response.ok) {
        setReview(await response.json());
        alert('Review saved successfully');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save review');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSectionAction = async (sectionKey: string) => {
    const actionData = newActions[sectionKey];
    if (!actionData || !actionData.description) return;
    try {
      const response = await fetch(`/api/management-reviews/${id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...actionData, sectionKey })
      });
      if (response.ok) {
        const addedAction = await response.json();
        setReview(prev => prev ? { ...prev, actionItems: [...prev.actionItems, addedAction] } : null);
        setNewActions(prev => ({
          ...prev,
          [sectionKey]: { description: '', assignedToId: null, dueDate: '', status: 'Open' }
        }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddGeneralAction = async () => {
    if (!generalNewAction.description) return;
    try {
      const response = await fetch(`/api/management-reviews/${id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...generalNewAction, sectionKey: null })
      });
      if (response.ok) {
        const addedAction = await response.json();
        setReview(prev => prev ? { ...prev, actionItems: [...prev.actionItems, addedAction] } : null);
        setGeneralNewAction({ description: '', assignedToId: null, dueDate: '', status: 'Open' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    if (!confirm('Delete this action item?')) return;
    try {
      const response = await fetch(`/api/management-reviews/${id}/actions/${actionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setReview(prev => prev ? { 
          ...prev, 
          actionItems: prev.actionItems.filter(a => a.id !== actionId) 
        } : null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateActionStatus = async (actionId: number, status: string) => {
    try {
      const actionToUpdate = review?.actionItems.find(a => a.id === actionId);
      if (!actionToUpdate) return;
      
      const response = await fetch(`/api/management-reviews/${id}/actions/${actionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...actionToUpdate, status })
      });
      
      if (response.ok) {
        const updated = await response.json();
        setReview(prev => prev ? {
          ...prev,
          actionItems: prev.actionItems.map(a => a.id === actionId ? updated : a)
        } : null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    if (!review) return;
    const baseOrder = Array.isArray(review.cardOrder) 
      ? [...review.cardOrder] 
      : DEFAULT_SECTIONS.map(s => s.key);
      
    let currentOrder = baseOrder.filter(key => DEFAULT_SECTIONS.some(s => s.key === key));
    DEFAULT_SECTIONS.forEach(s => {
      if (!currentOrder.includes(s.key)) {
        currentOrder.push(s.key);
      }
    });
      
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
    
    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIndex];
    currentOrder[targetIndex] = temp;
    
    setReview({
      ...review,
      cardOrder: currentOrder
    });
  };

  const exportPDF = async () => {
    if (!review) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // We will create pages off-screen, render to canvas, and add to PDF
      const pagesToRender: HTMLDivElement[] = [];

      // Determine current card ordering
      const baseOrder = Array.isArray(review.cardOrder)
        ? review.cardOrder
        : DEFAULT_SECTIONS.map(s => s.key);

      const orderedKeys = baseOrder.filter(key => DEFAULT_SECTIONS.some(s => s.key === key));
      DEFAULT_SECTIONS.forEach(s => {
        if (!orderedKeys.includes(s.key)) {
          orderedKeys.push(s.key);
        }
      });

      const orderedSections = orderedKeys.map(key => DEFAULT_SECTIONS.find(s => s.key === key)!);

      // Helper function to create a page element
      const createPageElement = () => {
        const page = document.createElement('div');
        page.style.width = '794px'; // Standard A4 width at 96 DPI
        page.style.height = '1123px'; // Standard A4 height at 96 DPI
        page.style.backgroundColor = '#ffffff';
        page.style.color = '#000000';
        page.style.fontFamily = "'Inter', sans-serif";
        page.style.padding = '40px';
        page.style.boxSizing = 'border-box';
        page.style.display = 'flex';
        page.style.flexDirection = 'column';
        page.style.position = 'relative';
        return page;
      };

      // Helper function to add a header to a page
      const addHeader = (page: HTMLDivElement) => {
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.width = '100%';
        header.style.borderBottom = '2px solid #cbd5e1';
        header.style.paddingBottom = '12px';
        header.style.marginBottom = '24px';
        header.style.boxSizing = 'border-box';

        const logoContainer = document.createElement('div');
        const logoImg = document.createElement('img');
        logoImg.src = '/prome.png';
        logoImg.style.height = '44px';
        logoImg.style.display = 'block';
        logoContainer.appendChild(logoImg);

        const metaContainer = document.createElement('div');
        metaContainer.style.textAlign = 'right';
        metaContainer.style.color = '#475569';
        metaContainer.style.fontSize = '12px';
        metaContainer.style.lineHeight = '1.4';

        const titleText = document.createElement('div');
        titleText.style.fontWeight = 'bold';
        titleText.style.fontSize = '14px';
        titleText.style.color = '#0f172a';
        titleText.style.marginBottom = '2px';
        titleText.innerText = 'Minutes of Management Review Meeting';

        const subTitleText = document.createElement('div');
        subTitleText.style.fontSize = '11px';
        subTitleText.style.color = '#0369a1';
        subTitleText.style.fontWeight = '600';
        subTitleText.style.marginBottom = '4px';
        subTitleText.innerText = 'IMS (ISO 9001:2015 and ISO 45001:2018)';

        const docRef = document.createElement('div');
        docRef.innerHTML = `Doc Ref: <span style="font-weight: 600; color: #1e293b;">PROME-IMSR-AFD-05</span>`;

        const status = document.createElement('div');
        status.innerHTML = `Status: <span style="font-weight: 600; color: #1e293b;">${review.status}</span>`;

        const date = document.createElement('div');
        date.innerHTML = `Date: <span style="font-weight: 600; color: #1e293b;">${review.conductedDate ? new Date(review.conductedDate).toLocaleDateString() : '-'}</span>`;

        metaContainer.appendChild(titleText);
        metaContainer.appendChild(subTitleText);
        metaContainer.appendChild(docRef);
        metaContainer.appendChild(status);
        metaContainer.appendChild(date);

        header.appendChild(logoContainer);
        header.appendChild(metaContainer);
        page.appendChild(header);
      };

      // Helper function to add footer to a page
      const addFooter = (page: HTMLDivElement, pageNum: number) => {
        const footer = document.createElement('div');
        footer.style.position = 'absolute';
        footer.style.bottom = '30px';
        footer.style.left = '40px';
        footer.style.right = '40px';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';
        footer.style.borderTop = '1px solid #cbd5e1';
        footer.style.paddingTop = '10px';
        footer.style.fontSize = '11px';
        footer.style.color = '#64748b';

        const leftText = document.createElement('div');
        leftText.innerText = 'PROME Consultants Ltd.';

        const rightText = document.createElement('div');
        rightText.innerText = `Page ${pageNum}`;

        footer.appendChild(leftText);
        footer.appendChild(rightText);
        page.appendChild(footer);
      };

      // PAGE 1: COVER PAGE
      const page1 = createPageElement();
      addHeader(page1);

      const page1Content = document.createElement('div');
      page1Content.style.flex = '1';
      page1Content.style.display = 'flex';
      page1Content.style.flexDirection = 'column';
      page1Content.style.gap = '20px';

      // Purpose
      const purposeCard = document.createElement('div');
      purposeCard.style.border = '1px solid #cbd5e1';
      purposeCard.style.borderRadius = '8px';
      purposeCard.style.padding = '20px';
      purposeCard.style.backgroundColor = '#ffffff';

      const purposeTitle = document.createElement('h2');
      purposeTitle.style.fontSize = '16px';
      purposeTitle.style.fontWeight = 'bold';
      purposeTitle.style.color = '#1e293b';
      purposeTitle.style.borderBottom = '1px solid #e2e8f0';
      purposeTitle.style.paddingBottom = '8px';
      purposeTitle.style.margin = '0 0 12px 0';
      purposeTitle.innerText = 'Purpose of Management Review Meeting';

      const purposeText = document.createElement('div');
      purposeText.style.fontSize = '13px';
      purposeText.style.color = '#334155';
      purposeText.style.lineHeight = '1.5';
      purposeText.innerText = review.purpose || 'To evaluate overall QMS effectiveness...';

      purposeCard.appendChild(purposeTitle);
      purposeCard.appendChild(purposeText);
      page1Content.appendChild(purposeCard);

      // Agenda
      const agendaCard = document.createElement('div');
      agendaCard.style.border = '1px solid #cbd5e1';
      agendaCard.style.borderRadius = '8px';
      agendaCard.style.padding = '20px';
      agendaCard.style.backgroundColor = '#ffffff';

      const agendaTitle = document.createElement('h2');
      agendaTitle.style.fontSize = '16px';
      agendaTitle.style.fontWeight = 'bold';
      agendaTitle.style.color = '#1e293b';
      agendaTitle.style.borderBottom = '1px solid #e2e8f0';
      agendaTitle.style.paddingBottom = '8px';
      agendaTitle.style.margin = '0 0 12px 0';
      agendaTitle.innerText = 'Agenda';

      const agendaList = document.createElement('ol');
      agendaList.style.margin = '0';
      agendaList.style.paddingLeft = '20px';
      agendaList.style.fontSize = '13px';
      agendaList.style.color = '#334155';
      agendaList.style.lineHeight = '1.6';

      orderedSections.forEach((section) => {
        const item = document.createElement('li');
        item.style.fontWeight = '500';
        item.innerText = section.label;
        agendaList.appendChild(item);
      });

      agendaCard.appendChild(agendaTitle);
      agendaCard.appendChild(agendaList);
      page1Content.appendChild(agendaCard);

      // Attendees
      const attendeesCard = document.createElement('div');
      attendeesCard.style.border = '1px solid #cbd5e1';
      attendeesCard.style.borderRadius = '8px';
      attendeesCard.style.padding = '20px';
      attendeesCard.style.backgroundColor = '#ffffff';

      const attendeesTitle = document.createElement('h2');
      attendeesTitle.style.fontSize = '16px';
      attendeesTitle.style.fontWeight = 'bold';
      attendeesTitle.style.color = '#1e293b';
      attendeesTitle.style.borderBottom = '1px solid #e2e8f0';
      attendeesTitle.style.paddingBottom = '8px';
      attendeesTitle.style.margin = '0 0 12px 0';
      attendeesTitle.innerText = 'List of Attendees';

      const attendeesList = document.createElement('div');
      attendeesList.style.display = 'flex';
      attendeesList.style.flexDirection = 'column';
      attendeesList.style.gap = '6px';
      attendeesList.style.fontSize = '13px';
      attendeesList.style.color = '#334155';

      review.attendees.forEach((attendee, index) => {
        const item = document.createElement('div');
        item.style.fontWeight = '500';
        item.innerText = `${index + 1}. ${attendee.name}`;
        attendeesList.appendChild(item);
      });

      if (review.attendees.length === 0) {
        const empty = document.createElement('div');
        empty.style.fontStyle = 'italic';
        empty.style.color = '#64748b';
        empty.innerText = 'No attendees recorded.';
        attendeesList.appendChild(empty);
      }

      attendeesCard.appendChild(attendeesTitle);
      attendeesCard.appendChild(attendeesList);
      page1Content.appendChild(attendeesCard);

      page1.appendChild(page1Content);
      pagesToRender.push(page1);

      // CARDS 2 to N: One Card per Page
      orderedSections.forEach((section, index) => {
        const cardPage = createPageElement();
        addHeader(cardPage);

        const cardContent = document.createElement('div');
        cardContent.style.flex = '1';
        cardContent.style.display = 'flex';
        cardContent.style.flexDirection = 'column';
        cardContent.style.gap = '20px';

        const mainCard = document.createElement('div');
        mainCard.style.border = '1px solid #cbd5e1';
        mainCard.style.borderRadius = '8px';
        mainCard.style.padding = '24px';
        mainCard.style.backgroundColor = '#ffffff';
        mainCard.style.display = 'flex';
        mainCard.style.flexDirection = 'column';
        mainCard.style.gap = '16px';

        const cardHeader = document.createElement('h3');
        cardHeader.style.fontSize = '18px';
        cardHeader.style.fontWeight = 'bold';
        cardHeader.style.color = '#0f172a';
        cardHeader.style.borderBottom = '1px solid #e2e8f0';
        cardHeader.style.paddingBottom = '10px';
        cardHeader.style.margin = '0';
        cardHeader.innerText = `${index + 1}. ${section.label}`;
        mainCard.appendChild(cardHeader);

        // Inputs Section
        const inputDiv = document.createElement('div');
        const inputLabel = document.createElement('label');
        inputLabel.style.fontSize = '12px';
        inputLabel.style.fontWeight = 'bold';
        inputLabel.style.color = '#475569';
        inputLabel.style.textTransform = 'uppercase';
        inputLabel.style.display = 'block';
        inputLabel.style.marginBottom = '6px';
        inputLabel.innerText = 'Review Inputs Details / Findings';

        const inputText = document.createElement('div');
        inputText.style.fontSize = '13px';
        inputText.style.color = '#334155';
        inputText.style.whiteSpace = 'pre-wrap';
        inputText.style.lineHeight = '1.5';
        inputText.style.backgroundColor = '#f8fafc';
        inputText.style.padding = '12px';
        inputText.style.borderRadius = '6px';
        inputText.style.border = '1px solid #e2e8f0';
        inputText.style.minHeight = '60px';
        inputText.innerText = review[section.key as keyof typeof review] as string || '-';

        inputDiv.appendChild(inputLabel);
        inputDiv.appendChild(inputText);
        mainCard.appendChild(inputDiv);

        // Outputs Section
        const outputDiv = document.createElement('div');
        const outputLabel = document.createElement('label');
        outputLabel.style.fontSize = '12px';
        outputLabel.style.fontWeight = 'bold';
        outputLabel.style.color = '#475569';
        outputLabel.style.textTransform = 'uppercase';
        outputLabel.style.display = 'block';
        outputLabel.style.marginBottom = '6px';
        outputLabel.innerText = 'Review Output / Decisions & Resource Needs';

        const outputsObj = typeof review.cardOutputs === 'object' && review.cardOutputs ? review.cardOutputs : {};
        const outputText = document.createElement('div');
        outputText.style.fontSize = '13px';
        outputText.style.color = '#334155';
        outputText.style.whiteSpace = 'pre-wrap';
        outputText.style.lineHeight = '1.5';
        outputText.style.backgroundColor = '#f8fafc';
        outputText.style.padding = '12px';
        outputText.style.borderRadius = '6px';
        outputText.style.border = '1px solid #e2e8f0';
        outputText.style.minHeight = '60px';
        outputText.innerText = (outputsObj as any)[section.key] || '-';

        outputDiv.appendChild(outputLabel);
        outputDiv.appendChild(outputText);
        mainCard.appendChild(outputDiv);

        // Action Items Table
        const sectionActionItems = review.actionItems.filter(action => action.sectionKey === section.key);
        if (sectionActionItems.length > 0) {
          const actionsDiv = document.createElement('div');
          const actionsLabel = document.createElement('label');
          actionsLabel.style.fontSize = '12px';
          actionsLabel.style.fontWeight = 'bold';
          actionsLabel.style.color = '#475569';
          actionsLabel.style.textTransform = 'uppercase';
          actionsLabel.style.display = 'block';
          actionsLabel.style.marginBottom = '8px';
          actionsLabel.innerText = 'Action Items';

          const table = document.createElement('table');
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
          table.style.fontSize = '12px';
          table.style.border = '1px solid #cbd5e1';

          const thead = document.createElement('thead');
          thead.style.backgroundColor = '#f1f5f9';
          thead.innerHTML = `
            <tr>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b;">Description</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b; width: 120px;">Assigned To</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b; width: 100px;">Due Date</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b; width: 90px;">Status</th>
            </tr>
          `;
          table.appendChild(thead);

          const tbody = document.createElement('tbody');
          sectionActionItems.forEach(action => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="border: 1px solid #cbd5e1; padding: 8px; color: #334155;">${action.description}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; color: #334155;">${action.assignedTo?.name || '-'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; color: #334155;">${action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '-'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 600; color: ${action.status === 'Completed' ? '#16a34a' : '#2563eb'};">${action.status}</td>
            `;
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);

          actionsDiv.appendChild(actionsLabel);
          actionsDiv.appendChild(table);
          mainCard.appendChild(actionsDiv);
        }

        cardContent.appendChild(mainCard);
        cardPage.appendChild(cardContent);
        pagesToRender.push(cardPage);
      });

      // LAST PAGE: CONCLUSION PAGE
      const conclusionPage = createPageElement();
      addHeader(conclusionPage);

      const conclusionContent = document.createElement('div');
      conclusionContent.style.flex = '1';
      conclusionContent.style.display = 'flex';
      conclusionContent.style.flexDirection = 'column';
      conclusionContent.style.gap = '20px';

      const conclusionCard = document.createElement('div');
      conclusionCard.style.border = '1px solid #cbd5e1';
      conclusionCard.style.borderRadius = '8px';
      conclusionCard.style.padding = '24px';
      conclusionCard.style.backgroundColor = '#ffffff';

      const conclusionTitle = document.createElement('h2');
      conclusionTitle.style.fontSize = '18px';
      conclusionTitle.style.fontWeight = 'bold';
      conclusionTitle.style.color = '#1e293b';
      conclusionTitle.style.borderBottom = '1px solid #e2e8f0';
      conclusionTitle.style.paddingBottom = '10px';
      conclusionTitle.style.margin = '0 0 16px 0';
      conclusionTitle.innerText = 'Conclusion';

      const conclusionText = document.createElement('div');
      conclusionText.style.fontSize = '14px';
      conclusionText.style.color = '#000000';
      conclusionText.style.lineHeight = '1.6';
      conclusionText.style.whiteSpace = 'pre-wrap';
      conclusionText.innerText = review.conclusion || 'Top Management concluded that the QMS remains suitable...';
      conclusionCard.appendChild(conclusionTitle);
      conclusionCard.appendChild(conclusionText);

      // Signatures Block
      const sigBlock = document.createElement('div');
      sigBlock.style.marginTop = '40px';
      sigBlock.style.display = 'flex';
      sigBlock.style.flexDirection = 'column';
      sigBlock.style.gap = '8px';

      const sigRow = document.createElement('div');
      sigRow.style.display = 'flex';
      sigRow.style.justifyContent = 'space-between';
      sigRow.style.alignItems = 'flex-end';
      sigRow.style.width = '100%';
      sigRow.style.maxWidth = '600px';

      const sigLine = document.createElement('div');
      sigLine.style.borderBottom = '1px solid #000000';
      sigLine.style.width = '300px';
      sigLine.style.paddingBottom = '4px';
      sigLine.style.fontSize = '13px';
      sigLine.innerText = review.approvedByName || 'Managing Director';

      const dateBlock = document.createElement('div');
      dateBlock.style.fontSize = '13px';
      dateBlock.style.display = 'flex';
      dateBlock.style.alignItems = 'flex-end';
      dateBlock.style.gap = '8px';

      const dateLabel = document.createElement('strong');
      dateLabel.innerText = 'Date:';

      const dateLine = document.createElement('span');
      dateLine.style.borderBottom = '1px solid #000000';
      dateLine.style.width = '200px';
      dateLine.style.display = 'inline-block';
      dateLine.style.textAlign = 'center';
      dateLine.style.paddingBottom = '4px';
      dateLine.innerText = review.approvedDate ? new Date(review.approvedDate).toLocaleDateString() : '';

      dateBlock.appendChild(dateLabel);
      dateBlock.appendChild(dateLine);
      sigRow.appendChild(sigLine);
      sigRow.appendChild(dateBlock);

      const sigTag = document.createElement('div');
      sigTag.style.fontSize = '11px';
      sigTag.style.fontStyle = 'italic';
      sigTag.style.color = '#475569';
      sigTag.style.marginTop = '2px';
      sigTag.innerText = '[Managing Director Signature]';

      sigBlock.appendChild(sigRow);
      sigBlock.appendChild(sigTag);
      conclusionCard.appendChild(sigBlock);

      // Add general unassigned action items to conclusion page if any exist
      const generalActionItems = review.actionItems.filter(action => !action.sectionKey);
      if (generalActionItems.length > 0) {
        const generalActionsDiv = document.createElement('div');
        generalActionsDiv.style.marginTop = '30px';

        const generalActionsLabel = document.createElement('label');
        generalActionsLabel.style.fontSize = '12px';
        generalActionsLabel.style.fontWeight = 'bold';
        generalActionsLabel.style.color = '#475569';
        generalActionsLabel.style.textTransform = 'uppercase';
        generalActionsLabel.style.display = 'block';
        generalActionsLabel.style.marginBottom = '8px';
        generalActionsLabel.innerText = 'General / Unassigned Action Items';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '12px';
        table.style.border = '1px solid #cbd5e1';

        const thead = document.createElement('thead');
        thead.style.backgroundColor = '#f1f5f9';
        thead.innerHTML = `
          <tr>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b;">Description</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b; width: 120px;">Assigned To</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b; width: 100px;">Due Date</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e293b; width: 90px;">Status</th>
          </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        generalActionItems.forEach(action => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="border: 1px solid #cbd5e1; padding: 8px; color: #334155;">${action.description}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; color: #334155;">${action.assignedTo?.name || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; color: #334155;">${action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 600; color: ${action.status === 'Completed' ? '#16a34a' : '#2563eb'};">${action.status}</td>
          `;
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        generalActionsDiv.appendChild(generalActionsLabel);
        generalActionsDiv.appendChild(table);
        conclusionCard.appendChild(generalActionsDiv);
      }

      conclusionContent.appendChild(conclusionCard);
      conclusionPage.appendChild(conclusionContent);
      pagesToRender.push(conclusionPage);

      // Append pages to body for rendering one by one
      for (let i = 0; i < pagesToRender.length; i++) {
        const page = pagesToRender[i];
        document.body.appendChild(page);

        // Add page numbering footer dynamically
        addFooter(page, i + 1);

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Clean up from body
        document.body.removeChild(page);

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const fileName = `${review.meetingNumber || 'management_review'}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCardOutputChange = (key: string, value: string) => {
    if (!review) return;
    const currentOutputs = typeof review.cardOutputs === 'object' && review.cardOutputs ? { ...review.cardOutputs } : {};
    setReview({
      ...review,
      cardOutputs: {
        ...currentOutputs,
        [key]: value
      }
    });
  };

  const handleNewActionChange = (key: string, field: string, value: any) => {
    setNewActions(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { description: '', assignedToId: null, dueDate: '', status: 'Open' }),
        [field]: value
      }
    }));
  };

  if (!review) return <div className="layout-container">Loading...</div>;

  // Determine current card ordering
  const currentOrder = Array.isArray(review.cardOrder)
    ? review.cardOrder
    : DEFAULT_SECTIONS.map(s => s.key);

  let orderedKeys = currentOrder.filter(key => DEFAULT_SECTIONS.some(s => s.key === key));
  DEFAULT_SECTIONS.forEach(s => {
    if (!orderedKeys.includes(s.key)) {
      orderedKeys.push(s.key);
    }
  });

  const orderedSections = orderedKeys.map(key => DEFAULT_SECTIONS.find(s => s.key === key)!);

  return (
    <div className="layout-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/management-reviews')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{review.meetingNumber}</h1>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '0.8rem',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontWeight: '600'
            }}>
              Management Review
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline no-print" 
            onClick={exportPDF} 
            disabled={isExporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Printer size={18} />
            {isExporting ? 'Exporting PDF...' : 'Export PDF'}
          </button>
          <button 
            className="btn btn-primary no-print" 
            onClick={handleSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }} className="main-grid-container">
        {/* Main Content Area wrapped in print table */}
        <table className="print-table-wrapper" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead className="print-table-thead print-only">
            <tr className="print-table-tr">
              <td className="print-table-td" style={{ padding: 0 }}>
                {/* Modern PDF Header */}
                <div style={{ display: 'flex', width: '100%', borderBottom: '2px solid #cbd5e1', paddingBottom: '12px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <img src="/prome.png" alt="PROME Logo" style={{ height: '44px', display: 'block' }} />
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: "'Inter', sans-serif", color: '#475569', fontSize: '0.75rem', lineHeight: '1.4' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a', marginBottom: '2px' }}>Minutes of Management Review Meeting</div>
                    <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600', marginBottom: '4px' }}>IMS (ISO 9001:2015 and ISO 45001:2018)</div>
                    <div>Doc Ref: <span style={{ fontWeight: '600', color: '#1e293b' }}>PROME-IMSR-AFD-05</span></div>
                    <div>Status: <span style={{ fontWeight: '600', color: '#1e293b' }}>{review.status}</span></div>
                    <div>Date: <span style={{ fontWeight: '600', color: '#1e293b' }}>{review.conductedDate ? new Date(review.conductedDate).toLocaleDateString() : '-'}</span></div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody className="print-table-tbody">
            <tr className="print-table-tr">
              <td className="print-table-td" style={{ padding: 0 }}>
                {/* Main Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                  {/* Cover Page Wrapper */}
                  <div className="print-cover-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Purpose of Management Review Meeting Section */}
                    <div 
                      className="card" 
                      style={{ 
                        backgroundColor: 'white', 
                        padding: '1.5rem', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b', margin: 0 }}>
                        Purpose of Management Review Meeting
                      </h2>
                      <div className="form-group" style={{ margin: 0 }}>
                        <textarea 
                          className="form-textarea"
                          rows={3}
                          value={review.purpose || ''}
                          onChange={e => setReview({ ...review, purpose: e.target.value })}
                          placeholder="To evaluate overall QMS effectiveness and to enable evidence-based decision-making and the establishment of actions to achieve desired results..."
                        />
                      </div>
                    </div>

                    {/* Agenda Section */}
                    <div 
                      className="card" 
                      style={{ 
                        backgroundColor: 'white', 
                        padding: '1.5rem', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b', margin: 0 }}>
                        Agenda
                      </h2>
                      <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: '#334155', lineHeight: '1.4' }}>
                        {orderedSections.map((section) => (
                          <li key={section.key} style={{ fontWeight: '500' }}>
                            {section.label}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* List of Attendees (Print only on Cover Page) */}
                    <div 
                      className="card print-only" 
                      style={{ 
                        backgroundColor: 'white', 
                        padding: '1.5rem', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b', margin: 0 }}>
                        List of Attendees
                      </h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {review.attendees.map((attendee, index) => (
                          <div key={attendee.id} style={{ fontSize: '0.95rem', color: '#334155', fontWeight: '500' }}>
                            {index + 1}. {attendee.name}
                          </div>
                        ))}
                        {review.attendees.length === 0 && (
                          <div style={{ fontStyle: 'italic', color: '#6b7280' }}>No attendees recorded.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', color: '#1e293b', marginTop: '1rem' }} className="no-print">
                    Review Inputs & Outputs (ISO 9001: 9.3)
                  </h2>

          {orderedSections.map((section, index) => {
            const sectionNewAction = newActions[section.key] || { description: '', assignedToId: null, dueDate: '', status: 'Open' };
            const sectionActionItems = review.actionItems.filter(action => action.sectionKey === section.key);

            return (
              <div 
                key={section.key} 
                className="card print-page-break" 
                style={{ 
                  backgroundColor: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}
              >
                {/* Header with drag/reorder controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                    {index + 1}. {section.label}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.25rem' }} className="no-print">
                    <button 
                      onClick={() => handleMoveCard(index, 'up')}
                      disabled={index === 0}
                      className="btn btn-outline"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', height: '28px', color: index === 0 ? '#94a3b8' : '#334155' }}
                    >
                      ▲ Move Up
                    </button>
                    <button 
                      onClick={() => handleMoveCard(index, 'down')}
                      disabled={index === orderedSections.length - 1}
                      className="btn btn-outline"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', height: '28px', color: index === orderedSections.length - 1 ? '#94a3b8' : '#334155' }}
                    >
                      ▼ Move Down
                    </button>
                  </div>
                </div>

                {/* Guidance checklists (mocking the reference image) */}
                {section.guidance && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fafafa' }}>
                    {section.guidance.map((g, gIdx) => (
                      <div key={gIdx} style={{ borderBottom: gIdx < (section.guidance?.length || 0) - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <div style={{ backgroundColor: '#f1f5f9', padding: '6px 12px', fontWeight: 'bold', fontSize: '0.8rem', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                          {g.title}
                        </div>
                        <ul style={{ margin: 0, padding: '10px 24px', listStyleType: 'disc', fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                          {g.items.map((item, itemIdx) => (
                            <li key={itemIdx} style={{ marginBottom: '2px' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Details */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Review Input Details / Findings</label>
                  <textarea 
                    className="form-textarea"
                    rows={4}
                    value={review[section.key as keyof ManagementReview] as string || ''}
                    onChange={e => setReview({ ...review, [section.key]: e.target.value })}
                    placeholder={section.placeholderInput}
                  />
                </div>

                {/* Output Decisions */}
                <div className="form-group" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: '600', color: '#cc0000' }}>Review Output / Decisions & Resource Needs</label>
                  <textarea 
                    className="form-textarea"
                    rows={3}
                    value={(review.cardOutputs && review.cardOutputs[section.key]) || ''}
                    onChange={e => handleCardOutputChange(section.key, e.target.value)}
                    placeholder={section.placeholderOutput}
                  />
                </div>

                {/* Section Specific Action Items */}
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem' }}>Action Items</h4>
                  
                  {/* Action creation form */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }} className="no-print">
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="New action item..." 
                      value={sectionNewAction.description}
                      onChange={e => handleNewActionChange(section.key, 'description', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <select 
                      className="form-select" 
                      value={sectionNewAction.assignedToId || ''}
                      onChange={e => handleNewActionChange(section.key, 'assignedToId', parseInt(e.target.value) || null)}
                      style={{ width: '150px' }}
                    >
                      <option value="">Assignee...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={sectionNewAction.dueDate || ''}
                      onChange={e => handleNewActionChange(section.key, 'dueDate', e.target.value)}
                      style={{ width: '150px' }}
                    />
                    <button className="btn btn-primary" onClick={() => handleAddSectionAction(section.key)} disabled={!sectionNewAction.description}>
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Section Actions Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Description</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Assigned To</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Due Date</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Status</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }} className="no-print"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionActionItems.map(action => (
                          <tr key={action.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{action.description}</td>
                            <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{action.assignedTo?.name || '-'}</td>
                            <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                              {action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <select 
                                className="form-select" 
                                style={{ padding: '2px 4px', fontSize: '0.7rem' }}
                                value={action.status}
                                onChange={(e) => handleUpdateActionStatus(action.id!, e.target.value)}
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }} className="no-print">
                              <button onClick={() => handleDeleteAction(action.id!)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sectionActionItems.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ padding: '0.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                              No action items for this section.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Fallback card: General / Unassigned Action Items */}
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#f8fafc', 
              padding: '1.5rem', 
              borderRadius: '8px', 
              border: '1px dashed #cbd5e1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#475569', margin: 0 }}>
                General / Unassigned Action Items
              </h3>
            </div>

            {/* General Action creation form */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }} className="no-print">
              <input 
                type="text" 
                className="form-input" 
                placeholder="New general action..." 
                value={generalNewAction.description}
                onChange={e => setGeneralNewAction({...generalNewAction, description: e.target.value})}
                style={{ flex: 1 }}
              />
              <select 
                className="form-select" 
                value={generalNewAction.assignedToId || ''}
                onChange={e => setGeneralNewAction({...generalNewAction, assignedToId: parseInt(e.target.value) || null})}
                style={{ width: '150px' }}
              >
                <option value="">Assignee...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input 
                type="date" 
                className="form-input" 
                value={generalNewAction.dueDate || ''}
                onChange={e => setGeneralNewAction({...generalNewAction, dueDate: e.target.value})}
                style={{ width: '150px' }}
              />
              <button className="btn btn-primary" onClick={handleAddGeneralAction} disabled={!generalNewAction.description}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Description</th>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Assigned To</th>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Due Date</th>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Status</th>
                    <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#475569' }} className="no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {review.actionItems.filter(action => !action.sectionKey).map(action => (
                    <tr key={action.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{action.description}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{action.assignedTo?.name || '-'}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                        {action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <select 
                          className="form-select" 
                          style={{ padding: '2px 4px', fontSize: '0.7rem' }}
                          value={action.status}
                          onChange={(e) => handleUpdateActionStatus(action.id!, e.target.value)}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }} className="no-print">
                        <button onClick={() => handleDeleteAction(action.id!)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {review.actionItems.filter(action => !action.sectionKey).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                        No general action items created.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legacy Global Decisions (if any exist) */}
          {review.decisions && (
            <div className="card" style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label className="form-label" style={{ fontWeight: '600' }}>Global / General Decisions (Legacy)</label>
              <textarea 
                className="form-textarea"
                rows={3}
                value={review.decisions}
                onChange={e => setReview({ ...review, decisions: e.target.value })}
              />
            </div>
          )}
          {/* Conclusion Section */}
          <div 
            className="card print-page-break" 
            style={{ 
              backgroundColor: 'white', 
              padding: '1.5rem', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginTop: '1rem'
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b', margin: 0 }}>
              Conclusion
            </h2>

            {/* Editable Conclusion Text (Screen only) */}
            <div className="form-group no-print" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: '600' }}>Conclusion Statement</label>
              <textarea 
                className="form-textarea"
                rows={3}
                value={review.conclusion || ''}
                onChange={e => setReview({ ...review, conclusion: e.target.value })}
                placeholder="Top Management concluded that..."
              />
            </div>

            {/* Conclusion static text (Print only) */}
            <div className="print-only" style={{ fontSize: '0.95rem', color: '#000', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              {review.conclusion || ''}
            </div>

            {/* Signatures */}
            <div style={{ marginTop: '0.5rem' }}>
              <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Minutes Approved By:</label>
              
              {/* Screen Inputs (Screen only) */}
              <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Approved By Name/Role (e.g. Managing Director)"
                    value={review.approvedByName || ''}
                    onChange={e => setReview({ ...review, approvedByName: e.target.value })}
                  />
                </div>
                <div style={{ width: '200px' }}>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={review.approvedDate || ''}
                    onChange={e => setReview({ ...review, approvedDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Print Layout (Print only) */}
              <div className="print-only" style={{ marginTop: '2.5rem', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', maxWidth: '600px' }}>
                  <div style={{ borderBottom: '1px solid #000', width: '300px', paddingBottom: '4px', fontSize: '0.9rem' }}>
                    {review.approvedByName || '_______________________'}
                  </div>
                  <div style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <strong>Date:</strong> 
                    <span style={{ borderBottom: '1px solid #000', width: '200px', display: 'inline-block', textAlign: 'center', paddingBottom: '4px' }}>
                      {review.approvedDate ? new Date(review.approvedDate).toLocaleDateString() : '_________________'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>
                  [Managing Director Signature]
                </div>
              </div>
            </div>
          </div>

                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Meeting Details</h2>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={review.status}
                onChange={e => setReview({...review, status: e.target.value})}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Conducted">Conducted</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Scheduled Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={review.scheduledDate ? review.scheduledDate.split('T')[0] : ''}
                onChange={e => setReview({...review, scheduledDate: e.target.value})}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Conducted Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={review.conductedDate ? review.conductedDate.split('T')[0] : ''}
                onChange={e => setReview({...review, conductedDate: e.target.value})}
              />
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Attendees</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {review.attendees.map(attendee => (
                  <span key={attendee.id} style={{ 
                    padding: '2px 8px', 
                    backgroundColor: '#f3f4f6', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {attendee.name}
                    <button 
                      onClick={() => setReview({...review, attendees: review.attendees.filter(a => a.id !== attendee.id)})}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}
                      className="no-print"
                    >×</button>
                  </span>
                ))}
              </div>
              <select 
                className="form-select no-print"
                onChange={(e) => {
                  const userId = parseInt(e.target.value);
                  if (userId && !review.attendees.find(a => a.id === userId)) {
                    const user = users.find(u => u.id === userId);
                    if (user) {
                      setReview({...review, attendees: [...review.attendees, user]});
                    }
                  }
                  e.target.value = '';
                }}
              >
                <option value="">Add attendee...</option>
                {users.filter(u => !review.attendees.find(a => a.id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementReviewDetails;
