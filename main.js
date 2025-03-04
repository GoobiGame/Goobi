import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

// Function to preload assets and return a Promise
function preloadAssets() {
  const assets = [
    // Images
    { type: 'image', src: 'assets/platform.svg' },
    { type: 'image', src: 'assets/obstacle.png' },
    { type: 'image', src: 'assets/backgroundTile.svg' },
    { type: 'image', src: 'assets/idleBoard.png' },
    { type: 'image', src: 'assets/rollBoard.png' },
    { type: 'image', src: 'assets/jumpBoard.png' },
    { type: 'image', src: 'assets/card.png' },
    { type: 'image', src: 'assets/avatarFallback.png' },
    // Videos
    { type: 'video', src: 'assets/start.mp4' },
    { type: 'video', src: 'assets/gameOver.mp4' },
    // Audio
    { type: 'audio', src: 'assets/themeMusic.wav' },
  ];

  const totalAssets = assets.length;
  let loadedAssets = 0;

  const loadingProgressBar = document.getElementById('loadingProgress');

  return Promise.all(
    assets.map(asset => {
      return new Promise((resolve, reject) => {
        let element;
        if (asset.type === 'image') {
          element = new Image();
        } else if (asset.type === 'video') {
          element = document.createElement('video');
          element.muted = true;
          element.preload = 'metadata'; // Changed back to 'metadata' for reliability
        } else if (asset.type === 'audio') {
          element = new Audio();
          element.muted = true;
          element.preload = 'metadata'; // Changed back to 'metadata' for reliability
        }

        // Force reload to ensure onload fires even for cached assets
        element.src = asset.src + '?t=' + new Date().getTime();

        // Timeout to prevent stalling (5 seconds)
        const timeout = setTimeout(() => {
          console.warn(`Timeout loading ${asset.src} - proceeding anyway`);
          loadedAssets++;
          const progress = (loadedAssets / totalAssets) * 100;
          loadingProgressBar.style.width = `${progress}%`;
          resolve();
        }, 5000);

        element.onload = () => {
          clearTimeout(timeout);
          loadedAssets++;
          const progress = (loadedAssets / totalAssets) * 100;
          console.log(`Loaded ${asset.src} - Progress: ${progress}%`);
          loadingProgressBar.style.width = `${progress}%`;
          resolve();
        };

        element.onerror = () => {
          clearTimeout(timeout);
          console.error(`Failed to load asset: ${asset.src}`);
          loadedAssets++;
          const progress = (loadedAssets / totalAssets) * 100;
          console.log(`Error loading ${asset.src} - Progress: ${progress}%`);
          loadingProgressBar.style.width = `${progress}%`;
          resolve();
        };

        // For videos and audio, use 'onloadedmetadata' instead of 'oncanplay' for reliability
        if (asset.type === 'video' || asset.type === 'audio') {
          element.onloadedmetadata = element.onload;
          // Add a generic error handler for stalled loading
          element.onstalled = () => {
            console.warn(`Stalled loading ${asset.src}`);
            element.onerror();
          };
        }

        // If the element is already complete (e.g., cached), trigger onload manually
        if (asset.type === 'image' && element.complete) {
          element.onload();
        }
      });
    })
  );
}

