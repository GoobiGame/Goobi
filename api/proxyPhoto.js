// /api/proxyPhoto.js
import fetch from 'node-fetch'; // If you're on Vercel, node-fetch is often built-in. 
// If not, add "node-fetch" to dependencies in package.json.

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send('Missing ?url=');
    }

    // Fetch the actual Telegram photo
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).send('Failed to fetch the remote image.');
    }

    // Get the image buffer and content-type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.buffer();

    // Set the correct headers so the browser can draw on canvas
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60');

    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Error proxying photo:', err);
    return res.status(500).send('Internal Server Error');
  }
}