import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ISO 9001:2015 and ISO 45001:2018 Standards into PROME Wiki...');

  // 1. Get or determine Author/Approver
  let adminUser = await prisma.user.findFirst({
    where: { email: 'ronald.kibuuka@promeconsult.com' }
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@promeconsult.com' },
          { name: { contains: 'Ronald', mode: 'insensitive' } }
        ]
      }
    });
  }

  const userId = adminUser?.id || 1;
  console.log(`Using Author/Approver User ID: ${userId} (${adminUser?.name || 'Administrator'})`);

  // 2. Create or find Folders
  // Folder 1: ISO 9001:2015 — Quality Management System
  let folder9001 = await prisma.wikiFolder.findFirst({
    where: { name: 'ISO 9001:2015 — Quality Management System' }
  });
  if (!folder9001) {
    folder9001 = await prisma.wikiFolder.create({
      data: {
        name: 'ISO 9001:2015 — Quality Management System',
        description: 'International Standard for Quality Management Systems (QMS) — Normative requirements and mapped PROME IMS operational evidence across Clauses 4 through 10.'
      }
    });
    console.log(`Created Folder: ${folder9001.name} (ID: ${folder9001.id})`);
  } else {
    console.log(`Found Folder: ${folder9001.name} (ID: ${folder9001.id})`);
  }

  // Folder 2: ISO 45001:2018 — Occupational Health & Safety
  let folder45001 = await prisma.wikiFolder.findFirst({
    where: { name: 'ISO 45001:2018 — Occupational Health & Safety' }
  });
  if (!folder45001) {
    folder45001 = await prisma.wikiFolder.create({
      data: {
        name: 'ISO 45001:2018 — Occupational Health & Safety',
        description: 'International Standard for Occupational Health and Safety Management Systems (OH&S) — Normative requirements, worker participation, and mapped PROME IMS operational evidence across Clauses 4 through 10.'
      }
    });
    console.log(`Created Folder: ${folder45001.name} (ID: ${folder45001.id})`);
  } else {
    console.log(`Found Folder: ${folder45001.name} (ID: ${folder45001.id})`);
  }

  // =========================================================================
  // ISO 9001:2015 CONTENT DEFINITIONS
  // =========================================================================

  const iso9001_clause4 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 9001:2015 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 4: Context of the Organization</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 4 requires PROME Consultants Limited to determine the external and internal factors affecting its strategic direction, map interested parties and their requirements, determine the scope of the Quality Management System, and establish controlled business processes.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1;">4.1 Understanding the organization and its context</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> The organization shall determine external and internal issues that are relevant to its purpose and its strategic direction and that affect its ability to achieve the intended result(s) of its quality management system. The organization shall monitor and review information about these external and internal issues.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Organization Context Portal (/organization-context)</a> — Live interactive dashboard tracking PESTLE external issues and internal organizational capabilities.</li>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-01: Organization Context Procedure (Rev 05)</a> — Defines methodology for identifying and biannually reviewing internal/external factors.</li>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-18: Scope &amp; Context of the Organization (Rev 05)</a> — Corporate boundary matrix for civil, structural, and geotechnical consultancy services.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">4.2 Understanding the needs and expectations of interested parties</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> The organization shall determine: a) the interested parties that are relevant to the quality management system; b) the requirements of these interested parties that are relevant to the quality management system. The organization shall monitor and review information about these interested parties and their relevant requirements.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Interested Parties Portal (/organization-context)</a> — Stakeholder prioritization register covering Clients, Funding Agencies (WB, AfDB), UIPE, ERB, KCCA, Subconsultants, and Staff.</li>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-21: Interested Party Mapping &amp; Prioritization (Rev 05)</a> — Evaluation criteria assessing level of Influence and Control (P1, P2, P3 tiers).</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">4.3 Determining the scope of the quality management system</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> The organization shall determine the boundaries and applicability of the quality management system to establish its scope, considering external/internal issues (4.1), interested parties (4.2), and products/services. Scope shall be maintained as documented information.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Official IMS Scope Statement</a> — Covers provision of Civil, Structural, Transportation, Water &amp; Sanitation, Environmental, and Geotechnical Engineering Consultancy, Feasibility Studies, Detailed Engineering Design, and Construction Supervision.</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-18: Quality System Scope Document</a> — Encompasses PROME Head Office (Plot 143, Ssebwana Road, Kawempe, Kampala) and all designated site resident supervision offices across Uganda.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">4.4 Quality management system and its processes</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> The organization shall establish, implement, maintain and continually improve a quality management system, including the processes needed and their interactions. Maintain documented information to support process operation and retain documented information to have confidence in execution.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME Process Interaction Matrix (PROME-QSP-CSVM-19)</a> — Interlinkage between Core Technical Processes (PED, PMBDD) and Support Processes (HR&amp;AD, Finance, HSE).</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-HRAD-12: Document Masterlist (Rev Jan 2026)</a> — Central repository cataloging all 99 controlled procedures, records, manuals, and instructions.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso9001_clause5 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 9001:2015 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 5: Leadership</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Top management at PROME Consultants Limited must demonstrate leadership, executive commitment, customer focus, establish the quality policy, and assign organizational responsibilities and authorities.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1;">5.1 Leadership and commitment</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement (5.1.1 General &amp; 5.1.2 Customer Focus):</strong> Top management shall demonstrate leadership and commitment by taking accountability for QMS effectiveness; ensuring quality policy and objectives are established; promoting process approach and risk-based thinking; ensuring resources; communicating importance of QMS; and ensuring customer and statutory/regulatory requirements are consistently determined, met, and customer satisfaction enhanced.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/uploads/company-documents/PROME_Company_Organisational_Chart.pdf" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-DOC-ORG-01: Company Organisational Chart (PDF)</a> — Executive governance reporting structure from Board of Directors to Managing Director and Divisional Heads.</li>
    <li><a href="/uploads/company-documents/PROME_IMS_Organisational_Structure.pdf" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-DOC-IMS-ORG-02: IMS Organization Structure (PDF)</a> — Designated management roles, Management Representative, and Safety Committees.</li>
    <li><a href="/customer-satisfaction" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Customer Satisfaction Portal (/customer-satisfaction)</a> — Customer feedback analysis, CSAT indices, and statistical trend evaluations.</li>
    <li><a href="/customer-satisfaction" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-CSR-2025: Customer Satisfaction Survey Report (PROME-QSR-CSVM-03)</a> — Annual client rating of technical quality, timeliness, and communication.</li>
    <li><a href="/management-review" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-15: Management Review Procedure</a> — Managing Director chairing scheduled executive reviews.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">5.2 Policy</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement (5.2.1 Establishing &amp; 5.2.2 Communicating):</strong> Top management shall establish, implement and maintain a quality policy appropriate to organizational context, providing framework for objectives, commitment to satisfy requirements and continual improvement. Must be documented, communicated, understood, and available to interested parties.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/uploads/company-documents/PROME_Quality_OHS_Policy_2026.pdf" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-POL-QOHS-2026: Quality and OHS Policy Statement (PDF)</a> — Duly approved and signed by Eng. Ronald Kibuuka, Managing Director (Updated Jan 2026).</li>
    <li><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Corporate Quality Policy Portal (/organization-context)</a> — In-app policy statement displayed for all employees and visitors.</li>
    <li><a href="/communication" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-AFD-20: Corporate Communication Matrix</a> — Communication protocol for policy dissemination via office display boards, induction, and company website.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">5.3 Organizational roles, responsibilities and authorities</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Top management shall ensure that the responsibilities and authorities for relevant roles are assigned, communicated and understood within the organization, including ensuring QMS conforms to ISO 9001 and reporting on performance.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/uploads/company-documents/PROME_Company_Organisational_Chart.pdf" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-DOC-ORG-01: Company Organisational Chart (PDF)</a> — Operational line authority.</li>
    <li><a href="/uploads/company-documents/PROME_IMS_Organisational_Structure.pdf" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-DOC-IMS-ORG-02: IMS Implementation Governance Hierarchy (PDF)</a>.</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-HRAD-12 Section 5: Master Job Descriptions</a> — Controlled JDs for Managing Director, Division Heads (PED, PMBDD, HR&amp;AD, Finance), Project Managers, Resident Engineers, and Quality Officers.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso9001_clause6 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 9001:2015 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 6: Planning</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 6 covers actions to address risks and opportunities, establishing measurable quality objectives, and executing planned changes to the management system.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1;">6.1 Actions to address risks and opportunities</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement (6.1.1 &amp; 6.1.2):</strong> Determine risks and opportunities to ensure QMS achieves intended results, enhance desirable effects, prevent or reduce undesired effects, and achieve improvement. Plan actions to address risks/opportunities, integrate into QMS processes, and evaluate effectiveness.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/risks" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Risk &amp; Opportunity Management Portal (/risks)</a> — Live enterprise risk register with 5x5 risk heat matrix, probability/severity scoring, and mitigation tracking.</li>
    <li><a href="/risks" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-REG-RSK-01: Enterprise Risk &amp; Opportunity Register</a> — Engineering consultancy and project supervision risk entries.</li>
    <li><a href="/risks" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PED-04: Risk Assessment and Opportunity Procedure (Rev 05)</a> — Standard methodology for evaluating engineering design and contract delivery risks.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">6.2 Quality objectives and planning to achieve them</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement (6.2.1 &amp; 6.2.2):</strong> Establish quality objectives at relevant functions, levels and processes. Objectives shall be consistent with quality policy, measurable, monitored, communicated, and updated. Plan what will be done, resources required, responsible party, deadline, and evaluation methods.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/objectives" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Quality Objectives &amp; KPI Tracking Portal (/objectives)</a> — Division-level quantitative KPI dashboards (PED, PMBDD, HR&amp;AD, Finance).</li>
    <li><a href="/objectives" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-OBJ-2025-26: Annual Quality Objectives Matrix</a> — Covers design error reduction, on-time project completion rate (&gt;90%), and client satisfaction scores (&gt;85%).</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">6.3 Planning of changes</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> When determining the need for changes to the quality management system, changes shall be carried out in a planned manner considering purpose, consequences, QMS integrity, resources, and responsibility allocation.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/moc" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Management of Change (MOC) Module (/moc)</a> — Workflow for initiating, risk-evaluating, and approving technical and organizational changes.</li>
    <li><a href="/moc" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-MOC-REG-2025-26: Management of Change Register</a> — Log of corporate process modifications, software upgrades, and restructuring.</li>
    <li><a href="/moc" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PED-05: Management of Change Procedure</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso9001_clause7 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 9001:2015 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 7: Support</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 7 covers the provisions of necessary resources (people, infrastructure, environment, monitoring/measuring resources, organizational knowledge), competence, awareness, communication, and control of documented information.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1;">7.1 Resources</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine and provide resources needed for QMS establishment, implementation, maintenance and continual improvement (7.1.1 General, 7.1.2 People, 7.1.3 Infrastructure, 7.1.4 Environment, 7.1.5 Monitoring and measuring resources, 7.1.6 Organizational knowledge).
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/objectives" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME Corporate Budget 2026</a> — Approved financial allocation for engineering tools, site vehicles, and IT equipment.</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-REG-EQP-01: Office &amp; Site Equipment Asset Register</a> — Hardware, software licenses (AutoCAD, Civil 3D, Prokon, GIS), and total stations.</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-04: Human Resource Recruitment &amp; Management Procedure</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-HSE-ENV-01: Work Environment &amp; Ergonomics Checklist</a>.</li>
    <li><a href="/wiki" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME Engineering Knowledge Base (/wiki)</a> — Repository of design standards, technical specifications, and project archives.</li>
  </ul>

  <!-- PENDING ITEM HIGHLIGHT -->
  <div style="background-color: #fef9c3; border: 1px solid #facc15; border-left: 6px solid #eab308; border-radius: 6px; padding: 12px 18px; margin: 16px 0; color: #713f12;">
    <p style="margin: 0 0 6px 0;">
      <span style="background-color: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #facc15; font-size: 0.85em;">PENDING DOCUMENTATION: Clause 7.1.5.2 (Measurement Traceability)</span>
    </p>
    <p style="margin: 0; font-size: 0.95em;">
      <strong>Action Required:</strong> Calibration certificates from accredited laboratories (e.g., UNBS or accredited metrology centres) for survey equipment (Total Stations, GNSS RTK receivers) and soil/concrete testing machines deployed on active supervision contracts must be obtained and uploaded to the app under <a href="/documents" target="_blank" style="color: #854d0e; font-weight: 700; text-decoration: underline;">Equipment Calibration Dossier (PROME-CAL-EQP-01)</a>.
    </p>
  </div>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">7.2 Competence &amp; 7.3 Awareness</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine necessary competence of personnel; ensure persons are competent on basis of education, training or experience; take actions to acquire competence and evaluate effectiveness; retain records; ensure workers are aware of quality policy, objectives, and contribution.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/training" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Training &amp; Competency Portal (/training)</a> — Interactive module tracking staff qualifications, professional registration (ERB/UIPE), and training hours.</li>
    <li><a href="/training" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-TRN-REG-2025-26: Corporate Training Register</a> — Records of FIDIC contract administration, Civil 3D design, and ISO internal auditor courses.</li>
    <li><a href="/training" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-05: Training and Competence Procedure</a>.</li>
    <li><a href="/training" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-TRN-AWR-01: Employee Quality &amp; Safety Induction Records</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">7.4 Communication</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine internal and external communications relevant to QMS: what to communicate, when, with whom, how, and who communicates.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/communication" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Corporate Communication Portal (/communication)</a>.</li>
    <li><a href="/communication" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-AFD-20: Corporate Communication Matrix</a> — Comprehensive 7-field matrix defining communication triggers, responsibilities, channels, and verified records.</li>
    <li><a href="/communication" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-06: Internal &amp; External Communication Procedure</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">7.5 Documented information</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Create, update and control documented information to ensure availability, suitability, protection, distribution, retrieval, retention, and change control.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Document Masterlist Portal (/documents)</a> — Master control list with Document IDs, revisions, issue dates, retention periods, and PDF downloads.</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-HRAD-12: Document Masterlist (Rev Jan 2026, Ver 7)</a>.</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-01: Control of Documents Procedure</a>.</li>
    <li><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-02: Control of Records Procedure</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso9001_clause8 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 9001:2015 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 8: Operation</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 8 addresses operational planning and control, determination of requirements for services, engineering design and development, control of external providers and subconsultants, production/service delivery, release of deliverables, and nonconforming outputs.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1;">8.1 Operational planning and control</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Plan, implement and control processes needed to meet requirements for engineering consultancy and construction supervision services.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Project Engineering Division Portal (/divisions/ped)</a> — Project Quality Plan (PQP) initialization, supervision milestones, and deliverable tracking.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PED-01: Preparation of Project Quality Plan (PQP) Procedure</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-PQP-TEMPLATE: Master Project Quality Plan Template</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">8.2 Requirements for products and services</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Customer communication, determining requirements specified by client and statutory/regulatory bodies, review of requirements before committing to bids, and managing contract amendments.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/divisions/pmbdd" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PMBDD Division Portal (/divisions/pmbdd)</a> — Tender review, client RFP analysis, and contract bidding.</li>
    <li><a href="/divisions/pmbdd" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PMBDD-01: Client Inquiries &amp; Tendering Procedure</a>.</li>
    <li><a href="/divisions/pmbdd" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PMBDD-02: Contract Review &amp; Proposal Submission Procedure (PROME-QSR-BDD-01)</a>.</li>
    <li><a href="/divisions/pmbdd" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PMBDD-03: Contract Variation Procedure</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">8.3 Design and development of products and services</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Plan, control, input, verify, validate, and control changes for civil, structural, geotechnical, and highway engineering design.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Engineering Design &amp; Calculation Portal (/divisions/ped)</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PED-02: Design &amp; Development Control Procedure</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PED-03: Design Review, Verification and Validation Procedure</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-PED-01: Design Input Brief Record</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-PED-02: Design Calculation Verification Sheet</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-PED-03: Inter-Discipline Design Check Sheet</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">8.4 Control of externally provided processes, products and services</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Ensure externally provided services (subconsultants, material testing laboratories, survey firms) conform to requirements. Evaluate, select, monitor performance, and communicate requirements.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/suppliers" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Approved Vendor List (AVL) Portal (/suppliers)</a> — Pre-qualified subconsultants, geotechnical drillers, material laboratories, and equipment suppliers.</li>
    <li><a href="/suppliers" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-AVL-2025-26: Approved Vendor List &amp; Subconsultant Register</a>.</li>
    <li><a href="/suppliers" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-FIN-01: Procurement &amp; Supplier Evaluation Procedure</a>.</li>
    <li><a href="/suppliers" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-FIN-01: Annual Supplier Performance Evaluation Form</a>.</li>
  </ul>

  <!-- PENDING ITEM HIGHLIGHT -->
  <div style="background-color: #fef9c3; border: 1px solid #facc15; border-left: 6px solid #eab308; border-radius: 6px; padding: 12px 18px; margin: 16px 0; color: #713f12;">
    <p style="margin: 0 0 6px 0;">
      <span style="background-color: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #facc15; font-size: 0.85em;">PENDING DOCUMENTATION: Clause 8.4.2 (External Plant &amp; Lifting Equipment Inspection)</span>
    </p>
    <p style="margin: 0; font-size: 0.95em;">
      <strong>Action Required:</strong> Third-party statutory examination certificates and load test reports for contractor heavy equipment (cranes, passenger/material hoists, batching plants, and earthmoving plant) deployed on supervision project sites must be collected and linked to the project audit files.
    </p>
  </div>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">8.5 Production and service provision &amp; 8.6 Release of services</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Implement controlled conditions for construction supervision and design delivery; ensure identification and traceability; protect customer property; preserve outputs; handle post-delivery/defects liability; verify release requirements.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/projects" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Project Supervision Management Portal (/projects)</a> — Track document status (including Issued for Construction), inspection RFIs, and site instructions.</li>
    <li><a href="/projects" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-WI-PED-01: Site Supervision &amp; Quality Inspection Work Instruction</a>.</li>
    <li><a href="/projects" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-WI-PED-02: Materials Testing Verification Work Instruction</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-PED-04: Final Engineering Deliverable Sign-Off Form</a>.</li>
    <li><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-PED-05: Project Handover, DLP &amp; As-Built Verification Procedure</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">8.7 Control of nonconforming outputs</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Ensure nonconforming deliverables (defective designs, substandard contractor work on site) are identified, controlled, and recorded to prevent unintended release.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/ncr" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Nonconformity Management Portal (/ncr)</a> — Issue NCR notices, capture defect photos, track contractor rectifications.</li>
    <li><a href="/ncr" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-NCR-REG-2025-26: Corporate NCR Register</a>.</li>
    <li><a href="/ncr" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-03: Control of Nonconforming Work Procedure</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso9001_clause9 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 9001:2015 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 9: Performance Evaluation</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 9 covers monitoring, measurement, analysis and evaluation, customer satisfaction surveys, internal quality audits, and management review meetings.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1;">9.1 Monitoring, measurement, analysis and evaluation</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine what needs monitoring and measuring, methods, and evaluation timing. Monitor customer perceptions (9.1.2) and analyze/evaluate data arising from monitoring (9.1.3 conformity, satisfaction, performance, risk action effectiveness, supplier performance).
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/customer-satisfaction" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Customer Satisfaction Portal (/customer-satisfaction)</a> — Real-time analytics, rating distributions, and client feedback metrics.</li>
    <li><a href="/customer-satisfaction" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-CSR-2025: Customer Satisfaction Survey &amp; Evaluation Report (PROME-QSR-CSVM-03)</a>.</li>
    <li><a href="/customer-satisfaction" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-02: Customer Satisfaction Evaluation Procedure</a>.</li>
    <li><a href="/objectives" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Division KPI Performance Dashboard (/objectives)</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">9.2 Internal audit</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Conduct internal audits at planned intervals to verify QMS conforms to ISO 9001 and organization requirements, and is effectively implemented and maintained. Establish audit program, define criteria, select objective auditors, report results, and take timely corrective actions.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/audits" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Internal Audit Management Portal (/audits)</a> — Audit planning, automated checklist execution, nonconformity report generation, and auditor sign-off.</li>
    <li><a href="/audits" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-AUD-2026-001: Integrated Internal ISO Audit Report (January 2026)</a> — Comprehensive audit report with formal 5-Why root cause analysis forms.</li>
    <li><a href="/audits" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-PLN-AUD-2026: Annual Internal Audit Schedule</a>.</li>
    <li><a href="/audits" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-14: Internal Audit Procedure</a>.</li>
    <li><a href="/audits" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-CSVM-01: ISO Internal Audit Checklist</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">9.3 Management review</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Top management shall review the organization's QMS at planned intervals to ensure its continuing suitability, adequacy, effectiveness and alignment with strategic direction. Include review of inputs and retain documented review outputs.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/management-review" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Management Review Portal (/management-review)</a> — Digital meeting minutes, agenda builder, and executive action tracker.</li>
    <li><a href="/management-review" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-MRM-2025-01: Minutes of Annual Management Review Meeting (Dec 2025)</a> — Chaired by Eng. Ronald Kibuuka with all 5 Division Directors.</li>
    <li><a href="/management-review" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-15: Management Review Procedure</a>.</li>
    <li><a href="/management-review" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSR-CSVM-02: Management Review Agenda and Meeting Records</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso9001_clause10 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 9001:2015 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 10: Improvement</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 10 covers determining opportunities for improvement, reacting to nonconformities, implementing corrective actions with 5-Why root cause analysis, and driving continual improvement.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1;">10.1 General &amp; 10.3 Continual improvement</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine and select opportunities for improvement and implement necessary actions. Continually improve the suitability, adequacy and effectiveness of the QMS using analysis results and management review outputs.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/continual-improvement" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Continual Improvement Portal (/continual-improvement)</a> — Kaizen initiatives, engineering innovation ideas, and productivity improvement logs.</li>
    <li><a href="/continual-improvement" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-CI-SEC-10: Continual Improvement Framework</a>.</li>
    <li><a href="/continual-improvement" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-REG-CI-01: Continual Improvement Action Register</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">10.2 Nonconformity and corrective action</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> When a nonconformity occurs, react to control and correct it, deal with consequences; evaluate the need for action to eliminate root causes using root cause analysis (RCA / 5-Why); implement corrective actions; review effectiveness; update risks/opportunities; and retain documented information.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/ncr" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Nonconformity &amp; Corrective Action Portal (/ncr)</a> — Structured NCR workflow with built-in 5-Why Root Cause Analysis form, immediate containment, and preventive action closure.</li>
    <li><a href="/ncr" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-NCR-REG-2025-26: Corporate Corrective Action Register</a>.</li>
    <li><a href="/ncr" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-07: Corrective and Preventive Action Procedure</a>.</li>
    <li><a href="/audits" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline;">PROME-AUD-2026-001: Internal Audit Non-conformance 1 of 1 Form</a> — Live verified implementation of 5-Why root cause analysis and lead auditor closure sign-off.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso9001_master = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
    <span style="background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; letter-spacing: 1px;">INTERNATIONAL STANDARD GUIDE</span>
    <h1 style="font-size: 2.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0; color: white;">ISO 9001:2015 Quality Management System</h1>
    <p style="font-size: 1.1rem; opacity: 0.95; margin: 0; max-width: 700px;">
      Complete normative requirements matrix and mapped PROME Consultants Limited operational documents, portals, and records (Clauses 4 through 10).
    </p>
  </div>

  <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 5px solid #22c55e; border-radius: 6px; padding: 12px 18px; margin-bottom: 1.5rem;">
    <h3 style="margin: 0 0 6px 0; color: #166534; font-size: 1.05rem;">Quick Navigation &amp; Summary</h3>
    <p style="margin: 0; color: #14532d; font-size: 0.92rem;">
      PROME Consultants Limited operates an audited ISO 9001:2015 Quality Management System integrated with ISO 45001:2018. All core engineering, design, supervision, and corporate processes are digitally managed. Standard requirements lacking direct automated records are highlighted in yellow as <strong>[PENDING]</strong> with action plans.
    </p>
  </div>

  <table class="wiki-iso-table" style="width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.88rem;">
    <thead>
      <tr style="background-color: #f1f5f9;">
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 14%;">Clause</th>
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 34%;">Standard Requirement Text</th>
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 34%;">PROME IMS App Document / Evidence Link</th>
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 18%;">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">4.1 Organization Context</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Determine external and internal issues relevant to strategic direction.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600;">Organization Context Portal</a><br/>PROME-QSP-CSVM-01 (Rev 05)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">4.2 Interested Parties</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Identify interested parties and determine relevant requirements.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600;">Interested Parties Register</a><br/>PROME-QSP-CSVM-21 (Rev 05)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">4.3 QMS Scope</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Establish boundaries &amp; applicability of QMS; maintain documented information.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/organization-context" target="_blank" style="color: #0284c7; font-weight: 600;">IMS Scope Statement</a><br/>PROME-QSP-CSVM-18</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">5.1 Leadership &amp; Commitment</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Top management accountability, customer focus, integration of QMS.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/uploads/company-documents/PROME_Company_Organisational_Chart.pdf" target="_blank" style="color: #0284c7; font-weight: 600;">PROME Organogram PDF</a><br/><a href="/customer-satisfaction" target="_blank" style="color: #0284c7; font-weight: 600;">Customer Satisfaction Portal</a></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">5.2 Quality Policy</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Establish, communicate and maintain quality policy.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/uploads/company-documents/PROME_Quality_OHS_Policy_2026.pdf" target="_blank" style="color: #0284c7; font-weight: 600;">PROME-POL-QOHS-2026 (PDF)</a> (Signed Jan 2026)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">6.1 Risks &amp; Opportunities</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Determine and plan actions to address risks and opportunities.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/risks" target="_blank" style="color: #0284c7; font-weight: 600;">Risk Register Portal (/risks)</a><br/>PROME-REG-RSK-01</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">6.2 Objectives &amp; Planning</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Establish measurable quality objectives at relevant functions.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/objectives" target="_blank" style="color: #0284c7; font-weight: 600;">Objectives Portal (/objectives)</a><br/>PROME-QSR-OBJ-2025-26</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">7.1.5 Measurement Traceability</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Equipment calibrated or verified against traceable national/international standards.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">
          <span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700;">PENDING: Calibration Certificates</span><br/>
          Survey Total Stations &amp; Soil Lab Machines
        </td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em; border: 1px solid #facc15;">PENDING ACTION</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">7.2 Competence &amp; Training</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Ensure staff competence; retain appropriate records.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/training" target="_blank" style="color: #0284c7; font-weight: 600;">Training Portal (/training)</a><br/>PROME-TRN-REG-2025-26</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">7.5 Documented Information</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Control creation, updating, distribution, and retention of QMS documents.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/documents" target="_blank" style="color: #0284c7; font-weight: 600;">Masterlist Portal (/documents)</a><br/>PROME-QSR-HRAD-12 (Rev Jan 2026)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">8.3 Design &amp; Development</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Design stages, inputs, verification, validation, and change control.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/divisions/ped" target="_blank" style="color: #0284c7; font-weight: 600;">Engineering Design Portal</a><br/>PROME-QSP-PED-02 &amp; PED-03</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">8.4 External Providers</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Control of externally provided services and contractor plant.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/suppliers" target="_blank" style="color: #0284c7; font-weight: 600;">Approved Vendor List (/suppliers)</a><br/>PROME-AVL-2025-26</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">9.2 Internal Audit</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Conduct planned internal audits and report findings to management.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/audits" target="_blank" style="color: #0284c7; font-weight: 600;">Audits Portal (/audits)</a><br/>PROME-AUD-2026-001 (Jan 2026 Report)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">9.3 Management Review</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Executive review of QMS suitability, adequacy, and effectiveness.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/management-review" target="_blank" style="color: #0284c7; font-weight: 600;">Management Review Portal</a><br/>PROME-MRM-2025-01 Minutes</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">10.2 NCR &amp; Corrective Action</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">React to nonconformities, execute 5-Why root cause analysis, prevent recurrence.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/ncr" target="_blank" style="color: #0284c7; font-weight: 600;">NCR Portal (/ncr)</a><br/>PROME-NCR-REG-2025-26 &amp; 5-Why RCA Form</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
    </tbody>
  </table>

  <h3 style="font-size: 1.15rem; font-weight: 600; color: #0369a1; margin-top: 2rem;">Individual Clause Detailed Documents</h3>
  <p>Select any specific clause document in the sidebar folder to inspect its complete line-by-line normative text, requirements, and compliance links.</p>
