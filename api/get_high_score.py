# /api/get_high_score.py
import os
import json
import sqlite3

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    """
    Returns { "username": <string or null>, "score": <number> }
    for the single highest score in ephemeral scoreboard.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Create table if doesn't exist
        c.execute("""CREATE TABLE IF NOT EXISTS scores
                     (username TEXT PRIMARY KEY, high_score INTEGER)""")

        # Get top user
        c.execute("SELECT username, high_score FROM scores ORDER BY high_score DESC LIMIT 1")
        row = c.fetchone()
        conn.close()

        if row:
            result = {"username": row[0], "score": row[1]}
        else:
            result = {"username": None, "score": 0}

        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }