import React, { useState } from 'react';
import MilestoneTimeline from '../project/MilestoneTimeline';
import EvaluationMetricsCards from '../project/EvaluationMetricsCards';

function Section({ title, children }) {
  return (
    <section className="agent-detail-section glass-panel">
      <h4 className="agent-detail-section-title">{title}</h4>
      {children}
    </section>
  );
}

function Badge({ tone, children }) {
  return <span className={`agent-severity-badge ${tone}`}>{children}</span>;
}

function TeamAllocationCards({ members = [] }) {
  return (
    <div className="team-allocation-grid">
      {members.map((member, index) => (
        <div key={`${member.name}-${index}`} className="team-allocation-card">
          <div className="team-allocation-avatar">{member.name.charAt(0).toUpperCase()}</div>
          <div className="team-allocation-name">{member.name}</div>
          <div className="team-allocation-role">{member.role}</div>
          <div className="team-allocation-label">Assigned Responsibilities</div>
          <ul className="team-allocation-tasks">
            {member.assigned.map((task, i) => (
              <li key={i}>{task}</li>
            ))}
          </ul>
          <div className="team-allocation-label">Workload</div>
          <div className="team-allocation-workload-value">{member.workload}%</div>
          <div className="progress-track mt-1">
            <div className="progress-fill" style={{ width: `${member.workload}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailDetail({ email }) {
  const [copied, setCopied] = useState(false);
  const fullText = `Subject: ${email.subject}\n\n${email.body}`;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Section title="Client Email">
      <div className="email-detail-subject">
        <span className="small-muted text-xs uppercase">Subject</span>
        <div className="font-bold text-lg mt-1">{email.subject}</div>
      </div>
      <div className="email-detail-body whitespace-pre-wrap">{email.body}</div>
      <button type="button" className="btn mt-3" onClick={copyEmail}>
        {copied ? 'Copied' : 'Copy email'}
      </button>
    </Section>
  );
}

export default function AgentDetailContent({ agentName, output = {} }) {
  if (!output || Object.keys(output).length === 0) {
    return <div className="small-muted">No detailed output available for this agent.</div>;
  }

  if (output.summary) {
    // summary rendered per-agent below where needed
  }

  switch (agentName) {
    case 'Requirement Analyzer Agent':
      return (
        <>
          <Section title="Summary">
            <p className="agent-detail-text">{output.summary}</p>
          </Section>
          <Section title="Identified Modules">
            <ul className="agent-chip-list">
              {(output.modules || []).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </Section>
          <Section title="Dependencies">
            <ul className="readable-list">
              {(output.dependencies || []).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </Section>
          <Section title="Missing Information">
            <ul className="readable-list">
              {(output.missingInformation || []).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </Section>
          <Section title="Completeness Score">
            <div className="agent-completeness">
              <strong>{output.completenessScore ?? '—'}%</strong>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: `${output.completenessScore || 0}%` }} />
              </div>
            </div>
          </Section>
        </>
      );

    case 'Task Generation Agent':
      return (
        <>
          <Section title="Summary">
            <p className="agent-detail-text">{output.summary}</p>
          </Section>
          <div className="task-card-grid">
            {(output.tasks || []).map((task, i) => (
              <div key={i} className="task-agent-card">
                <div className="task-agent-card-title">{task.title}</div>
                <div className="task-agent-meta">
                  <Badge tone={String(task.priority).toLowerCase()}>{task.priority}</Badge>
                  <span>{task.storyPoints} pts</span>
                </div>
                {task.dependencies?.length > 0 && (
                  <div className="task-agent-block">
                    <div className="small-muted text-xs uppercase">Dependencies</div>
                    <ul className="readable-list compact">
                      {task.dependencies.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {task.subtasks?.length > 0 && (
                  <div className="task-agent-block">
                    <div className="small-muted text-xs uppercase">Subtasks</div>
                    <ul className="readable-list compact">
                      {task.subtasks.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      );

    case 'Timeline Estimation Agent':
      return (
        <>
          <Section title="Summary">
            <p className="agent-detail-text">{output.summary}</p>
          </Section>
          <MilestoneTimeline embedded timeline={output.timeline} tasks={output.tasks} />
        </>
      );

    case 'Risk Detection Agent':
      return (
        <>
          <Section title="Summary">
            <p className="agent-detail-text">{output.summary}</p>
          </Section>
          <div className="risk-card-grid">
            {(output.risks || []).map((risk, i) => (
              <div key={i} className="risk-agent-card">
                <div className="risk-agent-card-head">
                  <div className="font-semibold">{risk.name}</div>
                  <Badge tone={String(risk.severity).toLowerCase()}>{risk.severity}</Badge>
                </div>
                <div className="small-muted">Risk score: {risk.score}/100</div>
                <div className="progress-track mt-2 mb-2">
                  <div className="progress-fill risk" style={{ width: `${risk.score}%` }} />
                </div>
                <div className="small-muted text-xs uppercase">Mitigation</div>
                <p className="agent-detail-text mt-1">{risk.mitigation}</p>
              </div>
            ))}
          </div>
        </>
      );

    case 'Team Allocation Agent':
      return (
        <>
          <Section title="Summary">
            <p className="agent-detail-text">{output.summary}</p>
          </Section>
          <Section title="Team Allocation">
            <TeamAllocationCards members={output.teamAllocation || []} />
          </Section>
        </>
      );

    case 'Weekly Report Agent':
      return (
        <>
          <Section title="Executive Summary">
            <p className="agent-detail-text">{output.executiveSummary || output.summary}</p>
          </Section>
          <Section title="Progress">
            <div className="agent-kpi-inline">
              <strong>{output.progress}</strong>
              <div className="progress-track mt-2">
                <div
                  className="progress-fill"
                  style={{ width: `${Number(String(output.progress).replace(/[^0-9]/g, '')) || 35}%` }}
                />
              </div>
            </div>
          </Section>
          <Section title="Completed Work">
            <ul className="readable-list">
              {(output.completedWork || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Section>
          <Section title="Blockers">
            <ul className="readable-list">
              {(output.blockers || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Section>
          <Section title="Next Steps">
            <ul className="readable-list">
              {(output.nextSteps || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Section>
        </>
      );

    case 'Email Generator Agent':
      return <EmailDetail email={output.email || { subject: 'Project update', body: output.summary }} />;

    case 'Security Monitoring Agent':
      return (
        <>
          <Section title="Summary">
            <p className="agent-detail-text">{output.summary}</p>
          </Section>
          <div className="security-status-row">
            <Badge tone={output.status === 'Safe' ? 'low' : 'high'}>{output.status}</Badge>
            <Badge tone="medium">Threat: {output.threatLevel}</Badge>
            <span className="small-muted">Score: {output.securityScore}</span>
          </div>
          <Section title="Security Checks">
            <ul className="security-check-list">
              {(output.checks || []).map((check, i) => (
                <li key={i} className={check.passed ? 'pass' : 'fail'}>
                  {check.passed ? '✓' : '✗'} {check.label}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="OWASP Coverage">
            <ul className="agent-chip-list">
              {(output.owaspCoverage || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Section>
          <Section title="Audit Readiness">
            <p className="agent-detail-text">{output.auditReadiness}</p>
          </Section>
        </>
      );

    case 'Evaluation Agent':
      return (
        <>
          <Section title="Evaluation Summary">
            <p className="agent-detail-text">{output.summary}</p>
          </Section>
          <EvaluationMetricsCards metrics={output.metrics || output.rawMetrics || {}} showOverall />
        </>
      );

    default:
      return (
        <Section title="Summary">
          <p className="agent-detail-text">{output.summary || 'Completed.'}</p>
        </Section>
      );
  }
}
