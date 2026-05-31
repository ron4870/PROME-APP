import { motion } from 'framer-motion';

export default function FDInvoices() {
  return (
    <div className="responsive-container" style={{ paddingTop: '2rem', paddingBottom: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem', padding: '0 1rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 600 }}>Invoices</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          Finance Division Invoice Management System
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ flex: 1, padding: '0 1rem', display: 'flex' }}
      >
        <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', padding: 0, borderRadius: '0.5rem', display: 'flex' }}>
          <iframe 
            src="/invoicing/" 
            style={{ width: '100%', height: 'calc(100vh - 250px)', border: 'none', background: 'white' }}
            title="InvoicePlane"
          />
        </div>
      </motion.div>
    </div>
  );
}
