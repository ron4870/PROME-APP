/**
 * Official PROME Consultants Limited ISO Mandatory Document Records
 * Extracted from official company Quality System Procedures:
 * - PROME-QSP-CSVM-18: Scope & Context of the Organization (Rev 05)
 * - PROME-QSP-CSVM-01: Organization Context (Clause 4.1, Rev 05)
 * - PROME-QSP-CSVM-21: Interested Party Mapping (Clause 4.2, Rev 05)
 * - PROME-QSR-AFD-20: Communication Matrix (Clause 7.4)
 * - Section 10: Continual Improvement Register
 */

export interface ContextFactorItem {
  id: string;
  type: 'Internal' | 'External';
  factorCategory: string;
  context: string;
  aspectFromContext: string;
  impactToBusiness: string;
  mitigationAction: string;
  followUpAndReviewBy: string;
  followUpDate: string;
  followUpResults: string;
}

export interface InterestedPartyItem {
  id: string;
  category: 'External' | 'Internal';
  name: string;
  ipToCompany: string; // "Control", "Influence", "Influence & Control"
  companyToIp: string; // "Control", "Influence", "Control & Influence"
  prioritization: 'P1' | 'P2' | 'P3'; // P1=High, P2=Medium, P3=Low
  actionToManageIp: string;
  followUpAndReviewBy: string;
  followUpDate: string;
  followUpResults: string;
}

export interface CommunicationItem {
  id: string;
  type: 'Internal' | 'External';
  whatToCommunicate: string;
  byWhom: string;
  how: string;
  toWhom: string;
  when: string;
  evidence: string;
}

