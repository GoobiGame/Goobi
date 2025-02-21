import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

/**
 * Dynamically scale the gameWrapper so the fixed 400×740 game fits
 * within the available viewport and stays centered.
 */
function scaleGame() {
  const gameWrapper = document.getElementById('gameWrapper');
  const gameWidth = 400;
  const gameHeight = 740;

  // Use window dimensions (or Telegram's stable height if available)
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.viewportStableHeight) {
    viewportHeight = Telegram.WebApp.viewportStableHeight;
  }

  // Calculate the scale factors and choose the smaller one
  const scaleX = viewportWidth / gameWidth;
  const scaleY = viewportHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);

  // Update transform: keep translate(-50%, -50%) to center, then scale.
  gameWrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Update scaling when the window resizes
window.addEventListener('resize', scaleGame);

document.addEventListener('DOMContentLoaded', () => {
  scaleGame();

  // 1) Audio initialization
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

  // 2) Prevent pinch-zoom, context menu, etc.
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

  // 3) Telegram user data
  let finalUsername = "Player";
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.expand();
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
    // Fallback if not in Telegram
    const urlParams = new URLSearchParams(window.location.search);
    finalUsername = urlParams.get('username') || "Player";
  }
  const telegramData = { username: finalUsername };
  console.log("Telegram Data:", telegramData);

  // 4) Start screen logic (unchanged from your original game logic)
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