import React from 'react';
import { formatEvaluationMetrics } from './formatEvaluationMetrics';

function KpiCard({ label, value, progress, badge, badgeTone }) {
  return (
    <div className="eval-kpi-card">
      <div className="eval-kpi-label">{label}</div>
      <div className="eval-kpi-value">{value}</div>
      {badge && <span className={`eval-kpi-badge ${badgeTone || 'neutral'}`}>{badge}</span>}
      {progress != null && (
        <div className="progress-track mt-2">
          <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function EvaluationMetricsCards({ metrics, showOverall = false, compact = false }) {
  const formatted = formatEvaluationMetrics(metrics);

  if (compact) {
    return (
      <div className="eval-kpi-grid eval-kpi-grid-compact">
        <KpiCard label="Accuracy" value={formatted.accuracyPercent} progress={formatted.accuracyValue} />
        <KpiCard label="Relevance" value={formatted.relevancePercent} progress={formatted.relevanceValue} />
        <KpiCard label="Faithfulness" value={formatted.faithfulnessPercent} progress={formatted.faithfulnessValue} />
        <KpiCard label="Feedback" value={formatted.feedbackPercent} progress={formatted.feedbackValue} />
      </div>
    );
  }

  return (
    <div className="eval-metrics-panel">
      {showOverall && (
        <div className="eval-overall-card">
          <div className="eval-kpi-label">Overall Quality Score</div>
          <div className="eval-overall-value">{formatted.overallQualityPercent}</div>
          <div className="progress-track mt-2">
            <div className="progress-fill" style={{ width: `${formatted.overallQualityValue}%` }} />
          </div>
          <span className={`eval-kpi-badge excellent mt-2`}>Status: {formatted.statusLabel}</span>
        </div>
      )}
      <div className="eval-kpi-grid">
        <KpiCard label="Accuracy" value={formatted.accuracyPercent} progress={formatted.accuracyValue} />
        <KpiCard label="Relevance" value={formatted.relevancePercent} progress={formatted.relevanceValue} />
        <KpiCard label="Faithfulness" value={formatted.faithfulnessPercent} progress={formatted.faithfulnessValue} />
        <KpiCard
          label="Hallucination Rate"
          value={formatted.hallucinationPercent}
          progress={formatted.hallucinationValue}
          badge={formatted.hallucinationBadge}
          badgeTone="low"
        />
        <KpiCard
          label="Feedback Score"
          value={formatted.feedbackPercent}
          progress={formatted.feedbackValue}
          badge={formatted.feedbackBadge}
          badgeTone="excellent"
        />
        <KpiCard label="Response Time" value={formatted.latencySeconds} />
        <KpiCard label="Cost Per Request" value={formatted.costFormatted} />
      </div>
    </div>
  );
}

export { formatEvaluationMetrics };
