import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Shield, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface Evaluation {
  id: number;
  evaluationDate: string;
  statusResult: string;
  findings: string;
  evaluator: { id: number; name: string };
  linkedCapa: { id: number; reportNumber: string; status: string } | null;
}

interface Requirement {
  id: number;
  requirementNumber: string;
  title: string;
  description: string;
  issuingAuthority: string;
  applicableClauses: string;
  status: string;
  evaluationFrequency: string;
  lastEvaluationDate: string;
  nextEvaluationDate: string;
  owner: { id: number; name: string } | null;
  evaluations: Evaluation[];
}

export const ComplianceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Evaluation Form State
  const [statusResult, setStatusResult] = useState('Compliant');
  const [findings, setFindings] = useState('');
  const [raiseCapa, setRaiseCapa] = useState(false);

  const fetchRequirement = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/compliance/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequirement(data);
      } else {
        throw new Error('Not found');
      }
    } catch (error) {
      console.error('Failed to fetch requirement', error);
      alert('Requirement not found');
      navigate('/compliance');
    }
  };

  useEffect(() => {
    if (id) fetchRequirement();
  }, [id]);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const response = await fetch(`/api/compliance/${id}/evaluations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          statusResult,
          findings,
          raiseCapa,
          evaluatorId: user?.id
        })
      });
      
      if (response.ok) {
        setIsEvaluating(false);
        setFindings('');
        setStatusResult('Compliant');
        setRaiseCapa(false);
        fetchRequirement();
      } else {
        throw new Error('Failed to evaluate');
      }
    } catch (error) {
      console.error('Failed to log evaluation', error);
      alert('Failed to log evaluation');
    }
  };

  if (!requirement) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button 
        onClick={() => navigate('/compliance')}
        className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Register
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {requirement.requirementNumber}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                requirement.status === 'Compliant' ? 'bg-green-100 text-green-800' :
                requirement.status === 'Non-Compliant' ? 'bg-red-100 text-red-800' :
                requirement.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {requirement.status}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{requirement.title}</h1>
            <p className="text-gray-500 max-w-3xl leading-relaxed">{requirement.description}</p>
          </div>
          <button 
            onClick={() => setIsEvaluating(true)}
            className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Shield className="w-5 h-5 mr-2" />
            Evaluate Compliance
          </button>
        </div>

        <div className="grid grid-cols-3 gap-8 p-8">
          <div className="col-span-2 space-y-8">
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-400" />
                Evaluation History
              </h3>
              
              <div className="space-y-4">
                {requirement.evaluations.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-gray-500">No evaluations have been logged yet.</p>
                  </div>
                ) : (
                  requirement.evaluations.map((evalRecord) => (
                    <div key={evalRecord.id} className="p-5 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {evalRecord.statusResult === 'Compliant' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : evalRecord.statusResult === 'Non-Compliant' ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          )}
                          <span className="font-semibold text-gray-900">{evalRecord.statusResult}</span>
                          <span className="text-sm text-gray-500">• {new Date(evalRecord.evaluationDate).toLocaleDateString()}</span>
                        </div>
                        {evalRecord.linkedCapa && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                            CAPA: {evalRecord.linkedCapa.reportNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm mb-3">{evalRecord.findings}</p>
                      <p className="text-xs text-gray-500">Evaluated by: {evalRecord.evaluator?.name || 'System'}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="col-span-1 space-y-6">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Requirement Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Issuing Authority</p>
                  <p className="text-sm font-medium text-gray-900">{requirement.issuingAuthority}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Applicable Clauses</p>
                  <p className="text-sm font-medium text-gray-900">{requirement.applicableClauses || 'Entire Regulation'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Owner</p>
                  <p className="text-sm font-medium text-gray-900">{requirement.owner?.name || 'Unassigned'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Schedule
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Evaluation Frequency</p>
                  <p className="text-sm font-medium text-gray-900">{requirement.evaluationFrequency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Evaluation</p>
                  <p className="text-sm font-medium text-gray-900">
                    {requirement.lastEvaluationDate ? new Date(requirement.lastEvaluationDate).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Next Evaluation Due</p>
                  <p className={`text-sm font-medium ${new Date(requirement.nextEvaluationDate) < new Date() ? 'text-red-600' : 'text-blue-600'}`}>
                    {requirement.nextEvaluationDate ? new Date(requirement.nextEvaluationDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEvaluating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Log Compliance Evaluation</h2>
              <button onClick={() => setIsEvaluating(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleEvaluate} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Result</label>
                  <select
                    value={statusResult}
                    onChange={(e) => setStatusResult(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Compliant">Compliant</option>
                    <option value="Partial">Partial Compliance</option>
                    <option value="Non-Compliant">Non-Compliant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Findings / Evidence</label>
                  <textarea
                    required
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                    placeholder="Describe the evidence reviewed and any gaps identified..."
                  />
                </div>

                {statusResult === 'Non-Compliant' && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="raiseCapa"
                      checked={raiseCapa}
                      onChange={(e) => setRaiseCapa(e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="raiseCapa" className="text-sm font-bold text-red-900 cursor-pointer">
                        Raise Corrective Action (CAPA)
                      </label>
                      <p className="text-xs text-red-700 mt-1">
                        Automatically generate a Non-Conformance report in the CAPA system to address this compliance failure.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEvaluating(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
