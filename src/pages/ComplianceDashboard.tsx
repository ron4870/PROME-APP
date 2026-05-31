import React, { useState, useEffect } from 'react';
import { Plus, Search, Shield, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Requirement {
  id: number;
  requirementNumber: string;
  title: string;
  issuingAuthority: string;
  status: string;
  evaluationFrequency: string;
  nextEvaluationDate: string;
  _count: { evaluations: number };
}

export const ComplianceDashboard: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [applicableClauses, setApplicableClauses] = useState('');
  const [evaluationFrequency, setEvaluationFrequency] = useState('Annual');

  const fetchRequirements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/compliance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequirements(data);
      }
    } catch (error) {
      console.error('Failed to fetch requirements', error);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title,
          description,
          issuingAuthority,
          applicableClauses,
          evaluationFrequency,
          ownerId: user?.id
        })
      });
      
      if (response.ok) {
        setIsNewModalOpen(false);
        setTitle('');
        setDescription('');
        setIssuingAuthority('');
        setApplicableClauses('');
        setEvaluationFrequency('Annual');
        fetchRequirements();
      } else {
        throw new Error('Failed to create');
      }
    } catch (error) {
      console.error('Failed to create requirement', error);
      alert('Failed to create compliance requirement');
    }
  };

  const filteredRequirements = requirements.filter(req => 
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.requirementNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Register</h1>
          <p className="text-gray-500">Manage legal and regulatory compliance requirements</p>
        </div>
        <button 
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Requirement
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="relative w-96">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search compliance register..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600 text-sm">Req Number</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Title</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Issuing Authority</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Frequency</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Next Evaluation</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequirements.map((req) => (
                <tr 
                  key={req.id} 
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/compliance/${req.id}`)}
                >
                  <td className="p-4 text-sm text-gray-900 font-medium">{req.requirementNumber}</td>
                  <td className="p-4 text-sm text-gray-900">{req.title}</td>
                  <td className="p-4 text-sm text-gray-500">{req.issuingAuthority}</td>
                  <td className="p-4 text-sm text-gray-500">{req.evaluationFrequency}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {req.nextEvaluationDate ? new Date(req.nextEvaluationDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      req.status === 'Compliant' ? 'bg-green-100 text-green-800' :
                      req.status === 'Non-Compliant' ? 'bg-red-100 text-red-800' :
                      req.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRequirements.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No compliance requirements found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Add Compliance Requirement
              </h2>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title / Regulation Name</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Occupational Safety and Health Act"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description / Summary</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                    placeholder="Briefly describe what this regulation requires..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issuing Authority</label>
                  <input
                    required
                    type="text"
                    value={issuingAuthority}
                    onChange={(e) => setIssuingAuthority(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. OSHA, EPA, ISO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Frequency</label>
                  <select
                    value={evaluationFrequency}
                    onChange={(e) => setEvaluationFrequency(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Bi-Annual">Bi-Annual</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Applicable Clauses (Optional)</label>
                  <input
                    type="text"
                    value={applicableClauses}
                    onChange={(e) => setApplicableClauses(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Section 4.1, 4.2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
