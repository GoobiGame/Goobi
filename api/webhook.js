import { Telegraf } from 'telegraf';

// 1) Bot token
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

// 2) The short name from BotFather, e.g. "goobi"
const GAME_SHORT_NAME = 'goobi';
// 3) The actual URL to your new index.html
const GAME_URL = 'https://goobi.vercel.app';

// We'll store either (chatId, messageId) or (inlineId)
const cachedGameMessage = {};

/**
 * /start command:
 *  - Sends the game message using replyWithGame(GAME_SHORT_NAME).
 *  - If successful, we store chatId & messageId in memory, keyed by userId.
 */
bot.command('start', async (ctx) => {
  try {
    console.log('Processing /start command');

    // 1) Send the game in a normal chat
    const sentMsg = await ctx.replyWithGame(GAME_SHORT_NAME);

    console.log('sentMsg =', sentMsg);

    // Typically, sentMsg has { chat: { id: 12345 }, message_id: 678, ... }
    if (sentMsg && sentMsg.chat && typeof sentMsg.chat.id === 'number') {
      // We have a numeric chat.id and message_id
      cachedGameMessage[ctx.from.id] = {
        chatId: sentMsg.chat.id,
        messageId: sentMsg.message_id
      };
      console.log(
        `Stored for user=${ctx.from.id}: chatId=${sentMsg.chat.id}, messageId=${sentMsg.message_id}`
      );
    } else {
      console.log(
        'No valid numeric chat/message_id found. Possibly inline context or error.'
      );
    }
  } catch (err) {
    console.error('Error in /start command:', err);
    await ctx.reply('Something went wrong with /start.');
  }
});

/**
 * callback_query:
 *  - Triggered when user taps "Play goobi" in the chat or inline
 *  - We must quickly call answerGameQuery(GAME_URL) to avoid "query is too old"
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
 * inline_query:
 *  - So inline mode works. If user types @YourBot in a chat, we return a "game" result
 */
bot.on('inline_query', async (ctx) => {
  try {
    console.log('Processing inline_query from user:', ctx.from.id);
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
 * chosen_inline_result:
 *  - If user actually chooses "Play goobi" inline, Telegram calls chosen_inline_result
 *  - We store inline_message_id in memory, so we can setGameScore later
 */
bot.on('chosen_inline_result', async (ctx) => {
  try {
    console.log('chosen_inline_result =', ctx.chosenInlineResult);

    const userId = ctx.chosenInlineResult.from.id;
    const inlineId = ctx.chosenInlineResult.inline_message_id;

    // Store the inlineId for setGameScore usage
    cachedGameMessage[userId] = {
      inlineId
    };

    console.log(`Stored inlineId=${inlineId} for user=${userId}`);
  } catch (err) {
    console.error('Error in chosen_inline_result:', err);
  }
});

/**
 * /setscore <score> - For testing or debugging.
 *  - We check if we have chatId+messageId or inlineId for the user
 *  - Then call setGameScore accordingly
 */
bot.command('setscore', async (ctx) => {
  try {
    // e.g. "/setscore 123"
    const parts = ctx.message.text.split(' ');
    const newScore = parseInt(parts[1], 10) || 0;
    const userId = ctx.from.id;

    const stored = cachedGameMessage[userId];
    if (!stored) {
      return ctx.reply('No game message or inline message found. Try /start or inline again.');
    }

    console.log(`Attempting setscore for user=${userId}, score=${newScore}`);
    console.log('stored =', stored);

    // Decide which approach to use
    let options = {};
    if (stored.chatId && stored.messageId) {
      // Normal chat-based approach
      options.chat_id = stored.chatId;
      options.message_id = stored.messageId;
    } else if (stored.inlineId) {
      // Inline approach
      options.inline_message_id = stored.inlineId;
    } else {
      return ctx.reply('No valid chat or inline data stored.');
    }

    // setGameScore
    await ctx.telegram.setGameScore(
      userId,
      newScore,
      {
        ...options,
        // "force" ensures scoreboard updates even if same/lower
        // you can omit if you only want to update on a higher score
        force: true 
      },
      GAME_SHORT_NAME
    );

    await ctx.reply(
      `Score of ${newScore} set for @${ctx.from.username || 'user'}. ` +
      `Check the original game message or inline message for "View Results"!`
    );
  } catch (err) {
    console.error('Error in /setscore command:', err);
    await ctx.reply(`Failed to set score. ${err.message}`);
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