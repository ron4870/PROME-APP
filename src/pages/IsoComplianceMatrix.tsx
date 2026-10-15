import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  Database, 
  Search, 
  ArrowUpRight, 
  Download, 
  Award,
  ChevronDown,
  ChevronUp,
  Info,
  Target
} from 'lucide-react';

interface IsoRequirement {
  id: string;
  standard: 'ISO 9001:2018' | 'ISO 14001:2015' | 'ISO 45001:2018';
  clause: string;
  clauseTitle: string;
  title: string;
  type: 'MANDATORY_DOCUMENT' | 'MANDATORY_RECORD';
  description: string;
  auditExpectation: string;
  targetModule: string;
  route: string;
  responsibleRole: string;
  retentionRequirement: string;
  status: 'COMPLIANT' | 'NEEDS_UPDATE' | 'MISSING';
  matchedCount: number;
  lastUpdated: string | null;
  liveSummary: string;
  aiRecommendation: string;
  matchedItems?: Array<{
    id: number | string;
    title: string;
    reference?: string;
    status?: string;
  }>;
}

interface MatrixSummary {
  standard: string;
  totalRequirements: number;
  compliantCount: number;
  needsUpdateCount: number;
  missingCount: number;
  readinessScore: number;
  lastScannedAt: string;
  aiAuditSummary?: {
    executiveSummary: string;
    highRiskGaps: string[];
    priorityActions: string[];
    certificationReadiness: string;
  };
}

