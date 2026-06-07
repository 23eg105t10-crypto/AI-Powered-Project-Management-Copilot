import React from 'react';
import { getAgentLiveSummary } from './workflowHelpers';

export default function ExecutionPanel({ active }) {
  const stateLabel =
    active?.state === 'success' ? 'Completed' : active?.state === 'running' ? 'Running' : active?.state === 'queued' ? 'Queued' : 'Idle';

  return (
    <div className="execution-panel card">
      <h4 className="font-bold">Execution</h4>
      {active ? (
        <div>
          <div className="mt-2">
            <strong>Current Agent</strong>
            <div className="small-muted">{active.name}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="glass-panel p-3">
              <div className="small-muted">Status</div>
              <div className="font-semibold">{stateLabel}</div>
            </div>
            <div className="glass-panel p-3">
              <div className="small-muted">Progress</div>
              <div className="font-semibold">{active.progress ?? 0}%</div>
            </div>
            <div className="glass-panel p-3">
              <div className="small-muted">Confidence</div>
              <div className="font-semibold">{active.confidence ? `${active.confidence}%` : '—'}</div>
            </div>
            <div className="glass-panel p-3 col-span-2">
              <div className="small-muted">Live summary</div>
              <div className="font-semibold text-sm mt-1">
                {getAgentLiveSummary(active.name, active.output, active.state)}
              </div>
            </div>
          </div>
          <div className="progress-track mt-3">
            <div className="progress-fill" style={{ width: `${Math.min(100, active.progress || 0)}%` }} />
          </div>
        </div>
      ) : (
        <div className="small-muted">Run Multi-Agent Workflow to start agent execution.</div>
      )}
    </div>
  );
}
