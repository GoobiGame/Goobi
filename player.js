// player.js

export class Player {
    constructor(canvas) {
        // === SPRITE DRAWING DIMENSIONS ===
        // We'll draw the sprite at 50×50 on the canvas
        this.spriteWidth = 50;
        this.spriteHeight = 50;

        // Position on the canvas
        this.x = canvas.width / 2 - this.spriteWidth / 2;
        this.y = canvas.height - 30 - this.spriteHeight - 50;
        this.worldY = this.y;

        // === COLLISION BOX ===
        this.collWidth = 50;
        this.collHeight = 40;
        this.collOffsetY = 10;

        // Movement / physics
        this.dy = 0;                
        this.dx = 0;                
        this.gravity = 600;         
        this.jumpPower = -400;      
        this.speed = 180;           

        this.onGround = false;
        this.jumpKeyReleased = true;
        this.doubleJumpUsed = false;

        // === ANIMATION SPRITES (assumed 480×120 each) ===
        // 4 frames across (120×120 per frame)
        this.idleImg = new Image();
        this.idleImg.src = "assets/idleBoard.png";

        this.rollImg = new Image();
        this.rollImg.src = "assets/rollBoard.png";

        this.jumpImg = new Image();
        this.jumpImg.src = "assets/jumpBoard.png";

        // We'll track the current animation and frame
        this.currentAnimation = "idle";
        this.totalFrames = 4; // 4 frames horizontally

        // We'll store different speeds for each animation (seconds per frame)
        this.animSpeeds = {
            idle: 0.15,
            roll: 0.15,
            jump: 0.3  // slower = stays on each jump frame longer
        };

        this.frameIndex = 0;
        this.frameTimer = 0;


    }

    update(platforms, canvasWidth, delta) {
        // 1) Gravity
        this.dy += this.gravity * delta;
        this.y += this.dy * delta;
        this.worldY += this.dy * delta;

        // 2) Horizontal movement
        this.x += this.dx * delta;

        // 3) Platform collisions
        let onPlatform = false;
        let platformSpeed = 0;

        let boxTop = this.y + this.collOffsetY;
        let boxBottom = boxTop + this.collHeight;
        let boxRight = this.x + this.collWidth;
        let boxLeft = this.x;

        platforms.forEach(platform => {
            // Landing on top
            if (
                this.dy >= 0 &&
                boxBottom >= platform.y &&
                (boxBottom - this.dy * delta) <= platform.y &&
                boxRight > platform.x &&
                boxLeft < platform.x + platform.width
            ) {
                this.dy = platform.isDropping ? 60 : 0;
                // place bounding box bottom at platform.y
                this.y = platform.y - this.collHeight - this.collOffsetY;
                this.worldY = this.y;

                onPlatform = true;
                this.doubleJumpUsed = false;

                if (platform.isMoving) {
                    platformSpeed = platform.speed * platform.direction;
                }
            }

            // Prevent jumping up through
            if (
                this.dy < 0 &&
                boxTop < (platform.y + platform.height) &&
                (boxTop - this.dy * delta) >= (platform.y + platform.height) &&
                boxRight > platform.x &&
                boxLeft < platform.x + platform.width
            ) {
                this.dy = 0;
                // boxTop = platform.y + platform.height
                this.y = (platform.y + platform.height) - this.collOffsetY;
            }
        });

        this.onGround = onPlatform;
        if (onPlatform) {
            // move with platform horizontally
            this.x += platformSpeed * delta;
        }

        // 4) Constrain within canvas
        if (this.x < 0) this.x = 0;
        if (this.x + this.collWidth > canvasWidth) {
            this.x = canvasWidth - this.collWidth;
        }

        // === DECIDE WHICH ANIMATION TO PLAY ===
        // 1) If we're not on the ground AND dx != 0 => "roll"
        // 2) If we're not on the ground => "jump"
        // 3) Else if dx != 0 => "roll"
        // 4) Else => "idle"
        if (!this.onGround && this.dx !== 0) {
            this.currentAnimation = "roll";
        } else if (!this.onGround) {
            this.currentAnimation = "jump";
        } else if (this.dx !== 0) {
            this.currentAnimation = "roll";
        } else {
            this.currentAnimation = "idle";
        }

        // === Animate frames based on current animation speed ===
        const currentInterval = this.animSpeeds[this.currentAnimation];
        this.frameTimer += delta;
        if (this.frameTimer >= currentInterval) {
            this.frameTimer = 0;
            this.frameIndex = (this.frameIndex + 1) % this.totalFrames;
        }
    }

    jump() {
        if (this.onGround) {
            this.dy = this.jumpPower;
            this.onGround = false;
        } else if (!this.doubleJumpUsed && this.jumpKeyReleased) {
            this.dy = this.jumpPower;
            this.doubleJumpUsed = true;
        }
        this.jumpKeyReleased = false;
    }

    moveLeft() {
        this.dx = -this.speed;
    }

    moveRight() {
        this.dx = this.speed;
    }

    stop() {
        this.dx = 0;
    }

    draw(ctx) {
        let spriteSheet;
        switch (this.currentAnimation) {
            case "jump":
                spriteSheet = this.jumpImg;
                break;
            case "roll":
                spriteSheet = this.rollImg;
                break;
            default:
                spriteSheet = this.idleImg;
                break;
        }

        // Each sheet is 480×120 with 4 frames horizontally, each 120×120
        const frameWidth = 120;
        const frameHeight = 120;

        // source x,y based on the current frame
        const sx = this.frameIndex * frameWidth;
        const sy = 0; // single row

        // Draw the higher-res 120×120 frame into a 50×50 box on the canvas
        ctx.drawImage(
            spriteSheet,
            sx, sy,
            frameWidth, frameHeight,
            this.x, this.y,
            this.spriteWidth, this.spriteHeight
        );

        // Debug bounding box if enabled
        if (window.debug) {
            ctx.strokeStyle = "lime";
            ctx.lineWidth = 2;
            ctx.strokeRect(
                this.x,
                this.y + this.collOffsetY,
                this.collWidth,
                this.collHeight
            );
        }
    }
}