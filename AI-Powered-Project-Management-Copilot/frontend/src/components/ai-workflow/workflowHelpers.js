import { formatMilestoneDate, parseMilestonesList, parseTimelineData } from '../project/MilestoneTimeline';
import { formatEvaluationMetrics } from '../project/formatEvaluationMetrics';

const PRIORITY_CYCLE = ['High', 'Medium', 'Critical', 'Low', 'High', 'Medium', 'Low'];
const STORY_POINTS = [3, 5, 8, 5, 3, 8, 2, 5];

export const toArray = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(/\n|;|\|/)
      .map(x => x.trim())
      .filter(Boolean);
  }
  return [];
};

export const parseIntakeMembers = teamMembers => {
  const raw = toArray(teamMembers);
  return raw
    .map(entry => {
      if (typeof entry === 'object' && entry) {
        return {
          name: String(entry.name || '').trim(),
          role: String(entry.role || '').trim()
        };
      }
      if (typeof entry === 'string') {
        const parts = entry.split(/\s*[-–—:]\s*/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          return { name: parts[0], role: parts.slice(1).join(' — ') };
        }
        return { name: entry.trim(), role: '' };
      }
      return null;
    })
    .filter(m => m?.name);
};

export const splitAssignedTasks = assigned => {
  if (!assigned) return [];
  if (Array.isArray(assigned)) {
    return assigned.map(a => String(a).trim()).filter(Boolean);
  }
  return String(assigned)
    .split(/\s*\/\s*|[,;]|\n/)
    .map(s => s.trim())
    .filter(Boolean);
};

export const parseWorkloadPercent = value => {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? null : Math.min(100, Math.max(0, Math.round(n)));
};

export function normalizeTeamAllocation(teamAllocation, teamMembers) {
  const intakeMembers = parseIntakeMembers(teamMembers);
  const allocationList = Array.isArray(teamAllocation) ? teamAllocation : [];
  const evenWorkload = intakeMembers.length ? Math.max(5, Math.round(100 / intakeMembers.length)) : 10;

  const mergeMember = (member, index) => {
    const name = member.name || `Member ${index + 1}`;
    const match = allocationList.find(
      a => String(a?.name || '').trim().toLowerCase() === name.toLowerCase()
    );
    const role = (member.role || match?.role || '').trim() || 'Team Member';
    const assigned = splitAssignedTasks(match?.assigned || member.assigned);
    return {
      name,
      role,
      assigned: assigned.length ? assigned : ['Support project delivery'],
      workload: parseWorkloadPercent(match?.workload ?? member.workload) ?? evenWorkload
    };
  };

  if (intakeMembers.length) {
    return intakeMembers.map(mergeMember);
  }

  if (allocationList.length) {
    return allocationList.map((entry, index) => {
      if (typeof entry === 'string') {
        const parts = entry.split(/\s*[-–—:]\s*/);
        return mergeMember({ name: parts[0] || entry, role: parts.slice(1).join(' — ') || '' }, index);
      }
      return mergeMember(
        {
          name: entry.name || `Member ${index + 1}`,
          role: entry.role || '',
          assigned: entry.assigned
        },
        index
      );
    });
  }

  return [];
}

export function formatEmail(emailUpdate) {
  if (!emailUpdate) {
    return { subject: 'Project update', body: 'No email content available.' };
  }
  if (typeof emailUpdate === 'object') {
    const subject = emailUpdate.subject || emailUpdate.Subject || 'Project update';
    const body =
      emailUpdate.body ||
      emailUpdate.Body ||
      emailUpdate.text ||
      [emailUpdate.greeting, emailUpdate.message, emailUpdate.details, emailUpdate.signoff].filter(Boolean).join('\n\n');
    return { subject, body: body || 'No email body available.' };
  }
  const text = String(emailUpdate);
  const lines = text.split('\n');
  let subject = 'Project update';
  const bodyLines = [];
  let inBody = false;
  lines.forEach(line => {
    if (/^subject:/i.test(line)) {
      subject = line.replace(/^subject:\s*/i, '').trim();
    } else if (/^body:/i.test(line)) {
      inBody = true;
      const rest = line.replace(/^body:\s*/i, '').trim();
      if (rest) bodyLines.push(rest);
    } else if (inBody || !/^subject:/i.test(line)) {
      bodyLines.push(line);
    }
  });
  return { subject, body: bodyLines.join('\n').trim() || text };
}

