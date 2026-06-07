import React from 'react';

export default function WorkflowTimeline({events=[]}){
  return <div className="workflow-timeline card">
    <h4 className="font-bold">Execution Timeline</h4>
    <ul className="mt-3 text-sm small-muted">
      {events.length? events.map((e,i)=> <li key={i}>{new Date(e.ts).toLocaleTimeString()} — {e.msg}</li>) : <li>No runs yet</li>}
    </ul>
  </div>
}
