import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');

  // We remove Telegram.WebApp references. Instead, just do a normal scale on load
  scaleGame();

  // Audio setup
  const audioManager = new AudioManager('assets/themeMusic.wav');
  audioManager.play().catch((err) => {
    console.log('Autoplay blocked:', err);
  });

  // Mute button
  const muteButton = document.getElementById('muteButton');
  muteButton.addEventListener('click', () => {
    audioManager.toggleMute();
    muteButton.textContent = audioManager.isMuted() ? '🔇' : '🔊';
    muteButton.blur();
  });

  // Prevent default gestures and context menus
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // We no longer detect Telegram user data. Default to "Player"
  // If you want to store the user's name or photo, you'd do so via the Game Bot approach
  window.telegramData = { username: 'Player' };
  console.log('Telegram Data defaulted to Player');

  // Start screen logic
  if (sessionStorage.getItem('skipStartScreen') === 'true') {
    startGame(window.telegramData);
  } else {
    const startScreen = document.getElementById('startScreen');
    const startVideo = document.getElementById('startVideo');
    const startButton = document.getElementById('startButton');
    startScreen.style.display = 'flex';

    if (startVideo) {
      startVideo.play().catch(err => console.log('startVideo play error:', err));
    }

    startButton.addEventListener('click', () => {
      sessionStorage.setItem('skipStartScreen', 'true');
      startScreen.style.display = 'none';
      audioManager.play().catch(err => console.log('User start -> still blocked?', err));
      if (startVideo) {
        startVideo.play().catch(err => console.log('startVideo user-gesture error:', err));
      }
      startGame(window.telegramData);
    });
  }

  // Share to Telegram button
  const shareToChatButton = document.getElementById('shareToChatButton');
  if (shareToChatButton) {
    shareToChatButton.addEventListener('click', shareScoreToChat);
  }
});

/**
 * Scales the #gameWrapper to fit the screen
 */
function scaleGame() {
  const gameWrapper = document.getElementById('gameWrapper');
  const gameWidth = 400;
  const gameHeight = 740;

  // Just do normal viewport detection
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  // We remove Telegram.WebApp.viewportStableHeight references
  const scaleX = viewportWidth / gameWidth;
  const scaleY = viewportHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);

  gameWrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener('resize', scaleGame);

/* share card logic remains the same if you want the scoreboard preview, etc. */

function drawCenteredText(ctx, text, y, font, fillStyle) {
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  const measure = ctx.measureText(text);
  const textWidth = measure.width;
  const centerX = ctx.canvas.width / 2;
  const x = centerX - textWidth / 2;
  ctx.fillText(text, x, y);
}

function generateShareCardDataURL() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const bgImg = new Image();
    bgImg.src = 'assets/card.png';

    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      const username = window.telegramData?.username || 'Player';
      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;

      const pfpSize = 200;
      const pfpX = (canvas.width - pfpSize) / 2;
      const pfpY = 50;

      // We'll just use a fallback avatar, since we can't fetch Telegram user photo
      const pfpImg = new Image();
      pfpImg.src = 'assets/avatarFallback.png'; 
      pfpImg.onload = () => {
        ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);
        renderText();
      };
      pfpImg.onerror = () => {
        console.error('Failed to load fallback avatar');
        renderText();
      };

      function renderText() {
        const mainLineY = pfpY + pfpSize + 70;
        if (newHigh) {
          drawCenteredText(ctx, 'New Personal High Score!', mainLineY - 120, '100px sans-serif', 'red');
        }
        const mainLine = `@${username} - Score: ${finalScore}`;
        drawCenteredText(ctx, mainLine, mainLineY, '100px sans-serif', 'white');

        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      }
    };

    bgImg.onerror = (err) => {
      console.error('Failed to load card.png background:', err);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const username = window.telegramData?.username || 'Player';
      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;
      const mainLineY = 270;

      if (newHigh) {
        drawCenteredText(ctx, 'New Personal High Score!', mainLineY - 60, '60px sans-serif', 'red');
      }
      const mainLine = `@${username} - Score: ${finalScore}`;
      drawCenteredText(ctx, mainLine, mainLineY, '80px sans-serif', 'white');

      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
  });
}

window.updateShareCardPreview = async function() {
  try {
    const dataURL = await generateShareCardDataURL();
    window.shareCardDataURL = dataURL;

    const previewImg = document.getElementById('shareCardPreview');
    if (previewImg) {
      previewImg.src = dataURL;
      previewImg.style.display = 'block';
    }
  } catch (err) {
    console.error('Failed to generate share card preview:', err);
  }
};

/**
 * Share button: previously we used Telegram.WebApp.sendData(...)
 * Now we can either do a "mock" share or do nothing 
 */
async function shareScoreToChat() {
  try {
    if (!window.shareCardDataURL) {
      window.shareCardDataURL = await generateShareCardDataURL();
    }
    const username = window.telegramData?.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `@${username} just scored ${finalScore} in Goobi!`;

    // No Telegram.WebApp. We'll just do a normal alert or console
    console.log('Share to chat (mock):', shareText);
    alert(`Shared to chat (mocked): ${shareText}`);
  } catch (err) {
    console.error('Share to chat failed:', err);
    alert('Failed to share to chat (mock).');
  }
}