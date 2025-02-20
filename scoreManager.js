// scoreManager.js

// Replace this with your actual Apps Script deployment URL:
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyx711WE6V1px9EP038NJt9yXrgw66ZL8uORfr_zQsS18XuEHj8uv4cSAffNTST3cxweg/exec";

export const ScoreManager = {
  // 1) Existing Local Storage Methods (unchanged)
  getHighScore() {
    return parseInt(localStorage.getItem("highScore")) || 0;
  },

  updateHighScore(currentScore) {
    const highScore = this.getHighScore();
    if (currentScore > highScore) {
      localStorage.setItem("highScore", currentScore);
      console.log(`New high score: ${currentScore}`);
    }
  },

  // 2) New Telegram Score Methods (Inline-based)

  /**
   * setTelegramScoreInline:
   *   Sends the player's final score to Telegram's scoreboard
   *   using inline_message_id (NOT chat_id/message_id).
   *
   *   If userId or inlineMessageId is missing, it just skips.
   */
  async setTelegramScoreInline(score, userId, inlineMessageId) {
    if (!userId || !inlineMessageId) {
      console.warn("Skipping setTelegramScoreInline: missing userId or inlineMessageId.");
      return;
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setScore",
          user_id: userId,
          inline_message_id: inlineMessageId,
          score: score
        })
      });
      const result = await response.json();
      console.log("setTelegramScoreInline result:", result);
      // Expected: { ok: true, result: { ... } } or an error
    } catch (err) {
      console.error("Error in setTelegramScoreInline:", err);
    }
  },

  /**
   * getInlineHighScores:
   *   Fetches the scoreboard for the current inline_message_id from Telegram.
   *   Returns an array of objects: [{ username, score, position }, ...]
   */
  async getInlineHighScores(userId, inlineMessageId) {
    if (!inlineMessageId) {
      console.warn("Skipping getInlineHighScores: missing inlineMessageId.");
      return [];
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getInlineHighScores",
          user_id: userId, // Telegram requires a user_id param
          inline_message_id: inlineMessageId
        })
      });
      const json = await response.json();

      if (json.ok) {
        // json.scores should be an array of { username, score, position }
        return json.scores || [];
      } else {
        console.error("getInlineHighScores returned error:", json);
        return [];
      }
    } catch (err) {
      console.error("Error in getInlineHighScores:", err);
      return [];
    }
  }
};