window.onload = async () => {
  console.log('window.onload fired');

  window.debug = false;

  // Show loading screen (already visible by default)
  const loadingScreen = document.getElementById('loadingScreen');

  // Ensure the loading screen is visible for at least 1 second
  const minimumLoadTime = new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Preload all assets and wait for the minimum load time
    await Promise.all([preloadAssets(), minimumLoadTime]);
  } catch (error) {
    console.error('Error preloading assets:', error);
  }

  // Hide loading screen after assets are loaded and minimum time has passed
  loadingScreen.style.display = 'none';

  // Log the full URL to debug
  const currentUrl = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const paramsLog = Object.fromEntries(urlParams);

  // Send logs to Vercel
  fetch('https://goobi.vercel.app/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Game Loaded',
      url: currentUrl,
      params: paramsLog,
    }),
  }).catch(err => console.error('Failed to send log:', err));

  // Scale the game to fit the screen
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

  // Prevent unwanted gestures and menus
  const canvas = document.getElementById("gameCanvas");
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

  // Get Telegram info from URL parameters (primary) and Telegram.WebApp (secondary)
  function getTelegramParams() {
    // Initialize default values
    let userId = null;
    let chatId = null;
    let inlineId = null;
    let username = 'Player';
    let photoUrl = null;
    let highScore = 0;
    let highScoreHolder = 'None';

    // First, get parameters from the URL (primary source for Game API)
    const urlParams = new URLSearchParams(window.location.search);
    userId = urlParams.get('user_id') || null;
    chatId = urlParams.get('chat_id') || null;
    const messageId = urlParams.get('message_id') || null;
    inlineId = urlParams.get('inline_message_id') || null;
    username = urlParams.get('username') || username;
    photoUrl = urlParams.get('photo_url') || null;
    highScore = parseInt(urlParams.get('high_score')) || highScore;
    highScoreHolder = urlParams.get('high_score_holder') || highScoreHolder;

    // Check Telegram.WebApp for additional context (secondary source)
    const telegramWebApp = window.Telegram?.WebApp?.initDataUnsafe;
    if (telegramWebApp) {
      console.log('Telegram.WebApp.initDataUnsafe:', telegramWebApp);
      if (telegramWebApp.user) {
        // Only override if URL parameters are missing
        userId = userId || telegramWebApp.user.id?.toString();
        username = telegramWebApp.user.username || telegramWebApp.user.first_name || username;
        photoUrl = telegramWebApp.user.photo_url || photoUrl;
      }
      if (telegramWebApp.chat && !chatId) {
        chatId = telegramWebApp.chat.id?.toString();
      }
    }

    return {
      userId,
      chatId,
      messageId,
      inlineId,
      username,
      photoUrl,
      highScore,
      highScoreHolder,
    };
  }

  const telegramParams = getTelegramParams();
  window.telegramData = {
    username: telegramParams.username,
    userId: telegramParams.userId,
    chatId: telegramParams.chatId,
    messageId: telegramParams.messageId,
    inlineId: telegramParams.inlineId,
    photoUrl: telegramParams.photoUrl,
    highScore: telegramParams.highScore,
    highScoreHolder: telegramParams.highScoreHolder,
  };

  console.log('Telegram Parameters:', telegramParams);

  // Check if running in a testing environment (localhost or 127.0.0.1)
  const isTesting = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Check if we have a Telegram context (require userId from URL or Telegram.WebApp)
  const hasTelegramContext = telegramParams.userId || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
  if (!hasTelegramContext) {
    fetch('https://goobi.vercel.app/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Error: Missing Telegram Context',
        telegramData: window.telegramData,
        telegramWebApp: window.Telegram?.WebApp?.initDataUnsafe,
      }),
    }).catch(err => console.error('Failed to send error log:', err));

    if (isTesting) {
      console.warn('Missing Telegram context. Using default context for testing.');
      window.telegramData.username = 'TestUser';
      window.telegramData.highScoreHolder = 'None';
      window.telegramData.highScore = 0;
    } else {
      // Show the Telegram error screen
      const telegramErrorScreen = document.getElementById('telegramErrorScreen');
      telegramErrorScreen.style.display = 'flex';

      // Add click handler for the "Open in Telegram" button
      const openInTelegramButton = document.getElementById('openInTelegramButton');
      openInTelegramButton.addEventListener('click', () => {
        window.location.href = 'https://t.me/goobigamebot';
      });

      return; // Stop further execution
    }
  }

  // Log any discrepancies between URL parameters and Telegram.WebApp
  const telegramWebApp = window.Telegram?.WebApp?.initDataUnsafe;
  if (telegramWebApp?.user?.id && telegramParams.userId && telegramWebApp.user.id.toString() !== telegramParams.userId) {
    console.warn('Discrepancy between Telegram.WebApp userId and URL user_id:', {
      telegramWebAppUserId: telegramWebApp.user.id,
      urlUserId: telegramParams.userId,
    });
  }

  // Send Telegram data to Vercel logs
  fetch('https://goobi.vercel.app/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Telegram Data',
      telegramData: window.telegramData,
    }),
  }).catch(err => console.error('Failed to send Telegram data log:', err));

  // Update UI with username and PFP
  const currentUsername = document.getElementById("currentUsername");
  const headerAvatar = document.getElementById("userAvatar");
  if (currentUsername) {
    currentUsername.textContent = `@${telegramParams.username}`;
  }
  if (headerAvatar) {
    if (telegramParams.photoUrl) {
      headerAvatar.src = `/api/proxyPhoto?url=${encodeURIComponent(telegramParams.photoUrl)}`;
      headerAvatar.onerror = () => {
        console.error('Failed to load Telegram PFP:', telegramParams.photoUrl);
        headerAvatar.src = 'assets/avatarFallback.png';
      };
    } else {
      headerAvatar.src = 'assets/avatarFallback.png';
    }
  }

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
};

