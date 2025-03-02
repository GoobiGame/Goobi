import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { InlineKeyboardMarkup, InlineKeyboardButton } from 'telegraf/types'; // optional for types

// 1) Access your bot token from environment
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBAPP_URL = 'https://goobi.vercel.app'; // your mini app front-end
const BOT_USERNAME = 'goobigamebot'; // your bot's username (without @)

// 2) Create Telegraf bot instance
const bot = new Telegraf(TOKEN);

// 3) /start command: show a button linking to the mini app
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Play Goobi', web_app: { url: WEBAPP_URL } }
        ]
      ]
    };
    await ctx.reply(
      'Welcome to GoobiBot! Click below to open the game.',
      { reply_markup: keyboard }
    );
  } catch (err) {
    console.error('Error in /start command:', err);
  }
});

// 4) Inline query: show a single “Play Goobi” result
bot.on('inline_query', async (ctx) => {
  try {
    console.log('Processing inline query:', ctx.inlineQuery?.query);
    const queryText = (ctx.inlineQuery?.query || '').toLowerCase().trim();

    // We ignore the user's actual query for now, just show “Play Goobi”
    const results = [
      {
        type: 'article',
        id: 'play',
        title: 'Play Goobi',
        input_message_content: {
          message_text: 'Click to play Goobi: t.me/goobigamebot/goobi'
        },
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Play Goobi', url: 't.me/goobigamebot/goobi' }
            ]
          ]
        }
      }
    ];
    await ctx.answerInlineQuery(results);
  } catch (err) {
    console.error('Error in inline query:', err);
  }
});

// 5) Vercel serverless function entry point
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Telegram sends POST updates
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    } else {
      // If GET or anything else, respond with 405
      return res.status(405).send('Method Not Allowed');
    }
  } catch (e) {
    console.error('Error processing update:', e);
    return res.status(500).json({ ok: false, error: e.toString() });
  }
}

// 6) We can disable Next.js body parsing if using Next's built-in routes
export const config = {
  api: {
    bodyParser: false
  }
};