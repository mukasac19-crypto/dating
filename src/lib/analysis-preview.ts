import { getVerdict, type VerdictMeta } from '@/lib/flag-labels';
import type { AnalysisResult } from '@/types';

/**
 * The only analysis data a non-premium user is allowed to see: the headline
 * verdict and how many flags were found. Everything substantive (the flags
 * themselves, evidence, scores, suggested replies, next steps) is withheld so
 * it never reaches the browser until the user upgrades.
 */
export interface AnalysisPreview {
  id: string;
  createdAt: string | Date;
  verdict: VerdictMeta;
  redCount: number;
  greenCount: number;
  criticalCount: number;
}

export function buildAnalysisPreview(analysis: AnalysisResult): AnalysisPreview {
  const flags = analysis.flags || [];
  return {
    id: analysis.id,
    createdAt: analysis.createdAt,
    verdict: getVerdict(analysis),
    redCount: flags.filter((f) => f.type === 'red').length,
    greenCount: flags.filter((f) => f.type === 'green').length,
    criticalCount: flags.filter(
      (f) => f.severity === 'critical' || f.safetyLevel === 'immediate_danger'
    ).length,
  };
}
