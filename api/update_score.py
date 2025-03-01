# /api/update_score.py
import os
import json
import sqlite3
from flask import jsonify

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    try:
        data = request.get_json(force=True)
        username = data.get('username')
        points = data.get('points', 0)

        if not username or not isinstance(points, (int, float)):
            return jsonify({'error': 'Invalid data'}), 400

        points = int(points)

        # Open or create the DB in /tmp
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Create table if not exists
        c.execute('''CREATE TABLE IF NOT EXISTS scores
                     (username TEXT PRIMARY KEY, high_score INTEGER)''')

        # Check current high score
        c.execute("SELECT high_score FROM scores WHERE username = ?", (username,))
        row = c.fetchone()
        current_high = row[0] if row else 0

        # Update if new score is higher
        if points > current_high:
            c.execute("INSERT OR REPLACE INTO scores (username, high_score) VALUES (?, ?)",
                      (username, points))
            conn.commit()

        conn.close()

        return jsonify({'message': 'Score updated'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500