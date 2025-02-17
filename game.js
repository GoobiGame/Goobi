// game.js
import { Player } from './player.js';
import { Platform, generatePlatforms } from './platform.js';
import { setupControls } from './controls.js';
import { ScoreManager } from './scoreManager.js';
import { getRandomInt } from './utils.js';
import { Obstacle } from './obstacle.js';

// === 1) LOAD & SCALE THE TILE TO 50×50 =====================================
const tileImg = new Image();
tileImg.src = "assets/backgroundTile.svg";

// We'll store the pattern globally once it's created
let tilePattern = null;

// Because the original SVG is 100×100, scaling by 0.5 → 50×50
// We'll need this numeric tile size to do modulo math
const SCALED_TILE_SIZE = 50;

// If you want parallax, set a factor < 1. If you want a static background, use 0.
const PARALLAX_FACTOR = 0.3;

tileImg.onload = () => {
    // Create a temporary canvas/context just to create the pattern
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Create the repeating pattern
    tilePattern = tempCtx.createPattern(tileImg, 'repeat');

    // Scale the pattern by 0.5 (half size)
    if (tilePattern && tilePattern.setTransform) {
        // DOMMatrix is standard in modern browsers
        const scaleMatrix = new DOMMatrix().scale(0.5, 0.5);
        tilePattern.setTransform(scaleMatrix);
    }
};

// === 2) START GAME FUNCTION ===============================================
export function startGame() {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 400;
    canvas.height = 600;

    let score = 0;
    let cameraY = 0;
    let highestWorldY = 0;

    // Create the player
    const player = new Player(canvas);
    const initialY = player.y;

    // Generate initial platforms
    let platforms = generatePlatforms(20, canvas.height, canvas.width);
    setupControls(player);

    // Obstacles array
    let obstacles = [];

    // Random spawn interval logic
    let obstacleSpawnTimer = 0;
    let nextSpawnInterval = getRandomFloat(3.0, 7.0);

    function getRandomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Score / High Score
    let highScore = ScoreManager.getHighScore();
    const scoreDisplay = document.getElementById("scoreDisplay");
    scoreDisplay.innerText = `Score: ${score}`;
    document.getElementById("highScoreDisplay").innerText = `High Score: ${highScore}`;

    // === Game Over overlay (unchanged) ===============================================
    const gameOverScreen = document.getElementById("gameOverScreen");
    const gameOverOkButton = document.getElementById("gameOverOkButton");
    // Get the video element for game over background
    const gameOverVideo = document.getElementById("gameOverVideo");

    gameOverOkButton.addEventListener("click", function() {
        // Stop the video and set flag to skip start screen on reload.
        gameOverVideo.pause();
        gameOverVideo.currentTime = 0;
        sessionStorage.setItem("skipStartScreen", "true");
        document.location.reload();
    });

    let lastScore = 0;
    let lastTimestamp = 0;

    // === 3) GAME LOOP ======================================================
    function gameLoop(timestamp) {
        // 3A) Delta time
        const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
        lastTimestamp = timestamp;

        // 3B) Clear or fill entire screen each frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // If tilePattern is ready, fill the screen with a scrolling pattern
        if (tilePattern) {
            // Compute how much to shift the pattern upward
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

        // 3C) Move the camera if player is above mid-screen
        if (player.y < canvas.height / 2) {
            const distanceMoved = Math.abs(player.dy) * delta;
            player.y += distanceMoved;
            platforms.forEach(p => p.y += distanceMoved);
            obstacles.forEach(o => o.y += distanceMoved);
            cameraY += distanceMoved;
        }

        // 3D) Update score
        const currentProgress = cameraY === 0
            ? initialY - player.y
            : (initialY - canvas.height / 2) + cameraY;

        if (currentProgress > highestWorldY) {
            highestWorldY = currentProgress;
        }
        score = Math.floor(highestWorldY);

        if (score !== lastScore) {
            scoreDisplay.innerText = `Score: ${score}`;
            lastScore = score;
        }

        if (score > highScore) {
            highScore = score;
            localStorage.setItem("highScore", highScore);
            document.getElementById("highScoreDisplay").innerText = `High Score: ${highScore}`;
        }

        // 3E) Remove off-screen platforms
        platforms = platforms.filter(p => p.y < canvas.height);

        // 3F) Generate new platforms if needed
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

        // 3G) Update & draw the player
        player.update(platforms, canvas.width, delta);
        player.draw(ctx);

        // 3H) Update & draw platforms
        platforms.forEach(platform => {
            platform.update(player, canvas.width, delta);
            platform.draw(ctx);
        });

        // 3I) Spawn obstacles at intervals
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

        // 3J) Update & draw obstacles
        obstacles.forEach(obstacle => obstacle.update(delta));
        obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height + obstacle.height);
        obstacles.forEach(obstacle => obstacle.draw(ctx));

        // 3K) Collision check with obstacles
        for (let obstacle of obstacles) {
            if (obstacle.collidesWith(player)) {
                if (gameOverScreen.style.display !== "flex") {
                    gameOverVideo.currentTime = 0;
                    gameOverVideo.play();
                }
                gameOverScreen.style.display = "flex";
                return;
            }
        }

        // 3L) Check if player falls off the canvas
        if (player.y > canvas.height) {
            if (gameOverScreen.style.display !== "flex") {
                gameOverVideo.currentTime = 0;
                gameOverVideo.play();
            }
            gameOverScreen.style.display = "flex";
            return;
        }

        // 3M) Request next frame
        requestAnimationFrame(gameLoop);
    }

    // === 4) START THE LOOP ================================================
    requestAnimationFrame(gameLoop);
}