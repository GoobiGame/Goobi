// main.js
import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) Create our AudioManager, which starts unmuted
  const audioManager = new AudioManager('assets/themeMusic.wav');

  // 2) Attempt to play the music immediately (autoplay might block)
  audioManager.play().catch((err) => {
    console.log('Autoplay was blocked:', err);
  });

  // 3) Mute/Unmute button
  const muteButton = document.getElementById('muteButton');
  muteButton.addEventListener('click', () => {
    audioManager.toggleMute();
  
    // Update button text
    if (audioManager.isMuted()) {
      muteButton.textContent = 'Sound OFF';
    } else {
      muteButton.textContent = 'Sound ON';
    }
  
    // **Remove focus** so the Space bar won't re-click the button
    muteButton.blur();
  });
  
  // 4) Basic iOS/Android pinch-zoom prevention, context menu disable, etc.
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

  // 5) Start Screen Logic
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
      // In case autoplay was blocked, try again after user interaction
      audioManager.play().catch((err) => console.log('User start -> still blocked?', err));
      startGame();
    });
  }
});