/**
 * Scales the game to fit the screen
 */
function scaleGame() {
  const gameWrapper = document.getElementById('gameWrapper');
  const gameWidth = 400;
  const gameHeight = 740;

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  const scaleX = viewportWidth / gameWidth;
  const scaleY = viewportHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);

  gameWrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener('resize', scaleGame);

/**
 * Draws text in the center of a canvas
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
 * Creates the share card image
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
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;

      const scoreY = 270;
      if (newHigh) {
        drawCenteredText(ctx, 'New Personal High Score!', scoreY - 60, '60px sans-serif', 'red');
      }
      const scoreLine = `Score: ${finalScore}`;
      drawCenteredText(ctx, scoreLine, scoreY, '160px sans-serif', 'white');

      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };

    bgImg.onerror = (err) => {
      console.error('Failed to load card.png background:', err);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;
      const scoreY = 270;

      if (newHigh) {
        drawCenteredText(ctx, 'New Personal High Score!', scoreY - 60, '60px sans-serif', 'red');
      }
      const scoreLine = `Score: ${finalScore}`;
      drawCenteredText(ctx, scoreLine, scoreY, '160px sans-serif', 'white');

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
 * Sends the score to the bot to share in Telegram and updates telegramData with the new high score
 */
async function shareScoreToChat() {
  try {
    if (!window.shareCardDataURL) {
      window.shareCardDataURL = await generateShareCardDataURL();
    }
    const username = window.telegramData.username || 'Player';
    const finalScore = window.finalScore ?? 0;
    const shareText = `@${username} just scored ${finalScore} in Goobi!`;

    const { userId, chatId, messageId, inlineId } = window.telegramData;

    // Log the share attempt to Vercel
    await fetch('https://goobi.vercel.app/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Sharing Score',
        userId,
        chatId,
        messageId,
        inlineId,
        score: finalScore,
        shareText,
      }),
    });

    // Use the full Vercel URL for the API call
    const response = await fetch('https://goobi.vercel.app/api/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        score: finalScore,
        chatId,
        messageId,
        inlineId,
      }),
    });

    const result = await response.json();
    if (response.ok || (result.error && result.error === 'BAD_REQUEST: BOT_SCORE_NOT_MODIFIED')) {
      console.log('Score submitted successfully:', shareText);

      // Fetch the updated high score after submission
      let highScore = window.telegramData.highScore;
      let highScoreHolder = window.telegramData.highScoreHolder;
      try {
        const payload = { user_id: userId };
        if (chatId && messageId) {
          payload.chat_id = chatId;
          payload.message_id = messageId;
        } else if (inlineId) {
          payload.inline_message_id = inlineId;
        }
        if (Object.keys(payload).length > 1) { // Ensure we have chat_id/message_id or inline_message_id
          const highScoreResponse = await fetch('https://goobi.vercel.app/api/getHighScore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const highScoreResult = await highScoreResponse.json();
          if (highScoreResult.ok) {
            highScore = highScoreResult.highScore;
            highScoreHolder = highScoreResult.highScoreHolder;
            // Update telegramData
            window.telegramData.highScore = highScore;
            window.telegramData.highScoreHolder = highScoreHolder;
            console.log('Updated high score in telegramData:', { highScore, highScoreHolder });
          } else {
            console.error('Failed to fetch updated high score:', highScoreResult);
          }
        }
      } catch (err) {
        console.error('Error fetching updated high score:', err);
      }

      return true; // Indicate success
    } else {
      console.error('Failed to submit score:', response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Failed to share score to chat: ${response.statusText} (${errorText})`);
    }
  } catch (err) {
    console.error('Share to chat failed:', err);
    throw err;
  }
}

// Make shareScoreToChat globally accessible
window.shareScoreToChat = shareScoreToChat;