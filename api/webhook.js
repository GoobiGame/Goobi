import { Telegraf } from 'telegraf';

// Bot token from BotFather (keep this secret!)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

// Game details
const GAME_SHORT_NAME = 'goobi';
const GAME_URL = 'https://goobi.vercel.app';

// Store game message details so we can update scores later
const cachedGameMessage = {};

/**
 * /start command: Sends the game message with a "Play goobi" button
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');
    const sentMsg = await ctx.replyWithGame(GAME_SHORT_NAME);
    console.log('sentMsg =', sentMsg);

    // Save the chat and message IDs for later score updates
    if (sentMsg && sentMsg.chat && typeof sentMsg.chat.id === 'number') {
      cachedGameMessage[ctx.from.id] = {
        chatId: sentMsg.chat.id,
        messageId: sentMsg.message_id,
      };
      console.log(`Stored for user=${ctx.from.id}: chatId=${sentMsg.chat.id}, messageId=${sentMsg.message_id}`);
    }
  } catch (err) {
    console.error('Error in /start command:', err);
    await ctx.reply('Something went wrong with /start.');
  }
});

/**
 * When someone taps "Play goobi"
 */
bot.on('callback_query', async (ctx) => {
  try {
    const query = ctx.callbackQuery;
    if (query.game_short_name === GAME_SHORT_NAME) {
      console.log('User tapped "Play" for short name:', GAME_SHORT_NAME);
      const userId = ctx.from.id;
      const stored = cachedGameMessage[userId];

      // Extract chat information from the callback query
      const chatId = query.message?.chat?.id?.toString() || query.chat_instance;
      const messageId = query.message?.message_id?.toString();

      // Fetch user details (username and PFP)
      let username = 'Player';
      let photoUrl = null;
      try {
        const user = await ctx.telegram.getChat(userId);
        if (user) {
          username = user.username || user.first_name || 'Player';
        }
        const photos = await ctx.telegram.getUserProfilePhotos(userId, { limit: 1 });
        if (photos.total_count > 0) {
          const fileId = photos.photos[0][0].file_id;
          const file = await ctx.telegram.getFile(fileId);
          photoUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
      }

      // Fetch high score for the game message using a direct API call
      let highScore = 0;
      let highScoreHolder = null;
      try {
        let payload = { user_id: userId };
        if (stored && stored.chatId && stored.messageId) {
          payload.chat_id = stored.chatId;
          payload.message_id = stored.messageId;
        } else if (stored && stored.inlineId) {
          payload.inline_message_id = stored.inlineId;
        } else if (chatId && messageId) {
          // Use chatId and messageId from the callback query if stored data is missing
          payload.chat_id = chatId;
          payload.message_id = messageId;
        }
        if (Object.keys(payload).length > 1) {
          const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getGameHighScores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (result.ok) {
            const highScores = result.result;
            if (highScores.length > 0) {
              highScore = highScores[0].score;
              highScoreHolder = highScores[0].user.username || highScores[0].user.first_name || 'Unknown';
            }
          } else {
            console.error('Failed to fetch high scores:', result);
          }
        }
      } catch (err) {
        console.error('Error fetching high scores:', err);
      }

      // Construct the game URL with userId, chatId, messageId, username, photo URL, and high score
      let gameUrl = `${GAME_URL}?user_id=${userId}`;
      if (chatId) {
        gameUrl += `&chat_id=${chatId}`;
      }
      if (messageId) {
        gameUrl += `&message_id=${messageId}`;
      } else if (stored && stored.inlineId) {
        gameUrl += `&inline_message_id=${stored.inlineId}`;
      }
      gameUrl += `&username=${encodeURIComponent(username)}`;
      if (photoUrl) {
        gameUrl += `&photo_url=${encodeURIComponent(photoUrl)}`;
      }
      gameUrl += `&high_score=${highScore}&high_score_holder=${encodeURIComponent(highScoreHolder || 'None')}`;

      console.log('Providing game URL:', gameUrl);
      await ctx.answerGameQuery(gameUrl);
    } else {
      await ctx.answerCallbackQuery({ text: 'Unknown game short name', show_alert: true });
    }
  } catch (err) {
    console.error('Error in callback_query:', err);
  }
});

/**
 * When someone types @YourBot in a chat
 */
bot.on('inline_query', async (ctx) => {
  try {
    console.log('Processing inline_query from user:', ctx.from.id);
    const results = [{ type: 'game', id: 'goobi_game_inline', game_short_name: GAME_SHORT_NAME }];
    await ctx.answerInlineQuery(results);
  } catch (err) {
    console.error('Error in inline_query:', err);
  }
});

/**
 * When someone selects the game inline
 */
bot.on('chosen_inline_result', async (ctx) => {
  try {
    console.log('chosen_inline_result =', ctx.chosenInlineResult);
    const userId = ctx.chosenInlineResult.from.id;
    const inlineId = ctx.chosenInlineResult.inline_message_id;
    cachedGameMessage[userId] = { inlineId };
    console.log(`Stored inlineId=${inlineId} for user=${userId}`);
  } catch (err) {
    console.error('Error in chosen_inline_result:', err);
  }
});

/**
 * /setscore <score>: For testing scores manually
 */
bot.command('setscore', async (ctx) => {
  try {
    const parts = ctx.message.text.split(' ');
    const newScore = parseInt(parts[1], 10) || 0;
    const userId = ctx.from.id;

    const stored = cachedGameMessage[userId];
    if (!stored) {
      return ctx.reply('No game message found. Try /start first.');
    }

    console.log(`Attempting setscore for user=${userId}, score=${newScore}`);
    console.log('stored =', stored);

    let payload = { user_id: userId, score: newScore, force: true };
    if (stored.chatId && stored.messageId) {
      payload.chat_id = stored.chatId;
      payload.message_id = stored.messageId;
    } else if (stored.inlineId) {
      payload.inline_message_id = stored.inlineId;
    } else {
      return ctx.reply('No valid chat or inline data stored.');
    }

    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/setGameScore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.ok) {
      console.error('Failed to set score:', result);
      throw new Error(result.description);
    }

    await ctx.reply(`Score of ${newScore} set for @${ctx.from.username || 'user'}. Check the game message!`);
  } catch (err) {
    console.error('Error in /setscore command:', err);
    await ctx.reply(`Failed to set score: ${err.message}`);
  }
});

/**
 * Vercel serverless function entry point
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    } else {
      return res.status(405).send('Method Not Allowed');
    }
  } catch (error) {
    console.error('Error processing update:', error);
    return res.status(500).json({ ok: false, error: error.toString() });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};