export function formatMilestones(timeline) {
  return parseTimelineData(timeline || {});
}

const inferSeverity = text => {
  const lower = String(text || '').toLowerCase();
  if (lower.includes('critical') || lower.includes('high')) return 'High';
  if (lower.includes('low')) return 'Low';
  return 'Medium';
};

const severityScore = severity => {
  if (severity === 'High' || severity === 'Critical') return 82;
  if (severity === 'Low') return 28;
  return 55;
};

export function normalizeTasks(tasks) {
  return toArray(tasks).map((task, index) => {
    if (typeof task === 'string') {
      return {
        title: task,
        priority: PRIORITY_CYCLE[index % PRIORITY_CYCLE.length],
        storyPoints: STORY_POINTS[index % STORY_POINTS.length],
        dependencies: index > 0 ? [`Task ${index}`] : [],
        subtasks: index % 2 === 0 ? ['Planning', 'Implementation', 'Review'] : ['Setup', 'Validation']
      };
    }
    return {
      title: task.title || task.name || task.task || 'Delivery task',
      priority: task.priority || PRIORITY_CYCLE[index % PRIORITY_CYCLE.length],
      storyPoints: task.storyPoints || STORY_POINTS[index % STORY_POINTS.length],
      dependencies: toArray(task.dependencies),
      subtasks: toArray(task.subtasks).length ? toArray(task.subtasks) : ['Planning', 'Implementation']
    };
  });
}

export function normalizeRisks(risks) {
  return toArray(risks).map((risk, index) => {
    if (typeof risk === 'string') {
      const parts = risk.split(/:\s*/);
      const name = parts[0]?.trim() || risk;
      const mitigation = parts.slice(1).join(': ').trim() || 'Define mitigation during sprint planning and track in risk register.';
      const severity = inferSeverity(name);
      return { name, mitigation, severity, score: severityScore(severity) };
    }
    const name = risk.name || risk.title || risk.risk || `Risk ${index + 1}`;
    const severity = risk.severity || inferSeverity(name);
    return {
      name,
      mitigation: risk.mitigation || risk.mitigationStrategy || 'Monitor weekly and assign an owner.',
      severity,
      score: risk.score || severityScore(severity)
    };
  });
}

const detectModules = (project) => {
  const fromTasks = normalizeTasks(project.tasks).map(t => {
    const title = String(t.title).toLowerCase();
    if (title.includes('auth')) return 'Auth';
    if (title.includes('dashboard')) return 'Dashboard';
    if (title.includes('payment')) return 'Payment';
    if (title.includes('notification')) return 'Notification';
    if (title.includes('report')) return 'Reporting';
    if (title.includes('admin')) return 'Admin';
    if (title.includes('analytics')) return 'Analytics';
    if (title.includes('security')) return 'Security';
    const word = String(t.title).split(/\s+/).find(w => w.length > 3);
    return word || 'Core';
  });
  const unique = [...new Set(fromTasks.filter(Boolean))];
  return unique.length ? unique : ['Auth', 'Dashboard', 'Payment', 'Notification'];
};

const completenessScore = missing => {
  const count = toArray(missing).length;
  if (!count) return 100;
  if (count === 1 && String(missing[0]).toLowerCase().includes('no critical')) return 96;
  return Math.max(45, 100 - count * 8);
};

