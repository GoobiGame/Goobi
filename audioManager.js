// audioManager.js
export class AudioManager {
  constructor(src) {
    // Create an HTMLAudioElement
    this.audio = new Audio(src);
    this.audio.loop = true;

    // By default, let's start unmuted
    this.audio.muted = false;
    this.isCurrentlyMuted = false;
  }

  play() {
    // Attempt to play the audio
    return this.audio.play();
  }

  mute() {
    this.audio.muted = true;
    this.isCurrentlyMuted = true;
  }

  unmute() {
    this.audio.muted = false;
    this.isCurrentlyMuted = false;
  }

  toggleMute() {
    if (this.isCurrentlyMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  isMuted() {
    return this.isCurrentlyMuted;
  }
}