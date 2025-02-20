// controls.js
export function setupControls(player) {
    let keys = {};
    let activeKey = null;

    document.addEventListener("keydown", (e) => {
        keys[e.code] = true;

        // ArrowLeft OR KeyA => move left
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
            activeKey = "left";
            player.moveLeft();
        }

        // ArrowRight OR KeyD => move right
        if (e.code === "ArrowRight" || e.code === "KeyD") {
            activeKey = "right";
            player.moveRight();
        }

        // Space => jump
        if (e.code === "Space" && player.jumpKeyReleased) {
            player.jump();
        }
    });

    document.addEventListener("keyup", (e) => {
        keys[e.code] = false;

        // Stop moving left if user released ArrowLeft or KeyA
        if ((e.code === "ArrowLeft" || e.code === "KeyA") && activeKey === "left") {
            // Check if right arrow/d is still held
            if (keys["ArrowRight"] || keys["KeyD"]) {
                activeKey = "right";
                player.moveRight();
            } else {
                activeKey = null;
                player.stop();
            }
        }

        // Stop moving right if user released ArrowRight or KeyD
        if ((e.code === "ArrowRight" || e.code === "KeyD") && activeKey === "right") {
            // Check if left arrow/a is still held
            if (keys["ArrowLeft"] || keys["KeyA"]) {
                activeKey = "left";
                player.moveLeft();
            } else {
                activeKey = null;
                player.stop();
            }
        }

        // Space => reset jumpKeyReleased
        if (e.code === "Space") {
            player.jumpKeyReleased = true;
        }
    });

    // Touch Controls (unchanged)
    document.getElementById("leftBtn").addEventListener("touchstart", () => {
        activeKey = "left";
        player.moveLeft();
    });
    document.getElementById("rightBtn").addEventListener("touchstart", () => {
        activeKey = "right";
        player.moveRight();
    });
    document.getElementById("jumpBtn").addEventListener("touchstart", () => {
        if (player.jumpKeyReleased) {
            player.jump();
            player.jumpKeyReleased = false;
        }
    });
    document.getElementById("leftBtn").addEventListener("touchend", () => {
        if (activeKey === "left") {
            activeKey = keys["ArrowRight"] || keys["KeyD"] ? "right" : null;
            activeKey === "right" ? player.moveRight() : player.stop();
        }
    });
    document.getElementById("rightBtn").addEventListener("touchend", () => {
        if (activeKey === "right") {
            activeKey = keys["ArrowLeft"] || keys["KeyA"] ? "left" : null;
            activeKey === "left" ? player.moveLeft() : player.stop();
        }
    });
    document.getElementById("jumpBtn").addEventListener("touchend", () => {
        player.jumpKeyReleased = true;
    });
}