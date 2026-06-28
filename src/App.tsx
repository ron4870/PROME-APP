import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserProfile from './pages/UserProfile';
import AlignmentConverter from './pages/AlignmentConverter';
import IsoDocuments from './pages/IsoDocuments';
import IsoDocumentEditor from './pages/document-control/IsoDocumentEditor';
import IsoDocumentViewer from './pages/document-control/IsoDocumentViewer';
import CapaDashboard from './pages/CapaDashboard';
import CapaDetails from './pages/CapaDetails';
import AuditDashboard from './pages/AuditDashboard';
import AuditDetails from './pages/AuditDetails';
import RiskDashboard from './pages/RiskDashboard';
import RiskDetails from './pages/RiskDetails';
import ManagementReviewDashboard from './pages/ManagementReviewDashboard';
import ManagementReviewDetails from './pages/ManagementReviewDetails';
import ObjectivesDashboard from './pages/ObjectivesDashboard';
import ObjectiveDetails from './pages/ObjectiveDetails';
import TrainingDashboard from './pages/TrainingDashboard';
import TrainingDetails from './pages/TrainingDetails';
import EquipmentDashboard from './pages/EquipmentDashboard';
import EquipmentDetails from './pages/EquipmentDetails';
import FeedbackDashboard from './pages/FeedbackDashboard';
import FeedbackDetails from './pages/FeedbackDetails';
import SupplierDashboard from './pages/SupplierDashboard';
import SupplierDetails from './pages/SupplierDetails';
import DocumentDashboard from './pages/DocumentDashboard';
import DocumentDetails from './pages/DocumentDetails';

import { ComplianceDashboard } from './pages/ComplianceDashboard';
import { ComplianceDetails } from './pages/ComplianceDetails';
import OrganizationContext from './pages/OrganizationContext';
import { HseDashboard } from './pages/HseDashboard';
import { HseDetails } from './pages/HseDetails';
import { MocDashboard } from './pages/MocDashboard';
import { MocDetails } from './pages/MocDetails';
import { NcrDashboard } from './pages/NcrDashboard';
import { ProjectsDashboard } from './pages/ProjectsDashboard';
import { ProjectWorkspace } from './pages/ProjectWorkspace';
import FormsDirectory from './pages/forms/FormsDirectory';
import FundsRequisitionForm from './pages/forms/FundsRequisitionForm';
import LocalPurchaseOrderForm from './pages/forms/LocalPurchaseOrderForm';
import NotificationsPage from './pages/NotificationsPage';
import AppLayout from './components/AppLayout';

// Division Pages
import PMBDD from './pages/divisions/PMBDD';
import BidsManagement from './pages/divisions/BidsManagement';
import BidWorkspace from './pages/divisions/BidWorkspace';
import CPSD from './pages/divisions/CPSD';
import PED from './pages/divisions/PED';
import PDMD from './pages/divisions/PDMD';
import HRAD from './pages/divisions/HRAD';
import FD from './pages/divisions/FD';
import FDInvoices from './pages/divisions/FDInvoices';
import PEDRoadsHighways from './pages/divisions/PEDRoadsHighways';
import PEDStructures from './pages/divisions/PEDStructures';
import PEDWaterSanitation from './pages/divisions/PEDWaterSanitation';
import PEDEnergyMinerals from './pages/divisions/PEDEnergyMinerals';
import PEDTransportationStudies from './pages/divisions/PEDTransportationStudies';
import PEDHydrology from './pages/divisions/PEDHydrology';
import PDMDConstructionManagement from './pages/divisions/PDMDConstructionManagement';
import PEDAlignmentDesign from './pages/divisions/PEDAlignmentDesign';
import PEDRouteOptimizer from './pages/divisions/PEDRouteOptimizer';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManualsDirectory from './pages/ManualsDirectory';
import LibraryModule from './pages/LibraryModule';
import Wiki from './pages/Wiki';
import AIAssistant from './pages/AIAssistant';
import FAQs from './pages/FAQs';


import BookOfDrawingsDashboard from './pages/divisions/BookOfDrawingsDashboard';
import BookOfDrawingsWorkspace from './pages/divisions/BookOfDrawingsWorkspace';
import CVsDashboard from './pages/divisions/CVsDashboard';
import CVsWorkspace from './pages/divisions/CVsWorkspace';

