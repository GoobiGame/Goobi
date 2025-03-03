import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  if (window.Telegram && Telegram.WebApp) {
    console.log('Telegram WebApp available. Init Data:', Telegram.WebApp.initDataUnsafe);
    Telegram.WebApp.expand();
    Telegram.WebApp.onEvent('viewportChanged', () => {
      Telegram.WebApp.expand();
      scaleGame();
    });
  } else {
    console.log('Not in Telegram context - Telegram.WebApp unavailable');
  }

  scaleGame();

  const audioManager = new AudioManager('assets/themeMusic.wav');
  audioManager.play().catch((err) => {
    console.log('Autoplay blocked:', err);
  });

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
          // Fallback to avatarFallback.png for the header
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

  // Game Over sharing buttons
  const copyScoreButton = document.getElementById('copyScoreButton');
  const shareToChatButton = document.getElementById('shareToChatButton');

  if (copyScoreButton) {
    copyScoreButton.addEventListener('click', copyScoreToClipboard);
  }
  if (shareToChatButton) {
    shareToChatButton.addEventListener('click', shareScoreToChat);
  }
});

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

/* share card logic remains unchanged below */

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

      // Draw placeholder for PFP
      ctx.fillStyle = '#444';
      const pfpSize = 200;
      const pfpX = (canvas.width - pfpSize) / 2;
      const pfpY = 50;
      ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);

      const pfpImg = new Image();
      pfpImg.crossOrigin = 'anonymous';
      pfpImg.referrerPolicy = 'no-referrer';

      console.log('Attempting to load PFP from:', document.getElementById('userAvatar').src);
      pfpImg.src = document.getElementById('userAvatar').src;

      pfpImg.onload = () => {
        console.log('PFP loaded successfully:', pfpImg.src);
        ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);
        renderText();
      };

      // If the player's PFP fails, fallback to avatarFallback.png
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
          // If fallback also fails, just draw a gray square
          ctx.fillStyle = '#666';
          ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);
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

async function copyScoreToClipboard() {
  try {
    if (!window.shareCardDataURL) {
      window.shareCardDataURL = await generateShareCardDataURL();
    }
    const dataURL = window.shareCardDataURL;

    const blob = await fetch(dataURL).then(res => res.blob());
    const username = window.telegramData?.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `Check out my Goobi score! @${username} - Score: ${finalScore}\nPlay now: https://t.me/goobigamebot`;

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
        'text/plain': new Blob([shareText], { type: 'text/plain' })
      })
    ]);
    alert('Score card and link copied to clipboard! Paste it anywhere.');
  } catch (err) {
    console.error('Clipboard write failed:', err);
    const username = window.telegramData?.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `Check out my Goobi score! @${username} - Score: ${finalScore}\nPlay now: https://t.me/goobigamebot`;
    await navigator.clipboard.writeText(shareText);
    alert('Image copy failed, but text was copied! Paste it anywhere.');
  }
}

async function shareScoreToChat() {
  try {
    if (!window.shareCardDataURL) {
      window.shareCardDataURL = await generateShareCardDataURL();
    }
    const dataURL = window.shareCardDataURL;
    const username = window.telegramData?.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `Check out my Goobi score! @${username} - Score: ${finalScore}\nPlay now: https://t.me/goobigamebot`;

    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.sendData(JSON.stringify({
        type: 'share_score',
        text: shareText,
        score: finalScore,
        username: username
      }));
      console.log('Sent to Telegram chat:', { text: shareText });
    } else {
      console.log('Mock share to chat:', { text: shareText });
      alert('Shared to chat (mocked): ' + shareText);
    }
  } catch (err) {
    console.error('Share to chat failed:', err);
    alert('Failed to share to chat. Try copying instead.');
  }
}