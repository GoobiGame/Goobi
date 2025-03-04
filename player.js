export class Player {
    constructor(canvas) {
      // === SPRITE DRAWING DIMENSIONS ===
      this.spriteWidth = 50;
      this.spriteHeight = 50;
  
      // Position on the canvas
      this.x = canvas.width / 2 - this.spriteWidth / 2;
      this.y = canvas.height - 30 - this.spriteHeight; // Place directly on the ground
      this.worldY = this.y;
  
      // === COLLISION BOX ===
      this.collWidth = 40; // Reduced to match visible sprite body
      this.collHeight = 40;
      this.collOffsetX = 5; // Center the collider horizontally
      this.collOffsetY = 10; // Lower the collider to align with visible sprite body
  
      // Movement / physics
      this.dx = 0;
      this.dy = 0;
      this.intendedDx = 0; // Track intended horizontal direction
      this.gravity = 600;
      this.jumpPower = -400;
      this.speed = 180;
  
      this.onGround = true; // Start on ground
      this.canDoubleJump = false;
      this.isJumpHeld = false;
  
      // === ANIMATION SPRITES (assumed 480×120 each) ===
      this.idleImg = new Image();
      this.idleImg.src = "assets/idleBoard.png";
  
      this.rollImg = new Image();
      this.rollImg.src = "assets/rollBoard.png";
  
      this.jumpImg = new Image();
      this.jumpImg.src = "assets/jumpBoard.png";
  
      this.currentAnimation = "idle";
      this.totalFrames = 4;
      this.animSpeeds = {
        idle: 0.15,
        roll: 0.15,
        jump: 0.3
      };
      this.frameIndex = 0;
      this.frameTimer = 0;
    }
  
    update(platforms, canvasWidth, delta) {
      // 1) Apply gravity
      this.dy += this.gravity * delta;
  
      // 2) Calculate new position tentatively
      let newX = this.x + this.dx * delta;
      let newY = this.y + this.dy * delta;
  
      // 3) Predictive vertical collision check (downward movement)
      let onPlatform = false;
      let platformSpeed = 0;
  
      let boxTop = this.y + this.collOffsetY;
      let boxBottom = boxTop + this.collHeight;
      let boxRight = this.x + this.collOffsetX + this.collWidth;
      let boxLeft = this.x + this.collOffsetX;
  
      let newBoxTop = newY + this.collOffsetY;
      let newBoxBottom = newBoxTop + this.collHeight;
      let newBoxRight = newX + this.collOffsetX + this.collWidth;
      let newBoxLeft = newX + this.collOffsetX;
  
      if (this.dy >= 0) {
        platforms.forEach(platform => {
          const platLeft = platform.x;
          const platRight = platform.x + platform.width;
          const platTop = platform.y;
          const platBottom = platform.y + platform.height;
  
          // Check if the player's trajectory intersects the platform
          if (
            boxBottom <= platTop &&
            newBoxBottom >= platTop &&
            boxRight > platLeft &&
            boxLeft < platRight
          ) {
            // Snap to the platform's top
            newY = platTop - this.collHeight - this.collOffsetY;
            this.dy = platform.isDropping ? 60 : 0; // Match dropping platform speed
            onPlatform = true;
            this.canDoubleJump = true;
  
            if (platform.isMoving) {
              platformSpeed = platform.speed * platform.direction;
            }
  
            // Update collision box for side collision checks
            newBoxTop = newY + this.collOffsetY;
            newBoxBottom = newBoxTop + this.collHeight;
          }
        });
      }
  
      // Apply vertical movement
      this.y = newY;
      this.worldY = this.y;
  
      // 4) Predictive horizontal collision check (only if not on a platform)
      let isBlockedHorizontally = false; // Track if a platform is blocking horizontal movement
  
      if (!onPlatform) {
        platforms.forEach(platform => {
          const platLeft = platform.x;
          const platRight = platform.x + platform.width;
          const platTop = platform.y;
          const platBottom = platform.y + platform.height;
  
          // Relaxed vertical overlap to catch platforms slightly above or below
          if (
            boxBottom > platTop - 5 &&
            boxTop < platBottom + 5
          ) {
            if (this.dx < 0) {
              // Moving left: Check both vertical edges
              if (
                (boxRight > platLeft && newBoxRight < platLeft + 5) || // Approaching left edge from right
                (boxRight <= platLeft + 5 && boxRight > platLeft) // Overlapping left edge
              ) {
                newX = platLeft - this.collWidth - this.collOffsetX;
                this.dx = 0;
                isBlockedHorizontally = true;
              } else if (
                (boxLeft < platRight && newBoxLeft > platRight - 5) || // Approaching right edge from left
                (boxLeft >= platRight - 5 && boxLeft < platRight) // Overlapping right edge
              ) {
                newX = platRight - this.collOffsetX;
                this.dx = 0;
                isBlockedHorizontally = true;
              }
            } else if (this.dx > 0) {
              // Moving right: Check both vertical edges
              if (
                (boxLeft < platRight && newBoxLeft > platRight - 5) || // Approaching right edge from left
                (boxLeft >= platRight - 5 && boxLeft < platRight) // Overlapping right edge
              ) {
                newX = platRight - this.collOffsetX;
                this.dx = 0;
                isBlockedHorizontally = true;
              } else if (
                (boxRight > platLeft && newBoxRight < platLeft + 5) || // Approaching left edge from right
                (boxRight <= platLeft + 5 && boxRight > platLeft) // Overlapping left edge
              ) {
                newX = platLeft - this.collWidth - this.collOffsetX;
                this.dx = 0;
                isBlockedHorizontally = true;
              }
            }
          }
        });
      }
  
      // Restore dx to intendedDx if no platform is blocking horizontally
      if (!isBlockedHorizontally) {
        this.dx = this.intendedDx;
      }
  
      // Apply horizontal movement
      this.x = newX;
  
      // 5) Check for collisions when moving up (underside of platforms)
      if (this.dy < 0) {
        platforms.forEach(platform => {
          const platLeft = platform.x;
          const platRight = platform.x + platform.width;
          const platTop = platform.y;
          const platBottom = platform.y + platform.height;
  
          if (
            boxTop < platBottom &&
            (boxTop - this.dy * delta) >= platBottom &&
            boxRight > platLeft &&
            boxLeft < platRight
          ) {
            this.dy = 0;
            this.y = platBottom - this.collOffsetY;
          }
        });
      }
  
      this.onGround = onPlatform;
      if (onPlatform) {
        this.x += platformSpeed * delta;
      }
  
      // Constrain within canvas
      if (this.x < 0) this.x = 0;
      if (this.x + this.collWidth + this.collOffsetX > canvasWidth) {
        this.x = canvasWidth - this.collWidth - this.collOffsetX;
      }
  
      // === DECIDE WHICH ANIMATION TO PLAY ===
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
  
    jump(isJumpPressed) {
      if (isJumpPressed && !this.isJumpHeld) {
        if (this.onGround) {
          this.dy = this.jumpPower;
          this.onGround = false;
          this.canDoubleJump = true;
        } else if (this.canDoubleJump) {
          this.dy = this.jumpPower;
          this.canDoubleJump = false;
        }
      }
      this.isJumpHeld = isJumpPressed;
    }
  
    moveLeft() {
      this.intendedDx = -this.speed;
      this.dx = this.intendedDx;
    }
  
    moveRight() {
      this.intendedDx = this.speed;
      this.dx = this.intendedDx;
    }
  
    stop() {
      this.intendedDx = 0;
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
  
      // Source x,y based on the current frame
      const sx = this.frameIndex * frameWidth;
      const sy = 0; // single row
  
      // Draw the higher-res 120×120 frame into a 50×50 box on the canvas
      ctx.drawImage(
        spriteSheet,
        sx, sy,
        frameWidth, frameHeight,
        this.x, this.y,
        this.spriteWidth,
        this.spriteHeight
      );
  
      // Debug bounding box if enabled
      if (window.debug) {
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          this.x + this.collOffsetX,
          this.y + this.collOffsetY,
          this.collWidth,
          this.collHeight
        );
      }
    }
  }