import React, {useState, useEffect} from 'react';
import AgentNode from './AgentNode';
import WorkflowConnections from './WorkflowConnections';
import AgentDetailsModal from './AgentDetailsModal';
import ParticleCanvas from './ParticleCanvas';
import { buildAgentOutput, getAgentLiveSummary } from './workflowHelpers';

const AGENTS = [
  'Requirement Analyzer Agent','Task Generation Agent','Timeline Estimation Agent','Risk Detection Agent','Team Allocation Agent','Weekly Report Agent','Email Generator Agent','Security Monitoring Agent','Evaluation Agent'
];

const safeParse = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};

function getUserKey(){ try{ const u = JSON.parse(localStorage.getItem('user')||'null'); return (u && (u.email || u.id)) ? (u.email || u.id).toString().replace(/\s+/g,'_') : null;}catch{return null;} }
function userKeyed(k){ const uk = getUserKey(); return uk ? `${k}_${uk}` : k; }
function userSafeParse(k, fallback=null){ return safeParse(userKeyed(k), fallback); }
function userSetItem(k, v){ try{ localStorage.setItem(userKeyed(k), JSON.stringify(v)); }catch(e){} }

function getLatestResult(){
  return userSafeParse('latest_ai_result', null) || userSafeParse('latestProjectResult', null);
}

function demoResult(){
  return {
    title: 'Client Portal Modernization',
    requirementSummary: 'Build a secure client portal with dashboards, task tracking, document sharing, weekly reporting, and production deployment.',
    missingInformation: ['Confirm payment provider', 'Confirm production SLA', 'Confirm final approval workflow'],
    tasks: ['Requirement workshop', 'Architecture and data model', 'Authentication and role access', 'Dashboard and task workflows', 'Report and email automation', 'Security testing and deployment'],
    timeline: {
      projectDurationDays: 28,
      sprintDurationDays: 14,
      startDate: new Date().toISOString().slice(0, 10),
      estimatedDelivery: '2026-07-02',
      criticalPath: 'T-001 → T-002 → T-003 → T-004',
      milestones: [
        { name: 'Auth', taskId: 'T-001', date: '2026-06-08' },
        { name: 'Dashboard', taskId: 'T-002', date: '2026-06-12' }
      ]
    },
    risks: ['Scope creep: use signed backlog', 'Integration delay: validate APIs early', 'Security gaps: run OWASP review before launch'],
    teamAllocation: [
      { name: 'Alex', role: 'Project Manager', assigned: 'Planning / Client reporting', workload: '20%' },
      { name: 'Sam', role: 'Backend Developer', assigned: 'Authentication / APIs', workload: '30%' }
    ],
    weeklyReportSummary: 'The project is organized into a clear delivery plan with risks visible and launch dependencies identified.',
    emailUpdate: 'Subject: Weekly Project Update\n\nHello,\n\nThe AI workflow generated the project plan, task backlog, milestones, risk mitigations, and team assignments.\n\nRegards,\nPM Copilot',
    evaluationMetrics: {accuracy:'91%', relevance:'94%', faithfulness:'92%', hallucinationRate:'3%'}
  };
}

