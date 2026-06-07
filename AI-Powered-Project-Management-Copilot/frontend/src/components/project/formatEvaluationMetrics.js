const SKIP_KEYS = new Set(['notes', 'note', 'comment', 'comments', 'description']);

const parseNumber = value => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

/** 0.86 → 86, "91%" → 91, 86 → 86 */
export const toPercentValue = (value, { fromDecimal = true, scaleMax = null } = {}) => {
  const str = String(value ?? '').trim();
  if (!str) return 0;
  if (str.includes('%')) {
    const n = parseNumber(str.replace('%', ''));
    return n == null ? 0 : Math.min(100, Math.round(n));
  }
  const slashMatch = str.match(/([\d.]+)\s*\/\s*([\d.]+)/);
  if (slashMatch) {
    const num = Number(slashMatch[1]);
    const den = Number(slashMatch[2]) || scaleMax || 5;
    if (!Number.isNaN(num) && den > 0) {
      return Math.min(100, Math.round((num / den) * 100));
    }
  }
  const n = parseNumber(str);
  if (n == null) return 0;
  if (scaleMax && n <= scaleMax && n > 1) {
    return Math.min(100, Math.round((n / scaleMax) * 100));
  }
  if (fromDecimal && n > 0 && n <= 1) {
    return Math.min(100, Math.round(n * 100));
  }
  return Math.min(100, Math.round(n));
};

const formatCost = value => {
  const n = parseNumber(value);
  if (n == null) {
    const s = String(value || '').trim();
    return s.startsWith('$') ? s : '$0.00';
  }
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
};

const formatLatency = (metrics = {}) => {
  const ms =
    parseNumber(metrics.latencyMs) ??
    parseNumber(metrics.latency) ??
    (() => {
      const s = String(metrics.latency || '');
      const m = s.match(/([\d.]+)\s*ms/i);
      return m ? Number(m[1]) : null;
    })();
  if (ms == null) return '—';
  const seconds = ms / 1000;
  const label = seconds === 1 ? '1 Second' : `${seconds.toFixed(2)} Seconds`;
  return label;
};

const qualityStatus = score => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  return 'Needs Improvement';
};

const hallucinationBadge = pct => {
  if (pct <= 10) return 'Low Risk';
  if (pct <= 20) return 'Medium Risk';
  return 'High Risk';
};

const feedbackBadge = pct => {
  if (pct >= 90) return 'Excellent';
  if (pct >= 75) return 'Good';
  return 'Fair';
};

/**
 * @param {Record<string, unknown>} metrics
 * @returns formatted evaluation metrics for UI
 */
export function formatEvaluationMetrics(metrics = {}) {
  const raw = { ...metrics };
  Object.keys(raw).forEach(key => {
    if (SKIP_KEYS.has(key)) delete raw[key];
  });

  const accuracyValue = toPercentValue(raw.accuracy);
  const relevanceValue = toPercentValue(raw.relevance);
  const faithfulnessValue = toPercentValue(raw.faithfulness);
  const hallucinationValue = toPercentValue(raw.hallucinationRate ?? raw.hallucination);
  const feedbackValue = toPercentValue(raw.feedbackScore ?? raw.feedback, {
    fromDecimal: false,
    scaleMax: 5
  });

  const coreScores = [accuracyValue, relevanceValue, faithfulnessValue].filter(n => n > 0);
  const overallQualityValue = coreScores.length
    ? Math.round(coreScores.reduce((a, b) => a + b, 0) / coreScores.length)
    : 0;

  return {
    accuracyPercent: `${accuracyValue}%`,
    relevancePercent: `${relevanceValue}%`,
    faithfulnessPercent: `${faithfulnessValue}%`,
    hallucinationPercent: `${hallucinationValue}%`,
    feedbackPercent: `${feedbackValue}%`,
    latencySeconds: formatLatency(raw),
    costFormatted: formatCost(raw.costPerRequest ?? raw.cost),
    accuracyValue,
    relevanceValue,
    faithfulnessValue,
    hallucinationValue,
    feedbackValue,
    overallQualityPercent: `${overallQualityValue}%`,
    overallQualityValue,
    statusLabel: qualityStatus(overallQualityValue),
    hallucinationBadge: hallucinationBadge(hallucinationValue),
    feedbackBadge: feedbackBadge(feedbackValue)
  };
}

export function buildEvaluationReportLines(metrics = {}) {
  const f = formatEvaluationMetrics(metrics);
  return [
    'Evaluation Summary',
    '',
    `Overall Quality Score: ${f.overallQualityPercent}`,
    `Accuracy: ${f.accuracyPercent}`,
    `Relevance: ${f.relevancePercent}`,
    `Faithfulness: ${f.faithfulnessPercent}`,
    `Hallucination Rate: ${f.hallucinationPercent}`,
    `Feedback Score: ${f.feedbackPercent}`,
    `Response Time: ${f.latencySeconds}`,
    `Cost Per Request: ${f.costFormatted}`,
    `Status: ${f.statusLabel}`
  ];
}
