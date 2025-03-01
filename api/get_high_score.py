# /api/get_high_score.py
import os
import sqlite3
from flask import jsonify

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # If the table doesn't exist yet, just return a default
        c.execute('''CREATE TABLE IF NOT EXISTS scores
                     (username TEXT PRIMARY KEY, high_score INTEGER)''')

        # Get the highest score
        c.execute("SELECT username, high_score FROM scores ORDER BY high_score DESC LIMIT 1")
        row = c.fetchone()
        conn.close()

        if row:
            return jsonify({'username': row[0], 'score': row[1]}), 200
        else:
            return jsonify({'username': None, 'score': 0}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500