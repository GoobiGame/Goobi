# /api/update_score.py
import os
import json
import sqlite3

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    try:
        data = request.get_json(force=True)
        username = data.get("username")
        points = data.get("points", 0)

        if not username or not isinstance(points, (int, float)):
            return {
                "statusCode": 400,
                "headers": {  # Add this
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": "Invalid data"})
            }

        points = int(points)
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("CREATE TABLE IF NOT EXISTS scores (username TEXT PRIMARY KEY, high_score INTEGER)")
        c.execute("SELECT high_score FROM scores WHERE username = ?", (username,))
        row = c.fetchone()
        current_high = row[0] if row else 0

        if points > current_high:
            c.execute("INSERT OR REPLACE INTO scores (username, high_score) VALUES (?, ?)", (username, points))
            conn.commit()

        conn.close()
        return {
            "statusCode": 200,
            "headers": {  # Add this
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"message": "Score updated"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {  # Add this
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }