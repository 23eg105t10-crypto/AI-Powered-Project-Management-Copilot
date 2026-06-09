import React, { useMemo } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flag,
  GitBranch,
  Layers,
  Milestone,
  Timer
} from 'lucide-react';

export const formatMilestoneDate = value => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const MODULE_TITLE_MAP = [
  ['auth', 'Build Authentication Module'],
  ['authentication', 'Build Authentication Module'],
  ['dashboard', 'Build Dashboard Module'],
  ['payment', 'Build Payment Module'],
  ['notification', 'Build Notification Module'],
  ['report', 'Build Reporting Module'],
  ['reporting', 'Build Reporting Module'],
  ['admin', 'Build Admin Module'],
  ['analytics', 'Build Analytics Module'],
  ['security', 'Build Security Module']
];

export const formatMilestoneTitle = raw => {
  const text = String(raw || '').trim();
  if (!text) return 'Build Milestone Module';
  const lower = text.toLowerCase();
  for (const [key, label] of MODULE_TITLE_MAP) {
    if (lower.includes(key)) return label;
  }
  if (/^build\s+/i.test(text) && /module/i.test(text)) return text;
  const cleaned = text.replace(/^build\s+/i, '').replace(/\s*module$/i, '').trim();
  const capitalized = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return capitalized ? `Build ${capitalized} Module` : 'Build Milestone Module';
};

const isMilestoneEntry = item => {
  if (!item) return false;
  if (typeof item === 'string') {
    const s = item.trim();
    if (!s || /^\d+$/.test(s)) return false;
    if (/^(T[-_]?[0-9]+)$/i.test(s)) return false;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
    return /[a-zA-Z]/.test(s);
  }
  if (typeof item === 'object') {
    return !!(item.name || item.title || item.task || item.milestone || item.date || item.taskId || item.id);
  }
  return false;
};

const parseMilestone = (item, index) => {
  if (typeof item === 'string') {
    const dateMatch = item.match(/\d{4}-\d{2}-\d{2}/);
    const name = item.replace(/\d{4}-\d{2}-\d{2}.*/, '').replace(/[—–-]\s*$/, '').trim() || item;
    return {
      name,
      taskId: `T-${String(index + 1).padStart(3, '0')}`,
      date: dateMatch?.[0] || null
    };
  }
  if (typeof item === 'object' && item !== null) {
    return {
      name: item.name || item.title || item.task || item.milestone || item.summary || item.description || `Milestone ${index + 1}`,
      taskId: item.taskId || item.id || item.milestoneId || item.key || item.code || `T-${String(index + 1).padStart(3, '0')}`,
      date: item.date || item.dueDate || item.deadline || item.targetDate || item.endDate || item.startDate || item.plannedDate || null
    };
  }
  return null;
};

export const parseMilestonesList = value => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(isMilestoneEntry).map(parseMilestone).filter(Boolean);
  }
  if (typeof value === 'object' && Array.isArray(value.milestones)) {
    return value.milestones.filter(isMilestoneEntry).map(parseMilestone).filter(Boolean);
  }
  return [];
};

export const formatCriticalPath = (value, tasks = []) => {
  if (!value) return '';
  const ids = Array.isArray(value)
    ? value
    : String(value)
        .split(/[\s,;→]+/)
        .map(part => part.trim())
        .filter(Boolean);
  if (!ids.length) return '';
  const taskList = Array.isArray(tasks) ? tasks : [];
  return ids
    .map(id => {
      const key = String(id);
      const match = taskList.find(
        t =>
          t?.taskId === key ||
          t?.id === key ||
          String(t?.title || '').toLowerCase().includes(key.toLowerCase()) ||
          String(t?.name || '').toLowerCase().includes(key.toLowerCase())
      );
      if (/^T[-_]?[0-9]+$/i.test(key)) return key.toUpperCase().replace('_', '-');
      if (match?.taskId) return match.taskId;
      if (match?.id) return match.id;
      return key;
    })
    .join(' → ');
};

const resolveSprintDays = timeline => {
  if (timeline.sprintDurationDays != null && timeline.sprintDurationDays !== '') {
    return timeline.sprintDurationDays;
  }
  const weeks = timeline.sprintDuration ?? timeline.sprintWeeks ?? timeline.sprintDurationWeeks;
  if (weeks != null && weeks !== '') {
    const n = Number(weeks);
    if (!Number.isNaN(n)) return n <= 4 ? n * 7 : n;
  }
  return null;
};

export const parseTimelineData = (timeline, tasks = []) => {
  if (!timeline) {
    return { milestones: [], criticalPath: '', projectDurationDays: null, sprintDurationDays: null, startDate: null, estimatedDelivery: null };
  }

  if (Array.isArray(timeline)) {
    const milestones = parseMilestonesList(timeline);
    return { milestones, criticalPath: '', projectDurationDays: null, sprintDurationDays: null, startDate: null, estimatedDelivery: null };
  }

  if (typeof timeline === 'object') {
    const milestones = parseMilestonesList(timeline.milestones || timeline);
    return {
      projectDurationDays: timeline.projectDurationDays ?? timeline.durationDays ?? timeline.duration ?? null,
      sprintDurationDays: resolveSprintDays(timeline),
      startDate: timeline.startDate || timeline.start || timeline.projectStart || timeline.start_date || null,
      estimatedDelivery:
        timeline.estimatedDelivery ||
        timeline.deliveryDate ||
        timeline.estimated_delivery ||
        timeline.endDate ||
        timeline.end_date ||
        timeline.deadline ||
        null,
      criticalPath: formatCriticalPath(timeline.criticalPath || timeline.critical_path || timeline.path, tasks),
      milestones
    };
  }

  return { milestones: [], criticalPath: '', projectDurationDays: null, sprintDurationDays: null, startDate: null, estimatedDelivery: null };
};

export function buildTimelineReportText(timeline, tasks = []) {
  const data = parseTimelineData(timeline, tasks);
  const lines = [
    'Timeline Overview',
    '',
    `Project Duration`,
    `${data.projectDurationDays ?? '—'} Days`,
    '',
    `Sprint Duration`,
    `${data.sprintDurationDays ?? '—'} Days`,
    '',
    `Project Start Date`,
    formatMilestoneDate(data.startDate),
    '',
    `Estimated Delivery`,
    formatMilestoneDate(data.estimatedDelivery),
    '',
    `Critical Path`,
    data.criticalPath || '—',
    '',
    'Milestone Schedule',
    ''
  ];
  data.milestones.forEach(item => {
    lines.push(`✓ ${formatMilestoneTitle(item.name)}`);
    lines.push(`Task ID: ${item.taskId}`);
    lines.push(`Date: ${formatMilestoneDate(item.date)}`);
    lines.push('');
  });
  return lines.join('\n').trim();
}

function OverviewCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="milestone-overview-card">
      <div className="milestone-overview-icon">
        <Icon size={18} />
      </div>
      <div className="overview-label">{label}</div>
      <div className={`overview-value ${accent || ''}`}>{value}</div>
    </div>
  );
}

const asArray = val => (Array.isArray(val) ? val : []);

export function ensureMilestones(result) {
  if (!result) return [];
  const tasks = asArray(result.tasks || result.generatedTasks);
  const timeline = result.timeline || {};
  const existing = asArray(timeline.milestones || result.milestones);

  if (tasks.length > 0 && existing.length === tasks.length) {
    return existing;
  }

  const startDate = timeline.startDate || result.startDate || new Date().toISOString();

  const generated = tasks.map((task, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (index + 1) * 4);
    const name = typeof task === 'string' ? task : task?.title || task?.name || `Task ${index + 1}`;
    const taskId = typeof task === 'object' && (task.id || task.taskId) ? task.id || task.taskId : `T-${String(index + 1).padStart(3, '0')}`;
    return {
      name,
      taskId,
      date: date.toISOString().slice(0, 10)
    };
  });

  console.log(`[MilestoneTimeline UI] Auto-generated ${generated.length} milestones for ${tasks.length} tasks.`);
  return generated;
}

