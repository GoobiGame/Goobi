import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) If Telegram is available, force it to expand (for full height)
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.expand();

    // 2) Listen for viewport changes (e.g., user drags the mini app up)
    Telegram.WebApp.onEvent('viewportChanged', () => {
      Telegram.WebApp.expand();  // ensure full height again
      scaleGame();               // re-run scaling logic
    });
  }

  // 3) Run scaleGame on load
  scaleGame();

  // 4) Audio
  const audioManager = new AudioManager('assets/themeMusic.wav');
  // We'll do .play() now, but on desktop it may be blocked until user gesture
  audioManager.play().catch((err) => {
    console.log('Autoplay blocked:', err);
  });

  const muteButton = document.getElementById('muteButton');
  muteButton.addEventListener('click', () => {
    audioManager.toggleMute();
    muteButton.textContent = audioManager.isMuted() ? 'Sound OFF' : 'Sound ON';
    muteButton.blur();
  });

  // 5) Prevent pinch-zoom, context menu, etc.
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

  // 6) Telegram user data
  let finalUsername = 'Player';
  if (window.Telegram && Telegram.WebApp) {
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user) {
      finalUsername = user.username || user.first_name || 'Player';
      if (user.photo_url) {
        // Show the user’s avatar in the header (optional)
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

  // 7) Start screen logic
  if (sessionStorage.getItem('skipStartScreen') === 'true') {
    // If skipStartScreen, we immediately start the game
    // Desktop might block startVideo from playing automatically
    startGame(window.telegramData);
  } else {
    const startScreen = document.getElementById('startScreen');
    const startVideo = document.getElementById('startVideo');
    const startButton = document.getElementById('startButton');
    startScreen.style.display = 'flex';

    // Attempt to play the startVideo (desktop may block until user gesture)
    if (startVideo) {
      startVideo.play().catch(err => console.log('startVideo play error:', err));
    }

    // When user clicks "Start", we do a user gesture => desktop unblocks video & audio
    startButton.addEventListener('click', () => {
      sessionStorage.setItem('skipStartScreen', 'true');
      startScreen.style.display = 'none';

      // Attempt to play audio & video again with user gesture => unblocked on desktop
      audioManager.play().catch(err => console.log('User start -> still blocked?', err));
      if (startVideo) {
        startVideo.play().catch(err => console.log('startVideo user-gesture error:', err));
      }

      startGame(window.telegramData);
    });
  }

  // 8) Hook up the "Share Score" button
  const shareScoreButton = document.getElementById('shareScoreButton');
  if (shareScoreButton) {
    shareScoreButton.addEventListener('click', shareScoreCard);
  }
});

/**
 * Dynamically scale the 400×740 game so it fits within the viewport.
 */
function scaleGame() {
  const gameWrapper = document.getElementById('gameWrapper');
  const gameWidth = 400;
  const gameHeight = 740;

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  // If Telegram provides a stable viewport height, use that
  if (window.Telegram && Telegram.WebApp && Telegram.WebApp.viewportStableHeight) {
    viewportHeight = Telegram.WebApp.viewportStableHeight;
  }

  const scaleX = viewportWidth / gameWidth;
  const scaleY = viewportHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);

  // Center the game at (50%, 50%) then scale it
  gameWrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Re-scale on normal window resize events
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
  const centerX = ctx.canvas.width / 2;
  const x = centerX - textWidth / 2;
  ctx.fillText(text, x, y);
}

/**
 * Creates a 1920×1080 share card image with your `card.png` as the background,
 * then draws the player's username + score ~1/4 from top, etc.
 * Returns a Promise that resolves to "data:image/png;base64,..."
 */
function generateShareCardDataURL() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const bgImg = new Image();
    bgImg.src = 'assets/card.png';

    bgImg.onload = () => {
      // Draw background
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // Gather user data
      const username = window.telegramData?.username || 'Player';
      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;

      // Positions
      const mainLineY = 270;
      const highScoreLineY = mainLineY - 120;

      if (newHigh) {
        drawCenteredText(ctx, 'New Personal High Score!', highScoreLineY, '100px sans-serif', 'red');
      }

      const mainLine = `@${username} - Score: ${finalScore}`;
      drawCenteredText(ctx, mainLine, mainLineY, '100px sans-serif', 'white');

      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };

    bgImg.onerror = (err) => {
      console.error('Failed to load card.png background:', err);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // fallback text
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
 * and stores it in window.shareCardDataURL for later use.
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
 * The main share function. Uses the Web Share API to show the device's share sheet.
 */
async function shareScoreCard() {
  try {
    if (!window.shareCardDataURL) {
      window.shareCardDataURL = await generateShareCardDataURL();
    }
    const dataURL = window.shareCardDataURL;

    // dataURL -> Blob -> File -> navigator.share
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

    const username = window.telegramData?.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `Check out my Goobi score! @${username} - Score: ${finalScore}\n\nPlay now: https://t.me/goobigamebot`;

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