export const IsoComplianceMatrix: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [summary, setSummary] = useState<MatrixSummary | null>(null);
  const [requirements, setRequirements] = useState<IsoRequirement[]>([]);
  
  // Filters
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatrix();
  }, [selectedStandard]);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const standardParam = selectedStandard !== 'ALL' ? `?standard=${encodeURIComponent(selectedStandard)}` : '';
      const res = await fetch(`/api/iso-matrix${standardParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setRequirements(data.requirements);
      }
    } catch (err) {
      console.error('Failed to load ISO matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAiScan = async () => {
    setScanning(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/iso-matrix/ai-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ standard: selectedStandard !== 'ALL' ? selectedStandard : undefined })
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setRequirements(data.requirements);
        setShowAiModal(true);
      }
    } catch (err) {
      console.error('AI Scan failed:', err);
      alert('Failed to run AI gap analysis.');
    } finally {
      setScanning(false);
    }
  };

  // Filtered requirements
  const filteredRequirements = requirements.filter(req => {
    if (selectedStatus !== 'ALL' && req.status !== selectedStatus) return false;
    if (selectedType !== 'ALL' && req.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const match = 
        req.title.toLowerCase().includes(query) ||
        req.clause.toLowerCase().includes(query) ||
        req.clauseTitle.toLowerCase().includes(query) ||
        req.targetModule.toLowerCase().includes(query) ||
        req.description.toLowerCase().includes(query) ||
        req.responsibleRole.toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  const getStatusBadge = (status: 'COMPLIANT' | 'NEEDS_UPDATE' | 'MISSING') => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Compliant & Active
          </span>
        );
      case 'NEEDS_UPDATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock size={13} className="text-amber-600" />
            Needs Update / Review Due
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <XCircle size={13} className="text-red-600" />
            Missing Record
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg">
                  <Award size={28} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                    ISO Standards Mandatory Records & Documents Register
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Live IMS compliance matrix mapping mandatory ISO 9001:2018 documented information to PROME IMS storage modules
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRunAiScan}
                disabled={scanning}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-sm transition-all text-sm disabled:opacity-60 cursor-pointer"
              >
                <Sparkles size={16} className={scanning ? 'animate-spin' : ''} />
                {scanning ? 'Auditing Live IMS Database...' : 'Run AI Gap Analysis'}
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-all cursor-pointer"
              >
                <Download size={15} />
                Export Matrix
              </button>
            </div>
          </div>

          {/* 2. Readiness Stats & Score Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-gray-100">
              
              {/* Score Gauge */}
              <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
                  ISO Audit Readiness
                </span>
                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-3xl font-extrabold text-red-900">
                    {summary.readinessScore}%
                  </span>
                  <span className="text-xs text-red-700 font-medium">Index Score</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${summary.readinessScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Total Requirements */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Requirements
                </span>
                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {summary.totalRequirements}
                  </span>
                  <span className="text-xs text-gray-500">Clauses</span>
                </div>
                <span className="text-xs text-gray-400">ISO 9001, 14001, 45001</span>
              </div>

              {/* Compliant */}
              <div 
                onClick={() => setSelectedStatus(selectedStatus === 'COMPLIANT' ? 'ALL' : 'COMPLIANT')}
                className={`rounded-xl p-4 border transition-all cursor-pointer ${
                  selectedStatus === 'COMPLIANT' 
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
                    : 'bg-white border-gray-200 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Compliant & Active
                  </span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-3xl font-bold text-emerald-700">
                    {summary.compliantCount}
                  </span>
                  <span className="text-xs text-emerald-600 font-medium">
                    ({Math.round((summary.compliantCount / (summary.totalRequirements || 1)) * 100)}%)
                  </span>
                </div>
                <span className="text-xs text-emerald-600">Verified in IMS</span>
              </div>

              {/* Needs Update */}
              <div 
                onClick={() => setSelectedStatus(selectedStatus === 'NEEDS_UPDATE' ? 'ALL' : 'NEEDS_UPDATE')}
                className={`rounded-xl p-4 border transition-all cursor-pointer ${
                  selectedStatus === 'NEEDS_UPDATE' 
                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
                    : 'bg-white border-gray-200 hover:border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Needs Update
                  </span>
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-3xl font-bold text-amber-700">
                    {summary.needsUpdateCount}
                  </span>
                  <span className="text-xs text-amber-600 font-medium">
                    ({Math.round((summary.needsUpdateCount / (summary.totalRequirements || 1)) * 100)}%)
                  </span>
                </div>
                <span className="text-xs text-amber-600">Review Overdue</span>
              </div>

              {/* Missing */}
              <div 
                onClick={() => setSelectedStatus(selectedStatus === 'MISSING' ? 'ALL' : 'MISSING')}
                className={`rounded-xl p-4 border transition-all cursor-pointer ${
                  selectedStatus === 'MISSING' 
                    ? 'bg-red-50 border-red-300 ring-2 ring-red-400' 
                    : 'bg-white border-gray-200 hover:border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                    Missing Records
                  </span>
                  <XCircle size={16} className="text-red-600" />
                </div>
                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-3xl font-bold text-red-700">
                    {summary.missingCount}
                  </span>
                  <span className="text-xs text-red-600 font-medium">
                    ({Math.round((summary.missingCount / (summary.totalRequirements || 1)) * 100)}%)
                  </span>
                </div>
                <span className="text-xs text-red-600">Audit Vulnerability</span>
              </div>

            </div>
          )}

          {/* AI Gap Analysis Inline Alert Banner */}
          {summary?.aiAuditSummary && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    AI Lead Auditor Findings ({summary.aiAuditSummary.certificationReadiness})
                  </h3>
                  <p className="text-xs text-amber-800 mt-1 line-clamp-2">
                    {summary.aiAuditSummary.executiveSummary}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(true)}
                className="shrink-0 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition cursor-pointer"
              >
                View Full Gap Report
              </button>
            </div>
          )}
        </div>

        {/* 3. Filters and Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            
            {/* Standard Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'All Standards', value: 'ALL' },
                { label: 'ISO 9001 (Quality)', value: 'ISO 9001' },
                { label: 'ISO 14001 (Environment)', value: 'ISO 14001' },
                { label: 'ISO 45001 (Safety)', value: 'ISO 45001' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedStandard(tab.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedStandard === tab.value
                      ? 'bg-red-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Type Filter & Search Input */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setSelectedType('ALL')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    selectedType === 'ALL' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600'
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setSelectedType('MANDATORY_DOCUMENT')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    selectedType === 'MANDATORY_DOCUMENT' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600'
                  }`}
                >
                  Documents
                </button>
                <button
                  onClick={() => setSelectedType('MANDATORY_RECORD')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    selectedType === 'MANDATORY_RECORD' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600'
                  }`}
                >
                  Records
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clause, module, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-600 focus:bg-white"
                />
              </div>

              {selectedStatus !== 'ALL' && (
                <button
                  onClick={() => setSelectedStatus('ALL')}
                  className="text-xs text-red-600 hover:underline font-medium cursor-pointer"
                >
                  Reset Status ({selectedStatus})
                </button>
              )}
            </div>

          </div>
        </div>

        {/* 4. Requirements Table / Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Showing {filteredRequirements.length} of {requirements.length} Requirements
            </span>
            <span className="text-xs text-gray-500">
              Last Scanned: {summary ? new Date(summary.lastScannedAt).toLocaleTimeString() : 'Live'}
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={28} className="animate-spin mx-auto text-red-600 mb-3" />
              <p className="text-sm text-gray-500">Auditing IMS database across modules...</p>
            </div>
          ) : filteredRequirements.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 size={36} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No matching requirements found</h3>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRequirements.map((req) => {
                const isExpanded = expandedId === req.id;
                return (
                  <div key={req.id} className="p-5 hover:bg-gray-50/60 transition-all">
                    
                    {/* Top Row: Clause Pill + Title + Status + Action Button */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      <div className="flex items-start gap-3.5">
                        <div className="shrink-0 mt-0.5">
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                            {req.clause}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base font-bold text-gray-900 hover:text-red-700 transition">
                              {req.title}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 border border-gray-200">
                              {req.type === 'MANDATORY_DOCUMENT' ? 'Mandatory Document' : 'Mandatory Record'}
                            </span>
                            <span className="text-xs text-gray-400">· {req.standard}</span>
                          </div>

                          <p className="text-xs text-gray-600 line-clamp-2 max-w-3xl">
                            {req.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 self-start lg:self-center shrink-0">
                        {/* Status Badge */}
                        {getStatusBadge(req.status)}

                        {/* Stored Location Pill with External Link */}
                        <Link
                          to={req.route}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                          title={`Navigate to ${req.targetModule} (${req.route})`}
                        >
                          <Database size={13} className="text-blue-600" />
                          <span>{req.targetModule}</span>
                          <ArrowUpRight size={13} className="text-blue-500" />
                        </Link>

                        {/* Expand Details Toggle */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                          title="Toggle Audit & Evidence Guidance"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                    </div>

                    {/* Middle Row: Live Database Detection Summary */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-gray-600 bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-700">Live IMS Status:</span>
                        <span className={req.status === 'COMPLIANT' ? 'text-emerald-700 font-medium' : (req.status === 'NEEDS_UPDATE' ? 'text-amber-700 font-medium' : 'text-red-700 font-medium')}>
                          {req.liveSummary}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-700">Owner:</span>
                        <span className="text-gray-600">{req.responsibleRole}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-700">Storage Route:</span>
                        <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-800">
                          {req.route}
                        </code>
                      </div>
                    </div>

                    {/* Expandable Section: Audit Expectation & AI Recommendation */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        
                        <div className="bg-blue-50/50 p-3.5 rounded-lg border border-blue-100">
                          <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                            <Info size={14} className="text-blue-600" />
                            ISO Auditor Expectation & Inspection Criteria
                          </h4>
                          <p className="text-blue-800 leading-relaxed">
                            {req.auditExpectation}
                          </p>
                          <div className="mt-2 text-[11px] text-blue-700">
                            <strong>Retention Period:</strong> {req.retentionRequirement}
                          </div>
                        </div>

                        <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-100">
                          <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-600" />
                            AI Compliance Guidance & Action Item
                          </h4>
                          <p className="text-amber-800 leading-relaxed">
                            {req.aiRecommendation}
                          </p>
                          <div className="mt-2">
                            <Link
                              to={req.route}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
                            >
                              Open {req.targetModule} to update or upload record &rarr;
                            </Link>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. AI Gap Analysis Modal */}
        {showAiModal && summary?.aiAuditSummary && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 p-6 md:p-8">
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      AI Lead Auditor ISO Gap Analysis Report
                    </h2>
                    <span className="text-xs text-gray-500">
                      Evaluated on {new Date(summary.lastScannedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                >
                  <XCircle size={22} />
                </button>
              </div>

              <div className="mt-6 space-y-6 text-sm">
                
                {/* Readiness Level */}
                <div className="flex items-center justify-between bg-red-50 p-4 rounded-xl border border-red-100">
                  <div>
                    <span className="text-xs text-red-700 font-semibold uppercase tracking-wider">
                      Overall Audit Readiness
                    </span>
                    <h3 className="text-lg font-extrabold text-red-950">
                      {summary.aiAuditSummary.certificationReadiness}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-red-900">
                      {summary.readinessScore}%
                    </span>
                    <p className="text-xs text-red-700">Readiness Score</p>
                  </div>
                </div>

                {/* Executive Summary */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Executive Summary</h4>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {summary.aiAuditSummary.executiveSummary}
                  </p>
                </div>

                {/* High Risk Gaps */}
                {summary.aiAuditSummary.highRiskGaps?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-600" />
                      Critical Audit Vulnerabilities
                    </h4>
                    <ul className="space-y-2">
                      {summary.aiAuditSummary.highRiskGaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-red-800 bg-red-50/70 p-3 rounded-lg border border-red-200">
                          <span className="font-bold shrink-0">{i + 1}.</span>
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Priority Remedial Actions */}
                {summary.aiAuditSummary.priorityActions?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Target size={16} className="text-emerald-600" />
                      Priority Remedial Actions for PROME Management
                    </h4>
                    <ul className="space-y-2">
                      {summary.aiAuditSummary.priorityActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-gray-800 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg text-sm cursor-pointer"
                >
                  Close Gap Analysis
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default IsoComplianceMatrix;
