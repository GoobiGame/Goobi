import { Player } from './player.js';
import { Platform, generatePlatforms } from './platform.js';
import { setupControls } from './controls.js';
import { getRandomInt } from './utils.js';
import { Obstacle } from './obstacle.js';

// Telegram bot webhook URL
const TELEGRAM_BOT_URL = "https://goobi.vercel.app/api/update_score";
const HIGH_SCORE_URL = "https://goobi.vercel.app/api/get_high_score";

// Load background tilenan
const tileImg = new Image();
tileImg.src = "assets/backgroundTile.svg";

let tilePattern = null;
const SCALED_TILE_SIZE = 50;
const PARALLAX_FACTOR = 0.3;

tileImg.onload = () => {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tilePattern = tempCtx.createPattern(tileImg, 'repeat');

  if (tilePattern && tilePattern.setTransform) {
    const scaleMatrix = new DOMMatrix().scale(0.5, 0.5);
    tilePattern.setTransform(scaleMatrix);
  }
};

export function startGame(telegramData = {}) {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 400;
  canvas.height = 600;

  let score = 0;
  let cameraY = 0;
  let highestWorldY = 0;
  let newHighScoreAchieved = false;

  const playerUsername = telegramData.username || 'Player';

  const player = new Player(canvas);
  const initialY = player.y;

  let platforms = generatePlatforms(20, canvas.height, canvas.width);
  setupControls(player);

  let obstacles = [];
  let obstacleSpawnTimer = 0;
  let nextSpawnInterval = getRandomFloat(3.0, 7.0);

  function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  const currentUsername = document.getElementById("currentUsername");
  const currentScore = document.getElementById("currentScore");
  const highScoreUsername = document.getElementById("highScoreUsername");
  const highScore = document.getElementById("highScore");

  currentUsername.textContent = `@${playerUsername}`;
  currentScore.textContent = `Score: 0`;

  // Fetch chat-wide high score with retries
  fetchChatHighScoreWithRetry().then(data => {
    if (data && data.username) {
      highScoreUsername.textContent = `@${data.username}`;
      highScore.textContent = `High: ${data.score}`;
    } else {
      highScoreUsername.textContent = `None`;
      highScore.textContent = `High: 0`;
    }
  }).catch(error => {
    console.error('Error fetching high score:', error);
    highScoreUsername.textContent = `N/A`;
    highScore.textContent = `High: N/A`;
  });

  const gameOverScreen = document.getElementById("gameOverScreen");
  const gameOverOkButton = document.getElementById("gameOverOkButton");
  const gameOverVideo = document.getElementById("gameOverVideo");

  gameOverOkButton.replaceWith(gameOverOkButton.cloneNode(true));
  const newGameOverOkButton = document.getElementById("gameOverOkButton");

  newGameOverOkButton.addEventListener("click", function() {
    gameOverVideo.pause();
    gameOverVideo.currentTime = 0;
    gameOverScreen.style.display = "none";
    startGame({ username: playerUsername });
  });

  let lastScore = 0;
  let lastTimestamp = 0;

  function gameLoop(timestamp) {
    const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tilePattern) {
      const offset = (cameraY * PARALLAX_FACTOR) % SCALED_TILE_SIZE;
      ctx.save();
      ctx.translate(0, -offset);
      ctx.fillStyle = tilePattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height + SCALED_TILE_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (player.y < canvas.height / 2) {
      const distanceMoved = Math.abs(player.dy) * delta;
      player.y += distanceMoved;
      platforms.forEach(p => p.y += distanceMoved);
      obstacles.forEach(o => o.y += distanceMoved);
      cameraY += distanceMoved;
    }

    const currentProgress = cameraY === 0
      ? initialY - player.y
      : (initialY - canvas.height / 2) + cameraY;

    if (currentProgress > highestWorldY) {
      highestWorldY = currentProgress;
    }
    score = Math.floor(highestWorldY);

    if (score !== lastScore) {
      currentScore.textContent = `Score: ${score}`;
      lastScore = score;
    }

    platforms = platforms.filter(p => p.y < canvas.height);

    while (platforms.length < 10) {
      const width = getRandomInt(50, 100);
      const x = getRandomInt(0, canvas.width - width);
      const y = platforms[platforms.length - 1].y - 100;

      const isMoving = Math.random() < 0.5;
      const isDropping = Math.random() < 0.05;

      if (y > canvas.height - 50) {
        continue;
      }

      platforms.push(new Platform(x, y, width, 20, isMoving, isDropping));
    }

    player.update(platforms, canvas.width, delta);
    player.draw(ctx);

    platforms.forEach(platform => {
      platform.update(player, canvas.width, delta);
      platform.draw(ctx);
    });

    obstacleSpawnTimer += delta;
    if (obstacleSpawnTimer >= nextSpawnInterval) {
      obstacleSpawnTimer = 0;
      const size = 50;
      const x = getRandomInt(0, canvas.width - size);
      const y = -50;
      const speed = getRandomInt(120, 240);

      obstacles.push(new Obstacle(x, y, size, size, speed));
      nextSpawnInterval = getRandomFloat(3.0, 7.0);
    }

    obstacles.forEach(obstacle => obstacle.update(delta));
    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height + obstacle.height);
    obstacles.forEach(obstacle => obstacle.draw(ctx));

    for (let obstacle of obstacles) {
      if (obstacle.collidesWith(player)) {
        handleGameOver();
        return;
      }
    }

    if (player.y > canvas.height) {
      handleGameOver();
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  async function fetchChatHighScore() {
    console.log('Fetching chat high score from:', HIGH_SCORE_URL);
    try {
      const response = await fetch(HIGH_SCORE_URL);
      console.log('High score fetch response:', response);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('High score data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching high score:', error);
      throw error;
    }
  }

  async function fetchChatHighScoreWithRetry(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchChatHighScore();
      } catch (error) {
        if (i === retries - 1) {
          console.error('All retries failed, returning default value');
          return { username: null, score: 0 }; // Fallback to default
        }
        console.log(`Retrying fetchChatHighScore (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async function sendScoreToTelegram(username, points) {
    console.log(`Attempting to send score: ${username} - ${points}`);
    try {
      const response = await fetch(TELEGRAM_BOT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, points })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      console.log(`Score sent to Telegram: ${username} - ${points}`);
    } catch (error) {
      console.error('Error sending score to Telegram:', error);
    }
  }

  function handleGameOver() {
    window.finalScore = score;
    window.isNewHighScore = newHighScoreAchieved;

    if (gameOverScreen.style.display !== "flex") {
      gameOverVideo.currentTime = 0;
      gameOverVideo.play();
    }
    gameOverScreen.style.display = "flex";

    window.updateShareCardPreview();

    sendScoreToTelegram(playerUsername, score);
  }
}