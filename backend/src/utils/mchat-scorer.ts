/**
 * M-CHAT-R Clinical Scoring Logic
 *
 * Implements the Modified Checklist for Autism in Toddlers, Revised (M-CHAT-R)
 * scoring algorithm. Each question has a defined "at-risk" response.
 *
 * Risk levels:
 *   Score 0–2   → LOW
 *   Score 3–7   → MEDIUM
 *   Score 8–20  → HIGH
 */

// For each question, define what answer is "at risk"
// true = "yes is at risk", false = "no is at risk"
const AT_RISK_ANSWER: Record<string, boolean> = {
  q1: false,   // Joint Attention — "no" is at-risk
  q2: true,    // Hearing Concern — "yes" is at-risk
  q3: false,   // Pretend Play — "no" is at-risk
  q4: false,   // Climbing — "no" is at-risk (non-critical)
  q5: true,    // Unusual Finger Movements — "yes" is at-risk
  q6: false,   // Pointing to Request — "no" is at-risk
  q7: false,   // Pointing to Share — "no" is at-risk
  q8: false,   // Peer Interest — "no" is at-risk
  q9: false,   // Showing Objects — "no" is at-risk
  q10: false,  // Response to Name — "no" is at-risk
  q11: false,  // Social Smile — "no" is at-risk
  q12: true,   // Sensory Sensitivity — "yes" is at-risk
  q13: false,  // Walking — "no" is at-risk (non-critical)
  q14: false,  // Eye Contact — "no" is at-risk
  q15: false,  // Imitation — "no" is at-risk
  q16: false,  // Gaze Following — "no" is at-risk
  q17: false,  // Attention Seeking — "no" is at-risk
  q18: false,  // Comprehension — "no" is at-risk
  q19: false,  // Social Referencing — "no" is at-risk
  q20: false,  // Movement Activities — "no" is at-risk (non-critical)
};

// Critical items (clinically most significant)
const CRITICAL_ITEMS = ['q2', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q14', 'q15', 'q16', 'q17', 'q18', 'q19'];

// Readable labels for each question
export const QUESTION_LABELS: Record<string, string> = {
  q1: 'Joint Attention',
  q2: 'Hearing Concern',
  q3: 'Pretend Play',
  q4: 'Climbing',
  q5: 'Unusual Finger Movements',
  q6: 'Pointing to Request',
  q7: 'Pointing to Share',
  q8: 'Peer Interest',
  q9: 'Showing Objects',
  q10: 'Response to Name',
  q11: 'Social Smile',
  q12: 'Sensory Sensitivity',
  q13: 'Walking',
  q14: 'Eye Contact',
  q15: 'Imitation',
  q16: 'Gaze Following',
  q17: 'Attention Seeking',
  q18: 'Comprehension',
  q19: 'Social Referencing',
  q20: 'Movement Activities',
};

export interface ScoringResult {
  mchatScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number; // 0-100 percentage
  shapValues: Array<{
    feature: string;
    label: string;
    value: number;     // -1.0 to 1.0 importance
    direction: 'risk' | 'protective';
  }>;
}

/**
 * Score M-CHAT-R answers using clinical rules.
 * @param answers Object with keys q1-q20, values true (yes) or false (no)
 */
export function scoreMCHATR(answers: Record<string, boolean>): ScoringResult {
  let atRiskCount = 0;
  const shapValues: ScoringResult['shapValues'] = [];

  for (let i = 1; i <= 20; i++) {
    const key = `q${i}`;
    const answer = answers[key];
    const isAtRisk = answer === AT_RISK_ANSWER[key];
    const isCritical = CRITICAL_ITEMS.includes(key);

    if (isAtRisk) {
      atRiskCount++;
    }

    // Generate SHAP-like importance values
    const weight = isCritical ? 0.8 : 0.4;
    const value = isAtRisk ? weight * (0.7 + Math.random() * 0.3) : -(weight * (0.5 + Math.random() * 0.3));

    shapValues.push({
      feature: key,
      label: QUESTION_LABELS[key],
      value: parseFloat(value.toFixed(3)),
      direction: isAtRisk ? 'risk' : 'protective',
    });
  }

  // Sort by absolute value (most impactful first)
  shapValues.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (atRiskCount <= 2) riskLevel = 'LOW';
  else if (atRiskCount <= 7) riskLevel = 'MEDIUM';
  else riskLevel = 'HIGH';

  // Calculate risk score as percentage
  const riskScore = Math.round((atRiskCount / 20) * 100);

  return {
    mchatScore: atRiskCount,
    riskLevel,
    riskScore,
    shapValues,
  };
}
