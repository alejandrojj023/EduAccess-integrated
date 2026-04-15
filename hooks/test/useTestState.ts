"use client";

import { useState, useCallback, useEffect } from 'react';
import { TestResult, TestSummary, createTestResult, calculateTestSummary } from '@/utils/test/scoring';

export type TestModule = 'visual' | 'auditivo' | null;
export type TestStep = 'intro' | 'visual' | 'auditivo' | 'results' | 'completed';

interface TestState {
  currentStep: TestStep;
  currentModule: TestModule;
  currentActivity: number;
  results: TestResult[];
  startTime: number;
  moduleStartTime: number;
  activityStartTime: number;
  isCompleted: boolean;
  modulesToRun: ('visual' | 'auditivo')[]; // Track which modules to run
}

export function useTestState() {
  const [state, setState] = useState<TestState>({
    currentStep: 'intro',
    currentModule: null,
    currentActivity: 0,
    results: [],
    startTime: Date.now(),
    moduleStartTime: 0,
    activityStartTime: 0,
    isCompleted: false,
    modulesToRun: ['visual', 'auditivo']
  });

  const startTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'visual',
      currentModule: 'visual',
      currentActivity: 0,
      startTime: Date.now(),
      moduleStartTime: Date.now(),
      activityStartTime: Date.now(),
      modulesToRun: ['visual', 'auditivo']
    }));
  }, []);

  const startVisualTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'visual',
      currentModule: 'visual',
      currentActivity: 0,
      startTime: Date.now(),
      moduleStartTime: Date.now(),
      activityStartTime: Date.now(),
      modulesToRun: ['visual']
    }));
  }, []);

  const startAuditivoTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'auditivo',
      currentModule: 'auditivo',
      currentActivity: 0,
      startTime: Date.now(),
      moduleStartTime: Date.now(),
      activityStartTime: Date.now(),
      modulesToRun: ['auditivo']
    }));
  }, []);

  const nextActivity = useCallback(() => {
    setState(prev => {
      const nextActivity = prev.currentActivity + 1;
      
      if (prev.currentModule === 'visual' && nextActivity >= 3) {
        // Check if auditivo is in the modules to run
        if (prev.modulesToRun.includes('auditivo')) {
          return {
            ...prev,
            currentStep: 'auditivo',
            currentModule: 'auditivo',
            currentActivity: 0,
            moduleStartTime: Date.now(),
            activityStartTime: Date.now()
          };
        } else {
          // No more modules, go to results
          return {
            ...prev,
            currentStep: 'results',
            currentModule: null,
            currentActivity: 0
          };
        }
      }
      
      if (prev.currentModule === 'auditivo' && nextActivity >= 3) {
        return {
          ...prev,
          currentStep: 'results',
          currentModule: null,
          currentActivity: 0
        };
      }
      
      return {
        ...prev,
        currentActivity: nextActivity,
        activityStartTime: Date.now()
      };
    });
  }, []);

  const addResult = useCallback((result: TestResult) => {
    setState(prev => ({
      ...prev,
      results: [...prev.results, result]
    }));
  }, []);

  const completeTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'completed',
      isCompleted: true
    }));
  }, []);

  const resetTest = useCallback(() => {
    setState({
      currentStep: 'intro',
      currentModule: null,
      currentActivity: 0,
      results: [],
      startTime: Date.now(),
      moduleStartTime: 0,
      activityStartTime: 0,
      isCompleted: false,
      modulesToRun: ['visual', 'auditivo']
    });
  }, []);

  const getTestSummary = useCallback((): TestSummary => {
    return calculateTestSummary(state.results);
  }, [state.results]);

  const getCurrentActivityTime = useCallback(() => {
    return Date.now() - state.activityStartTime;
  }, [state.activityStartTime]);

  return {
    state,
    startTest,
    startVisualTest,
    startAuditivoTest,
    nextActivity,
    addResult,
    completeTest,
    resetTest,
    getTestSummary,
    getCurrentActivityTime
  };
}
