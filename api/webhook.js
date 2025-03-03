import { Telegraf } from 'telegraf';

// 1) Bot token
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

// 2) The short name from BotFather, e.g. "goobi_game"
const GAME_SHORT_NAME = 'GOOBI_GAME';
// 3) The actual URL to your new index.html
const GAME_URL = 'https://goobi.vercel.app';

// We'll store chat_id and message_id in memory keyed by userId
// so we can call setGameScore later with the correct values.
const cachedGameMessage = {};

/**
 * /start command
 *  - Sends the game message using replyWithGame(GAME_SHORT_NAME).
 *  - We store the chat_id & message_id from the returned message.
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');

    // 1) Send the game message. 
    //    Telegram automatically shows "Play GOOBI_GAME" in the chat.
    const sentMsg = await ctx.replyWithGame(GAME_SHORT_NAME);

    // 2) Store the chat_id and message_id so we can update them later
    //    with setGameScore. Key by the user's ID (ctx.from.id).
    cachedGameMessage[ctx.from.id] = {
      chatId: sentMsg.chat.id,
      messageId: sentMsg.message_id
    };

  } catch (err) {
    console.error('Error in /start command:', err);
    await ctx.reply('Something went wrong with /start.');
  }
});

/**
 * callback_query:
 *  - Triggered when user taps "Play" in the chat for your short name.
 *  - We must answerGameQuery(GAME_URL) so Telegram loads your index.html.
 */
bot.on('callback_query', async (ctx) => {
  const query = ctx.callbackQuery;
  if (query.game_short_name === GAME_SHORT_NAME) {
    // Provide the game URL for Telegram to open in the game overlay
    await ctx.answerGameQuery(GAME_URL);
  } else {
    await ctx.answerCallbackQuery({
      text: 'Unknown game short name',
      show_alert: true
    });
  }
});

/**
 * /setscore <score>
 *  - For testing or debugging. In real usage, your game might call 
 *    a custom endpoint to set the score after the user finishes.
 */
bot.command('setscore', async (ctx) => {
  try {
    // e.g. user sends "/setscore 123"
    const parts = ctx.message.text.split(' ');
    const newScore = parseInt(parts[1], 10) || 0;
    const userId = ctx.from.id;

    // Retrieve the chat_id & message_id we stored in /start
    const stored = cachedGameMessage[userId];
    if (!stored) {
      return ctx.reply('No game message found for you. Please /start again.');
    }

    // Now call setGameScore with chat_id, message_id, and game_short_name
    // "force" ensures the message updates even if score is lower or same
    // but typically you only do that if newScore is higher than the old one
    await bot.telegram.setGameScore(
      userId, 
      newScore,
      {
        chat_id: stored.chatId,
        message_id: stored.messageId,
        force: true  // optional
      },
      GAME_SHORT_NAME
    );

    await ctx.reply(`Score of ${newScore} set for @${ctx.from.username || 'user'}. Check the chat message for "View Results"!`);
  } catch (err) {
    console.error('Error in /setscore command:', err);
    await ctx.reply('Failed to set score.');
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

// Vercel config
export const config = {
  api: {
    bodyParser: false
  }
};