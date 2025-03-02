# /api/get_leaderboard.py
import os
import json
import sqlite3

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    """
    Returns a JSON array of objects:
    [ { "username": "...", "score": <number> }, ... ]
    for the top 10 ephemeral scores.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Create table if doesn't exist
        c.execute("""CREATE TABLE IF NOT EXISTS scores
                     (username TEXT PRIMARY KEY, high_score INTEGER)""")

        c.execute("SELECT username, high_score FROM scores ORDER BY high_score DESC LIMIT 10")
        rows = c.fetchall()
        conn.close()

        leaderboard = []
        for row in rows:
            leaderboard.append({"username": row[0], "score": row[1]})

        return {
            "statusCode": 200,
            "body": json.dumps(leaderboard)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }