export class AudioManager {
  constructor(src) {
    // Create an HTMLAudioElement
    this.audio = new Audio(src);
    this.audio.loop = true;
    // Set the default volume to 1 (100%)
    this.audio.volume = 1;
  }

  play() {
    return this.audio.play();
  }

  setVolume(normalizedVolume) {
    // Set the volume directly (expects a value between 0 and 1)
    this.audio.volume = normalizedVolume;
  }

  getVolume() {
    return this.audio.volume;
  }
}