// 1. Clause 4.1 Organization Context (PROME-QSP-CSVM-01, Rev 05)
export const PROME_CONTEXT_FACTORS: ContextFactorItem[] = [
  // Internal Factors
  {
    id: 'INT-01',
    type: 'Internal',
    factorCategory: 'Competence & Knowledge',
    context: '1. Strength of Employees (Competence and knowledge)',
    aspectFromContext: 'Inefficient and ineffective execution of works in case the employees have inadequate skills and product knowledge, are demotivated, less hardworking and less talented.',
    impactToBusiness: 'Delays in execution of tasks; Substandard work produced; Low output.',
    mitigationAction: 'Evaluate and select hardworking individual using a concise criteria during recruitment; Regular performance appraisal; Training needs assessments; Sensitization meetings and staff mentoring.',
    followUpAndReviewBy: 'Gertrude Nakiyaga / Stephanie Canowira',
    followUpDate: '2023-07-02',
    followUpResults: 'Recruitment screening criteria and annual training matrix instituted.'
  },
  {
    id: 'INT-02',
    type: 'Internal',
    factorCategory: 'IT Systems & Infrastructure',
    context: '2. Organizational and operational limitations',
    aspectFromContext: 'Inability to manage services provided due to poor / faulty IT systems; Inability to access data for past company projects for reference.',
    impactToBusiness: 'Inability to access data for past company projects for reference.',
    mitigationAction: 'Set up a digital data bank; Ensure all staff members upload relevant work periodically.',
    followUpAndReviewBy: 'Eng. Godfrey Ssambwa',
    followUpDate: '2023-01-25',
    followUpResults: 'Digital data bank has been set up and past projects can now be accessed - Closed.'
  },
  {
    id: 'INT-03',
    type: 'Internal',
    factorCategory: 'Communication',
    context: '3. Communication gap',
    aspectFromContext: 'Mismanagement of activities/services due to miscommunication and lack of proper channels for communication.',
    impactToBusiness: 'Delayed decision making; Obstruct exploration of more alternatives; Low output and work morale.',
    mitigationAction: 'Provide clearly defined duties and responsibilities; Conduct meetings regularly where issues can be discussed; Ensure responsible individuals communicate all relevant information as precisely as possible.',
    followUpAndReviewBy: 'Gertrude Nakiyaga',
    followUpDate: '2023-07-03',
    followUpResults: 'Weekly division coordination meetings and Communication Matrix (PROME-QSR-AFD-20) implemented.'
  },
  {
    id: 'INT-04',
    type: 'Internal',
    factorCategory: 'HSE & Safety',
    context: '4. Health, Safety & Environmental',
    aspectFromContext: 'Employee injuries and property damage due to accident; Fire outbreak.',
    impactToBusiness: 'High cost of compensation and medical treatment; Loss of property & lives in case of fire; Lost time and productivity.',
    mitigationAction: 'Observe statutory obligations in regard to Occupation Health and Safety; Establish and implement health, safety and environmental management system which provide policies and procedures for workers to follow in order to work safely.',
    followUpAndReviewBy: 'Philippa Arinaitwe',
    followUpDate: '2023-07-14',
    followUpResults: 'Office smoke detectors and serviced fire extinguishers installed; ISO 45001 certification active.'
  },
  {
    id: 'INT-05',
    type: 'Internal',
    factorCategory: 'Innovation & Technology',
    context: '5. Lack of adequate Innovation',
    aspectFromContext: 'Company being stagnant and irrelevant in its field.',
    impactToBusiness: 'Decline in market share; Delay of tasks due to use of old technology; High cost; Demotivated staff.',
    mitigationAction: 'Embracing new technology; Strong emphasis on research and development; Staff training.',
    followUpAndReviewBy: 'Ronald Kibuuka / Cyrus Kibuuka',
    followUpDate: '2023-07-22',
    followUpResults: 'Adoption of advanced BIM/GIS workflows, 3D Cesium workspace, and modern AI engineering tools.'
  },
  {
    id: 'INT-06',
    type: 'Internal',
    factorCategory: 'Human Resources',
    context: '6. Conflicts amongst staff',
    aspectFromContext: 'Occupational stress due to unresolved conflicts.',
    impactToBusiness: 'Diverts time and energy from the main issues; Delay decisions; Create deadlocks; Obstruct exploration of more alternatives; Low output and work morale; High employee turnover; Breeds distractive teams.',
    mitigationAction: 'An elaborate conflict management guideline should be provided; Conduct mentoring sessions to guide and listen to employees grievances; Provide suggestion boxes to allow employees air their complaints (staff satisfaction survey).',
    followUpAndReviewBy: 'Gertrude Nakiyaga',
    followUpDate: '2023-07-20',
    followUpResults: 'Staff mentoring sessions and anonymous HR feedback channels active.'
  },
  {
    id: 'INT-07',
    type: 'Internal',
    factorCategory: 'Finance & Audit',
    context: '7. Financial mismanagement',
    aspectFromContext: 'Financial losses.',
    impactToBusiness: 'Bankrupts the company leading to closure.',
    mitigationAction: 'Carry out periodic financial audits and strict rolling imprest monitoring.',
    followUpAndReviewBy: 'Eng. Godfrey Ssambwa',
    followUpDate: '2023-07-22',
    followUpResults: 'Annual independent statutory financial audits and internal audit division oversight established.'
  },

  // External Factors
  {
    id: 'EXT-01',
    type: 'External',
    factorCategory: 'Legal & Regulatory',
    context: '1. Regulatory authorities/factors (Government) and legal restrictions',
    aspectFromContext: 'Noncompliance with regulatory requirements.',
    impactToBusiness: 'Business closure and penal sanctions; Stalling of services to first clear non-conformance.',
    mitigationAction: 'Maintain an updated schedule of regulatory requirements with their compliance timelines.',
    followUpAndReviewBy: 'Gertrude Nakiyaga / Hope Nahamya',
    followUpDate: '2023-07-27',
    followUpResults: 'Current KCCA trading licenses, NSSF clearance, UACE practicing certificates, and PPDA registrations verified.'
  },
  {
    id: 'EXT-02',
    type: 'External',
    factorCategory: 'Political & Governance',
    context: '2. Political Climate',
    aspectFromContext: 'Change in national policies and laws; Bureaucracy; Political strikes and riots; Government stability and related changes.',
    impactToBusiness: 'High cost; Delays in execution of services due to bureaucracy; Affects the economy which in turn affects business performance.',
    mitigationAction: 'Continual assessment of the political situation and act in anticipation of change; Plan and give an allowance for such unexpected occurrences.',
    followUpAndReviewBy: 'Cyrus Kibuuka',
    followUpDate: '2023-07-27',
    followUpResults: 'Contingency cushions built into project delivery schedules and public sector contract reviews.'
  },
  {
    id: 'EXT-03',
    type: 'External',
    factorCategory: 'Economic & Market',
    context: '3. Economic factors within our area of influence',
    aspectFromContext: 'Economic shifts in the market which the company must be readily able to react to like COVID Lockdown.',
    impactToBusiness: 'Reduced amount of available work for the company; High cost of execution of work.',
    mitigationAction: 'Conduct regular market surveys to plan and cope up with changes in market trends; Diversify company profile; Maintain focus to customer requirements.',
    followUpAndReviewBy: 'Cyrus Kibuuka',
    followUpDate: '2023-07-20',
    followUpResults: 'Service diversification into Tilenga energy sector, stand-alone ESIA studies, and regional branch operations.'
  },
  {
    id: 'EXT-04',
    type: 'External',
    factorCategory: 'Socio-Cultural & CSR',
    context: '4. Social Cultural factors',
    aspectFromContext: 'Cultural limitations; Negative attitude towards the company; Scandals involving the company affecting public opinion.',
    impactToBusiness: 'Delay in works; Distancing of Clients from Company; Reduction in market share.',
    mitigationAction: 'Have a Corporate Social Responsibility (CSR) program; Monitor public opinion of Company and diffuse any situations early enough; Have promotional items to improve company visibility.',
    followUpAndReviewBy: 'Cyrus Kibuuka / Stephanie Canowira',
    followUpDate: '2023-07-12',
    followUpResults: 'Active CSR outreach in project catchment communities and continuous stakeholder engagement.'
  },
  {
    id: 'EXT-05',
    type: 'External',
    factorCategory: 'Technology & Competition',
    context: '5. Technology factors',
    aspectFromContext: 'Introduction of new technology by competitors.',
    impactToBusiness: 'Loss of contracts/projects.',
    mitigationAction: 'Embracing new technology; Conduct customer surveys; Carry out periodic research to identify new methodologies and equipment.',
    followUpAndReviewBy: 'Ronald Kibuuka / Eng. Patrick Ludigo / Cyrus Kibuuka',
    followUpDate: '2023-07-24',
    followUpResults: 'Procurement of state-of-the-art GPS survey units, laser scanners, drone mapping, and proprietary engineering apps.'
  }
];

// 2. Clause 4.2 Interested Parties Mapping (PROME-QSP-CSVM-21, Rev 05)
export const PROME_INTERESTED_PARTIES: InterestedPartyItem[] = [
  // External Interested Parties
  {
    id: 'EXT-IP-01',
    category: 'External',
    name: '1. Clients (e.g., UNRA, KCCA, NSSF, NWSC, MoWT)',
    ipToCompany: 'Control',
    companyToIp: 'Influence',
    prioritization: 'P1',
    actionToManageIp: 'Maintain focus to client requirements; Perform services strictly to Client specifications; Frequently monitor customer satisfaction.',
    followUpAndReviewBy: 'Cyrus Kibuuka / Eng. Bruno S. Musoke / Eng. P.J. Ludigo',
    followUpDate: '2023-07-17',
    followUpResults: 'Quarterly client satisfaction surveys and structured project progress meetings conducted.'
  },
  {
    id: 'EXT-IP-02',
    category: 'External',
    name: '2. Government & Statutory Authorities (e.g., URA, NEMA, MoWT, UNBS)',
    ipToCompany: 'Control',
    companyToIp: 'Influence',
    prioritization: 'P1',
    actionToManageIp: 'Compliance with statutory & regulatory requirements (e.g. Work permits, NEMA environmental certificates, building codes).',
    followUpAndReviewBy: 'Gertrude Nakiyaga',
    followUpDate: '2023-07-13',
    followUpResults: 'Statutory compliance register (PROME-REG-LEG-01) monitored monthly.'
  },
  {
    id: 'EXT-IP-03',
    category: 'External',
    name: '3. Suppliers & Vendors',
    ipToCompany: 'Influence',
    companyToIp: 'Control',
    prioritization: 'P2',
    actionToManageIp: 'Regular supplier evaluations against quality, delivery timeliness, and commercial terms.',
    followUpAndReviewBy: 'Jackie Logose',
    followUpDate: '2023-07-23',
    followUpResults: 'Approved vendor register maintained with annual re-evaluations.'
  },
  {
    id: 'EXT-IP-04',
    category: 'External',
    name: '4. Other Engineering Consultants (Local & International JV Partners)',
    ipToCompany: 'Influence & Control',
    companyToIp: 'Control & Influence',
    prioritization: 'P2',
    actionToManageIp: 'Maintaining strong professional relationships with peer Engineering Consultants; Continuous performance review of subconsultants.',
    followUpAndReviewBy: 'Eng. Bruno S. Musoke',
    followUpDate: '2023-07-13',
    followUpResults: 'JV partnership agreements and subconsultant review protocols executed.'
  },
  {
    id: 'EXT-IP-05',
    category: 'External',
    name: '5. Contractors & Construction Firms',
    ipToCompany: 'Influence',
    companyToIp: 'Control',
    prioritization: 'P2',
    actionToManageIp: 'Rigorous review of site works, material testing, shop drawings, and supervision logs.',
    followUpAndReviewBy: 'Eng. P.J. Ludigo / Eng. Bruno S. Musoke',
    followUpDate: '2023-07-22',
    followUpResults: 'Four-eye engineering inspections and QA/QC non-conformance tracking enforced.'
  },
  {
    id: 'EXT-IP-06',
    category: 'External',
    name: '6. Community & Project Affected Persons',
    ipToCompany: 'Influence',
    companyToIp: 'Influence',
    prioritization: 'P1',
    actionToManageIp: 'Corporate Social Responsibility (CSR) policy, public consultations, and environmental safeguard grievance mechanisms.',
    followUpAndReviewBy: 'Cyrus Kibuuka',
    followUpDate: '2023-07-22',
    followUpResults: 'Community sensitization workshops and RAP safeguard documentation deployed.'
  },
  {
    id: 'EXT-IP-07',
    category: 'External',
    name: '7. Professional Bodies (FIDIC, UIPE, UACE, ERB)',
    ipToCompany: 'Control',
    companyToIp: 'Influence',
    prioritization: 'P1',
    actionToManageIp: 'Active participation in institutional activities, engineering ethics compliance, and continuous professional development (CPD).',
    followUpAndReviewBy: 'Cyrus Kibuuka',
    followUpDate: '2023-07-14',
    followUpResults: 'UACE Class-A corporate membership and engineer practicing certificates kept valid.'
  },

  // Internal Interested Parties
  {
    id: 'INT-IP-01',
    category: 'Internal',
    name: '1. Management & Shareholders / Owners',
    ipToCompany: 'Control',
    companyToIp: 'Influence',
    prioritization: 'P1',
    actionToManageIp: 'Regular review of corporate policies, quality objectives, operational procedures, resource allocation, and profitability.',
    followUpAndReviewBy: 'Eng. Bruno S. Musoke',
    followUpDate: '2023-07-13',
    followUpResults: 'Quarterly board reviews and Management Review meetings conducted.'
  },
  {
    id: 'INT-IP-02',
    category: 'Internal',
    name: '2. Employees & Project Engineers',
    ipToCompany: 'Influence',
    companyToIp: 'Control',
    prioritization: 'P2',
    actionToManageIp: 'Continual employee performance appraisals, technical training, competitive remuneration, and a safe, conducive working environment.',
    followUpAndReviewBy: 'Gertrude Nakiyaga',
    followUpDate: '2023-07-12',
    followUpResults: 'Annual staff appraisals and engineering training matrices executed.'
  },
  {
    id: 'INT-IP-03',
    category: 'Internal',
    name: '3. Work Environment & Infrastructure',
    ipToCompany: 'Influence',
    companyToIp: 'Control',
    prioritization: 'P2',
    actionToManageIp: 'Carry out regular workplace health, safety, and environmental inspections and ergonomic assessments.',
    followUpAndReviewBy: 'Philippa Arinaitwe / Gertrude Nakiyaga',
    followUpDate: '2023-07-11',
    followUpResults: 'Workplace safety inspections, fire drill simulations, and hygiene audits active.'
  }
];

