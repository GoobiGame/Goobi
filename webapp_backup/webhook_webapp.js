import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
// We won't use a "web_app" URL anymore, so let's just keep this around if needed:
const WEBAPP_URL = 'https://goobi.vercel.app';

const bot = new Telegraf(TOKEN);

/**
 * /start command:
 *  - If private chat, just send the same link as /play
 *  - If group, fallback to a simple message
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');
    if (ctx.chat.type === 'private') {
      // Instead of web_app, just send the direct link
      await ctx.reply('Play Goobi here: https://t.me/goobigamebot/goobi');
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
 *  - If used in a group or private, just send a raw link
 */
bot.command('play', async (ctx) => {
  try {
    console.log('Processing /play command');
    // Unified logic for private or group: send the direct link
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
 * (If you're no longer using web_app in /start, this might be unused,
 * but we'll keep it in case you still have references or future usage.)
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