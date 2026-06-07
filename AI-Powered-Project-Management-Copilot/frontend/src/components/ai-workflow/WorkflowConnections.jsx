import React from 'react';
import { motion } from 'framer-motion';

export default function WorkflowConnections({nodes=[],links=[], activeFlags=[]}){
  // nodes: {id,x,y}
  const find=(id)=>nodes.find(n=>n.id===id)||{x:0,y:0};
  return <svg className="connections-svg" viewBox="0 0 1200 800" preserveAspectRatio="none">
    {links.map((l,i)=>{
      const a=find(l.from); const b=find(l.to);
      const path = `M ${a.x+120} ${a.y+48} C ${a.x+200} ${a.y+48} ${b.x-80} ${b.y+48} ${b.x} ${b.y+48}`;
      const isActive = !!(activeFlags && activeFlags[i]);
      return <g key={i} className={`conn-group ${isActive? 'active': ''}`}>
        {/* blurred glow layer */}
        <path className={`flow-glow ${isActive? 'glow-on':''}`} d={path} fill="none" strokeWidth={10} stroke="url(#grad-neon)" strokeOpacity={isActive?0.28:0.06} />
        {/* main animating path */}
        <motion.path className={`flow-path ${isActive? 'active':''}`} d={path} fill="none" strokeWidth={3} stroke="url(#grad-neon)" strokeOpacity={0.95}
          initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.0, delay:i*0.12}} />
        <motion.circle className="conn-target" cx={b.x} cy={b.y+48} r={6} fill="rgba(255,255,255,0.9)" initial={{scale:0}} animate={{scale:1}} transition={{delay:0.3+i*0.12}} />
      </g>
    })}
    <defs>
      <linearGradient id="grad-neon" x1="0%" x2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="45%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
}