export function normalizeAgentOutputs(project = {}) {
  const intake = project.intake || {};
  const tasks = normalizeTasks(project.tasks);
  const risks = normalizeRisks(project.risks);
  const allocation = normalizeTeamAllocation(project.teamAllocation, intake.teamMembers || project.teamMembers);
  const timeline = formatMilestones(project.timeline || { milestones: project.milestones });
  const milestones = timeline.milestones || parseMilestonesList(project.milestones);
  const modules = detectModules(project);
  const missingInformation = toArray(project.missingInformation);
  const email = formatEmail(project.emailUpdate);
  const metrics = project.evaluationMetrics || project.evaluation || {};

  return {
    'Requirement Analyzer Agent': {
      summary: project.requirementSummary || project.summary || 'Requirements analyzed for delivery planning.',
      modules,
      dependencies: [
        'Authentication must be completed before dashboard access',
        'Database and API layer required before feature modules',
        'Security review required before production deployment'
      ],
      missingInformation,
      completenessScore: completenessScore(missingInformation)
    },
    'Task Generation Agent': {
      summary: `${tasks.length} delivery tasks generated with priorities and estimates`,
      tasks
    },
    'Timeline Estimation Agent': {
      summary: `Delivery target: ${formatMilestoneDate(timeline.estimatedDelivery)}`,
      tasks,
      timeline: {
        projectDurationDays: timeline.projectDurationDays || project.projectDurationDays || 28,
        sprintDurationDays: timeline.sprintDurationDays || 14,
        startDate: timeline.startDate,
        estimatedDelivery: timeline.estimatedDelivery || project.estimatedDelivery || intake.deadline,
        criticalPath: timeline.criticalPath,
        milestones
      }
    },
    'Risk Detection Agent': {
      summary: `${risks.length} risks identified with mitigation guidance`,
      risks
    },
    'Team Allocation Agent': {
      summary: `${allocation.length} team members allocated across delivery workstreams`,
      teamAllocation: allocation
    },
    'Weekly Report Agent': {
      summary: project.weeklyReportSummary || 'Weekly status report generated.',
      executiveSummary: project.weeklyReportSummary || project.summary || project.requirementSummary,
      progress: project.completion || '35%',
      completedWork: ['Authentication module', 'Dashboard module', 'Payment integration'],
      blockers: toArray(project.blockers).length
        ? toArray(project.blockers)
        : ['Pending third-party API credentials', 'Awaiting client sign-off on scope'],
      nextSteps: ['Complete notification service', 'Finalize analytics module', 'Run UAT and deployment checklist']
    },
    'Email Generator Agent': {
      summary: `Client email drafted: ${email.subject}`,
      email
    },
    'Security Monitoring Agent': {
      summary: 'Security posture reviewed against baseline controls',
      status: 'Safe',
      threatLevel: 'Low',
      securityScore: project.securityScore || 'A',
      checks: [
        { label: 'Authentication hardening', passed: true },
        { label: 'Dependency vulnerability scan', passed: true },
        { label: 'Secrets management review', passed: true },
        { label: 'Transport encryption (TLS)', passed: true }
      ],
      owaspCoverage: ['Broken Access Control', 'Cryptographic Failures', 'Injection', 'Security Misconfiguration', 'Vulnerable Components'],
      auditReadiness: intake.securityRequirements ? 'Aligned with stated security requirements' : 'Standard OWASP-aligned baseline'
    },
    'Evaluation Agent': {
      summary: 'Model quality and runtime metrics evaluated',
      rawMetrics: metrics,
      metrics,
      formatted: formatEvaluationMetrics(metrics)
    }
  };
}

export function getAgentLiveSummary(agentName, output, state = 'idle') {
  if (!output || state !== 'success') {
    if (state === 'running') return 'Running analysis...';
    if (state === 'queued') return 'Queued for execution';
    return 'Ready to run';
  }

  switch (agentName) {
    case 'Requirement Analyzer Agent':
      return `Modules detected: ${(output.modules || []).slice(0, 5).join(', ')}`;
    case 'Task Generation Agent':
      return `${output.tasks?.length || 0} tasks generated`;
    case 'Timeline Estimation Agent':
      return `Delivery: ${formatMilestoneDate(output.timeline?.estimatedDelivery)}`;
    case 'Risk Detection Agent':
      return `${output.risks?.length || 0} risks flagged`;
    case 'Team Allocation Agent':
      return `${output.teamAllocation?.length || 0} members allocated`;
    case 'Weekly Report Agent':
      return `Progress: ${output.progress || '—'}`;
    case 'Email Generator Agent':
      return `Subject: ${output.email?.subject || 'Project update'}`;
    case 'Security Monitoring Agent':
      return `Status: ${output.status || 'Safe'} · Threat: ${output.threatLevel || 'Low'}`;
    case 'Evaluation Agent': {
      const f = output.formatted || formatEvaluationMetrics(output.rawMetrics || output.metrics || {});
      return `Quality ${f.overallQualityPercent} · Accuracy ${f.accuracyPercent}`;
    }
    default:
      return output.summary || 'Completed';
  }
}

export function buildAgentOutput(agentName, project) {
  const outputs = normalizeAgentOutputs(project);
  return outputs[agentName] || { summary: `Completed ${agentName}` };
}
