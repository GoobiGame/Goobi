import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { userId, score, chatId, messageId, inlineId } = req.body;
  if (!userId || !score) {
    return res.status(400).json({ ok: false, error: 'Missing userId or score' });
  }

  let options = {};
  if (chatId && messageId) {
    options.chat_id = chatId;
    options.message_id = messageId;
  } else if (inlineId) {
    options.inline_message_id = inlineId;
  } else {
    return res.status(400).json({ ok: false, error: 'No chat or inline context' });
  }

  try {
    await bot.telegram.setGameScore(userId, score, {
      ...options,
      edit_message: true, // This makes the score show up in the chat
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error setting score:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}