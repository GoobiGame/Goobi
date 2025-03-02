# /api/update_score.py
import os
import json
import sqlite3

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    """
    Receives JSON { "username": "...", "points": <number> }
    Updates ephemeral scoreboard in /tmp/scoreboard.db
    """
    try:
        data = request.get_json(force=True)
        username = data.get("username")
        points = data.get("points", 0)

        if not username or not isinstance(points, (int, float)):
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Invalid data"})
            }

        points = int(points)

        # Connect to ephemeral DB in /tmp
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Create table if doesn't exist
        c.execute("""CREATE TABLE IF NOT EXISTS scores
                     (username TEXT PRIMARY KEY, high_score INTEGER)""")

        # Check current high score
        c.execute("SELECT high_score FROM scores WHERE username = ?", (username,))
        row = c.fetchone()
        current_high = row[0] if row else 0

        # Update if new score is higher
        if points > current_high:
            c.execute("""INSERT OR REPLACE INTO scores (username, high_score)
                         VALUES (?, ?)""", (username, points))
            conn.commit()

        conn.close()

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Score updated"})
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }