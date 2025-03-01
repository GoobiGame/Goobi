import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) If Telegram is available, force it to expand (for full height)
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.expand();

    // 2) Listen for viewport changes (e.g., user drags the mini app up)
    Telegram.WebApp.onEvent('viewportChanged', () => {
      Telegram.WebApp.expand();
      scaleGame();
    });
  }

  // 3) Run scaleGame on load
  scaleGame();

  // 4) Audio
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
        const headerAvatar = document.getElementById('userAvatar');
        if (headerAvatar) {
          headerAvatar.src = user.photo_url;
        }
      }
    }
  } else {
    // Fallback for non-Telegram environments (e.g., direct browser access)
    const urlParams = new URLSearchParams(window.location.search);
    finalUsername = urlParams.get('username') || 'Player';
  }
  window.telegramData = { username: finalUsername };
  console.log('Telegram Data:', window.telegramData);

  // 7) Start screen logic
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

  // 8) Hook up the new buttons
  const copyScoreButton = document.getElementById('copyScoreButton');
  const shareToChatButton = document.getElementById('shareToChatButton');

  if (copyScoreButton) {
    copyScoreButton.addEventListener('click', copyScoreToClipboard);
  }
  if (shareToChatButton) {
    shareToChatButton.addEventListener('click', shareScoreToChat);
  }

  // 9) Hook up the leaderboard button
  const leaderboardButton = document.getElementById('leaderboardButton');
  const leaderboardScreen = document.getElementById('leaderboardScreen');
  const leaderboardList = document.getElementById('leaderboardList');
  const closeLeaderboardButton = document.getElementById('closeLeaderboardButton');

  async function fetchLeaderboard() {
    console.log('Fetching leaderboard from: https://goobi.vercel.app/api/get_leaderboard');
    const response = await fetch('https://goobi.vercel.app/api/get_leaderboard');
    console.log('Leaderboard fetch response:', response);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Leaderboard data:', data);
    return data;
  }

  async function fetchLeaderboardWithRetry(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchLeaderboard();
      } catch (error) {
        if (i === retries - 1) {
          console.error('All retries failed, returning default value');
          return [];
        }
        console.log(`Retrying fetchLeaderboard (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  leaderboardButton.addEventListener('click', async () => {
    try {
      const data = await fetchLeaderboardWithRetry();
      if (data.length === 0) {
        leaderboardList.innerHTML = '<p>No scores yet!</p>';
      } else {
        leaderboardList.innerHTML = data.map((entry, index) => 
          `<p>${index + 1}. @${entry.username}: ${entry.score} points</p>`
        ).join('');
      }
      leaderboardScreen.style.display = 'flex';
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      leaderboardList.innerHTML = '<p>Error loading leaderboard</p>';
      leaderboardScreen.style.display = 'flex';
    }
  });

  closeLeaderboardButton.addEventListener('click', () => {
    leaderboardScreen.style.display = 'none';
  });
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

window.shareCardDataURL = null;

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

      // Draw placeholder PFP area
      ctx.fillStyle = '#444';
      const pfpSize = 200;
      const pfpX = (canvas.width - pfpSize) / 2;
      const pfpY = 50;
      ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);

      const pfpImg = new Image();
      pfpImg.crossOrigin = 'Anonymous';
      console.log('Attempting to load PFP from:', document.getElementById('userAvatar').src);
      pfpImg.src = document.getElementById('userAvatar').src;

      pfpImg.onload = () => {
        console.log('PFP loaded successfully:', pfpImg.src);
        ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);
        renderText();
      };

      pfpImg.onerror = (err) => {
        console.error('PFP failed to load:', pfpImg.src, err);
        ctx.fillStyle = '#666';
        ctx.fillRect(pfpX, pfpY, pfpSize, pfpSize);
        renderText();
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