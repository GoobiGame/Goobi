import { Telegraf } from 'telegraf';

// 1) Environment variables
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBAPP_URL = 'https://goobi.vercel.app'; // Your mini app front-end
const BOT_USERNAME = 'goobigamebot'; // Your bot's username (without @)

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

// 4) Inline query: return one “photo” result
bot.on('inline_query', async (ctx) => {
  try {
    console.log('Processing inline query:', ctx.inlineQuery?.query);

    // Full domain for your deployed Vercel project
    // e.g. 'https://goobi.vercel.app'
    const fullDomain = 'https://goobi.vercel.app';

    // The main photo and thumbnail stored in /assets
    // Replace these filenames with yours if needed
    const photoUrl = `${fullDomain}/assets/inlinePhoto.png`;
    const thumbUrl = `${fullDomain}/assets/thumbImage.png`;

    // Build a single photo result
    const results = [
      {
        type: 'photo',
        id: 'photo-1',
        photo_url: photoUrl,
        thumb_url: thumbUrl,
        caption: 'Inline photo from the assets folder!'
      }
    ];

    // Send the results to Telegram
    await ctx.answerInlineQuery(results);
  } catch (err) {
    console.error('Error in inline query with photo:', err);
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

// 6) Disable body parsing if using Next.js-style routes (optional)
export const config = {
  api: {
    bodyParser: false
  }
};