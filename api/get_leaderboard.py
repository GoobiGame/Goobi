# /api/get_leaderboard.py
import os
import json
import sqlite3

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("CREATE TABLE IF NOT EXISTS scores (username TEXT PRIMARY KEY, high_score INTEGER)")
        c.execute("SELECT username, high_score FROM scores ORDER BY high_score DESC LIMIT 10")
        rows = c.fetchall()
        conn.close()

        leaderboard = [{"username": row[0], "score": row[1]} for row in rows]
        return {
            "statusCode": 200,
            "headers": {  # Add this
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps(leaderboard)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {  # Add this
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }