// scoreManager.js
export const ScoreManager = {
    getHighScore() {
        return parseInt(localStorage.getItem("highScore")) || 0;
    },
    updateHighScore(currentScore) {
        const highScore = this.getHighScore();
        if (currentScore > highScore) {
            localStorage.setItem("highScore", currentScore);
            console.log(`New high score: ${currentScore}`);
        }
    }
};