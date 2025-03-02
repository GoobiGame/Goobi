# /api/get_high_score.py
import os
import json
import sqlite3

DB_PATH = "/tmp/scoreboard.db"

def handler(request):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("CREATE TABLE IF NOT EXISTS scores (username TEXT PRIMARY KEY, high_score INTEGER)")
        c.execute("SELECT username, high_score FROM scores ORDER BY high_score DESC LIMIT 1")
        row = c.fetchone()
        conn.close()

        result = {"username": row[0], "score": row[1]} if row else {"username": None, "score": 0}
        return {
            "statusCode": 200,
            "headers": {  # Add this
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps(result)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {  # Add this
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }