import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

// Your short name from BotFather, e.g. "goobi"
const GAME_SHORT_NAME = 'goobi';
// Your game URL where index.html is hosted
const GAME_URL = 'https://goobi.vercel.app';

// We'll store (chat_id, message_id) for each user in memory
const cachedGameMessage = {};

/**
 * /start command
 * Sends the game message with replyWithGame(short_name).
 * We store the chat_id & message_id for setGameScore later.
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');

    // 1) Send the game message
    const sentMsg = await ctx.replyWithGame(GAME_SHORT_NAME);

    // 2) Store chat_id & message_id in memory, keyed by userId
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
 * callback_query for the game:
 *  - Called when user taps "Play <GAME_SHORT_NAME>" in the chat
 *  - We must call answerGameQuery(GAME_URL) quickly (within ~15s).
 */
bot.on('callback_query', async (ctx) => {
  try {
    const query = ctx.callbackQuery;
    if (query.game_short_name === GAME_SHORT_NAME) {
      console.log('User tapped "Play" for short name:', GAME_SHORT_NAME);
      // Immediately answer with the game URL
      await ctx.answerGameQuery(GAME_URL);
    } else {
      // Possibly an unknown short name
      await ctx.answerCallbackQuery({
        text: 'Unknown game short name',
        show_alert: true
      });
    }
  } catch (err) {
    console.error('Error in callback_query:', err);
  }
});

/**
 * /setscore <score>
 *  - For testing. Real usage might do an HTTP request from the game code.
 */
bot.command('setscore', async (ctx) => {
  try {
    // e.g. "/setscore 123"
    const parts = ctx.message.text.split(' ');
    const newScore = parseInt(parts[1], 10) || 0;
    const userId = ctx.from.id;

    // Get the stored chat_id & message_id
    const stored = cachedGameMessage[userId];
    if (!stored) {
      return ctx.reply('No game message found for you. Please /start again.');
    }

    await bot.telegram.setGameScore(
      userId,
      newScore,
      {
        chat_id: stored.chatId,
        message_id: stored.messageId,
        force: true // ensure scoreboard updates even if same/lower
      },
      GAME_SHORT_NAME
    );

    await ctx.reply(
      `Score of ${newScore} set for @${ctx.from.username || 'user'}. ` +
      `Check the original game message in chat for "View Results"!`
    );
  } catch (err) {
    console.error('Error in /setscore command:', err);
    await ctx.reply('Failed to set score.');
  }
});

/**
 * Inline query handler:
 *  - Re-add so inline mode works again. 
 *  - This is a minimal example returning a single "game" result 
 *    so user can type "@YourBot" in any chat and see "Play goobi".
 */
bot.on('inline_query', async (ctx) => {
  try {
    const queryText = ctx.inlineQuery?.query || '';
    console.log('Processing inline query:', queryText);

    // Return an inline "game" result
    const results = [
      {
        type: 'game',
        id: 'goobi_game_inline',
        game_short_name: GAME_SHORT_NAME
      }
    ];

    // Respond to the inline query
    await ctx.answerInlineQuery(results);
  } catch (err) {
    console.error('Error in inline_query:', err);
  }
});

/**
 * Vercel serverless function entry point
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Telegraf handle the incoming update
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