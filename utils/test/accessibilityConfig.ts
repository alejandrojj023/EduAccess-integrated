export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  audioSupport: boolean;
  visualAids: boolean;
  subtitles: boolean;
  repeatAudio: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  audioSupport: false,
  visualAids: false,
  subtitles: false,
  repeatAudio: false
};

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private settings: AccessibilitySettings;
  private listeners: ((settings: AccessibilitySettings) => void)[] = [];

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  private loadSettings(): AccessibilitySettings {
    if (typeof window === 'undefined') return DEFAULT_ACCESSIBILITY_SETTINGS;
    
    try {
      const saved = localStorage.getItem('accessibilitySettings:v1');
      return saved ? { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...JSON.parse(saved) } : DEFAULT_ACCESSIBILITY_SETTINGS;
    } catch {
      return DEFAULT_ACCESSIBILITY_SETTINGS;
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('accessibilitySettings:v1', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applySettings();
    this.notifyListeners();
  }

  public applyRecommendations(recommendations: string[]): void {
    const updates: Partial<AccessibilitySettings> = {};

    recommendations.forEach(rec => {
      switch (rec) {
        case 'ALTA_VISIBILIDAD':
          updates.highContrast = true;
          updates.largeText = true;
          updates.visualAids = true;
          break;
        case 'APOYO_AUDITIVO':
          updates.audioSupport = true;
          updates.subtitles = true;
          updates.repeatAudio = true;
          break;
      }
    });

    this.updateSettings(updates);
  }

  public applySettings(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // High contrast
    if (this.settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (this.settings.largeText) {
      root.style.fontSize = '18px';
      root.classList.add('large-text');
    } else {
      root.style.fontSize = '';
      root.classList.remove('large-text');
    }

    // Visual aids
    if (this.settings.visualAids) {
      root.classList.add('visual-aids');
    } else {
      root.classList.remove('visual-aids');
    }

    // Audio support
    if (this.settings.audioSupport) {
      root.setAttribute('data-audio-support', 'true');
    } else {
      root.removeAttribute('data-audio-support');
    }

    // Subtitles
    if (this.settings.subtitles) {
      root.classList.add('subtitles-enabled');
    } else {
      root.classList.remove('subtitles-enabled');
    }
  }

  public addListener(listener: (settings: AccessibilitySettings) => void): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: (settings: AccessibilitySettings) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public reset(): void {
    this.settings = { ...DEFAULT_ACCESSIBILITY_SETTINGS };
    this.saveSettings();
    this.applySettings();
    this.notifyListeners();
  }

  public isEnabled(feature: keyof AccessibilitySettings): boolean {
    return this.settings[feature];
  }
}

// Export singleton instance
export const accessibilityManager = AccessibilityManager.getInstance();

// CSS classes for accessibility
export const ACCESSIBILITY_CLASSES = {
  HIGH_CONTRAST: 'high-contrast',
  LARGE_TEXT: 'large-text',
  VISUAL_AIDS: 'visual-aids',
  SUBTITLES_ENABLED: 'subtitles-enabled'
};

// Utility functions
export const applyHighContrast = () => {
  accessibilityManager.updateSettings({ highContrast: true });
};

export const applyLargeText = () => {
  accessibilityManager.updateSettings({ largeText: true });
};

export const applyAudioSupport = () => {
  accessibilityManager.updateSettings({ audioSupport: true });
};

export const applySubtitles = () => {
  accessibilityManager.updateSettings({ subtitles: true });
};

export const resetAccessibility = () => {
  accessibilityManager.reset();
};
