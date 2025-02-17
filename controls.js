// controls.js
export function setupControls(player) {
    let keys = {};
    let activeKey = null;

    document.addEventListener("keydown", (e) => {
        keys[e.code] = true;
        if (e.code === "ArrowLeft") {
            activeKey = "left";
            player.moveLeft();
        }
        if (e.code === "ArrowRight") {
            activeKey = "right";
            player.moveRight();
        }
        if (e.code === "Space" && player.jumpKeyReleased) {
            player.jump();
        }
    });

    document.addEventListener("keyup", (e) => {
        keys[e.code] = false;
        if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
            if (e.code === "ArrowLeft" && activeKey === "left") {
                activeKey = keys["ArrowRight"] ? "right" : null;
                activeKey === "right" ? player.moveRight() : player.stop();
            }
            if (e.code === "ArrowRight" && activeKey === "right") {
                activeKey = keys["ArrowLeft"] ? "left" : null;
                activeKey === "left" ? player.moveLeft() : player.stop();
            }
        }
        if (e.code === "Space") {
            player.jumpKeyReleased = true;
        }
    });

    // Touch Controls
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
            activeKey = keys["ArrowRight"] ? "right" : null;
            activeKey === "right" ? player.moveRight() : player.stop();
        }
    });
    document.getElementById("rightBtn").addEventListener("touchend", () => {
        if (activeKey === "right") {
            activeKey = keys["ArrowLeft"] ? "left" : null;
            activeKey === "left" ? player.moveLeft() : player.stop();
        }
    });
    document.getElementById("jumpBtn").addEventListener("touchend", () => {
        player.jumpKeyReleased = true;
    });
}