// 3. Clause 7.4 Communication Matrix (PROME-QSR-AFD-20)
export const PROME_COMMUNICATION_MATRIX: CommunicationItem[] = [
  // Internal Communication
  {
    id: 'COM-INT-01',
    type: 'Internal',
    whatToCommunicate: 'Renewed Operating Strategies for the Year',
    byWhom: 'Managing Director (MD)',
    how: 'Internal Memorandum',
    toWhom: 'All Staff',
    when: 'Annually (January)',
    evidence: 'Written Memorandum / Circular'
  },
  {
    id: 'COM-INT-02',
    type: 'Internal',
    whatToCommunicate: 'Reopening of Office & Operational Resumption',
    byWhom: 'Senior Admin Secretary (SAS) / HR',
    how: 'Internal Memorandum',
    toWhom: 'All Staff',
    when: 'Beginning of New Year / Post-Holiday',
    evidence: 'Written Memorandum'
  },
  {
    id: 'COM-INT-03',
    type: 'Internal',
    whatToCommunicate: 'Code of Conduct and Strict Compliance to Company Values',
    byWhom: 'Managing Director (MD)',
    how: 'Executive Order / Corporate Policy',
    toWhom: 'All Staff',
    when: 'Bi-annually & Upon Induction',
    evidence: 'Written Executive Order & Signed Staff Acknowledgments'
  },
  {
    id: 'COM-INT-04',
    type: 'Internal',
    whatToCommunicate: 'Implementation of Logbooks in Pool Vehicles & Field Fleet',
    byWhom: 'Senior Admin Secretary (SAS)',
    how: 'Internal Memo & Driver Briefing',
    toWhom: 'All Drivers & Field Engineers',
    when: 'Continuous / Quarterly audit',
    evidence: 'Vehicle Movement Logbooks & Fuel Requisition Slips'
  },
  {
    id: 'COM-INT-05',
    type: 'Internal',
    whatToCommunicate: 'Corporate & Field Staff Group Personal Accident / Health Insurance',
    byWhom: 'Senior Admin Secretary (SAS)',
    how: 'Internal Memorandum',
    toWhom: 'All Staff',
    when: 'Annual Policy Renewal',
    evidence: 'Written Memo & Insurance Policy Schedules'
  },
  {
    id: 'COM-INT-06',
    type: 'Internal',
    whatToCommunicate: 'Guidance Note on Rolling Imprest for All Divisions',
    byWhom: 'Managing Director (MD)',
    how: 'Internal Memo & Financial Guidelines',
    toWhom: 'All Division Heads',
    when: 'Periodic / As Issued',
    evidence: 'Financial Guidance Note & Imprest Reconciliation Vouchers'
  },
  {
    id: 'COM-INT-07',
    type: 'Internal',
    whatToCommunicate: 'Project Site Communications & Technical Instructions',
    byWhom: 'Resident Engineer (RE)',
    how: 'Official Letters & Site Instruction Books',
    toWhom: 'Client & Main Contractor',
    when: 'During Project Implementation',
    evidence: 'Submitted Correspondence & Signed Site Orders'
  },
  {
    id: 'COM-INT-08',
    type: 'Internal',
    whatToCommunicate: 'Delegation of Powers & Formal Appointment of Site Engineers',
    byWhom: 'Managing Director (MD)',
    how: 'Formal Appointment Letter',
    toWhom: 'Resident Engineer (RE)',
    when: 'Commencement of Project',
    evidence: 'Signed Letter of Delegation of Powers'
  },

  // External Communication
  {
    id: 'COM-EXT-01',
    type: 'External',
    whatToCommunicate: 'Divisional & Departmental Internal Capacity Building & Technical Competency',
    byWhom: 'Managing Director (MD)',
    how: 'Official Email & Corporate Capability Statements',
    toWhom: 'All Divisions & Partner Institutions',
    when: 'Periodic (Annual Planning)',
    evidence: 'Email to All Engineers & Published Capability Documents'
  },
  {
    id: 'COM-EXT-02',
    type: 'External',
    whatToCommunicate: 'Superintendence & Technical Approval of Construction Milestones (e.g. Subbase Pavement)',
    byWhom: 'Managing Director / Lead Engineer',
    how: 'Official Letter & Technical Transmittal',
    toWhom: 'Resident Engineer & Client',
    when: 'Milestone Execution Checkpoints',
    evidence: 'Email + Formal Approval Letter to RE and Client'
  },
  {
    id: 'COM-EXT-03',
    type: 'External',
    whatToCommunicate: 'Performance Review and Presentations of Divisional Action Plans',
    byWhom: 'Managing Director (MD)',
    how: 'Executive Email & Presentation Sessions',
    toWhom: 'Head PMBDD & External Stakeholders',
    when: 'Annual Strategic Review Cycle',
    evidence: 'Official Presentation Records & Confirmation Emails'
  }
];

