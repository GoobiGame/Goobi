import { startGame } from './game.js';
import { AudioManager } from './audioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');

  // Log the full URL to debug
  console.log('Current URL:', window.location.href);

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

  // Get Telegram info from the URL
  function getTelegramParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {
      userId: urlParams.get('user_id') || null,
      chatId: urlParams.get('chat_id') || null,
      messageId: urlParams.get('message_id') || null,
      inlineId: urlParams.get('inline_message_id') || null,
    };
    console.log('Raw URL Parameters:', Object.fromEntries(urlParams));
    return params;
  }

  const telegramParams = getTelegramParams();
  window.telegramData = {
    username: telegramParams.userId ? `Player_${telegramParams.userId}` : 'Player',
    userId: telegramParams.userId,
    chatId: telegramParams.chatId,
    messageId: telegramParams.messageId,
    inlineId: telegramParams.inlineId,
  };
  console.log('Telegram Data:', window.telegramData);

  // Check if we have the necessary parameters
  if (!telegramParams.userId || (!telegramParams.chatId && !telegramParams.inlineId)) {
    console.error('Missing required Telegram parameters. Cannot proceed.');
    alert('Error: Missing Telegram context. Please start the game from Telegram.');
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

  // Share to Telegram button
  const shareToChatButton = document.getElementById('shareToChatButton');
  if (shareToChatButton) {
    shareToChatButton.addEventListener('click', shareScoreToChat);
  }
});

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

      const username = window.telegramData?.username || 'Player';
      const finalScore = window.finalScore ?? 0;
      const newHigh = window.isNewHighScore === true;

      const pfpSize = 200;
      const pfpX = (canvas.width - pfpSize) / 2;
      const pfpY = 50;

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
 * Sends the score to the bot to share in Telegram
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
    console.log('Sharing score with:', { userId, chatId, messageId, inlineId });

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

    if (response.ok) {
      console.log('Score submitted successfully:', shareText);
      alert('Score shared to chat successfully!');
    } else {
      console.error('Failed to submit score:', response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      alert(`Failed to share score to chat: ${response.statusText} (${errorText})`);
    }
  } catch (err) {
    console.error('Share to chat failed:', err);
    alert(`Failed to share to chat: ${err.message}`);
  }
}