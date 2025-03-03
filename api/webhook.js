import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBAPP_URL = 'https://goobi.vercel.app'; // your mini app front-end

const bot = new Telegraf(TOKEN);

/**
 * /start command:
 *  - If private chat, show the web_app button & photo
 *  - If group, fallback to a simple message
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');
    if (ctx.chat.type === 'private') {
      // Private chat => web_app is valid
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
    } else {
      // Group chat => just send a normal message
      await ctx.reply('This command works best in a private chat.\nTry /play if you want a link to share here.');
    }
  } catch (err) {
    console.error('Error in /start command:', err);
  }
});

/**
 * /play command:
 *  - If used in a group, just send a raw link
 *  - If private, also send the link
 */
bot.command('play', async (ctx) => {
  try {
    console.log('Processing /play command');
    // If you want the same logic for private or group, you can unify it
    await ctx.reply('Play Goobi here: https://t.me/goobigamebot/goobi');
  } catch (err) {
    console.error('Error in /play command:', err);
  }
});

/**
 * Inline query remains the same if you want
 */
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
 */
bot.on('message', async (ctx) => {
  try {
    // If it's a web_app_data message
    if (ctx.message?.web_app_data?.data) {
      const dataStr = ctx.message.web_app_data.data;
      console.log('Received web_app_data:', dataStr);

      const parsed = JSON.parse(dataStr);
      if (parsed.type === 'share_score') {
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