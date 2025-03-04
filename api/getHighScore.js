export default async function handler(req, res) {
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      return res.status(405).send('Method Not Allowed');
    }
  
    const { user_id, chat_id, message_id, inline_message_id } = req.body;
    console.log('Received high score request:', { user_id, chat_id, message_id, inline_message_id });
  
    if (!user_id) {
      console.log('Missing user_id');
      return res.status(400).json({ ok: false, error: 'Missing user_id' });
    }
  
    if (!chat_id && !inline_message_id) {
      console.log('Missing chat_id/message_id or inline_message_id');
      return res.status(400).json({ ok: false, error: 'Missing chat_id/message_id or inline_message_id' });
    }
  
    try {
      const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
      if (!TOKEN) {
        console.log('Missing TELEGRAM_BOT_TOKEN');
        return res.status(500).json({ ok: false, error: 'Missing bot token' });
      }
  
      const payload = { user_id };
      if (chat_id && message_id) {
        payload.chat_id = chat_id;
        payload.message_id = message_id;
      } else if (inline_message_id) {
        payload.inline_message_id = inline_message_id;
      }
  
      console.log('Fetching high score with payload:', payload);
  
      const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getGameHighScores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      const result = await response.json();
      if (result.ok) {
        const highScores = result.result;
        let highScore = 0;
        let highScoreHolder = 'None';
        if (highScores.length > 0) {
          highScore = highScores[0].score;
          highScoreHolder = highScores[0].user.username || highScores[0].user.first_name || 'Unknown';
        }
        console.log('High score fetched successfully:', { highScore, highScoreHolder });
        return res.status(200).json({ ok: true, highScore, highScoreHolder });
      } else {
        console.error('Failed to fetch high score:', result);
        return res.status(500).json({ ok: false, error: result.description });
      }
    } catch (err) {
      console.error('Error fetching high score:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }