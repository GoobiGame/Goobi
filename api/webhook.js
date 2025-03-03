import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBAPP_URL = 'https://goobi.vercel.app'; // Your mini app front-end

const bot = new Telegraf(TOKEN);

// /start command: send an image + "Play Goobi" web app button
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');
    const photoUrl = 'https://goobi.vercel.app/assets/inlinePhoto.png';

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Play Goobi', web_app: { url: WEBAPP_URL } }
        ]
      ]
    };

    await ctx.replyWithPhoto(photoUrl, {
      caption: 'Welcome to GoobiBot! Click below to open the game.',
      reply_markup: keyboard
    });
  } catch (err) {
    console.error('Error in /start command:', err);
  }
});

// Inline query remains the same
bot.on('inline_query', async (ctx) => {
  try {
    console.log('Processing inline query:', ctx.inlineQuery?.query);

    const thumbUrl = 'https://goobi.vercel.app/assets/inlinePhoto.png';
    const results = [
      {
        type: 'article',
        id: 'play',
        title: 'Play Goobi',
        description: 'Click to Launch Goobi',
        thumb_url: thumbUrl,
        thumb_width: 50,
        thumb_height: 50,
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

/**
 * Handle web_app_data from the Mini App
 * This event triggers when the user calls Telegram.WebApp.sendData(...)
 */
bot.on('message', async (ctx) => {
  try {
    // If it's a web_app_data message
    if (ctx.message?.web_app_data?.data) {
      const dataStr = ctx.message.web_app_data.data;
      console.log('Received web_app_data:', dataStr);

      const parsed = JSON.parse(dataStr);
      if (parsed.type === 'share_score') {
        // Post the text in the same chat
        await ctx.reply(parsed.text);
      }
    }
  } catch (err) {
    console.error('Error handling web_app_data message:', err);
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