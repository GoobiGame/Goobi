import { Player } from './player.js';
import { Platform, generatePlatforms } from './platform.js';
import { setupControls } from './controls.js';
import { getRandomInt } from './utils.js';
import { Obstacle } from './obstacle.js';

// Load background tile
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
  canvas.height = 680; // Increased to match new canvas height

  let score = 0;
  let cameraY = 0;
  let highestWorldY = 0;

  const playerUsername = telegramData.username || 'Player';

  const player = new Player(canvas);
  const initialY = player.y;

  let platforms = generatePlatforms(24, canvas.height, canvas.width); // Increased to 24 platforms to fill extra space
  setupControls(player);

  let obstacles = [];
  let obstacleSpawnTimer = 0;
  let nextSpawnInterval = getRandomFloat(3.0, 7.0);

  function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  // DOM elements for score display
  const currentUsername = document.getElementById("currentUsername");
  const currentScore = document.getElementById("currentScore");
  const highScoreHolder = document.getElementById("highScoreUsername");
  const highScoreDisplay = document.getElementById("highScore");

  // Set initial UI
  currentUsername.textContent = `@${playerUsername}`;
  currentScore.textContent = `Score: 0`;
  highScoreHolder.textContent = telegramData.highScoreHolder;
  highScoreDisplay.textContent = `High: ${telegramData.highScore || 0}`;

  // Game Over elements
  const gameOverScreen = document.getElementById("gameOverScreen");
  const gameOverOkButton = document.getElementById("gameOverOkButton");
  const gameOverVideo = document.getElementById("gameOverVideo");

  // Refresh the Try Again button
  gameOverOkButton.replaceWith(gameOverOkButton.cloneNode(true));
  const newGameOverOkButton = document.getElementById("gameOverOkButton");

  newGameOverOkButton.addEventListener("click", function() {
    gameOverVideo.pause();
    gameOverVideo.currentTime = 0;
    gameOverScreen.style.display = "none";
    startGame(telegramData);
  });

  let lastScore = 0;
  let lastTimestamp = 0;

  function gameLoop(timestamp) {
    const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiled background
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

    // Camera logic
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

    // Update UI score if changed
    if (score !== lastScore) {
      currentScore.textContent = `Score: ${score}`;
      lastScore = score;
    }

    // Maintain platform count
    platforms = platforms.filter(p => p.y < canvas.height);
    while (platforms.length < 12) { // Adjusted to maintain density with new height
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

    // Update & draw player
    player.update(platforms, canvas.width, delta);
    player.draw(ctx);

    // Update & draw platforms
    platforms.forEach(platform => {
      platform.update(player, canvas.width, delta);
      platform.draw(ctx);
    });

    // Spawn obstacles
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

    // Update & draw obstacles
    obstacles.forEach(obstacle => obstacle.update(delta));
    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height + obstacle.height);
    obstacles.forEach(obstacle => obstacle.draw(ctx));

    // Collision check
    for (let obstacle of obstacles) {
      if (obstacle.collidesWith(player)) {
        handleGameOver();
        return;
      }
    }

    // If player falls off screen
    if (player.y > canvas.height) {
      handleGameOver();
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  async function handleGameOver() {
    window.finalScore = score;

    // Share the score automatically
    try {
      await window.shareScoreToChat();
    } catch (err) {
      // Log the error to Vercel but don't show it to the user
      fetch('https://goobi.vercel.app/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Share Score Error',
          error: err.message,
        }),
      }).catch(logErr => console.error('Failed to send error log:', logErr));
    }

    // Show game over screen
    if (gameOverScreen.style.display !== "flex") {
      gameOverVideo.currentTime = 0;
      gameOverVideo.play();
    }
    gameOverScreen.style.display = "flex";

    window.updateShareCardPreview();
  }
}