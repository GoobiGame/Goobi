import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');

  // Check Telegram WebApp context
  if (window.Telegram && Telegram.WebApp) {
    console.log('Telegram WebApp available. Init Data:', Telegram.WebApp.initDataUnsafe);

    // Expand the WebApp to full height
    Telegram.WebApp.expand();

    // Listen for viewport changes, re-expand
    Telegram.WebApp.onEvent('viewportChanged', () => {
      Telegram.WebApp.expand();
      scaleGame();
    });
  } else {
    console.log('Not in Telegram context - Telegram.WebApp unavailable');
  }

  // Call scaleGame() once immediately
  scaleGame();

  // *** NEW ***: Call scaleGame() again after a short delay to fix layout on Telegram mobile
  setTimeout(() => {
    console.log('Delayed scaleGame() call...');
    scaleGame();
  }, 300);

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

  // Telegram user data
  let finalUsername = 'Player';
  if (window.Telegram && Telegram.WebApp) {
    const user = Telegram.WebApp.initDataUnsafe.user;
    if (user) {
      finalUsername = user.username || user.first_name || 'Player';
      const headerAvatar = document.getElementById('userAvatar');
      if (headerAvatar && user.photo_url) {
        headerAvatar.src = user.photo_url;
        headerAvatar.onerror = () => {
          console.error('Failed to load Telegram PFP:', user.photo_url);
          headerAvatar.src = 'assets/avatarFallback.png';
        };
      } else if (headerAvatar) {
        headerAvatar.src = 'assets/avatarFallback.png';
      }
    }
  } else {
    // Not in Telegram context
    const urlParams = new URLSearchParams(window.location.search);
    finalUsername = urlParams.get('username') || 'Player';
    const headerAvatar = document.getElementById('userAvatar');
    if (headerAvatar) {
      headerAvatar.src = 'assets/avatarFallback.png';
    }
  }
  window.telegramData = { username: finalUsername };
  console.log('Telegram Data:', window.telegramData);

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

  // The only button now is "shareToChatButton" (if you removed the copy button from HTML)
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

window.addEventListener('resize', scaleGame);

/* share card logic remains if you want the scoreboard preview */

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

      const pfpImg = new Image();
      pfpImg.crossOrigin = 'anonymous';
      pfpImg.referrerPolicy = 'no-referrer';

      console.log('Attempting to load PFP from:', document.getElementById('userAvatar').src);
      pfpImg.src = '/api/proxyPhoto?url=' + encodeURIComponent(document.getElementById('userAvatar').src);

      pfpImg.onload = () => {
        console.log('PFP loaded successfully via proxy:', pfpImg.src);
        ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);
        renderText();
      };

      // If player's PFP fails, fallback to avatarFallback
      pfpImg.onerror = (err) => {
        console.error('PFP failed to load:', pfpImg.src, err);
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.referrerPolicy = 'no-referrer';
        fallbackImg.src = 'assets/avatarFallback.png';

        fallbackImg.onload = () => {
          console.log('Falling back to assets/avatarFallback.png for PFP');
          ctx.drawImage(fallbackImg, pfpX, pfpY, pfpSize, pfpSize);
          renderText();
        };
        fallbackImg.onerror = () => {
          console.log('Even fallback image failed, leaving area transparent');
          renderText();
        };
      };

      function renderText() {
        const mainLineY = pfpY + pfpSize + 70;
        const highScoreLineY = mainLineY - 120;

        if (newHigh) {
          drawCenteredText(ctx, 'New Personal High Score!', highScoreLineY, '100px sans-serif', 'red');
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
 * Share button: send text data to the bot, so it posts a message in the chat
 */
async function shareScoreToChat() {
  try {
    if (!window.shareCardDataURL) {
      window.shareCardDataURL = await generateShareCardDataURL();
    }
    const username = window.telegramData?.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `@${username} just scored ${finalScore} in Goobi!\nPlay now: https://t.me/goobigamebot`;

    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.sendData(JSON.stringify({
        type: 'share_score',
        text: shareText
      }));
      console.log('Sent share text to the bot:', shareText);
    } else {
      console.log('Mock share to chat:', { text: shareText });
      alert(`Shared to chat (mocked): ${shareText}`);
    }
  } catch (err) {
    console.error('Share to chat failed:', err);
    alert('Failed to share to chat. Possibly not in Telegram context.');
  }
}