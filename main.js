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

  // 3) Parse URL params for username
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('username') || 'Player';

  // 4) Check if inside Telegram WebApp, set user avatar if available
  if (window.Telegram && Telegram.WebApp) {
    // Expand the web app if you want
    Telegram.WebApp.expand();
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user && user.photo_url) {
      const avatarImg = document.getElementById("userAvatar");
      avatarImg.src = user.photo_url;
    }
  }

  // 5) Build the telegramData object
  const telegramData = { username };
  console.log("Telegram Data:", telegramData);

  // 6) Start Screen Logic
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