// obstacle.js

// Load the sprite sheet (4 frames in a single row, 400×100 total)
const obstacleImg = new Image();
obstacleImg.src = "assets/obstacleBoard.svg";

export class Obstacle {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;   // how big it appears on-screen
        this.height = height; // how big it appears on-screen
        this.speed = speed;

        // === Animation Setup ===
        this.totalFrames = 4;          // We have 4 frames in a row
        this.frameIndex = 0;           // Current frame index (0 to 3)
        this.frameTimer = 0;           // How long we've been on the current frame
        this.animSpeed = 0.2;          // Seconds per frame (adjust as you like)

        // Each frame in the sprite sheet is 100×100 (since 400×100 total)
        this.spriteFrameWidth = 100;
        this.spriteFrameHeight = 100;

        // Optional: smaller collision box offset if desired
        this.colliderOffset = 8; // Set to e.g. 5 if you want a smaller hitbox
    }

    update(delta) {
        // Move down at `this.speed` px/s
        this.y += this.speed * delta;

        // === Update Animation ===
        this.frameTimer += delta;
        if (this.frameTimer >= this.animSpeed) {
            this.frameTimer = 0;
            // Go to the next frame
            this.frameIndex = (this.frameIndex + 1) % this.totalFrames;
        }
    }

    draw(ctx) {
        // If the sprite sheet isn't loaded yet, skip drawing
        if (!obstacleImg.complete) return;

        // Source X in the sprite sheet
        const sx = this.frameIndex * this.spriteFrameWidth;
        const sy = 0; // single row

        // Draw the current frame
        ctx.drawImage(
            obstacleImg,
            sx, sy, 
            this.spriteFrameWidth, this.spriteFrameHeight, // source slice
            this.x, this.y, 
            this.width, this.height // how big to draw on the canvas
        );

        // === Debug collision box ===
        if (window.DEBUG) {
            const left = this.x + this.colliderOffset;
            const top = this.y + this.colliderOffset;
            const collWidth = this.width - 2 * this.colliderOffset;
            const collHeight = this.height - 2 * this.colliderOffset;

            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.strokeRect(left, top, collWidth, collHeight);
        }
    }

    collidesWith(player) {
        // Calculate obstacle's bounding box
        const left = this.x + this.colliderOffset;
        const right = this.x + this.width - this.colliderOffset;
        const top = this.y + this.colliderOffset;
        const bottom = this.y + this.height - this.colliderOffset;

        // Player's bounding box
        const pLeft   = player.x;
        const pRight  = player.x + player.collWidth;
        const pTop    = player.y + player.collOffsetY;
        const pBottom = pTop + player.collHeight;

        // Standard axis-aligned bounding box (AABB) check
        return (
            right > pLeft &&
            left < pRight &&
            bottom > pTop &&
            top < pBottom
        );
    }
}