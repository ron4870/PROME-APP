
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PDMDConstructionManagement() {
  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/division/pdmd" style={{ color: 'var(--primary-color)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600, margin: 0 }}>Construction Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
            Project Delivery & Contract Management Services
          </p>
        </div>
      </div>

      <div style={{ padding: '0 1rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel"
          style={{ padding: '2rem', marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="lg-flex-row">
            <div style={{ flex: 1 }}>
              <h2 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Overview</h2>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1rem' }}>
                PROME Consultants Limited has a fully-fledged project management team that has demonstrated innovative approaches in the delivery of infrastructure projects on time and on budget going above and beyond Client’s expectations. All infrastructure projects managed by PROME Consultants are executed whilst ensuring the highest ethical standards, social inclusion, environmental protection, cost effectiveness and aesthetic impact.
              </p>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1rem' }}>
                Construction Supervision projects are always unique and, in that regard, PROME Consultants Limited constitutes teams which can supervise construction and associated works with diligence and efficiency and in accordance with sound and up to date technical, administrative, financial and engineering practices all within the powers delegated.
              </p>
              <p style={{ color: '#475569', lineHeight: 1.6 }}>
                PROME staff are well versed with the management of Construction supervision, management of customer relations, external public relations management and generation of the requisite processes and procedures covering its functions in full compliance with ISO 9001:2015.
              </p>
            </div>
            <div style={{ flex: '0 0 400px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              <img 
                src="https://promeconsult.com/images/hands.png" 
                alt="Construction Hands" 
                style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', objectFit: 'cover' }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel"
          style={{ padding: '2rem' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="lg-flex-row-reverse">
            <div style={{ flex: '0 0 400px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              <img 
                src="https://promeconsult.com/images/3.jpeg" 
                alt="Project Management" 
                style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Project Administration & Strategy</h2>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1rem' }}>
                From our regional presence we bring together experienced professionals from the region and across the globe to provide project and contract management services to our clients.
              </p>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1rem' }}>
                Infrastructure and construction projects are habitually complex mainly in terms of scope and their priorities. Over the past two decades PROME has reliably delivered construction projects proficiently while operating in the most challenging locations and under difficult institutional circumstances.
              </p>
              <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                With the intension of delivering the desired outcome, our projects are administered with utmost transparency by engaging all relevant stakeholders. PROME is tailored to mitigate risks associated with running projects, and capitalises on apt opportunities in order to guarantee value for money.
              </p>
              
              <h3 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Services Offered</h3>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {[
                  'Bid document preparation services to construction companies',
                  'Project contract management and support to companies',
                  'Customized project management information systems and quality assurance systems',
                  'Expert services for construction claims mitigation, avoidance and management',
                  'Economic studies, social, environmental and land acquisition services',
                  'Project and program development, documentation and construction supervision',
                  'Development of design standards and manuals for construction'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <CheckCircle size={20} color="#0f766e" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ color: '#475569', lineHeight: 1.5, fontSize: '0.95rem' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
      <style>{`
        .lg-flex-row {
          flex-direction: column;
        }
        .lg-flex-row-reverse {
          flex-direction: column-reverse;
        }
        @media (min-width: 992px) {
          .lg-flex-row {
            flex-direction: row;
          }
          .lg-flex-row-reverse {
            flex-direction: row-reverse;
          }
        }
      `}</style>
    </div>
  );
}
