import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Flag } from 'lucide-react';

interface ProjectGanttChartProps {
  tasks: any[];
  milestones: any[];
}

export const ProjectGanttChart: React.FC<ProjectGanttChartProps> = ({ tasks, milestones }) => {
  // Generate date range from tasks and milestones
  const { minDate, dateRange, totalDays } = useMemo(() => {
    let min = new Date();
    let max = new Date();
    
    if (tasks.length > 0 || milestones.length > 0) {
      const allDates: number[] = [];
      tasks.forEach(t => {
        if (t.startDate) allDates.push(new Date(t.startDate).getTime());
        if (t.dueDate) allDates.push(new Date(t.dueDate).getTime());
      });
      milestones.forEach(m => {
        if (m.targetDate) allDates.push(new Date(m.targetDate).getTime());
      });

      if (allDates.length > 0) {
        min = new Date(Math.min(...allDates));
        max = new Date(Math.max(...allDates));
      }
    }

    // Add padding of 5 days before and after
    min.setDate(min.getDate() - 5);
    max.setDate(max.getDate() + 5);

    const range: Date[] = [];
    const curr = new Date(min);
    while (curr <= max) {
      range.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return { minDate: min, maxDate: max, dateRange: range, totalDays: range.length };
  }, [tasks, milestones]);

  const getColSpan = (startDate: string, dueDate: string) => {
    if (!startDate || !dueDate) return { start: 1, span: 1 };
    
    const start = new Date(startDate);
    const end = new Date(dueDate);
    
    // Calculate start index (1-based for CSS Grid)
    const diffStart = Math.floor((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const span = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return { start: diffStart + 1, span };
  };

  const getMilestoneCol = (date: string) => {
    if (!date) return 1;
    const mDate = new Date(date);
    const diff = Math.floor((mDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      marginTop: '2rem'
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
        <Calendar size={20} color="#0ea5e9" />
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Interactive Gantt Timeline</h3>
      </div>
      
      <div style={{ display: 'flex', width: '100%', overflowX: 'auto' }}>
        {/* Left Pane: WBS / Task List */}
        <div style={{
          width: '300px',
          flexShrink: 0,
          borderRight: '1px solid #e2e8f0',
          backgroundColor: '#fff',
          zIndex: 10,
          position: 'sticky',
          left: 0,
        }}>
          {/* Header */}
          <div style={{ height: '60px', borderBottom: '1px solid #e2e8f0', padding: '1rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center' }}>
            Task / Milestone
          </div>
          
          {/* List items */}
          <div style={{ padding: '0.5rem 0' }}>
            {milestones.map(m => (
              <div key={`m-lbl-${m.id}`} style={{ height: '40px', padding: '0 1rem', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 600, color: '#b45309' }}>
                <Flag size={14} style={{ marginRight: '6px' }}/> {m.title}
              </div>
            ))}
            {tasks.map(t => (
              <div key={`t-lbl-${t.id}`} style={{ height: '40px', padding: '0 1rem', display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#334155', borderBottom: '1px solid #f1f5f9' }}>
                {t.title}
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Gantt Grid */}
        <div style={{ padding: '0', minWidth: `${totalDays * 40}px` }}>
          {/* Timeline Header (Days) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${totalDays}, 40px)`,
            height: '60px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc'
          }}>
            {dateRange.map((d, i) => (
              <div key={i} style={{
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: '#64748b'
              }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{d.getDate()}</span>
                <span>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
              </div>
            ))}
          </div>

          {/* Timeline Body */}
          <div style={{
            padding: '0.5rem 0',
            position: 'relative',
            backgroundImage: 'linear-gradient(to right, #f8fafc 1px, transparent 1px)',
            backgroundSize: '40px 100%'
          }}>
            
            {/* Milestones Rendering */}
            {milestones.map(m => {
              const col = getMilestoneCol(m.targetDate);
              return (
                <div key={`m-row-${m.id}`} style={{ height: '40px', display: 'grid', gridTemplateColumns: `repeat(${totalDays}, 40px)`, position: 'relative' }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    title={`Milestone: ${m.title} (${new Date(m.targetDate).toLocaleDateString()})`}
                    style={{
                      gridColumnStart: col,
                      gridColumnEnd: col + 1,
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#eab308',
                      transform: 'rotate(45deg)',
                      margin: '10px auto',
                      boxShadow: '0 2px 4px rgba(234, 179, 8, 0.4)',
                      zIndex: 5,
                      cursor: 'pointer'
                    }}
                  />
                </div>
              );
            })}

            {/* Tasks Rendering */}
            {tasks.map(t => {
              const { start, span } = getColSpan(t.startDate, t.dueDate);
              const progress = t.progress || 0;
              
              return (
                <div key={`t-row-${t.id}`} style={{ height: '40px', display: 'grid', gridTemplateColumns: `repeat(${totalDays}, 40px)`, position: 'relative', borderBottom: '1px solid transparent' }}>
                  {t.startDate && t.dueDate && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      title={`${t.title} (${progress}%)`}
                      style={{
                        gridColumnStart: start,
                        gridColumnEnd: start + span,
                        height: '24px',
                        backgroundColor: '#e0f2fe',
                        borderRadius: '6px',
                        margin: '8px 4px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 0 0 1px #7dd3fc',
                        cursor: 'pointer',
                        zIndex: 4
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #0ea5e9)',
                        borderRadius: progress === 100 ? '6px' : '6px 0 0 6px'
                      }} />
                    </motion.div>
                  )}
                </div>
              );
            })}
            
          </div>
        </div>
      </div>
    </div>
  );
};
