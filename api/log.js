export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
  
    const { message, ...data } = req.body;
    console.log(`Client Log - ${message}:`, data);
    return res.status(200).json({ ok: true });
  }