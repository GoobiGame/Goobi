// main.js
import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) Audio setup (same as before)
  const audioManager = new AudioManager('assets/themeMusic.wav');
  audioManager.play().catch((err) => {
    console.log('Autoplay was blocked:', err);
  });
  
  const muteButton = document.getElementById('muteButton');
  muteButton.addEventListener('click', () => {
    audioManager.toggleMute();
    muteButton.textContent = audioManager.isMuted() ? 'Sound OFF' : 'Sound ON';
    muteButton.blur();
  });

  // 2) Prevent pinch-zoom, context menu, etc. (same as before)
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
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 3) Parse URL params for inline_message_id and user_id
  const urlParams = new URLSearchParams(window.location.search);
  const inlineMessageId = urlParams.get('inline_message_id');
  const userId = urlParams.get('user_id');
  const username = urlParams.get('username') || 'Player';

  // 4) Build the telegramData object
  const telegramData = {
    userId: userId,
    username: username,
    inlineMessageId: inlineMessageId
  };
  console.log("Telegram Data:", telegramData);

  // 5) Start Screen Logic
  if (sessionStorage.getItem("skipStartScreen") === "true") {
    startGame(telegramData);
  } else {
    const startScreen = document.getElementById("startScreen");
    const startVideo = document.getElementById("startVideo");
    const startButton = document.getElementById("startButton");
    startScreen.style.display = "flex";

    if (startVideo) {
      startVideo.play().catch(err => console.log("startVideo play error:", err));
    }

    startButton.addEventListener("click", () => {
      sessionStorage.setItem("skipStartScreen", "true");
      startScreen.style.display = "none";
      audioManager.play().catch((err) => console.log('User start -> still blocked?', err));
      startGame(telegramData);
    });
  }
});