export default function WorkflowCanvas(){
  const [nodes,setNodes] = useState(()=>AGENTS.map((n,i)=>({id:i,name:n,x:80 + (i%3)*300, y: 40 + Math.floor(i/3)*160})));
  const [links] = useState(()=>{
    const arr=[]; for(let i=0;i<AGENTS.length-1;i++) arr.push({from:i,to:i+1}); return arr;
  });
  const [states,setStates]=useState(()=>nodes.reduce((s,n)=>{s[n.id]={state:'idle',progress:0,output:null,confidence:0}; return s;},{}));
  const [active,setActive]=useState(null);
  const [modal,setModal]=useState(null);
  const [presentation,setPresentation] = useState(false);

  const latestAi = userSafeParse('latest_ai_result', null);
  const latestRun = userSafeParse('latest_workflow_run', null);

  useEffect(()=>{ setNodes(n=>n); },[]);

  const pathStrings = links.map(l=>{
    const a = nodes.find(n=>n.id===l.from) || {x:0,y:0};
    const b = nodes.find(n=>n.id===l.to) || {x:0,y:0};
    return `M ${a.x+120} ${a.y+48} C ${a.x+200} ${a.y+48} ${b.x-80} ${b.y+48} ${b.x} ${b.y+48}`;
  });
  const activePathFlags = links.map(l=> (active && (l.from===active.id || l.to===active.id)) );

  function appendAdminLog(msg) {
    try {
      const logs = userSafeParse('admin_logs', []);
      logs.push(`${new Date().toISOString()} - ${msg}`);
      userSetItem('admin_logs', logs);
    } catch (e) {}
  }

  function openAgentDetail(nodeId){
    const node = nodes.find(x => x.id === nodeId);
    if (!node) return;
    setModal({ ...node, ...states[nodeId] });
  }

  async function runWorkflow(){
    const sourceResult = getLatestResult() || demoResult();
    setStates(s=>Object.fromEntries(nodes.map(n=>[n.id,{...s[n.id],state:'queued',progress:0,output:null,confidence:0}])));
    appendAdminLog('Multi-agent workflow started');
    const finalStates = {};
    for(const node of nodes){
      setActive(node);
      window.dispatchEvent(new CustomEvent('workflow:active', {detail: {activeNode: node.id}}));
      setStates(s=>({...s, [node.id]:{...s[node.id], state:'running', progress:0}}));
      await new Promise(res=>{
        let p=0; const t = setInterval(()=>{ p+=Math.random()*12; setStates(s=>({...s,[node.id]:{...s[node.id], progress:Math.min(100,Math.floor(p)), state:'running'}})); if(p>100){ clearInterval(t); res(); } }, 300);
      });
      const output = {
        ...buildAgentOutput(node.name, sourceResult),
        tokens: Math.floor(100 + Math.random() * 900),
        confidence: Math.floor(82 + Math.random() * 15)
      };
      finalStates[node.id] = {state:'success', progress:100, output, confidence:output.confidence};
      setStates(s=>({...s, [node.id]:finalStates[node.id]}));
      window.dispatchEvent(new CustomEvent('workflow:completed', {detail: {node: node.id}}));
      await new Promise(r=>setTimeout(r,300));
    }
    setActive(null);
    const workflowRun = {
      id: Date.now(),
      title: sourceResult.title || sourceResult.projectTitle || 'Workflow Run',
      completedAt: new Date().toISOString(),
      agents: nodes.map(n=>({name:n.name, output:finalStates[n.id]?.output || null})),
      sourceResult
    };
    try{
      userSetItem('latest_workflow_run', workflowRun);
      const runs = userSafeParse('workflow_runs', []);
      runs.push(workflowRun);
      userSetItem('workflow_runs', runs);
      appendAdminLog(`Multi-agent workflow completed for ${workflowRun.title}`);
    }catch(e){}
  }

  const stateLabel = state => {
    if (state === 'success') return 'Completed';
    if (state === 'running') return 'Running';
    if (state === 'queued') return 'Queued';
    return 'Idle';
  };

  return (
    <div className={`workflow-root ${presentation? 'presentation':''}`}>
      <div className="workflow-left">
        <div className="card"><h4 className="font-bold">Agents</h4>
          <ul className="mt-3 agent-list-links">
            {nodes.map(n=> (
              <li key={n.id}>
                <button type="button" className="agent-list-btn" onClick={()=>openAgentDetail(n.id)}>{n.name}</button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn" onClick={runWorkflow}>Run Multi-Agent Workflow</button>
            <button type="button" className="btn muted" onClick={()=>setPresentation(p=>!p)}>{presentation? 'Exit Presentation' : 'Presentation Mode'}</button>
          </div>
        </div>
      </div>
      <div className="workflow-canvas card">
        <div className="canvas-inner">
          {presentation && <ParticleCanvas pathStrings={pathStrings} activeFlags={activePathFlags} />}
          <WorkflowConnections nodes={nodes} links={links} activeFlags={activePathFlags} />
          {nodes.map(n=> (
            <AgentNode
              key={n.id}
              id={n.id}
              name={n.name}
              x={n.x}
              y={n.y}
              state={states[n.id]?.state}
              progress={states[n.id]?.progress}
              onClick={openAgentDetail}
            />
          ))}
        </div>
      </div>
      <div className="workflow-right">
        <div className="card workflow-live-outputs">
          <h4 className="font-bold">Live Outputs</h4>
          <p className="small-muted mt-2">Click a card to open full agent details.</p>
          <div className="mt-3 live-output-list">
            {(latestAi || latestRun) ? (
              nodes.map(n=> {
                const st = states[n.id];
                const summary = getAgentLiveSummary(n.name, st?.output, st?.state);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="live-output-card"
                    onClick={()=>openAgentDetail(n.id)}
                  >
                    <div className="live-output-card-head">
                      <div className="font-semibold">{n.name}</div>
                      <span className={`agent-badge ${st?.state || 'idle'}`}>{stateLabel(st?.state)}</span>
                    </div>
                    <div className="live-output-card-body">{summary}</div>
                  </button>
                );
              })
            ) : (
              <div className="empty-state">Run Multi-Agent Workflow to start agent execution.</div>
            )}
          </div>
        </div>
      </div>
      <AgentDetailsModal agent={modal} open={!!modal} onClose={()=>setModal(null)} />
    </div>
  );
}
