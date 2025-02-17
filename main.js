import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  // Create the AudioManager with no extra base volume; default starting volume is set by the file.
  const audioManager = new AudioManager('assets/themeMusic.wav');
  
  // Try to play the theme music immediately.
  // If autoplay is blocked, it will start upon user interaction.
  audioManager.play().catch((e) => {
    console.log('Autoplay prevented; music will start on user interaction.', e);
  });

  // Setup the volume slider to control the audio level.
  const volumeSlider = document.getElementById("volumeSlider");
  if (volumeSlider) {
    volumeSlider.value = audioManager.getVolume();
    volumeSlider.addEventListener("input", (e) => {
      const normalizedVolume = parseFloat(e.target.value);
      audioManager.setVolume(normalizedVolume);
    });
  }

  // Prevent default behaviors (zoom, context menus, etc.)
  const canvas = document.getElementById("gameCanvas");
  if (canvas) {
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // Start Screen Logic
  if (sessionStorage.getItem("skipStartScreen") === "true") {
    startGame();
  } else {
    const startScreen = document.getElementById("startScreen");
    const startVideo = document.getElementById("startVideo");
    const startButton = document.getElementById("startButton");
    startScreen.style.display = "flex";
    startVideo.play();
    startButton.addEventListener("click", () => {
      sessionStorage.setItem("skipStartScreen", "true");
      startScreen.style.display = "none";
      // Try playing the audio again on user interaction.
      audioManager.play();
      startGame();
    });
  }
});