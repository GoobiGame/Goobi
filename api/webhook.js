import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
// Your mini app front-end (for the web_app button in /start)
const WEBAPP_URL = 'https://goobi.vercel.app';

// Create Telegraf bot instance
const bot = new Telegraf(TOKEN);

/**
 * /start command: Sends an image plus a "Play Goobi" web app button
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');

    // Full URL to your inlinePhoto.png in /assets
    const photoUrl = 'https://goobi.vercel.app/assets/inlinePhoto.png';

    // Inline keyboard with a web_app button
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Play Goobi', web_app: { url: WEBAPP_URL } }
        ]
      ]
    };

    // Send an image with a caption + button
    await ctx.replyWithPhoto(photoUrl, {
      caption: 'Welcome to GoobiBot! Click below to open the game.',
      reply_markup: keyboard
    });
  } catch (err) {
    console.error('Error in /start command:', err);
  }
});

/**
 * Inline query: Return an "article" result for "Play Goobi"
 * This approach is known to work reliably if inline mode is enabled.
 */
bot.on('inline_query', async (ctx) => {
  try {
    console.log('Processing inline query:', ctx.inlineQuery?.query);

    // We ignore the actual query text, just show "Play Goobi"
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

    // Return the single "article" result
    await ctx.answerInlineQuery(results);
  } catch (err) {
    console.error('Error in inline query:', err);
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

/**
 * Disable Next.js body parsing if needed
 */
export const config = {
  api: {
    bodyParser: false
  }
};