export default function MilestoneTimeline({
  timeline,
  tasks = [],
  variant = 'full',
  embedded = false,
  showOverview = true,
  showProgress = true
}) {
  const data = useMemo(() => parseTimelineData(timeline, tasks), [timeline, tasks]);
  
  const milestones = useMemo(() => {
    const taskList = asArray(tasks);
    console.log("MILESTONE_RENDER_TASKS_COUNT", taskList.length);

    const startDate = new Date(data.startDate || new Date());
    
    return taskList.map((task, index) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + (index + 1) * 4);
      
      const name = typeof task === 'string' ? task : (task.title || task.name || `Task ${index + 1}`);
      const taskId = typeof task === 'object' && (task.id || task.taskId) ? (task.id || task.taskId) : `T-${String(index + 1).padStart(3, "0")}`;
      
      return {
        name,
        taskId,
        date: d.toISOString().slice(0, 10)
      };
    });
  }, [data.startDate, tasks]);

  const completedCount = milestones.filter(m => m.date && new Date(m.date) <= new Date()).length;
  const progressPct = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0;
  const hasOverview = !!(data.projectDurationDays || data.sprintDurationDays || data.startDate || data.estimatedDelivery || data.criticalPath);
  const hasContent = hasOverview || milestones.length;

  if (!hasContent) {
    return (
      <div className={embedded ? 'milestone-timeline-empty' : 'glass-panel p-5 milestone-timeline'}>
        <div className="small-muted">No timeline milestones available yet. Run AI Intake to generate a delivery schedule.</div>
      </div>
    );
  }

  const rootClass = [
    'milestone-timeline',
    embedded ? 'milestone-timeline-embedded' : 'glass-panel p-5',
    variant === 'compact' ? 'milestone-timeline-compact' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {variant !== 'compact' && showOverview && (
        <>
          <div className="milestone-section-head">
            <Timer size={18} />
            <span>Timeline Overview</span>
          </div>
          <div className="milestone-overview">
            <OverviewCard
              icon={Clock3}
              label="Project Duration"
              value={data.projectDurationDays != null ? `${data.projectDurationDays} Days` : 'TBD'}
            />
            <OverviewCard
              icon={Flag}
              label="Sprint Duration"
              value={data.sprintDurationDays != null ? `${data.sprintDurationDays} Days` : 'TBD'}
            />
            <OverviewCard icon={CalendarDays} label="Project Start Date" value={formatMilestoneDate(data.startDate)} />
            <OverviewCard
              icon={Milestone}
              label="Estimated Delivery"
              value={formatMilestoneDate(data.estimatedDelivery)}
              accent="text-emerald-400"
            />
          </div>
          {data.criticalPath && (
            <div className="critical-path">
              <div className="critical-path-label">
                <GitBranch size={16} />
                Critical Path
              </div>
              <div className="critical-path-value">{data.criticalPath}</div>
            </div>
          )}
          {showProgress && milestones.length > 1 && (
            <div className="milestone-progress-wrap">
              <div className="milestone-progress-label">
                <span>Milestone progress</span>
                <strong>
                  {completedCount}/{milestones.length} complete
                </strong>
              </div>
              <div className="milestone-progress-track">
                <div className="milestone-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}
        </>
      )}

      {milestones.length > 0 && (
        <>
          <div className="milestone-section-head milestone-schedule-head">
            <Layers size={18} />
            <span>Milestone Schedule</span>
          </div>
          <div className="milestone-list" role="list">
            {milestones.map((m, index) => {
              const title = formatMilestoneTitle(m.name);
              const taskId = m.taskId || '';
              const date = formatMilestoneDate(m.date);
              const isLast = index === milestones.length - 1;
              const isComplete = m.date && new Date(m.date) <= new Date();
              return (
                <div className={`milestone-step ${isLast ? 'is-last' : ''}`} key={m.taskId || index} role="listitem">
                  <div className="milestone-rail">
                    <div className={`milestone-step-badge ${isComplete ? 'is-complete' : ''}`}>
                      <CheckCircle2 size={18} />
                    </div>
                    {!isLast && <div className="milestone-connector" aria-hidden="true" />}
                  </div>
                  <div className="milestone-step-card">
                    <div className="milestone-step-title">{index + 1}. {title}</div>
                    {taskId && (
                      <div className="milestone-step-meta">
                        <ArrowRight size={14} />
                        <span>Task ID: {taskId}</span>
                      </div>
                    )}
                    <div className="milestone-step-meta">
                      <CalendarDays size={14} />
                      <span>Due Date: {date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