</div>
`;

  // =========================================================================
  // ISO 45001:2018 CONTENT DEFINITIONS
  // =========================================================================

  const iso45001_clause4 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 45001:2018 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 4: Context of the Organization</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 4 requires PROME Consultants Limited to determine external and internal issues affecting OH&amp;S performance, identify needs and expectations of workers and regulatory authorities, define the OH&amp;S management system scope, and establish the safety processes.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669;">4.1 Understanding the organization and its context</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine external and internal issues that are relevant to its purpose and that affect its ability to achieve the intended outcomes of its OH&amp;S management system (preventing work-related injuries and ill-health).
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/organization-context" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Organization Context Portal (/organization-context)</a> — HSE factor evaluation including road safety risks during field site visits, climatic conditions, security, and physical office ergonomics.</li>
    <li><a href="/organization-context" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-QSP-CSVM-01: Context of the Organization (OHS Matrix)</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">HSE Management Portal (/hse)</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">4.2 Understanding the needs and expectations of workers and other interested parties</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine: a) other interested parties in addition to workers; b) relevant needs and expectations (requirements) of workers and interested parties; c) which of these needs and expectations become applicable legal requirements and other requirements.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/organization-context" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Stakeholder &amp; Worker Matrix (/organization-context)</a> — Identifies requirements of full-time staff, contract site engineers, Ministry of Gender, Labour and Social Development (MGLSD), KCCA, and Police Fire Department.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-REG-LEG-01: Legal and Statutory Compliance Register</a> — Uganda Occupational Safety and Health Act 2006, Workers Compensation Act Cap 225, NEMA Act 2019.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">4.3 Determining the scope of the OH&amp;S management system &amp; 4.4 System</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine boundaries and applicability of OH&amp;S system, taking into account activities, products and services within organization's control or influence. Establish, implement, maintain and continually improve the OH&amp;S system.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/organization-context" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Official IMS Scope Statement</a> — Encompasses all head office administrative facilities and all active construction supervision, material testing, and surveying field sites across Uganda.</li>
    <li><a href="/documents" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-HSE-MAN-01: Integrated Health, Safety &amp; Environment Manual</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso45001_clause5 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 45001:2018 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 5: Leadership &amp; Worker Participation</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Top management leadership, establishing the corporate OH&amp;S policy, defining organizational roles, and formal processes for worker consultation and participation.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669;">5.1 Leadership and commitment</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Top management shall take overall responsibility and accountability for prevention of work-related injury and ill health, provision of safe workplaces, protecting workers from reprisals when reporting hazards/incidents, and developing a positive safety culture.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/uploads/company-documents/PROME_Company_Organisational_Chart.pdf" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-DOC-ORG-01: Company Organisational Chart (PDF)</a> — Executive authority and line accountability.</li>
    <li><a href="/uploads/company-documents/PROME_IMS_Organisational_Structure.pdf" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-DOC-IMS-ORG-02: IMS Organization Structure (PDF)</a> — Safety Committee and appointed Safety Officers.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME Stop-Work Authority &amp; Non-Reprisal Policy</a> — Empowering any worker to halt unsafe work on site without penalty.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">5.2 OH&amp;S policy</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Top management shall establish, implement and maintain an OH&amp;S policy that includes commitment to provide safe and healthy working conditions, eliminate hazards, reduce OH&amp;S risks, continual improvement, and consultation/participation of workers.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/uploads/company-documents/PROME_OHS_Policy_2026.pdf" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-POL-OHS-2026: Occupational Health and Safety Policy (PDF)</a> — Formally approved and signed by Eng. Ronald Kibuuka, Managing Director (Jan 2026).</li>
    <li><a href="/uploads/company-documents/PROME_Quality_OHS_Policy_2026.pdf" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-POL-QOHS-2026: Integrated Quality and OHS Policy Statement (PDF)</a>.</li>
    <li><a href="/organization-context" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Corporate Policy Display (/organization-context)</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">5.4 Consultation and participation of workers</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Establish, implement and maintain processes for consultation and participation of workers at all applicable levels; provide time, training, resources, and clear information; remove obstacles; emphasize non-managerial worker participation in hazard identification, risk assessments, and incident investigations.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Safety Committee &amp; Worker Participation Portal (/hse)</a> — Log of joint worker-management monthly safety reviews.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-HSE-COM-01: Joint Safety &amp; Health Committee Meeting Minutes</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-WI-HSE-02: Worker Consultation &amp; Daily Toolbox Talk Work Instruction</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso45001_clause6 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 45001:2018 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 6: Planning</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 6 covers proactive hazard identification, assessment of OH&amp;S risks and opportunities, determining legal obligations, and setting measurable OH&amp;S performance objectives.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669;">6.1 Actions to address risks and opportunities (HIRA &amp; Legal)</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement (6.1.2 Hazard identification, 6.1.3 Legal requirements):</strong> Establish proactive processes for ongoing hazard identification (routine/non-routine, emergencies, people factors); assess OH&amp;S risks; determine legal requirements and other requirements; and plan actions.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/risks" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Hazard Identification &amp; Risk Assessment Portal (HIRA) (/risks)</a> — Interactive HIRA module categorizing physical, ergonomic, chemical, and biological hazards.</li>
    <li><a href="/risks" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-REG-HIRA-01: Comprehensive HIRA Register</a> — Detailed risk assessments for office operations, site driving, working at heights, deep excavations, and traffic management.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-REG-LEG-01: Statutory Legal &amp; Regulatory Compliance Register</a> — Tracks compliance with Uganda OSH Act 2006, Workers Compensation Act Cap 225, National Forestry Act, and Traffic &amp; Road Safety Regulations.</li>
    <li><a href="/objectives" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-PLN-HSE-2026: Annual Corporate HSE Operational Plan</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">6.2 OH&amp;S objectives and planning to achieve them</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Establish OH&amp;S objectives at relevant functions and levels to maintain and continually improve the OH&amp;S management system and OH&amp;S performance. Objectives shall be measurable, monitored, and supported by action plans.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/objectives" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">OH&amp;S Objectives &amp; Safety KPI Tracker (/objectives)</a> — Targets: Zero fatalities, Zero Lost Time Injuries (LTI), 100% PPE compliance, and 100% scheduled toolbox talks conducted.</li>
    <li><a href="/objectives" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-QSR-OBJ-2025-26: Annual Corporate IMS Objectives Matrix</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso45001_clause7 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 45001:2018 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 7: Support</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Provisions of resources for safety, safety competence and certifications, worker safety awareness, internal/external communication, and documented safety information.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669;">7.1 Resources &amp; 7.2 Competence</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Provide resources needed for OH&amp;S system (PPE, first aid kits, emergency gear). Ensure workers are competent on basis of education, training, or experience; retain documented evidence.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PPE Management &amp; Issuance Portal (/hse)</a> — Tracking safety helmets, high-visibility vests, steel-toe boots, and eye protection.</li>
    <li><a href="/training" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Safety Training &amp; First Aid Portal (/training)</a> — Certified training for Designated First Aiders, Fire Marshals, and Defensive Driving for site vehicle operators.</li>
    <li><a href="/training" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-TRN-REG-2025-26: Corporate Safety Training Register</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-REG-PPE-01: PPE Supply and Issuance Register</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">7.3 Awareness, 7.4 Communication &amp; 7.5 Documented Information</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Worker safety awareness (rights, hazard avoidance, incident reporting); internal/external communication processes; control and retention of documented information.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/training" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-HSE-IND-01: Site Safety Induction &amp; Worker Handbook</a>.</li>
    <li><a href="/communication" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Corporate Communication Matrix (/communication)</a> — Lines of reporting to Uganda Ministry of Labour (injuries/dangerous occurrences), KCCA, and local police.</li>
    <li><a href="/documents" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Document Masterlist Portal (/documents)</a> — PROME-QSR-HRAD-12 (Rev Jan 2026).</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso45001_clause8 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 45001:2018 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 8: Operation</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Operational planning and control, eliminating hazards via the Hierarchy of Controls, management of change, procurement/contractor safety controls, and emergency preparedness and response.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669;">8.1 Operational planning and control (8.1.1 General &amp; 8.1.2 Hierarchy of Controls)</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Implement controls to manage OH&amp;S risks; adapt work to workers; eliminate hazards and reduce risks using the Hierarchy of Controls: 1) Elimination; 2) Substitution; 3) Engineering controls; 4) Administrative controls; 5) PPE.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Permit to Work (PTW) Portal (/hse)</a> — Permits for Hot Work, Confined Space Entry, Deep Excavations (&gt;1.5m), and Working at Heights (&gt;2.0m).</li>
    <li><a href="/risks" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Hierarchy of Controls Matrix in PROME-REG-HIRA-01</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-WI-HSE-01: Personal Protective Equipment Compliance Instruction</a>.</li>
  </ul>

  <!-- PENDING ITEM HIGHLIGHT 1: MEDICAL CHECK-UPS -->
  <div style="background-color: #fef9c3; border: 1px solid #facc15; border-left: 6px solid #eab308; border-radius: 6px; padding: 12px 18px; margin: 16px 0; color: #713f12;">
    <p style="margin: 0 0 6px 0;">
      <span style="background-color: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #facc15; font-size: 0.85em;">PENDING DOCUMENTATION: Clause 8.1.1 (Worker Health Surveillance)</span>
    </p>
    <p style="margin: 0; font-size: 0.95em;">
      <strong>Action Required:</strong> Pre-employment and annual medical check-up examination fitness certificates for field survey crews, material inspectors, and resident engineers from an accredited occupational health clinic must be uploaded under <a href="/hse" target="_blank" style="color: #854d0e; font-weight: 700; text-decoration: underline;">Employee Health &amp; Medical Records (PROME-MED-CHK-2025)</a>.
    </p>
  </div>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">8.1.3 Management of change &amp; 8.1.4 Procurement (Contractors &amp; Outsourcing)</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Manage temporary/permanent changes impacting OH&amp;S performance. Establish procurement controls; coordinate with contractors to identify and control hazards arising from contractor activities on site.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/moc" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Management of Change (MOC) Module (/moc)</a> — Safety impact assessments prior to altering engineering designs or construction methodologies.</li>
    <li><a href="/suppliers" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Approved Vendor List &amp; Contractor Portal (/suppliers)</a> — Contractor OH&amp;S pre-qualification criteria, safety track records, and PPE verification.</li>
    <li><a href="/suppliers" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-QSR-FIN-02: Contractor HSE Evaluation &amp; Compliance Form</a>.</li>
  </ul>

  <!-- PENDING ITEM HIGHLIGHT 2: CONTRACTOR HEAVY EQUIPMENT LOAD TESTING -->
  <div style="background-color: #fef9c3; border: 1px solid #facc15; border-left: 6px solid #eab308; border-radius: 6px; padding: 12px 18px; margin: 16px 0; color: #713f12;">
    <p style="margin: 0 0 6px 0;">
      <span style="background-color: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #facc15; font-size: 0.85em;">PENDING DOCUMENTATION: Clause 8.1.4.2 (Contractor Plant Inspection &amp; Load Testing)</span>
    </p>
    <p style="margin: 0; font-size: 0.95em;">
      <strong>Action Required:</strong> Third-party structural and mechanical load testing certification records for cranes, hoists, batching plants, and lifting gear operated by construction contractors on supervised project sites must be verified by Resident Engineers and archived in project files.
    </p>
  </div>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">8.2 Emergency preparedness and response</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Prepare for and respond to potential emergency situations (evacuation, first aid, fire outbreaks, structural collapses, hazardous spills). Periodically test emergency response capabilities and conduct drills.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Emergency Preparedness &amp; Response Portal (/hse)</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-ERP-2026: Corporate Emergency Response Plan</a> — Detailed protocols for medical emergencies, site injuries, fire outbreaks, and severe weather.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-DRL-LOG-2025: Fire &amp; Evacuation Drill Log</a> — Head Office fire evacuation drill executed in November 2025.</li>
  </ul>

  <!-- PENDING ITEM HIGHLIGHT 3: EXTERNAL DRILL -->
  <div style="background-color: #fef9c3; border: 1px solid #facc15; border-left: 6px solid #eab308; border-radius: 6px; padding: 12px 18px; margin: 16px 0; color: #713f12;">
    <p style="margin: 0 0 6px 0;">
      <span style="background-color: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #facc15; font-size: 0.85em;">PENDING DOCUMENTATION: Clause 8.2 (Joint Simulation with External Emergency Services)</span>
    </p>
    <p style="margin: 0; font-size: 0.95em;">
      <strong>Action Required:</strong> Joint simulation drill and coordination report with external Police Fire &amp; Rescue Services or Emergency Medical Services (EMS) for major supervision project sites is scheduled for Q2 2026.
    </p>
  </div>
</div>
`;

  const iso45001_clause9 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 45001:2018 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 9: Performance Evaluation</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Clause 9 covers monitoring and measurement of OH&amp;S performance, evaluation of statutory legal compliance, internal OH&amp;S audits, and top management safety reviews.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669;">9.1 Monitoring, measurement, analysis and evaluation (9.1.1 &amp; 9.1.2 Legal compliance)</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine what needs monitoring (incident rates, PPE compliance, safe man-hours, equipment inspections); evaluate compliance with legal and other requirements (9.1.2) at planned intervals; maintain knowledge of compliance status.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Monthly HSE Statistics Portal (/hse)</a> — Real-time tracking of Safe Working Hours, Lost Time Injury Frequency Rate (LTIFR = 0), and Near-Miss reports.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-HSE-STATS-2025-26: Monthly HSE Metric Reports</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-REG-LEG-01: Annual Statutory Legal Compliance Evaluation Audit</a> — Completed evaluation under Uganda Occupational Safety &amp; Health Act 2006.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">9.2 Internal audit &amp; 9.3 Management review</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Conduct internal audits at planned intervals covering ISO 45001; report findings to managers and workers. Top management review of OH&amp;S management system covering incidents, audit results, worker consultations, and continual improvement.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/audits" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Audits Management Portal (/audits)</a> — Comprehensive ISO 45001 internal audit program.</li>
    <li><a href="/audits" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-AUD-2026-001: Integrated Internal ISO 9001 &amp; ISO 45001 Audit Report (January 2026)</a>.</li>
    <li><a href="/management-review" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Management Review Portal (/management-review)</a>.</li>
    <li><a href="/management-review" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-MRM-2025-01: Minutes of Annual Management Review Meeting (Dec 2025)</a> — Detailed review of OH&amp;S performance metrics, safety committee resolutions, and resource allocation.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso45001_clause10 = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 2px solid #059669; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
    <span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;">ISO 45001:2018 Standard</span>
    <h1 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0.5rem 0 0 0;">Clause 10: Improvement</h1>
  </div>

  <p style="font-size: 1rem; color: #334155;">
    Reporting and investigation of incidents, near misses, occupational nonconformities, implementing corrective actions with worker participation, and driving continual safety improvement.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669;">10.1 General &amp; 10.3 Continual improvement</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Determine opportunities for improvement and implement necessary actions. Continually improve suitability, adequacy and effectiveness of OH&amp;S system, promote a positive safety culture, and communicate results to workers.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/continual-improvement" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Continual Improvement Portal (/continual-improvement)</a> — Worker safety suggestion scheme, PPE enhancements, and site supervision best practices.</li>
    <li><a href="/continual-improvement" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-REG-CI-01: Continual Improvement Action Log</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>

  <h2 style="font-size: 1.25rem; font-weight: 600; color: #059669; margin-top: 2rem;">10.2 Incident, nonconformity and corrective action</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0;">
    <strong>Standard Requirement:</strong> Establish processes to report, investigate and take action on incidents and nonconformities. React in a timely manner; evaluate root causes with the participation of workers; review risk assessments; implement corrective actions using the Hierarchy of Controls; review effectiveness; retain documented evidence.
  </div>
  <p><strong>PROME IMS Compliance Evidence &amp; App Links:</strong></p>
  <ul>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Incident Reporting &amp; Investigation Portal (/hse)</a> — Real-time incident logs, witness statement uploads, and severity classification.</li>
    <li><a href="/ncr" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">Nonconformity &amp; Corrective Action Portal (/ncr)</a> — Integrated 5-Why root cause analysis forms and preventive action validation.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-INC-REG-2025-26: Corporate Incident &amp; Near Miss Register</a>.</li>
    <li><a href="/hse" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-WI-HSE-03: Incident Notification and Root Cause Investigation Work Instruction</a>.</li>
    <li><a href="/ncr" target="_blank" style="color: #059669; font-weight: 600; text-decoration: underline;">PROME-QSP-HRAD-07: Corrective and Preventive Action Procedure</a>.</li>
  </ul>
  <p><span style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac; font-size: 0.85em;">✓ FULLY COMPLIANT &amp; LINKED</span></p>
