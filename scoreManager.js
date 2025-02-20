// scoreManager.js

export const ScoreManager = {
  // Store and retrieve the user's personal high score from localStorage
  getHighScore() {
    return parseInt(localStorage.getItem("highScore")) || 0;
  },

  updateHighScore(currentScore) {
    const highScore = this.getHighScore();
    if (currentScore > highScore) {
      localStorage.setItem("highScore", currentScore);
      console.log(`New local high score: ${currentScore}`);
    }
  }
};