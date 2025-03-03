import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

// 1) Your short name from BotFather
const GAME_SHORT_NAME = 'goobi';
// 2) URL to your index.html
const GAME_URL = 'https://goobi.vercel.app';

// We'll store data in memory keyed by userId, e.g. { chatId, messageId, inlineId }
const cachedGameMessage = {};

/**
 * /start command:
 *  - If it's a normal chat (private/group), replyWithGame returns { chat: { id }, message_id }
 *  - If for some reason it doesn't, we'll see what we get in "sentMsg"
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');

    const sentMsg = await ctx.replyWithGame(GAME_SHORT_NAME);

    // Let's log what we got
    console.log('sentMsg =', sentMsg);

    // If it's a normal message, we get sentMsg.chat.id and sentMsg.message_id
    if (sentMsg && sentMsg.chat && sentMsg.message_id) {
      cachedGameMessage[ctx.from.id] = {
        chatId: sentMsg.chat.id,
        messageId: sentMsg.message_id
      };
      console.log(`Stored chatId=${sentMsg.chat.id}, messageId=${sentMsg.message_id}`);
    } else {
      // Possibly we got something else, or no chat
      console.log('No valid chat/message_id in sentMsg; might be inline context or an error');
    }
  } catch (err) {
    console.error('Error in /start command:', err);
    await ctx.reply('Something went wrong with /start.');
  }
});

/**
 * callback_query:
 *  - Called when user taps "Play <short_name>" in the chat or inline
 *  - We must quickly answerGameQuery(GAME_URL) or answerCallbackQuery
 */
bot.on('callback_query', async (ctx) => {
  try {
    const query = ctx.callbackQuery;
    if (query.game_short_name === GAME_SHORT_NAME) {
      console.log('User tapped "Play" for short name:', GAME_SHORT_NAME);
      // Immediately answer with the game URL
      await ctx.answerGameQuery(GAME_URL);
    } else {
      // Possibly an unknown short name or a different callback
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
 * inline_query:
 *  - So inline mode works, returning an inline "game" result
 */
bot.on('inline_query', async (ctx) => {
  try {
    console.log('Processing inline query...');
    const results = [
      {
        type: 'game',
        id: 'goobi_game_inline',
        game_short_name: GAME_SHORT_NAME
      }
    ];
    await ctx.answerInlineQuery(results);
  } catch (err) {
    console.error('Error in inline_query:', err);
  }
});

/**
 * If the user "plays" inline, Telegram won't send a normal message with chatId.
 * Instead, it will create an inline message with an inline_message_id.
 * 
 * We can detect that in "chosen_inline_result" if we want to store the inline_message_id.
 */
bot.on('chosen_inline_result', async (ctx) => {
  try {
    console.log('chosen_inline_result =', ctx.chosenInlineResult);

    // We can store the inline_message_id in memory for setGameScore usage
    const userId = ctx.chosenInlineResult.from.id;
    const inlineId = ctx.chosenInlineResult.inline_message_id;

    cachedGameMessage[userId] = {
      inlineId
    };
    console.log(`Stored inlineId=${inlineId} for user=${userId}`);
  } catch (err) {
    console.error('Error in chosen_inline_result:', err);
  }
});

/**
 * /setscore <score> - for testing
 *  - We check if we have (chatId, messageId) or inlineId stored
 *  - Then call setGameScore accordingly
 */
bot.command('setscore', async (ctx) => {
  try {
    const parts = ctx.message.text.split(' ');
    const newScore = parseInt(parts[1], 10) || 0;
    const userId = ctx.from.id;

    const stored = cachedGameMessage[userId];
    if (!stored) {
      return ctx.reply('No game message or inline message found. Try /start or inline again.');
    }

    // We'll see if we have chatId/messageId or inlineId
    let options = {};
    if (stored.chatId && stored.messageId) {
      // Normal chat-based approach
      options.chat_id = stored.chatId;
      options.message_id = stored.messageId;
    } else if (stored.inlineId) {
      // Inline approach
      options.inline_message_id = stored.inlineId;
    } else {
      return ctx.reply('No valid chat or inline data. Possibly we never stored it.');
    }

    // setGameScore
    await ctx.telegram.setGameScore(
      userId,
      newScore,
      {
        ...options,
        force: true  // optional
      },
      GAME_SHORT_NAME
    );

    await ctx.reply(
      `Score of ${newScore} set for @${ctx.from.username || 'user'}. ` +
      `Check the original game message (or inline message) for "View Results"!`
    );
  } catch (err) {
    console.error('Error in /setscore command:', err);
    await ctx.reply(`Failed to set score. ${err.message}`);
  }
});

/**
 * Vercel serverless entry
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