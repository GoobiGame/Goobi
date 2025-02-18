// scoreManager.js

export const ScoreManager = {
    // 1) Existing Local Storage Methods
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
  
    // 2) New Telegram Score Methods
    /**
     * setTelegramScore:
     *   Sends the player's final score to Telegram's scoreboard for the current chat/message.
     *   If userId, chatId, or messageId is missing, it just skips.
     */
    async setTelegramScore(score, userId, chatId, messageId) {
      // If we don't have the required data, do nothing
      if (!userId || !chatId || !messageId) {
        console.warn("Skipping setTelegramScore: missing userId/chatId/messageId.");
        return;
      }
  
      try {
        const response = await fetch(
          "https://script.google.com/macros/s/AKfycbw1ViZoDhZFhcaSZrY0FTAsI3i-KKFtKAkPuU_spdx9_1Yo17YQKBAgrHbKP7X5QRW14w/exec",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "setScore",
              user_id: userId,
              chat_id: chatId,
              message_id: messageId,
              score: score
            })
          }
        );
        const result = await response.json();
        console.log("setTelegramScore result:", result);
        // Expected: { ok: true, result: { ... } } or an error
      } catch (err) {
        console.error("Error in setTelegramScore:", err);
      }
    },
  
    /**
     * getChatHighScores:
     *   Fetches the scoreboard for the current chat/message from Telegram.
     *   Returns an array of objects: [{ username, score }, ...]
     */
    async getChatHighScores(userId, chatId, messageId) {
      if (!chatId || !messageId) {
        console.warn("Skipping getChatHighScores: missing chatId/messageId.");
        return [];
      }
  
      try {
        const response = await fetch(
          "https://script.google.com/macros/s/YOUR_APPS_SCRIPT_DEPLOY_ID/exec",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "getChatHighScores",
              user_id: userId, // Telegram requires a user_id param
              chat_id: chatId,
              message_id: messageId
            })
          }
        );
        const json = await response.json();
  
        if (json.ok) {
          // json.scores should be an array of { username, score }
          return json.scores || [];
        } else {
          console.error("getChatHighScores returned error:", json);
          return [];
        }
      } catch (err) {
        console.error("Error in getChatHighScores:", err);
        return [];
      }
    }
  };