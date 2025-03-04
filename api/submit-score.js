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
  
    // Construct the payload explicitly
    let payload = {
      user_id: userId,
      score,
      edit_message: true,
    };
    let mode = '';
  
    if (chatId && messageId) {
      payload.chat_id = chatId;
      payload.message_id = messageId;
      mode = 'chat';
      console.log('Using chat mode:', payload);
    } else if (inlineId && typeof inlineId === 'string') {
      payload.inline_message_id = inlineId;
      mode = 'inline';
      console.log('Using inline mode:', payload);
    } else {
      console.log('Invalid context: no valid chat or inline ID');
      return res.status(400).json({ ok: false, error: 'No valid chat or inline context' });
    }
  
    try {
      const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
      if (!TOKEN) {
        console.log('Missing TELEGRAM_BOT_TOKEN');
        return res.status(500).json({ ok: false, error: 'Missing bot token' });
      }
  
      console.log(`Calling setGameScore in ${mode} mode with payload:`, payload);
  
      const response = await fetch(`https://api.telegram.org/bot${TOKEN}/setGameScore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      const result = await response.json();
      if (!result.ok) {
        // Handle BOT_SCORE_NOT_MODIFIED as a success case
        if (result.description === 'BAD_REQUEST: BOT_SCORE_NOT_MODIFIED') {
          console.log('Score not modified (not a new high score), treating as success');
          return res.status(200).json({ ok: true, notModified: true });
        }
        console.error('Telegram API error:', result);
        return res.status(500).json({ ok: false, error: result.description });
      }
  
      console.log('Score set successfully:', result);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error setting score:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }