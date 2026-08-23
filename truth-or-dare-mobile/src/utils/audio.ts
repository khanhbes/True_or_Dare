/**
 * Sound and Music controller for Mobile using expo-audio and haptics.
 */
import { setAudioModeAsync, createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { haptics } from './haptics';

class SoundEngine {
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicPlayer: AudioPlayer | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    if (this.isInitialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      });
      this.isInitialized = true;
    } catch {
      // Audio mode fallback
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    haptics.selection();
    if (this.isMuted && this.musicPlayer) {
      try {
        this.musicPlayer.pause();
      } catch {}
    } else if (!this.isMuted && this.isMusicPlaying && this.musicPlayer) {
      try {
        this.musicPlayer.play();
      } catch {}
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playCardFlip() {
    haptics.medium();
  }

  public playShuffle() {
    haptics.light();
  }

  public playComplete() {
    haptics.success();
  }

  public playSkip() {
    haptics.warning();
  }

  public playGarmentRemoved() {
    haptics.heavy();
  }

  public toggleAmbientMusic(): boolean {
    this.isMusicPlaying = !this.isMusicPlaying;
    haptics.selection();
    if (this.musicPlayer) {
      try {
        if (this.isMusicPlaying && !this.isMuted) {
          this.musicPlayer.play();
        } else {
          this.musicPlayer.pause();
        }
      } catch {}
    }
    return this.isMusicPlaying;
  }

  public isMusicActive(): boolean {
    return this.isMusicPlaying;
  }
}

export const soundEngine = new SoundEngine();
