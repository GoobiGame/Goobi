import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

// 1) The short name from BotFather, e.g. "goobi_game"
const GAME_SHORT_NAME = 'goobi';

// 2) The actual URL to your game (new index.html), e.g. "https://goobi.vercel.app/game/index.html"
//    or just "https://goobi.vercel.app" if that's where index.html is
const GAME_URL = 'https://goobi.vercel.app';

/**
 * /start command:
 * Sends a "Play <GAME_SHORT_NAME>" button in chat. 
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');
    // Telegram shows "Play GOOBI_GAME" button
    await ctx.replyWithGame(GAME_SHORT_NAME);
  } catch (err) {
    console.error('Error in /start command:', err);
    await ctx.reply('Something went wrong with /start.');
  }
});

/**
 * callback_query:
 * Triggered when user taps "Play" button for your short name.
 * We must answerGameQuery with the actual GAME_URL
 */
bot.on('callback_query', async (ctx) => {
  const query = ctx.callbackQuery;
  if (query.game_short_name === GAME_SHORT_NAME) {
    // Provide the game URL for Telegram to open
    await ctx.answerGameQuery(GAME_URL);
  } else {
    await ctx.answerCallbackQuery({
      text: 'Unknown game short name',
      show_alert: true
    });
  }
});

/**
 * (Optional) /setscore command:
 * Example for debugging or manual scoring.
 * Typically you'd set scores automatically from your game code,
 * calling your bot to run setGameScore(...) 
 */
bot.command('setscore', async (ctx) => {
  try {
    // e.g. user sends "/setscore 123"
    const parts = ctx.message.text.split(' ');
    const newScore = parseInt(parts[1], 10);

    // setGameScore requires user_id, score, and game_short_name
    await ctx.telegram.setGameScore(
      ctx.from.id,      // user_id
      newScore,         // score
      undefined,        // inline_message_id
      undefined,        // chat_id
      GAME_SHORT_NAME   // your short name
    );

    await ctx.reply(`Score of ${newScore} set for @${ctx.from.username || 'user'}`);
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

export const config = {
  api: {
    bodyParser: false
  }
};