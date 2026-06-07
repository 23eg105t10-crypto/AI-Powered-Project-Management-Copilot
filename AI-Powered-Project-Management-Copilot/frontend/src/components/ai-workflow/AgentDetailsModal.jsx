import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import AgentDetailContent from './AgentDetailContent';

export default function AgentDetailsModal({ agent, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !agent) return null;

  const out = agent.output || {};

  return (
    <div className="modal-backdrop agent-modal-backdrop" onClick={onClose} role="presentation">
      <motion.div
        className="agent-details-modal modal-card"
        onClick={e => e.stopPropagation()}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-details-title"
      >
        <div className="agent-details-header">
          <div>
            <h3 id="agent-details-title" className="font-bold">
              {agent.name}
            </h3>
            <div className="small-muted mt-1">Confidence: {agent.confidence ?? '—'}%</div>
          </div>
          <button type="button" className="btn muted agent-details-close" onClick={onClose} aria-label="Close">
            <X size={18} />
            Close
          </button>
        </div>

        <div className="agent-details-content">
          <AgentDetailContent agentName={agent.name} output={out} />
        </div>
      </motion.div>
    </div>
  );
}
