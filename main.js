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

  // 3) Determine final username and possibly avatar
  let finalUsername = "Player"; // default if nothing else found

  // Check if we're inside Telegram WebApp
  if (window.Telegram && Telegram.WebApp) {
    // Expand the web app if you want
    Telegram.WebApp.expand();

    // 3A) Scale the game if stable viewport < 740
    const stableH = Telegram.WebApp.viewportStableHeight;
    if (stableH && stableH < 740) {
      const scaleFactor = stableH / 740;
      const wrapper = document.getElementById("gameWrapper");
      wrapper.style.transformOrigin = "top left"; // ensure scaling from top-left
      wrapper.style.transform = `scale(${scaleFactor})`;
    }

    // 3B) Read user data
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user) {
      finalUsername = user.username || user.first_name || "Player";
      if (user.photo_url) {
        const avatarImg = document.getElementById("userAvatar");
        if (avatarImg) {
          avatarImg.src = user.photo_url;
        }
      }
    }
  } else {
    // If not inside Telegram, fallback to URL param ?username=...
    const urlParams = new URLSearchParams(window.location.search);
    finalUsername = urlParams.get('username') || "Player";
  }

  // 4) Build the telegramData object
  const telegramData = { username: finalUsername };
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