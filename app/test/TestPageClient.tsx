"use client";

import { TestContainer } from '@/components/test/TestContainer';
import { accessibilityManager } from '@/utils/test/accessibilityConfig';
import { useEffect } from 'react';

export default function TestPageClient() {
  useEffect(() => {
    // Apply any existing accessibility settings when page loads
    const settings = accessibilityManager.getSettings();
    accessibilityManager.applySettings();
  }, []);

  return (
    <div className="min-h-screen">
      <TestContainer />
    </div>
  );
}