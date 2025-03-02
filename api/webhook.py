# /api/webhook.py
import os
import json
import asyncio
import logging
import sqlite3
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import Application, CommandHandler, InlineQueryHandler, ContextTypes
from telegram.error import BadRequest

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variables
# At the top
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
logger.info(f"Using token: {TOKEN[:6]}...") 
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://goobi.vercel.app")
WEBHOOK_URL = "https://goobi.vercel.app/api/webhook"
SCORE_API_URL = "https://goobi.vercel.app/api/update_score"
HIGH_SCORE_API_URL = "https://goobi.vercel.app/api/get_high_score"
LEADERBOARD_API_URL = "https://goobi.vercel.app/api/get_leaderboard"

# Initialize bot
app_bot = Application.builder().token(TOKEN).local_mode(True).build()

# Database initialization (ephemeral for Vercel)
DB_PATH = "/tmp/scoreboard.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS scores (username TEXT PRIMARY KEY, high_score INTEGER)''')
    conn.commit()
    conn.close()

init_db()

# Command handlers
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /start command")
    keyboard = [[InlineKeyboardButton("Play Goobi", web_app={"url": WEBAPP_URL})]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "Welcome to GoobiBot on Vercel! Click below to play or use @goobigamebot inline.",
        reply_markup=reply_markup
    )

async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /me command")
    user = update.message.from_user
    username = user.username if user.username else user.first_name
    user_id = user.id
    try:
        photos = await context.bot.get_user_profile_photos(user_id, limit=1)
        if photos.total_count > 0:
            file_id = photos.photos[0][-1].file_id
            await update.message.reply_photo(photo=file_id, caption=f"Player: @{username}")
        else:
            await update.message.reply_text(f"Player: @{username} (No profile picture)")
    except BadRequest as e:
        logger.error(f"BadRequest in /me: {e}")
        await update.message.reply_text(f"Player: @{username} (Error fetching profile picture)")
    except Exception as e:
        logger.error(f"Error in /me: {e}")
        await update.message.reply_text(f"Player: @{username} (Unexpected error)")

async def add_score(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /addscore command")
    user = update.message.from_user
    username = user.username if user.username else user.first_name
    try:
        response = requests.post(SCORE_API_URL, json={"username": username, "points": 10})
        if response.status_code == 200:
            await update.message.reply_text(f"Added 10 points to @{username}. Check /score!")
        else:
            await update.message.reply_text(f"Failed to add score for @{username}.")
    except Exception as e:
        logger.error(f"Error in /addscore: {e}")
        await update.message.reply_text(f"Error adding score for @{username}.")

async def score(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /score command")
    user = update.message.from_user
    username = user.username if user.username else user.first_name
    try:
        response = requests.get(HIGH_SCORE_API_URL)
        if response.status_code == 200:
            data = response.json()
            if data["username"] == username:
                await update.message.reply_text(f"🏆 Your High Score: {data['score']}")
            else:
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("SELECT high_score FROM scores WHERE username = ?", (username,))
                row = c.fetchone()
                conn.close()
                score = row[0] if row else 0
                await update.message.reply_text(f"🏆 Your High Score: {score}")
        else:
            await update.message.reply_text("Error fetching high score.")
    except Exception as e:
        logger.error(f"Error in /score: {e}")
        await update.message.reply_text("You haven't set a high score yet!")

async def leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /leaderboard command")
    try:
        response = requests.get(LEADERBOARD_API_URL)
        if response.status_code == 200:
            top_players = response.json()
            if not top_players:
                await update.message.reply_text("No high scores yet!")
            else:
                board_text = "🏆 Leaderboard (Top 10) 🏆\n"
                for rank, player in enumerate(top_players, 1):
                    board_text += f"{rank}. @{player['username']}: {player['score']} points\n"
                await update.message.reply_text(board_text)
        else:
            await update.message.reply_text("Error fetching leaderboard.")
    except Exception as e:
        logger.error(f"Error in /leaderboard: {e}")
        await update.message.reply_text("Error loading leaderboard!")

async def inline_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info(f"Processing inline query: {update.inline_query.query}")
    query = update.inline_query.query.lower().strip()
    results = []
    if query == "leaderboard":
        try:
            response = requests.get(LEADERBOARD_API_URL)
            if response.status_code == 200:
                top_players = response.json()
                if not top_players:
                    results.append(
                        InlineQueryResultArticle(
                            id="leaderboard_empty",
                            title="Leaderboard",
                            input_message_content=InputTextMessageContent("No high scores yet!")
                        )
                    )
                else:
                    board_text = "🏆 Leaderboard (Top 10) 🏆\n"
                    for rank, player in enumerate(top_players, 1):
                        board_text += f"{rank}. @{player['username']}: {player['score']} points\n"
                    results.append(
                        InlineQueryResultArticle(
                            id="leaderboard",
                            title="Leaderboard",
                            input_message_content=InputTextMessageContent(board_text)
                        )
                    )
        except Exception as e:
            logger.error(f"Error in inline leaderboard: {e}")
            results.append(
                InlineQueryResultArticle(
                    id="error",
                    title="Error",
                    input_message_content=InputTextMessageContent("Error loading leaderboard.")
                )
            )
    else:
        results.append(
            InlineQueryResultArticle(
                id="play",
                title="Play Goobi",
                input_message_content=InputTextMessageContent("Click to play Goobi: t.me/goobigamebot"),
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("Play Goobi", url="t.me/goobigamebot/goobi")]
                ])
            )
        )
    await update.inline_query.answer(results)

# Register handlers
app_bot.add_handler(CommandHandler("start", start))
app_bot.add_handler(CommandHandler("me", me))
app_bot.add_handler(CommandHandler("addscore", add_score))
app_bot.add_handler(CommandHandler("score", score))
app_bot.add_handler(CommandHandler("leaderboard", leaderboard))
app_bot.add_handler(InlineQueryHandler(inline_query))

# Initialize bot and set webhook
loop = asyncio.get_event_loop()
loop.run_until_complete(app_bot.initialize())
loop.run_until_complete(app_bot.bot.set_webhook(WEBHOOK_URL))
logger.info(f"Webhook set to {WEBHOOK_URL}")

def handler(request):
    try:
        update_json = request.get_json(force=True)
        update = Update.de_json(update_json, app_bot.bot)
        logger.info("Received update: %s", update)
        if update.message or update.inline_query:
            loop.run_until_complete(app_bot.process_update(update))
        return {"statusCode": 200, "body": json.dumps({"ok": True})}
    except Exception as e:
        logger.error("Error processing update: %s", e)
        return {"statusCode": 500, "body": json.dumps({"ok": False, "error": str(e)})}