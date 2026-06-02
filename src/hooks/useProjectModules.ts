import { useState, useEffect } from 'react';

export const useProjectModules = (projectId: string | undefined, token: string | null) => {
  const [procurement, setProcurement] = useState<{ requisitions: any[], inventory: any[] }>({ requisitions: [], inventory: [] });
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [variations, setVariations] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [correspondence, setCorrespondence] = useState<any[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId || !token) return;

    const fetchAll = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [procRes, dailyRes, varRes, subRes, snagRes, corrRes, equipRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/procurement`, { headers }),
          fetch(`/api/projects/${projectId}/daily-reports`, { headers }),
          fetch(`/api/projects/${projectId}/variations`, { headers }),
          fetch(`/api/projects/${projectId}/subcontractors`, { headers }),
          fetch(`/api/projects/${projectId}/snags`, { headers }),
          fetch(`/api/projects/${projectId}/correspondence`, { headers }),
          fetch(`/api/projects/${projectId}/equipment-logs`, { headers })
        ]);

        if (procRes.ok) setProcurement(await procRes.json());
        if (dailyRes.ok) setDailyReports(await dailyRes.json());
        if (varRes.ok) setVariations(await varRes.json());
        if (subRes.ok) setSubcontractors(await subRes.json());
        if (snagRes.ok) setSnags(await snagRes.json());
        if (corrRes.ok) setCorrespondence(await corrRes.json());
        if (equipRes.ok) setEquipmentLogs(await equipRes.json());
      } catch (err) {
        console.error('Failed to fetch project modules data', err);
      }
    };

    fetchAll();
  }, [projectId, token]);

  return {
    procurement, dailyReports, variations, subcontractors, snags, correspondence, equipmentLogs
  };
};
