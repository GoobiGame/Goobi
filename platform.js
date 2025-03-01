// platform.js
import { getRandomInt } from './utils.js';

// Load the platform.svg file as a standard Image
const platformImg = new Image();
platformImg.src = "assets/platform.svg";

export class Platform {
    /**
     * @param {number} x - Platform's left coordinate
     * @param {number} y - Platform's top coordinate
     * @param {number} width - Platform width in px
     * @param {number} height - Platform height in px
     * @param {boolean} isMoving - True if the platform moves horizontally
     * @param {boolean} isDropping - True if the platform is a "dropping" platform
     */
    constructor(x, y, width, height, isMoving = false, isDropping = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isMoving = isMoving;
        this.isDropping = isDropping;

        // Speed for moving platforms
        this.speed = isMoving ? 60 : 0; // px/s
        this.direction = 1;
    }

    /**
     * Called each frame to update platform logic.
     * @param {object} player - The player object
     * @param {number} canvasWidth - The width of the game canvas
     * @param {number} delta - Time delta in seconds
     */
    update(player, canvasWidth, delta) {
        // 1) Horizontal movement if isMoving
        if (this.isMoving) {
            this.x += this.speed * this.direction * delta;
            // Reverse direction if we hit canvas edges
            if (this.x <= 0 || this.x + this.width >= canvasWidth) {
                this.direction *= -1;
            }
        }

        // 2) Dropping logic
        // Use the player's collision box instead of player.width / player.height
        const pLeft   = player.x;
        const pRight  = player.x + player.collWidth;
        const pTop    = player.y + player.collOffsetY;
        const pBottom = pTop + player.collHeight;

        const playerOnPlatform =
            (pRight > this.x) &&
            (pLeft < this.x + this.width) &&
            // Check if player's feet are near the top of this platform
            Math.abs(pBottom - this.y) < 5;

        if (this.isDropping && playerOnPlatform) {
            // Move the platform downward
            this.y += 60 * delta;
        }
    }

    /**
     * Draw the platform onto the main canvas.
     * - Static/Moving: use the SVG as-is.
     * - Dropping: overlay a red gradient on the SVG.
     */
    draw(ctx) {
        // If the SVG isn't fully loaded yet, skip drawing
        if (!platformImg.complete) return;

        if (!this.isDropping) {
            // Normal or moving platform: use the SVG's original color/gradient
            ctx.drawImage(
                platformImg,
                0, 0, platformImg.width, platformImg.height, // source rect
                this.x, this.y,                               // destination coords
                this.width, this.height                       // scale to platform size
            );
        } else {
            // Dropping platform: create a red gradient overlay
            // 1) Draw the SVG onto an offscreen canvas
            const offscreen = document.createElement('canvas');
            offscreen.width = this.width;
            offscreen.height = this.height;
            const offCtx = offscreen.getContext('2d');

            offCtx.drawImage(
                platformImg,
                0, 0, platformImg.width, platformImg.height,
                0, 0,
                this.width, this.height
            );

            // 2) Tint it red with a gradient
            offCtx.globalCompositeOperation = 'source-in';
            const gradient = offCtx.createLinearGradient(0, 0, 0, this.height);
            gradient.addColorStop(0, '#ff9999');
            gradient.addColorStop(1, '#ff0000');
            offCtx.fillStyle = gradient;
            offCtx.fillRect(0, 0, this.width, this.height);

            // 3) Draw the tinted result to the main canvas
            ctx.drawImage(offscreen, this.x, this.y);
        }

        // Show platform collider if DEBUG is true
    if (window.DEBUG) {
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    }
}

/**
 * Generate an array of platforms with random properties,
 * as your old code did.
 * @param {number} count - Number of platforms to generate
 * @param {number} canvasHeight - The canvas height
 * @param {number} canvasWidth - The canvas width
 * @returns {Platform[]} Array of platform instances
 */
export function generatePlatforms(count, canvasHeight, canvasWidth) {
    let platforms = [];

    // Ground platform at the bottom
    platforms.push(new Platform(0, canvasHeight - 30, canvasWidth, 30, false, false));

    for (let i = 1; i < count; i++) {
        // Increase this if you want taller platforms:
        let w = getRandomInt(50, 100);
        let h = 20; // <-- try 40 or 50 if you want bigger platforms
        let x = getRandomInt(0, canvasWidth - w);
        let y = platforms[platforms.length - 1].y - 100;

        // Randomly decide dropping or moving
        let isDropping = Math.random() < 0.2; // 20% chance
        let isMoving = !isDropping && Math.random() < 0.5;

        platforms.push(new Platform(x, y, w, h, isMoving, isDropping));
    }
    return platforms;
}