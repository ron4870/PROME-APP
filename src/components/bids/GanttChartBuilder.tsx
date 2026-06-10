import { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, Target, Activity } from 'lucide-react';

export interface GanttTask {
  id: string;
  name: string;
  type: 'task' | 'milestone';
  startDate: string; // YYYY-MM-DD
  durationDays: number;
  assigneeId: string | null;
}

interface Props {
  tasks: GanttTask[];
  onChange: (tasks: GanttTask[]) => void;
  users: any[];
}

export default function GanttChartBuilder({ tasks, onChange, users }: Props) {
  const [newTask, setNewTask] = useState<Partial<GanttTask>>({
    name: '',
    type: 'task',
    startDate: new Date().toISOString().split('T')[0],
    durationDays: 1,
    assigneeId: ''
  });

  const handleAddTask = () => {
    if (!newTask.name || !newTask.startDate) return;
    
    const task: GanttTask = {
      id: Math.random().toString(36).substring(7),
      name: newTask.name,
      type: newTask.type as 'task' | 'milestone',
      startDate: newTask.startDate,
      durationDays: newTask.type === 'milestone' ? 0 : Number(newTask.durationDays) || 1,
      assigneeId: newTask.assigneeId || null
    };

    onChange([...tasks, task]);
    setNewTask({ ...newTask, name: '', durationDays: 1 }); // reset form
  };

  const removeTask = (id: string) => {
    onChange(tasks.filter(t => t.id !== id));
  };

  // Calculate grid metrics
  const gridMetrics = useMemo(() => {
    if (tasks.length === 0) return { start: new Date(), end: new Date(), totalDays: 7, days: [] };
    
    let minDate = new Date(tasks[0].startDate);
    let maxDate = new Date(tasks[0].startDate);

    tasks.forEach(t => {
      const start = new Date(t.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (t.durationDays || 0));
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    // Add some padding
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 2);

    const totalDays = Math.max(7, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24)));
    
    const days = Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      return d;
    });

    return { minDate, totalDays, days };
  }, [tasks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Input Form */}
      <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} /> Add Schedule Item
        </h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Item Name</label>
            <input 
              type="text" 
              value={newTask.name}
              onChange={e => setNewTask({...newTask, name: e.target.value})}
              placeholder="e.g. Needs Assessment"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ width: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Type</label>
            <select 
              value={newTask.type}
              onChange={e => setNewTask({...newTask, type: e.target.value as 'task'|'milestone'})}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="task">Task</option>
              <option value="milestone">Milestone</option>
            </select>
          </div>

          <div style={{ width: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Start Date</label>
            <input 
              type="date" 
              value={newTask.startDate}
              onChange={e => setNewTask({...newTask, startDate: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {newTask.type === 'task' && (
            <div style={{ width: '100px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Duration (Days)</label>
              <input 
                type="number" 
                min="1"
                value={newTask.durationDays}
                onChange={e => setNewTask({...newTask, durationDays: Number(e.target.value)})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          )}

          <div style={{ width: '160px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Assignee</label>
            <select 
              value={newTask.assigneeId || ''}
              onChange={e => setNewTask({...newTask, assigneeId: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleAddTask}
            disabled={!newTask.name || !newTask.startDate}
            style={{ 
              padding: '0.5rem 1rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '6px', 
              fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', height: '38px' 
            }}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Gantt Visualizer */}
      {tasks.length > 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr' }}>
            {/* Left Sidebar (Task List) */}
            <div style={{ borderRight: '1px solid #e2e8f0' }}>
              <div style={{ height: '40px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', padding: '0 1rem', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
                Task Name
              </div>
              {tasks.map(t => (
                <div key={t.id} style={{ height: '40px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {t.type === 'milestone' ? <Target size={14} color="#f59e0b" /> : <Calendar size={14} color="#3b82f6" />}
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{t.name}</span>
                  </div>
                  <button onClick={() => removeTask(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Right Chart Area */}
            <div style={{ overflowX: 'auto', backgroundColor: '#f8fafc' }}>
              <div style={{ 
                minWidth: '100%', 
                display: 'grid', 
                gridTemplateColumns: `repeat(${gridMetrics.totalDays}, 40px)` 
              }}>
                {/* Header Days */}
                <div style={{ display: 'contents' }}>
                  {gridMetrics.days.map((d, i) => (
                    <div key={i} style={{ height: '40px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9' }}>
                      {d.getDate()}/{d.getMonth() + 1}
                    </div>
                  ))}
                </div>

                {/* Task Bars */}
                {tasks.map(t => {
                  const taskStart = new Date(t.startDate);
                  const startIndex = Math.max(0, Math.floor((taskStart.getTime() - gridMetrics.minDate!.getTime()) / (1000 * 3600 * 24)));
                  const duration = t.type === 'milestone' ? 1 : Math.max(1, t.durationDays);

                  return (
                    <div key={t.id} style={{ display: 'contents' }}>
                      {gridMetrics.days.map((_, i) => {
                        const isStart = i === startIndex;
                        
                        return (
                          <div key={i} style={{ height: '40px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', position: 'relative' }}>
                            {isStart && t.type === 'task' && (
                              <div style={{ 
                                position: 'absolute', left: '4px', right: `calc(-${(duration - 1) * 40}px + 4px)`, top: '8px', bottom: '8px', 
                                backgroundColor: '#3b82f6', borderRadius: '4px', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                display: 'flex', alignItems: 'center', padding: '0 8px', color: 'white', fontSize: '0.75rem', overflow: 'hidden', whiteSpace: 'nowrap'
                              }}>
                                {users.find(u => u.id == t.assigneeId)?.name?.split(' ')[0] || ''}
                              </div>
                            )}
                            {isStart && t.type === 'milestone' && (
                              <div style={{ 
                                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(45deg)',
                                width: '16px', height: '16px', backgroundColor: '#f59e0b', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          No tasks scheduled yet. Add a task or milestone above to build your Work Programme.
        </div>
      )}
    </div>
  );
}
