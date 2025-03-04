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

      // Construct the game URL with chatId and messageId
      let gameUrl = GAME_URL;
      if (stored && stored.chatId && stored.messageId) {
        gameUrl = `${GAME_URL}?user_id=${userId}&chat_id=${stored.chatId}&message_id=${stored.messageId}`;
      }
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

    let options = {};
    if (stored.chatId && stored.messageId) {
      options.chat_id = stored.chatId;
      options.message_id = stored.messageId;
    } else if (stored.inlineId) {
      options.inline_message_id = stored.inlineId;
    } else {
      return ctx.reply('No valid chat or inline data stored.');
    }

    await ctx.telegram.setGameScore(userId, newScore, {
      ...options,
      force: true,
    });

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