</div>
`;

  const iso45001_master = `
<div style="font-family: inherit; line-height: 1.6; color: #1e293b;">
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
    <span style="background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; letter-spacing: 1px;">INTERNATIONAL STANDARD GUIDE</span>
    <h1 style="font-size: 2.25rem; font-weight: 800; margin: 0.75rem 0 0.5rem 0; color: white;">ISO 45001:2018 Occupational Health &amp; Safety</h1>
    <p style="font-size: 1.1rem; opacity: 0.95; margin: 0; max-width: 700px;">
      Complete normative requirements matrix and mapped PROME Consultants Limited OH&amp;S operational documents, portals, and records (Clauses 4 through 10).
    </p>
  </div>

  <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 5px solid #22c55e; border-radius: 6px; padding: 12px 18px; margin-bottom: 1.5rem;">
    <h3 style="margin: 0 0 6px 0; color: #166534; font-size: 1.05rem;">Executive Summary &amp; Scope</h3>
    <p style="margin: 0; color: #14532d; font-size: 0.92rem;">
      PROME Consultants Limited maintains an accredited ISO 45001:2018 Occupational Health &amp; Safety Management System. It safeguards all personnel at the Kampala Head Office and across all civil, structural, and geotechnical project supervision sites. Standard requirements requiring physical external uploads or pending actions are highlighted in yellow as <strong>[PENDING]</strong>.
    </p>
  </div>

  <table class="wiki-iso-table" style="width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.88rem;">
    <thead>
      <tr style="background-color: #f1f5f9;">
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 14%;">Clause</th>
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 34%;">Standard Requirement Text</th>
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 34%;">PROME IMS App Document / Evidence Link</th>
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 18%;">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">4.1 Context of Organization</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Determine internal and external issues affecting OH&amp;S intended outcomes.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/organization-context" target="_blank" style="color: #059669; font-weight: 600;">Organization Context Portal</a><br/>PROME-QSP-CSVM-01</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">4.2 Worker Needs &amp; Legal</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Determine worker needs, expectations, and applicable statutory/legal obligations.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/hse" target="_blank" style="color: #059669; font-weight: 600;">Legal Register Portal (/hse)</a><br/>PROME-REG-LEG-01 (OSH Act 2006)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">5.1 Leadership &amp; Commitment</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Top management accountability for preventing injury, developing safety culture.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/uploads/company-documents/PROME_Company_Organisational_Chart.pdf" target="_blank" style="color: #059669; font-weight: 600;">PROME Organogram PDF</a><br/><a href="/uploads/company-documents/PROME_IMS_Organisational_Structure.pdf" target="_blank" style="color: #059669; font-weight: 600;">IMS Structure PDF</a></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">5.2 OH&amp;S Policy</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Establish, document, and communicate OH&amp;S policy approved by top management.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/uploads/company-documents/PROME_OHS_Policy_2026.pdf" target="_blank" style="color: #059669; font-weight: 600;">PROME-POL-OHS-2026 (PDF)</a> (Signed Jan 2026)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">5.4 Worker Consultation</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Processes for worker consultation, participation, safety committees, toolbox talks.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/hse" target="_blank" style="color: #059669; font-weight: 600;">Safety Committee Portal (/hse)</a><br/>PROME-HSE-COM-01 &amp; PROME-WI-HSE-02</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">6.1 Hazard ID &amp; Risk (HIRA)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Proactive hazard identification, risk assessment, and hierarchy of controls.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/risks" target="_blank" style="color: #059669; font-weight: 600;">HIRA Portal (/risks)</a><br/>PROME-REG-HIRA-01 Register</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">6.2 OH&amp;S Objectives</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Measurable safety performance objectives (Zero Fatalities, Zero LTIs).</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/objectives" target="_blank" style="color: #059669; font-weight: 600;">Objectives Portal (/objectives)</a><br/>PROME-QSR-OBJ-2025-26</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">7.2 Competence &amp; Training</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Ensure staff safety competency (First Aid, Fire Fighting, Defensive Driving).</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/training" target="_blank" style="color: #059669; font-weight: 600;">Training Portal (/training)</a><br/>PROME-TRN-REG-2025-26</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">8.1.1 Worker Medical Surveillance</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Periodic occupational medical examination fitness certificates for field personnel.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">
          <span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700;">PENDING: Medical Check-ups</span><br/>
          Field Survey &amp; Site Engineers (PROME-MED-CHK-2025)
        </td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em; border: 1px solid #facc15;">PENDING ACTION</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">8.1.2 Operational Controls &amp; PTW</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Permit to Work systems for high-risk works and PPE compliance.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/hse" target="_blank" style="color: #059669; font-weight: 600;">Permits &amp; PPE Portal (/hse)</a><br/>PROME-REG-PPE-01 &amp; PTW Records</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">8.1.4 Contractor Machinery Inspection</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Statutory third-party inspection/load test certificates for contractor cranes &amp; hoists.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">
          <span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700;">PENDING: Plant Load Tests</span><br/>
          Contractor Site Machinery (PROME-CAL-EQP-01)
        </td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em; border: 1px solid #facc15;">PENDING ACTION</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">8.2 Emergency Response</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Emergency response plan and scheduled fire/evacuation simulation drills.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/hse" target="_blank" style="color: #059669; font-weight: 600;">Emergency Response Portal</a><br/>PROME-ERP-2026 &amp; Nov 2025 Drill Log</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">9.1 Performance &amp; Compliance</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Monthly safety metrics monitoring and statutory legal compliance audits.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/hse" target="_blank" style="color: #059669; font-weight: 600;">Monthly HSE Metrics Portal</a><br/>PROME-HSE-STATS-2025-26</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">9.2 Internal Audit</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Internal audit program verifying conformity to ISO 45001.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/audits" target="_blank" style="color: #059669; font-weight: 600;">Audits Portal (/audits)</a><br/>PROME-AUD-2026-001 (Jan 2026)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">10.2 Incident &amp; Corrective Action</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">Reporting, 5-Why root cause investigation, and preventing injury recurrence.</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="/hse" target="_blank" style="color: #059669; font-weight: 600;">Incident Portal</a> &amp; <a href="/ncr" target="_blank" style="color: #059669; font-weight: 600;">NCR Portal</a><br/>PROME-INC-REG-2025-26</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.8em;">✓ COMPLIANT</span></td>
      </tr>
    </tbody>
  </table>

  <h3 style="font-size: 1.15rem; font-weight: 600; color: #059669; margin-top: 2rem;">Individual Clause Detailed Documents</h3>
  <p>Select any specific clause document in the sidebar folder to inspect its complete line-by-line normative text, requirements, and compliance links.</p>
