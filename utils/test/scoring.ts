export interface TestResult {
  moduleId: 'visual' | 'auditivo';
  activityId: string;
  score: number;
  maxScore: number;
  timeSpent: number;
  errors: number;
  warnings: number;
}

export interface TestSummary {
  visual: {
    totalErrors: number;
    totalWarnings: number;
    activities: TestResult[];
  };
  auditivo: {
    totalErrors: number;
    totalWarnings: number;
    activities: TestResult[];
  };
  recommendations: string[];
}

export function calculateTestSummary(results: TestResult[]): TestSummary {
  const visualResults = results.filter(r => r.moduleId === 'visual');
  const auditivoResults = results.filter(r => r.moduleId === 'auditivo');

  const visualErrors = visualResults.reduce((sum, r) => sum + r.errors, 0);
  const visualWarnings = visualResults.reduce((sum, r) => sum + r.warnings, 0);
  
  const auditivoErrors = auditivoResults.reduce((sum, r) => sum + r.errors, 0);
  const auditivoWarnings = auditivoResults.reduce((sum, r) => sum + r.warnings, 0);

  const recommendations: string[] = [];
  
  if (visualErrors >= 2 || visualWarnings >= 3) {
    recommendations.push('ALTA_VISIBILIDAD');
  }
  
  if (auditivoErrors >= 2 || auditivoWarnings >= 3) {
    recommendations.push('APOYO_AUDITIVO');
  }

  return {
    visual: {
      totalErrors: visualErrors,
      totalWarnings: visualWarnings,
      activities: visualResults
    },
    auditivo: {
      totalErrors: auditivoErrors,
      totalWarnings: auditivoWarnings,
      activities: auditivoResults
    },
    recommendations
  };
}

export function createTestResult(
  moduleId: 'visual' | 'auditivo',
  activityId: string,
  score: number,
  maxScore: number,
  timeSpent: number,
  errors: number = 0,
  warnings: number = 0
): TestResult {
  return {
    moduleId,
    activityId,
    score,
    maxScore,
    timeSpent,
    errors,
    warnings
  };
}
