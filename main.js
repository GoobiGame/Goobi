// main.js
import { startGame } from './game.js';

// Wait for the DOM to be fully loaded before initializing the game
document.addEventListener('DOMContentLoaded', () => {
  // Disable long-press, pinch-zoom, and context menu events

  // Get the canvas element
  const canvas = document.getElementById("gameCanvas");
  if (canvas) {
    // Disable the context menu on the canvas
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  // Prevent pinch-zoom and multi-touch gestures globally
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent gesture events (e.g., pinch-zoom, rotate) globally
  document.addEventListener("gesturestart", (e) => {
    e.preventDefault();
  });

  // Prevent the context menu on the entire document
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // === NEW: Prevent double-tap zoom ===
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    // If a second tap comes within 300ms of the last one, prevent default
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  // === END NEW CODE ===

  // --- New start screen logic added below ---
  // If the session flag indicates we should skip the start screen (e.g., after a game-over restart), start immediately.
  if (sessionStorage.getItem("skipStartScreen") === "true") {
    startGame();
  } else {
    // Otherwise, show the start screen overlay and wait for the user to click "Start"
    const startScreen = document.getElementById("startScreen");
    const startVideo = document.getElementById("startVideo");
    const startButton = document.getElementById("startButton");
    // Display the start screen overlay
    startScreen.style.display = "flex";
    // Play the start video
    startVideo.play();
    // Add event listener for the Start button
    startButton.addEventListener("click", () => {
      // Set the flag so that subsequent reloads (from game over) skip the start screen.
      sessionStorage.setItem("skipStartScreen", "true");
      // Hide the start screen overlay
      startScreen.style.display = "none";
      // Now start the game
      startGame();
    });
  }
});