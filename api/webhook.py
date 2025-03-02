# /api/webhook.py
import os
import json
import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variable for your bot token (set in Vercel)
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

# Optional environment variables for your web app URL (defaults to goobi.vercel.app)
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://goobi.vercel.app")

# Initialize the Telegram bot in local mode to avoid built-in server issues
app_bot = (
    Application.builder()
    .token(TOKEN)
    .local_mode(True)  # <-- This is critical to prevent 'issubclass() arg 1 must be a class' errors
    .build()
)

# /start command
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /start command")
    keyboard = [
        [InlineKeyboardButton("Play Goobi", web_app={"url": WEBAPP_URL})]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "Welcome to GoobiBot on Vercel! Type /score or /leaderboard for more.",
        reply_markup=reply_markup
    )

# /score command (placeholder logic)
async def score(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /score command")
    # TODO: Insert real scoreboard logic or call separate endpoint here.
    await update.message.reply_text("Your current score is: (placeholder)")

# /leaderboard command (placeholder logic)
async def leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /leaderboard command")
    # TODO: Insert real leaderboard logic or call separate endpoint here.
    await update.message.reply_text("Top players:\n1. Alice (100)\n2. Bob (50)\n(placeholder)")

# Register the command handlers
app_bot.add_handler(CommandHandler("start", start))
app_bot.add_handler(CommandHandler("score", score))
app_bot.add_handler(CommandHandler("leaderboard", leaderboard))

def handler(request):
    """
    Vercel entry point for Telegram webhook calls.
    We do NOT use Flask here; we parse the request
    and return a dict with statusCode and body.
    """
    try:
        # Force parse JSON body from request
        update_json = request.get_json(force=True)
        # Convert JSON into a Telegram Update object
        update = Update.de_json(update_json, app_bot.bot)
        logger.info("Received update: %s", update)

        # Process the update in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(app_bot.process_update(update))

        return {
            "statusCode": 200,
            "body": json.dumps({"ok": True})
        }

    except Exception as e:
        logger.error("Error processing update: %s", e)
        return {
            "statusCode": 500,
            "body": json.dumps({"ok": False, "error": str(e)})
        }