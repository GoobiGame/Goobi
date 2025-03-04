export function setupControls(player) {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        player.moveLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        player.moveRight();
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        player.jump();
      }
    });
  
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (!player.rightPressed) {
          player.stop();
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (!player.leftPressed) {
          player.stop();
        }
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        player.jumpKeyReleased = true;
      }
    });
  
    // Joystick controls for touch
    const joystick = document.getElementById('joystick');
    const joystickThumb = document.getElementById('joystickThumb');
    const jumpBtn = document.getElementById('jumpBtn');
  
    let touchId = null;
    let joystickCenterX = joystick.offsetWidth / 2;
    let joystickCenterY = joystick.offsetHeight / 2;
    const maxDistance = 30; // Maximum distance the thumb can move from the center
  
    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      updateJoystick(touch);
    });
  
    joystick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
      if (touch) {
        updateJoystick(touch);
      }
    });
  
    joystick.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
      if (touch) {
        touchId = null;
        joystickThumb.style.transform = 'translate(0px, 0px)';
        player.stop();
      }
    });
  
    function updateJoystick(touch) {
      const rect = joystick.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
  
      // Calculate the distance from the center
      const dx = touchX - joystickCenterX;
      const dy = touchY - joystickCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
  
      // Restrict to horizontal movement only
      let constrainedX = dx;
      let constrainedY = 0; // Keep Y at 0 for horizontal-only movement
  
      // Limit the distance
      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        constrainedX = maxDistance * Math.cos(angle);
        constrainedY = 0; // Keep Y at 0
      }
  
      joystickThumb.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
  
      // Move the player based on joystick position
      if (constrainedX < -10) { // Threshold to avoid jitter
        player.moveLeft();
      } else if (constrainedX > 10) {
        player.moveRight();
      } else {
        player.stop();
      }
    }
  
    // Jump button
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      player.jump();
    });
  
    jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      player.jumpKeyReleased = true; // Allow double jump after releasing
    });
  
    // Mouse support for desktop (optional, for testing)
    let isDragging = false;
  
    joystick.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      updateJoystickMouse(e);
    });
  
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        updateJoystickMouse(e);
      }
    });
  
    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        e.preventDefault();
        isDragging = false;
        joystickThumb.style.transform = 'translate(0px, 0px)';
        player.stop();
      }
    });
  
    function updateJoystickMouse(e) {
      const rect = joystick.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
  
      const dx = mouseX - joystickCenterX;
      const dy = mouseY - joystickCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
  
      let constrainedX = dx;
      let constrainedY = 0;
  
      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        constrainedX = maxDistance * Math.cos(angle);
        constrainedY = 0;
      }
  
      joystickThumb.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
  
      if (constrainedX < -10) {
        player.moveLeft();
      } else if (constrainedX > 10) {
        player.moveRight();
      } else {
        player.stop();
      }
    }
  
    jumpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      player.jump();
    });
  
    jumpBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      player.jumpKeyReleased = true; // Allow double jump after releasing on desktop
    });
  }