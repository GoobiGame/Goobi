import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

/**
 * Dynamically scale the 400×740 game so it fits within the viewport.
 */
function scaleGame() {
  const gameWrapper = document.getElementById('gameWrapper');
  const gameWidth = 400;
  const gameHeight = 740;

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.viewportStableHeight) {
    viewportHeight = Telegram.WebApp.viewportStableHeight;
  }

  const scaleX = viewportWidth / gameWidth;
  const scaleY = viewportHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);

  gameWrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Re-scale on load and when the window resizes
window.addEventListener('resize', scaleGame);

/**
 * We'll store the last-generated share card data URL here so we don't
 * have to regenerate every time the user clicks "Share Score".
 */
window.shareCardDataURL = null;

/**
 * A helper to draw text **centered horizontally** at a given (y) coordinate.
 */
function drawCenteredText(ctx, text, y, font, fillStyle) {
  ctx.font = font;
  ctx.fillStyle = fillStyle;

  const measure = ctx.measureText(text);
  const textWidth = measure.width;

  // We'll center it at (canvas.width / 2)
  const centerX = ctx.canvas.width / 2;
  const x = centerX - textWidth / 2;

  ctx.fillText(text, x, y);
}

/**
 * Creates a 1920×1080 share card image with your `card.png` as the background.
 * Then draws the player's username + score centered ~1/4 from top.
 * If new personal high score, we show that in red above it.
 * Returns a Promise that resolves to a dataURL string: "data:image/png;base64,..."
 */
function generateShareCardDataURL() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Load your card.png from the assets folder
    const bgImg = new Image();
    bgImg.src = 'assets/card.png';

    bgImg.onload = () => {
      // 1) Draw the card.png as the background
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // 2) Gather user data (name, score, high score)
      const username = window.telegramData?.username || 'Player';
      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;

      // We'll place the main text about 1/4 from top: ~1080 * 0.25 = 270
      // The "New Personal High Score!" line will be 60px above it if needed
      const mainLineY = 270;
      const highScoreLineY = mainLineY - 120;

      // 3) If new personal high score, draw it first in red
      if (newHigh) {
        drawCenteredText(ctx, 'New Personal High Score!', highScoreLineY, '100px sans-serif', 'red');
      }

      // 4) Draw the main line: "@username - Score: 1251" in white
      const mainLine = `@${username} - Score: ${finalScore}`;
      drawCenteredText(ctx, mainLine, mainLineY, '100px sans-serif', 'white');

      // 5) Convert to dataURL
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };

    bgImg.onerror = (err) => {
      console.error('Failed to load card.png background:', err);

      // If card.png fails to load, we’ll just fill black as a fallback
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Then draw the text anyway
      const username = window.telegramData?.username || 'Player';
      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;

      const mainLineY = 270;
      const highScoreLineY = mainLineY - 60;

      if (newHigh) {
        drawCenteredText(ctx, 'New Personal High Score!', highScoreLineY, '60px sans-serif', 'red');
      }

      const mainLine = `@${username} - Score: ${finalScore}`;
      drawCenteredText(ctx, mainLine, mainLineY, '80px sans-serif', 'white');

      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
  });
}

/**
 * Called at game-over. Generates the share card, puts it in #shareCardPreview,
 * and stores it globally in window.shareCardDataURL for later sharing.
 */
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
 * The main share function. Instead of copying to clipboard, we use the Web Share API
 * to show the device's share sheet (where supported).
 */
async function shareScoreCard() {
  try {
    // Generate if we haven't already
    if (!window.shareCardDataURL) {
      window.shareCardDataURL = await generateShareCardDataURL();
    }
    const dataURL = window.shareCardDataURL;

    // Convert dataURL -> Blob -> File -> navigator.share
    const blob = await new Promise((resolve) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempImg.width;
        tempCanvas.height = tempImg.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(tempImg, 0, 0);
        tempCanvas.toBlob((b) => resolve(b), 'image/png');
      };
      tempImg.onerror = () => {
        resolve(null);
      };
      tempImg.src = dataURL;
    });

    if (!blob) {
      throw new Error('Failed to create blob from share card.');
    }

    const file = new File([blob], 'score.png', { type: 'image/png' });

    // For the share text, let's mention the user & score
    const username = window.telegramData?.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `Check out my Goobi score! @${username} - Score: ${finalScore}`;

    // Check if the device can share files
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      alert('Sharing not supported on this device or browser.');
      return;
    }

    await navigator.share({
      files: [file],
      title: 'My Goobi Score',
      text: shareText
    });

    console.log('Share completed successfully!');
  } catch (err) {
    // iOS or some in-app browsers often return "AbortError", "NotAllowedError",
    // "SecurityError", etc. after a successful share.
    console.log('Share error details:', err);

    const ignoredErrors = ['AbortError', 'NotAllowedError', 'SecurityError', 'UnknownError'];
    if (ignoredErrors.includes(err.name)) {
      console.log('User canceled or share completed, ignoring...');
    } else {
      console.error('Share error:', err);
      alert('Sorry, sharing is not supported in this environment.');
    }
  }
}

// ----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  scaleGame();

  // 1) Audio
  const audioManager = new AudioManager('assets/themeMusic.wav');
  audioManager.play().catch((err) => {
    console.log('Autoplay blocked:', err);
  });

  const muteButton = document.getElementById('muteButton');
  muteButton.addEventListener('click', () => {
    audioManager.toggleMute();
    muteButton.textContent = audioManager.isMuted() ? 'Sound OFF' : 'Sound ON';
    muteButton.blur();
  });

  // 2) Prevent pinch-zoom, etc.
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

  // 3) Telegram user data
  let finalUsername = 'Player';
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.expand();
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user) {
      finalUsername = user.username || user.first_name || 'Player';
      if (user.photo_url) {
        // If you want to show the user’s avatar in the header:
        const headerAvatar = document.getElementById('userAvatar');
        if (headerAvatar) {
          headerAvatar.src = user.photo_url;
        }
      }
    }
  } else {
    // Fallback if not in Telegram
    const urlParams = new URLSearchParams(window.location.search);
    finalUsername = urlParams.get('username') || 'Player';
  }

  window.telegramData = { username: finalUsername };
  console.log('Telegram Data:', window.telegramData);

  // 4) Start Screen
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
      startGame(window.telegramData);
    });
  }

  // 5) Hook up the "Share Score" button
  const shareScoreButton = document.getElementById('shareScoreButton');
  if (shareScoreButton) {
    shareScoreButton.addEventListener('click', shareScoreCard);
  }
});