// 4. Clause 4.3 Scope of QMS & Core Processes (PROME-QSP-CSVM-18, Rev 05)
export const PROME_QMS_SCOPE_RECORD = {
  documentRef: 'PROME-QSP-CSVM-18',
  revision: '05',
  revisionDate: '2023-01-04',
  approvedBy: 'H.R. Kibuuka (Managing Director)',
  companyName: 'PROME Consultants Limited',
  headOffice: 'Innovations House, Plot 7B, Babiiha Avenue, P.O. Box 24934 Kampala, Uganda',
  contact: 'Phone: +256-414-345543/4 | Fax: +256-414-345149 | Web: www.promeconsult.com',
  branchOffice: 'Ethiopia Branch Office',
  qualityPolicy: 'DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME',
  permissibleExclusions: 'The company claims NO exclusions from the ISO 9001:2015 standard (Clause 3.7).',
  riskRegisterRef: 'PROME-QSR-BE&ED-04',
  scopeStatement: 'Provision of Project Management and Engineering Consultancy Services and Solutions in the Built Environment: Planning, Feasibility Studies, Topographical & Geological Surveys, Detailed Engineering Designs, Environmental & Social Studies, and Construction Supervision.',
  subsidiarySpecialist: 'Teclab Limited (Independently operated stand-alone Geotechnical Engineering affiliate).',
  processes: [
    { number: 1, name: 'Feasibility & Design', leadDivision: 'Planning & Engineering Division (PED)' },
    { number: 2, name: 'Project Management', leadDivision: 'Project Management Office (PMO)' },
    { number: 3, name: 'Work Supervision', leadDivision: 'Project Delivery Management Division (PDMD)' },
    { number: 4, name: 'Project Procurement & Bidding', leadDivision: 'PMBDD' },
    { number: 5, name: 'Communication Management', leadDivision: 'Corporate Strategy & Administration' },
    { number: 6, name: 'Customer Focus & Perception Monitoring', leadDivision: 'PDMD & PMBDD' },
    { number: 7, name: 'Purchasing & Vendor Evaluation', leadDivision: 'Administration & Finance' },
    { number: 8, name: 'Cost-Related Processes & Budget Control', leadDivision: 'Finance & Accounts Unit' },
    { number: 9, name: 'Managing Change (MOC)', leadDivision: 'CPSD & PED' },
    { number: 10, name: 'Risk & Opportunity Management', leadDivision: 'Corporate Planning & Strategy Division' },
    { number: 11, name: 'Documents & Records Control', leadDivision: 'MIS, Quality Assurance & Standards Unit' },
    { number: 12, name: 'Monitoring & Measuring Equipment (Calibration)', leadDivision: 'PED & Survey Unit' },
    { number: 13, name: 'Customer Property Management', leadDivision: 'PDMD' },
    { number: 14, name: 'Control of Non-Conforming Outputs (NCR)', leadDivision: 'QA Lead & Site Supervisors' },
    { number: 15, name: 'Corrective Actions (CAPA) & Continual Improvement', leadDivision: 'Management Representative (MR)' },
    { number: 16, name: 'Internal Audit Programme', leadDivision: 'Lead Quality Auditor / PMBDD' }
  ],
  statutoryCertificates: [
    { name: 'KCCA Trading License', authority: 'Kampala Capital City Authority', reference: 'TLC: 20231195983 / COIN: 0003869719', status: 'Compliant' },
    { name: 'NSSF Clearance Certificate', authority: 'National Social Security Fund', reference: 'NS010678KPE / Serial: 00017739', status: 'Compliant' },
    { name: 'UACE Corporate Membership', authority: 'Uganda Association of Consulting Engineers (FIDIC/GAMA)', reference: 'Class-A Member', status: 'Compliant' },
    { name: 'PPDA Register of Providers', authority: 'Public Procurement and Disposal of Public Assets Authority', reference: 'PRV/SRVCS/21081312/AUG/21', status: 'Compliant' }
  ]
};

