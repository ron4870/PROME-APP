import { useState, useEffect } from 'react';

export const useProjectModules = (projectId: string | undefined, token: string | null) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [hse, setHse] = useState<{ incidents: any[] }>({ incidents: [] });
  const [quality, setQuality] = useState<{ ncrs: any[] }>({ ncrs: [] });
  const [risks, setRisks] = useState<any[]>([]);
  
  const [procurement, setProcurement] = useState<{ requisitions: any[], inventory: any[] }>({ requisitions: [], inventory: [] });
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [variations, setVariations] = useState<any[]>([]);
  const [paymentInvoices, setPaymentInvoices] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [correspondence, setCorrespondence] = useState<any[]>([]);

  const fetchAll = async () => {
    if (!projectId || !token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [
        taskRes, docRes, resRes, finRes, hseRes, qualRes, riskRes,
        procRes, dailyRes, varRes, invoiceRes, subRes, snagRes, corrRes
      ] = await Promise.all([
        fetch(`/api/projects/${projectId}/tasks`, { headers }),
        fetch(`/api/projects/${projectId}/documents`, { headers }),
        fetch(`/api/projects/${projectId}/resources`, { headers }),
        fetch(`/api/projects/${projectId}/financials`, { headers }),
        fetch(`/api/projects/${projectId}/hse`, { headers }),
        fetch(`/api/projects/${projectId}/quality`, { headers }),
        fetch(`/api/projects/${projectId}/risks`, { headers }),
        fetch(`/api/projects/${projectId}/procurement`, { headers }),
        fetch(`/api/projects/${projectId}/daily-reports`, { headers }),
        fetch(`/api/projects/${projectId}/variations`, { headers }),
        fetch(`/api/projects/${projectId}/payment-invoices`, { headers }),
        fetch(`/api/projects/${projectId}/subcontractors`, { headers }),
        fetch(`/api/projects/${projectId}/snags`, { headers }),
        fetch(`/api/projects/${projectId}/correspondence`, { headers }),
      ]);

      if (taskRes.ok) setTasks(await taskRes.json());
      if (docRes.ok) setDocuments(await docRes.json());
      if (resRes.ok) setResources(await resRes.json());
      if (finRes.ok) setFinancials(await finRes.json());
      if (hseRes.ok) setHse(await hseRes.json());
      if (qualRes.ok) setQuality(await qualRes.json());
      if (riskRes.ok) setRisks(await riskRes.json());

      if (procRes.ok) setProcurement(await procRes.json());
      if (dailyRes.ok) setDailyReports(await dailyRes.json());
      if (varRes.ok) setVariations(await varRes.json());
      if (invoiceRes.ok) setPaymentInvoices(await invoiceRes.json());
      if (subRes.ok) setSubcontractors(await subRes.json());
      if (snagRes.ok) setSnags(await snagRes.json());
      if (corrRes.ok) setCorrespondence(await corrRes.json());
    } catch (err) {
      console.error('Failed to fetch project modules data', err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [projectId, token]);

  return {
    tasks, documents, resources, financials, hse, quality, risks,
    procurement, dailyReports, variations, paymentInvoices, subcontractors, snags, correspondence, fetchAll // expose this to allow refetching
  };
};
