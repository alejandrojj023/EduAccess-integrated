// Audio utilities for test module
// Uses Web Audio API for sounds and Web Speech API for voice

class AudioManager {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private synth: SpeechSynthesis | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private getSpeechSynthesis(): SpeechSynthesis {
    if (!this.synth) {
      this.synth = window.speechSynthesis;
    }
    return this.synth;
  }

  /**
   * Play a simple tone
   */
  async playTone(frequency: number, duration: number = 1000): Promise<void> {
    const ctx = this.getAudioContext();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = frequency;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
    
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }

  /**
   * Play a sequence of tones
   */
  async playSequence(frequencies: number[], duration: number = 500): Promise<void> {
    for (const freq of frequencies) {
      await this.playTone(freq, duration);
      // Small gap between notes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Play a pitch pattern (up or down) with voice
   */
  async playPitchPattern(directions: ('up' | 'down')[], startFreq: number = 440): Promise<void> {
    // For voice version, announce the pattern using Spanish words
    const words = directions.map(d => d === 'up' ? 'sube' : 'baja');
    const patternText = words.join(', ');
    await this.speak(patternText);
  }

  /**
   * Play a sequence with custom durations
   */
  private async playSequenceWithDurations(
    frequencies: number[], 
    durations: number[]
  ): Promise<void> {
    for (let i = 0; i < frequencies.length; i++) {
      const freq = frequencies[i];
      const duration = durations[i] || 500;
      
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = freq;
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'; // Vary waveform for variety
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
      
      await new Promise(resolve => setTimeout(resolve, duration + 100));
    }
  }

  /**
   * Play a specific sound by name (for Activity B1) - Uses voice synthesis
   */
  async playSound(soundName: string): Promise<void> {
    // Map sound names to Spanish words
    const soundMap: { [key: string]: string } = {
      gato: "Gato",
      auto: "Automóvil",
      olas: "Olas",
      campana: "Campana",
      manzana: "Manzana",
      musica: "Música",
    };

    const word = soundMap[soundName] || "Sonido";
    await this.speak(word);
  }

  /**
   * Speak text using Web Speech API
   */
  async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      const synth = this.getSpeechSynthesis();
      
      // Cancel any ongoing speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES'; // Spanish language
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        resolve(); // Resolve even on error
      };

      synth.speak(utterance);
    });
  }

  /**
   * Play random sequence of sounds for Activity B2
   */
  async playRandomSequence(soundNames: string[], duration: number = 500): Promise<void> {
    // Map emoji/sound names to Spanish words
    const nameMap: { [key: string]: string } = {
      gato: "Gato",
      auto: "Automóvil",
      olas: "Olas",
      campana: "Campana",
      manzana: "Manzana",
      musica: "Música",
      '🐱': "Gato",
      '🐶': "Perro",
      '🔔': "Campana",
      '🎵': "Música",
      '🌊': "Olas",
      '🌧️': "Lluvia",
      '🚗': "Auto",
      '✈️': "Avión",
      '📱': "Teléfono",
      '⏰': "Reloj",
    };

    // Collect words for the sequence
    const words = soundNames.map(name => nameMap[name] || name);
    const sequenceText = words.join(', ');
    
    await this.speak(sequenceText);
  }

  /**
   * Stop any playing audio
   */
  stop(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // Already stopped
      }
    }
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

/**
 * Request user permissions for audio (if needed)
 */
export async function requestAudioPermission(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      // AudioContext doesn't need permissions for playback
      return true;
    }
    // For future voice recording features
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Audio permission denied:', error);
    return false;
  }
}
