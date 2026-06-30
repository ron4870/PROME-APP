import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Printer } from 'lucide-react';

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
          <button className="btn btn-outline no-print" onClick={() => window.print()}>
            <Printer size={18} style={{ marginRight: '8px' }} />
            Export PDF
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
                {/* PDF Header block matching the mockup image */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginBottom: '20px' }}>
                  <tbody>
                    <tr>
                      <td rowSpan={3} style={{ width: '25%', border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <svg width="150" height="48" viewBox="0 0 150 48" style={{ display: 'block', margin: '0 auto' }}>
                          <text x="5" y="25" font-family="Arial, sans-serif" font-weight="bold" font-size="24" fill="#c00" letter-spacing="-1">pr</text>
                          <polygon points="36,12 46,12 51,20 46,28 36,28 31,20" fill="#666" />
                          <circle cx="41" cy="20" r="3.5" fill="#fff" />
                          <text x="52" y="25" font-family="Arial, sans-serif" font-weight="bold" font-size="24" fill="#c00" letter-spacing="-1">me</text>
                          <text x="5" y="35" font-family="Arial, sans-serif" font-weight="bold" font-size="9" fill="#000">Consultants Ltd</text>
                          <text x="5" y="44" font-family="Arial, sans-serif" font-style="italic" font-size="4.2" fill="#555">Project Management And Engineering Consultants Ltd</text>
                        </svg>
                      </td>
                      <td style={{ width: '50%', border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', verticalAlign: 'middle', color: '#000' }}>
                        PROME Consultants Ltd
                      </td>
                      <td style={{ width: '10%', border: '1px solid #000', padding: '6px', fontWeight: 'bold', fontSize: '0.85rem', verticalAlign: 'middle', color: '#000' }}>
                        Doc:
                      </td>
                      <td style={{ width: '15%', border: '1px solid #000', padding: '6px', fontSize: '0.85rem', verticalAlign: 'middle', color: '#000' }}>
                        PROME-IMSR-AFD-05
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1', verticalAlign: 'middle' }}>
                        IMS (ISO 9001:2015 and ISO 45001:2018)
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', fontSize: '0.85rem', verticalAlign: 'middle', color: '#000' }}>
                        Status:
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.85rem', verticalAlign: 'middle', fontWeight: '600', color: '#000' }}>
                        {review.status}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', verticalAlign: 'middle', color: '#000' }}>
                        Minutes of Management Review Meeting
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', fontSize: '0.85rem', verticalAlign: 'middle', color: '#000' }}>
                        Date:
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.85rem', verticalAlign: 'middle', color: '#000' }}>
                        {review.conductedDate ? new Date(review.conductedDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </thead>
          <tbody className="print-table-tbody">
            <tr className="print-table-tr">
              <td className="print-table-td" style={{ padding: 0 }}>
                {/* Main Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
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

          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', color: '#1e293b', marginTop: '1rem' }}>
            Review Inputs & Outputs (ISO 9001: 9.3)
          </h2>

          {orderedSections.map((section, index) => {
            const sectionNewAction = newActions[section.key] || { description: '', assignedToId: null, dueDate: '', status: 'Open' };
            const sectionActionItems = review.actionItems.filter(action => action.sectionKey === section.key);

            return (
              <div 
                key={section.key} 
                className="card" 
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
            className="card" 
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
