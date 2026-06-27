import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, ChevronRight, ChevronDown, Home, Bell, User, Shield, FileText, Activity, Settings, LayoutDashboard, BookOpen, AlertTriangle, ClipboardCheck, Files, ShieldAlert, Users, Target, GraduationCap, PenTool, MessageSquare, Truck, HelpCircle, MessageCircle, Lock, Library, ClipboardList, FileSpreadsheet, Wallet, Scale, Globe, GitPullRequest, AlertOctagon, Briefcase, Bot, Palette } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = React.useState(false);
  const [isImsMenuOpen, setIsImsMenuOpen] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(0);
  
  // Support Modal State
  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
  const [supportMessage, setSupportMessage] = React.useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = React.useState(false);

  React.useEffect(() => {
    // Close the right drawer automatically when navigating to a new page
    setIsRightDrawerOpen(false);

    // Simple fetch to get inbox count and project notifications
    const token = localStorage.getItem('token');
    if (token) {
      Promise.all([
        fetch('/api/workflows/inbox', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()).catch(() => []),
        fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()).catch(() => [])
      ]).then(([inboxData, notifData]) => {
        let count = 0;
        if (Array.isArray(inboxData)) count += inboxData.length;
        if (Array.isArray(notifData)) count += notifData.filter((n: any) => !n.isRead).length;
        setNotificationCount(count);
      });
    }
  }, [location.pathname]); // Refresh on navigation

  const { logout, hasPermission, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSupportSubmit = async () => {
    if (!supportMessage.trim()) return;
    setIsSubmittingSupport(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: supportMessage })
      });
      if (response.ok) {
        alert('Support request sent to Administrator successfully!');
        setIsSupportModalOpen(false);
        setSupportMessage('');
      } else {
        alert('Failed to send support request.');
      }
    } catch (e) {
      console.error(e);
      alert('Error sending support request.');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  let navLinks: { label: string, path: string }[] = [];

  // Division Specific Navigation Links
  if (location.pathname.startsWith('/division/pmbdd')) {
    navLinks = [
      { label: 'PMO', path: '#' },
      { label: 'Bids', path: '/division/pmbdd/bids' },
      { label: 'IMS', path: '/iso-documents' },
      { label: 'Records', path: '#' }
    ];
  } else if (location.pathname.startsWith('/division/cpsd')) {
    navLinks = [
      { label: 'Corporate Strategy', path: '#' },
      { label: 'Risk Management', path: '/risks' },
      { label: 'Corporate Visibility', path: '#' },
      { label: 'Professional Associations', path: '#' }
    ];
  } else if (location.pathname.startsWith('/division/ped')) {
    navLinks = [
      { label: 'Transportation Studies', path: '/division/ped/transportation-studies' },
      { label: 'Roads & Highways', path: '/division/ped/roads-highways' },
      { label: 'Structures', path: '/division/ped/structures' },
      { label: 'Water & Sanitation', path: '/division/ped/water-sanitation' },
      { label: 'Energy & Minerals', path: '/division/ped/energy-minerals' },
      { label: 'PROME Design ↗', path: `https://design.promeconsult.com/?token=${localStorage.getItem('token') || ''}` }
    ];
  } else if (location.pathname.startsWith('/division/pdmd')) {
    navLinks = [
      { label: 'Construction Management', path: '#' },
      { label: 'Site QA & QC', path: '#' },
      { label: 'Correspondence', path: '#' }
    ];
  } else if (location.pathname.startsWith('/division/hrad')) {
    navLinks = [
      { label: 'Staff Data Management', path: '#' },
      { label: 'Performance Management', path: '#' },
      { label: 'Leave Management', path: '#' },
      { label: 'Payroll', path: '#' }
    ];
  } else if (location.pathname.startsWith('/division/fd')) {
    navLinks = [
      { label: 'Finance and Accounts', path: '#' },
      { label: 'Financial Audits', path: '#' },
      { label: 'Invoices', path: '/division/fd/invoices' }
    ];
  }

  return (
    <div className="app-layout-wrapper">
      
      {/* Sticky Header Wrapper */}
      <div className="sticky-header-wrapper">
        {/* 1. Top Utility Bar */}
        <div className="top-utility-bar hide-on-mobile">
          <div className="layout-container utility-inner">
            <nav className="utility-left">
              <a 
                href="/dashboard" 
                onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
                className="utility-link active"
                title="Home"
              >
                <Home size={16} />
              </a>
              <div className="utility-dropdown-wrapper">
                <span className="utility-link" style={{ cursor: 'pointer' }}>
                  Divisions
                  <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                </span>
                <div className="utility-dropdown-menu" style={{ padding: 0, minWidth: '400px' }}>
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {hasPermission('pmbdd') && (
                      <Link to="/division/pmbdd" title="Project Management & Business Development Division" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Briefcase size={28} color="#bb0a0a" strokeWidth={1.5} />
                        <span style={{ fontWeight: 500 }}>PMBDD</span>
                      </Link>
                    )}
                    {hasPermission('cpsd') && (
                      <Link to="/division/cpsd" title="Corporate Planning & Strategy Division" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Target size={28} color="#bb0a0a" strokeWidth={1.5} />
                        <span style={{ fontWeight: 500 }}>CP&SD</span>
                      </Link>
                    )}
                    {hasPermission('ped') && (
                      <Link to="/division/ped" title="Planning & Engineering Division" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <PenTool size={28} color="#bb0a0a" strokeWidth={1.5} />
                        <span style={{ fontWeight: 500 }}>PED</span>
                      </Link>
                    )}
                    {hasPermission('pdmd') && (
                      <Link to="/division/pdmd" title="Project Delivery Management Division" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Activity size={28} color="#bb0a0a" strokeWidth={1.5} />
                        <span style={{ fontWeight: 500 }}>PDMD</span>
                      </Link>
                    )}
                    {hasPermission('hrad') && (
                      <Link to="/division/hrad" title="Human Resource & Administration Division" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Users size={28} color="#bb0a0a" strokeWidth={1.5} />
                        <span style={{ fontWeight: 500 }}>HR&AD</span>
                      </Link>
                    )}
                    {hasPermission('fd') && (
                      <Link to="/division/fd" title="Finance Division" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Wallet size={28} color="#bb0a0a" strokeWidth={1.5} />
                        <span style={{ fontWeight: 500 }}>Finance</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              <a href="#" className="utility-link" onClick={(e) => { e.preventDefault(); setIsSupportModalOpen(true); }}>Support</a>
              {(user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Managing Director')) && (
                <Link to="/ai-assistant" className="utility-link" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cc0000', fontWeight: 600 }}>
                  <Bot size={14} /> AI Assistant
                </Link>
              )}
            </nav>
            
            <div className="utility-right">
              {hasPermission('admin_panel') && (
                <button className="utility-btn" title="Admin Control Panel" onClick={() => navigate('/admin')}>
                  <Shield size={16} />
                </button>
              )}
              {hasPermission('admin_panel') && <div className="utility-divider"></div>}
              <button 
                className="utility-btn" 
                title="Notifications"
                onClick={() => navigate('/notifications')}
                style={{ position: 'relative' }}
              >
                <Bell size={16} />
                {notificationCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 5px',
                    borderRadius: '10px'
                  }}>
                    {notificationCount}
                  </span>
                )}
              </button>
              <div className="utility-divider"></div>
              <div className="utility-dropdown-wrapper">
                <button 
                  className="utility-btn" 
                  title={`Profile: ${user?.name || 'User'}`}
                  onClick={() => navigate('/profile#profile')}
                >
                  <User size={16} />
                </button>
                <div className="utility-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '180px' }}>
                  <Link to="/profile#profile" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} /> My Profile
                  </Link>
                  <Link to="/profile#documents" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} /> My Documents
                  </Link>
                  <Link to="/profile#activity" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={14} /> My Activity
                  </Link>
                  <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }}></div>
                  <Link to="/profile#settings" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={14} /> Account Settings
                  </Link>
                </div>
              </div>
              <div className="utility-divider"></div>
              <div>
                <button 
                  className="utility-btn" 
                  title="Tools & Menu"
                  onClick={() => setIsRightDrawerOpen(true)}
                >
                  <Menu size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Main Navigation Header */}
        <header className="main-nav-header">
          <div className="layout-container header-inner">
            
            {/* Logo Section */}
            <div className="header-brand" onClick={() => navigate('/dashboard')}>
              <img src="/prome.png" alt="PROME Logo" className="header-logo" />
              <div className="brand-text hide-on-mobile">
                <span className="brand-title">PROME Consultants Ltd</span>
                <span className="brand-subtitle">Engineering Intranet Portal</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="desktop-nav hide-on-mobile-tablet">
              {navLinks.map((link) => {
                const isExternal = link.path.startsWith('http');
                return (
                  <a 
                    key={link.label}
                    href={link.path}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (!isExternal && link.path !== '#') {
                        e.preventDefault();
                        navigate(link.path);
                      }
                    }}
                    className={`main-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            {/* Mobile Menu Toggle */}
            <button 
              className="mobile-menu-toggle hide-on-desktop"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer hide-on-desktop">
          <nav className="mobile-nav-list">
            {navLinks.map((link) => {
              const isExternal = link.path.startsWith('http');
              return (
                <a 
                  key={link.label}
                  href={link.path}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={(e) => {
                    if (!isExternal && link.path !== '#') {
                      e.preventDefault();
                      navigate(link.path);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  {link.label}
                  <ChevronRight size={18} />
                </a>
              );
            })}
            <div className="mobile-nav-divider"></div>
            <button onClick={handleLogout} className="mobile-nav-link logout-link">
              Log off
              <LogOut size={18} />
            </button>
          </nav>
        </div>
      )}

      {/* 3. Main Content Area */}
      <main className="layout-main-content">
        {children}
      </main>

      {/* 4. Corporate Footer */}
      <footer className="corporate-footer">
        <div className="layout-container footer-inner">
          <div className="footer-links">
            <a href="https://promeconsult.com/about%20us.html" target="_blank" rel="noopener noreferrer">About PROME</a>
            <a href="#">Privacy Notice</a>
            <a href="#">Terms & Conditions</a>
            <a href="#">Cookie Notice</a>
            <a href="#">Accessibility</a>
          </div>
          <div className="footer-copyright">
            © {new Date().getFullYear()} PROME Consultants Ltd. All Rights Reserved.
          </div>
        </div>
      </footer>

      {/* 5. Right Menu Drawer */}
      <div 
        className={`right-drawer-overlay ${isRightDrawerOpen ? 'open' : ''}`} 
        onClick={() => setIsRightDrawerOpen(false)}
      ></div>
      <div className={`right-drawer ${isRightDrawerOpen ? 'open' : ''}`}>
        <div className="right-drawer-header">
          <h2>Tools & Menu</h2>
          <button className="right-drawer-close" onClick={() => setIsRightDrawerOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <div className="right-drawer-content">
          <div style={{ margin: '0.5rem 1rem', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
            <button 
              onClick={() => setIsImsMenuOpen(!isImsMenuOpen)}
              style={{ 
                width: '100%', 
                padding: '1.2rem 1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                textAlign: 'left', 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Wallet size={24} color="#cc0000" strokeWidth={1.5} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.2))' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#000' }}>
                  PROME IMS Core Modules
                </span>
              </div>
              <ChevronRight size={20} color="#000" style={{ transform: isImsMenuOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {isImsMenuOpen && (
              <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <Link to="/dashboard" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <LayoutDashboard size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Global Command</span>
                </Link>
                <Link to="/iso-documents" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <BookOpen size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>ISO Documents</span>
                </Link>
                {(hasPermission('wiki_view') || hasPermission('wiki_draft') || hasPermission('wiki_review') || hasPermission('wiki_approve')) && (
                  <Link to="/wiki" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Library size={28} color="#bb0a0a" strokeWidth={1.5} />
                    <span>PROME Wiki</span>
                  </Link>
                )}
                <Link to="/capa" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <AlertTriangle size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>CAPA & NCRs</span>
                </Link>
                <Link to="/audits" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <ClipboardCheck size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Internal Audits</span>
                </Link>
                <Link to="/documents" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Files size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Master Docs</span>
                </Link>
                <Link to="/risks" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <ShieldAlert size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Risk Mgmt</span>
                </Link>
                <Link to="/management-reviews" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Users size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Mgmt Reviews</span>
                </Link>
                <Link to="/forms" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <FileText size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Forms</span>
                </Link>
                <Link to="/objectives" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Target size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Objectives</span>
                </Link>
                <Link to="/trainings" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <GraduationCap size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Training</span>
                </Link>
                <Link to="/equipment" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <PenTool size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Equipment</span>
                </Link>
                <Link to="/feedback" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <MessageSquare size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Feedback</span>
                </Link>
                <Link to="/suppliers" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Truck size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Suppliers</span>
                </Link>
                <Link to="/compliance" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Scale size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Compliance</span>
                </Link>
                <Link to="/organization-context" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Globe size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>Org. Context</span>
                </Link>
                <Link to="/hse" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Activity size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>HSE</span>
                </Link>
                <Link to="/moc" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <GitPullRequest size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>MOC</span>
                </Link>
                <Link to="/ncr" className="dropdown-item" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem', color: '#333', border: 'none', borderRadius: '8px', gap: '0.5rem', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <AlertOctagon size={28} color="#bb0a0a" strokeWidth={1.5} />
                  <span>NCR</span>
                </Link>
              </div>
            )}
          </div>
          
          <div style={{ padding: '0.5rem 1rem 0.5rem 1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111', margin: '0 0 1rem 0' }}>Corporate Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>

              {(hasPermission('wiki_view') || hasPermission('wiki_draft') || hasPermission('wiki_review') || hasPermission('wiki_approve')) && (
                <Link to="/wiki" onClick={() => setIsRightDrawerOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                    <ClipboardList size={20} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>Company Documents</span>
                </Link>
              )}
              <Link to="/forms" onClick={() => setIsRightDrawerOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <FileSpreadsheet size={20} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>Forms</span>
              </Link>
              <Link to="/library" onClick={() => setIsRightDrawerOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <Library size={20} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>Library</span>
              </Link>
              <a 
                href={`https://design.promeconsult.com/?token=${localStorage.getItem('token') || ''}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setIsRightDrawerOpen(false)} 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <Palette size={20} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>PROME Design</span>
              </a>
            </div>
          </div>
          
          <div style={{ padding: '1rem 1rem 0.5rem 1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111', margin: '0 0 1rem 0' }}>Help</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <a href="#" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <HelpCircle size={24} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>FAQs</span>
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsRightDrawerOpen(false); setIsSupportModalOpen(true); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <MessageCircle size={24} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>Support</span>
              </a>
              <a href="#" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <Lock size={24} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>Secure messages</span>
              </a>
            </div>
          </div>

          {/* PROJECT MANAGEMENT SECTION */}
          <div style={{ padding: '0.5rem 1rem 0.5rem 1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111', margin: '0 0 1rem 0' }}>Project Management</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              <a href="#" onClick={(e) => {
                e.preventDefault();
                navigate('/projects');
                setIsRightDrawerOpen(false);
              }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <Briefcase size={20} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>Projects</span>
              </a>
              <a href="https://design.promeconsult.com" target="_blank" rel="noopener noreferrer" onClick={() => setIsRightDrawerOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '0.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(145deg, #ffffff, #e6e6e6)', boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <PenTool size={20} color="#cc0000" strokeWidth={2} style={{ filter: 'drop-shadow(1px 2px 2px rgba(204, 0, 0, 0.3))' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', fontWeight: '500' }}>Design Projects</span>
              </a>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #eee', margin: '1rem 0' }}></div>
          <a href="#" className="dropdown-item" style={{ padding: '1rem', display: 'block', fontSize: '1rem' }}>System Settings</a>
          <div style={{ padding: '1rem' }}>
            <button 
              onClick={handleLogout} 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              Log off <LogOut size={18} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      </div>

      {isSupportModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111' }}>Support Request</h3>
              <button onClick={() => setIsSupportModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Please describe the issue you have encountered or the support you need. This will be sent as a notification to the system administrator.</p>
            <textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe your issue..."
              rows={5}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setIsSupportModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#334155' }}>Cancel</button>
              <button onClick={handleSupportSubmit} disabled={isSubmittingSupport || !supportMessage.trim()} style={{ padding: '0.5rem 1rem', background: '#cc0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isSubmittingSupport || !supportMessage.trim() ? 0.7 : 1 }}>
                {isSubmittingSupport ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
