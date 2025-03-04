import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new Telegraf(TOKEN);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).send('Method Not Allowed');
  }

  const { userId, score, chatId, messageId, inlineId } = req.body;
  console.log('Received score submission:', { userId, score, chatId, messageId, inlineId });

  if (!userId || !score) {
    console.log('Missing userId or score');
    return res.status(400).json({ ok: false, error: 'Missing userId or score' });
  }

  let options = { edit_message: true };
  let mode = '';

  if (chatId && messageId) {
    options.chat_id = chatId;
    options.message_id = messageId;
    mode = 'chat';
    console.log('Using chat mode:', options);
  } else if (inlineId && typeof inlineId === 'string') {
    options.inline_message_id = inlineId;
    mode = 'inline';
    console.log('Using inline mode:', options);
  } else {
    console.log('Invalid context: no valid chat or inline ID');
    return res.status(400).json({ ok: false, error: 'No valid chat or inline context' });
  }

  try {
    console.log(`Calling setGameScore in ${mode} mode with payload:`, {
      user_id: userId,
      score,
      ...options,
    });
    await bot.telegram.setGameScore(userId, score, options);
    console.log('Score set successfully');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error setting score:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}