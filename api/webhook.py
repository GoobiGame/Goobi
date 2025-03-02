# /api/webhook.py
import os
import json
import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, InlineQueryHandler, ContextTypes

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variable for your bot token (set in Vercel)
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")

# Optional environment variables for your web app URL (defaults to goobi.vercel.app)
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "https://goobi.vercel.app/api/webhook")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://goobi.vercel.app")

# Initialize the Telegram bot application.
app_bot = Application.builder().token(TOKEN).build()

# Define your command handlers (e.g. /start)
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("Processing /start command")
    keyboard = [
        [InlineKeyboardButton("Play Goobi", web_app={"url": WEBAPP_URL})]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "Welcome to GoobiBot! Click below to play or use @goobigamebot in any chat for inline features:",
        reply_markup=reply_markup
    )

# Add the /start command handler:
app_bot.add_handler(CommandHandler("start", start))

# (Optionally add other handlers here: /me, /addscore, /leaderboard, etc.)
# e.g., app_bot.add_handler(CommandHandler("leaderboard", leaderboard))
# app_bot.add_handler(InlineQueryHandler(inline_query))

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