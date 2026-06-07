import React from 'react';
import { motion } from 'framer-motion';

export default function AgentNode({id,name,x=0,y=0,state='idle',progress=0,onClick,selected}){
  return (
    <motion.div layoutId={`agent-${id}`} onClick={()=>onClick&&onClick(id)} className={`agent-node ${state}`} style={{left:x,top:y,cursor:'pointer'}} whileHover={{scale:1.02}}>
      <div className="agent-header">
        <div className="agent-name">{name}</div>
        <div className={`agent-badge ${state}`}>{state==='running'? 'Thinking...' : state==='success' ? 'Done' : state==='queued' ? 'Queued' : 'Idle'}</div>
      </div>
      <div className="agent-body">
        <div className="progress-wrap"><div className="progress-bar"><div style={{width:`${Math.min(progress,100)}%`}} className="progress-fill"/></div></div>
      </div>
      <div className="agent-footer">
        <div className="small-muted">{state==='running'? 'Elapsed: ...' : 'Duration: 0s'}</div>
        <div className="small-muted">{`Conf: ${Math.floor(Math.random()*40)+60}%`}</div>
      </div>
      <motion.span className="agent-ripple" animate={ state==='success' ? { scale: [1,1.4,1], opacity: [0.5,0.15,0] } : {opacity:0} } transition={{duration:0.75}} />
    </motion.div>
  );
}
