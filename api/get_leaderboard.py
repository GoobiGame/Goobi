# /api/get_leaderboard.py
import os
import sqlite3
from flask import jsonify

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # If the table doesn't exist yet, create it
        c.execute('''CREATE TABLE IF NOT EXISTS scores
                     (username TEXT PRIMARY KEY, high_score INTEGER)''')

        c.execute("SELECT username, high_score FROM scores ORDER BY high_score DESC LIMIT 10")
        rows = c.fetchall()
        conn.close()

        leaderboard = []
        for row in rows:
            leaderboard.append({'username': row[0], 'score': row[1]})

        return jsonify(leaderboard), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500