</div>
`;

  // 3. Upsert Pages
  const pages = [
    // ISO 9001:2015 Pages
    {
      title: 'ISO 9001:2015 — Requirements & IMS Document Mapping',
      folderId: folder9001.id,
      content: iso9001_master
    },
    {
      title: 'Clause 4: Context of the Organization (ISO 9001)',
      folderId: folder9001.id,
      content: iso9001_clause4
    },
    {
      title: 'Clause 5: Leadership (ISO 9001)',
      folderId: folder9001.id,
      content: iso9001_clause5
    },
    {
      title: 'Clause 6: Planning (ISO 9001)',
      folderId: folder9001.id,
      content: iso9001_clause6
    },
    {
      title: 'Clause 7: Support (ISO 9001)',
      folderId: folder9001.id,
      content: iso9001_clause7
    },
    {
      title: 'Clause 8: Operation (ISO 9001)',
      folderId: folder9001.id,
      content: iso9001_clause8
    },
    {
      title: 'Clause 9: Performance Evaluation (ISO 9001)',
      folderId: folder9001.id,
      content: iso9001_clause9
    },
    {
      title: 'Clause 10: Improvement (ISO 9001)',
      folderId: folder9001.id,
      content: iso9001_clause10
    },

    // ISO 45001:2018 Pages
    {
      title: 'ISO 45001:2018 — Requirements & OHS Document Mapping',
      folderId: folder45001.id,
      content: iso45001_master
    },
    {
      title: 'Clause 4: Context of the Organization (ISO 45001)',
      folderId: folder45001.id,
      content: iso45001_clause4
    },
    {
      title: 'Clause 5: Leadership & Worker Participation (ISO 45001)',
      folderId: folder45001.id,
      content: iso45001_clause5
    },
    {
      title: 'Clause 6: Planning (ISO 45001)',
      folderId: folder45001.id,
      content: iso45001_clause6
    },
    {
      title: 'Clause 7: Support (ISO 45001)',
      folderId: folder45001.id,
      content: iso45001_clause7
    },
    {
      title: 'Clause 8: Operation (ISO 45001)',
      folderId: folder45001.id,
      content: iso45001_clause8
    },
    {
      title: 'Clause 9: Performance Evaluation (ISO 45001)',
      folderId: folder45001.id,
      content: iso45001_clause9
    },
    {
      title: 'Clause 10: Improvement (ISO 45001)',
      folderId: folder45001.id,
      content: iso45001_clause10
    }
  ];

  for (const pageData of pages) {
    const existing = await prisma.wikiPage.findFirst({
      where: {
        title: pageData.title,
        folderId: pageData.folderId
      }
    });

    if (existing) {
      await prisma.wikiPage.update({
        where: { id: existing.id },
        data: {
          content: pageData.content,
          status: 'Approved',
          approvedById: userId,
          version: '2026.1'
        }
      });
      console.log(`Updated page: "${pageData.title}" (ID: ${existing.id})`);
    } else {
      const created = await prisma.wikiPage.create({
        data: {
          title: pageData.title,
          folderId: pageData.folderId,
          content: pageData.content,
          authorId: userId,
          approvedById: userId,
          status: 'Approved',
          version: '2026.1'
        }
      });
      console.log(`Created page: "${pageData.title}" (ID: ${created.id})`);
    }
  }

  console.log('Successfully seeded all ISO 9001:2015 and ISO 45001:2018 Wiki documents!');
}

main()
  .catch((e) => {
    console.error('Error during Wiki seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