// Simple protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/alignment-converter" 
          element={
            <ProtectedRoute>
              <AlignmentConverter />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          } 
        />
        {/* Division Routes */}
        <Route path="/iso-documents" element={<ProtectedRoute><IsoDocuments /></ProtectedRoute>} />
        <Route path="/iso-documents/edit/:id" element={<ProtectedRoute><IsoDocumentEditor /></ProtectedRoute>} />
        <Route path="/iso-documents/:id" element={<ProtectedRoute><IsoDocumentViewer /></ProtectedRoute>} />
        <Route path="/capa" element={<ProtectedRoute><CapaDashboard /></ProtectedRoute>} />
        <Route path="/capa/:id" element={<ProtectedRoute><CapaDetails /></ProtectedRoute>} />
        <Route path="/audits" element={<ProtectedRoute><AuditDashboard /></ProtectedRoute>} />
        <Route path="/audits/:id" element={<ProtectedRoute><AuditDetails /></ProtectedRoute>} />
        <Route path="/risks" element={<ProtectedRoute><RiskDashboard /></ProtectedRoute>} />
        <Route path="/risks/:id" element={<ProtectedRoute><RiskDetails /></ProtectedRoute>} />
        <Route path="/management-reviews" element={<ProtectedRoute><ManagementReviewDashboard /></ProtectedRoute>} />
        <Route path="/management-reviews/:id" element={<ProtectedRoute><ManagementReviewDetails /></ProtectedRoute>} />
        <Route path="/objectives" element={<ProtectedRoute><ObjectivesDashboard /></ProtectedRoute>} />
        <Route path="/objectives/:id" element={<ProtectedRoute><ObjectiveDetails /></ProtectedRoute>} />
        <Route path="/trainings" element={<ProtectedRoute><TrainingDashboard /></ProtectedRoute>} />
        <Route path="/trainings/:id" element={<ProtectedRoute><TrainingDetails /></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><EquipmentDashboard /></ProtectedRoute>} />
        <Route path="/equipment/:id" element={<ProtectedRoute><EquipmentDetails /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><FeedbackDashboard /></ProtectedRoute>} />
        <Route path="/feedback/:id" element={<ProtectedRoute><FeedbackDetails /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><SupplierDashboard /></ProtectedRoute>} />
        <Route path="/suppliers/:id" element={<ProtectedRoute><SupplierDetails /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentDashboard /></ProtectedRoute>} />
        <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetails /></ProtectedRoute>} />

        <Route path="/compliance" element={<ProtectedRoute><ComplianceDashboard /></ProtectedRoute>} />
        <Route path="/compliance/:id" element={<ProtectedRoute><ComplianceDetails /></ProtectedRoute>} />
        <Route path="/organization-context" element={<ProtectedRoute><OrganizationContext /></ProtectedRoute>} />
        <Route path="/hse" element={<ProtectedRoute><HseDashboard /></ProtectedRoute>} />
        <Route path="/hse/:id" element={<ProtectedRoute><HseDetails /></ProtectedRoute>} />
        <Route path="/moc" element={<ProtectedRoute><MocDashboard /></ProtectedRoute>} />
        <Route path="/moc/:id" element={<ProtectedRoute><MocDetails /></ProtectedRoute>} />
        <Route path="/ncr" element={<ProtectedRoute><NcrDashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsDashboard /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectWorkspace /></ProtectedRoute>} />
        
        {/* Forms Routes */}
        <Route path="/forms" element={<ProtectedRoute><FormsDirectory /></ProtectedRoute>} />
        <Route path="/forms/funds-requisition" element={<ProtectedRoute><FundsRequisitionForm /></ProtectedRoute>} />
        <Route path="/manuals" element={<ProtectedRoute><ManualsDirectory /></ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute><LibraryModule /></ProtectedRoute>} />
        <Route path="/forms/local-purchase-order" element={<ProtectedRoute><LocalPurchaseOrderForm /></ProtectedRoute>} />
        <Route path="/wiki" element={<ProtectedRoute><Wiki /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
        <Route path="/faqs" element={<ProtectedRoute><FAQs /></ProtectedRoute>} />
        
        {/* Division Routes */}
        <Route path="/division/pmbdd" element={<ProtectedRoute><PMBDD /></ProtectedRoute>} />
        <Route path="/division/pmbdd/bids" element={<ProtectedRoute><BidsManagement /></ProtectedRoute>} />
        <Route path="/division/pmbdd/bids/:id" element={<ProtectedRoute><BidWorkspace /></ProtectedRoute>} />
        <Route path="/division/cpsd" element={<ProtectedRoute><CPSD /></ProtectedRoute>} />
        <Route path="/division/ped" element={<ProtectedRoute><PED /></ProtectedRoute>} />
        <Route path="/division/ped/roads-highways" element={<ProtectedRoute><PEDRoadsHighways /></ProtectedRoute>} />
        <Route path="/division/ped/structures" element={<ProtectedRoute><PEDStructures /></ProtectedRoute>} />
        <Route path="/division/ped/water-sanitation" element={<ProtectedRoute><PEDWaterSanitation /></ProtectedRoute>} />
        <Route path="/division/ped/energy-minerals" element={<ProtectedRoute><PEDEnergyMinerals /></ProtectedRoute>} />
        <Route path="/division/ped/transportation-studies" element={<ProtectedRoute><PEDTransportationStudies /></ProtectedRoute>} />
        <Route path="/division/ped/hydrology" element={<ProtectedRoute><PEDHydrology /></ProtectedRoute>} />
        <Route path="/division/ped/alignment-design" element={<ProtectedRoute><PEDAlignmentDesign /></ProtectedRoute>} />
        <Route path="/division/ped/route-optimizer" element={<ProtectedRoute><PEDRouteOptimizer /></ProtectedRoute>} />
        
        {/* Book of Drawings */}
        <Route path="/book-of-drawings" element={<ProtectedRoute><BookOfDrawingsDashboard /></ProtectedRoute>} />
        <Route path="/book-of-drawings/:id" element={<ProtectedRoute><BookOfDrawingsWorkspace /></ProtectedRoute>} />
        
        {/* CVs Module */}
        <Route path="/cvs" element={<ProtectedRoute><CVsDashboard /></ProtectedRoute>} />
        <Route path="/cvs/:id" element={<ProtectedRoute><CVsWorkspace /></ProtectedRoute>} />
        <Route path="/division/pdmd" element={<ProtectedRoute><PDMD /></ProtectedRoute>} />
        <Route path="/division/pdmd/construction-management" element={<ProtectedRoute><PDMDConstructionManagement /></ProtectedRoute>} />
        <Route path="/division/hrad" element={<ProtectedRoute><HRAD /></ProtectedRoute>} />
        <Route path="/division/fd" element={<ProtectedRoute><FD /></ProtectedRoute>} />
        <Route path="/division/fd/invoices" element={<ProtectedRoute><FDInvoices /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