// 5. Section 10 Continual Improvement Record
export const PROME_CONTINUAL_IMPROVEMENT_RECORD = {
  sectionTitle: 'Section 10: Continual Improvement',
  vision: 'To be recognized as the most trusted Engineering Consultancy Firm in the Eastern Africa region that develops and delivers appropriate and state of the Art Engineering and Digital Technological Solutions for the enhancement of the quality of lives in society.',
  mission: 'To deliver innovative and sustainable Engineering and Digital Technological solutions that more than satisfy Customer needs as well as meeting the Company’s objectives.',
  coreValues: [
    'Customer Satisfaction',
    'Innovation',
    'Ethical Principles',
    'Profitability',
    'Teamwork'
  ],
  corporateStrategy: 'To be a diversified innovative company pursuing an agile digital and technological strategy hinged on human, financial and technological capabilities in relation to forecasted market opportunities and international engineering competitiveness.',
  coreServices: [
    'Construction Supervision',
    'Physical Planning',
    'Topographical Surveys',
    'Geological Surveys',
    'Environmental Socio-Economic Studies',
    'Multi-modal Transportation Studies',
    'Digital Technology Solutions',
    'Engineering Designs',
    'Project Management',
    'Energy Development Studies'
  ],
  registeredImprovements: [
    {
      category: 'Process Improvements',
      details: 'To ease management, coordination and monitoring of all company activities, a Management Information System (MIS) has been set up. ISO 45001:2018 certification is actively being pursued alongside ISO 9001:2015.'
    },
    {
      category: 'Products & Services Improved/Added',
      details: '1. Stand-alone Environmental and Social Impact Assessment (ESIA) projects. 2. Energy sector projects including Tilenga Oil & Gas development.'
    },
    {
      category: 'Infrastructure Improvement',
      details: '1. Washrooms upgrade with replacement of all toilet fixtures. 2. Building facelift including exterior painting and window replacements. 3. Aesthetic enhancement with office indoor plants. 4. Fire extinguisher servicing. 5. Installation of active smoke detectors.'
    },
    {
      category: 'Machinery & Equipment Added',
      details: '1. Kyocera 5053ci high-efficiency multi-function printer/scanner. 2. New corporate field vehicle procured from Toyota. 3. High-efficiency backup diesel generator.'
    },
    {
      category: 'New Clients Acquired',
      details: '1. JICA (Japan International Cooperation Agency). 2. TOTAL Energies E&P Uganda. 3. UNOC (Uganda National Oil Company).'
    },
    {
      category: 'Approved New Suppliers',
      details: '1. Rehoboth Real Solutions Ltd (Stationery). 2. MUKDUES General Enterprises Ltd (Computer & IT Hardware). 3. UAP Old Mutual Group (Insurance). 4. Pompey Communications (GPS Equipment). 5. Beth Global Supplies (Toiletries). 6. Safety Systems (Fire Fighting Equipment).'
    }
  ]
};
