import os
import json
import logging
from flask import jsonify, request
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import Application, CommandHandler, InlineQueryHandler, ContextTypes

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get sensitive data from environment variables (set these in Vercel's project settings)
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
# You can optionally also set WEBHOOK_URL and WEBAPP_URL via environment variables.
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "https://goobi.vercel.app/api/webhook")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://goobi.vercel.app")

# Initialize the Telegram bot application.
app_bot = Application.builder().token(TOKEN).build()

# Define your command handlers (example: /start)
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

# (Add your other handlers here as needed, e.g., /me, /addscore, etc.)
# For brevity, only /start is shown. You can add them similarly:
# app_bot.add_handler(CommandHandler("me", me))
# app_bot.add_handler(CommandHandler("addscore", add_score))
# app_bot.add_handler(CommandHandler("score", score))
# app_bot.add_handler(CommandHandler("leaderboard", leaderboard))
# app_bot.add_handler(InlineQueryHandler(inline_query))

# Add the /start command handler:
app_bot.add_handler(CommandHandler("start", start))

# Define the Vercel entry point. Vercel will call this function for requests to /api/webhook.
def handler(request):
    try:
        # Force parsing the JSON body
        update_json = request.get_json(force=True)
        # Convert JSON to a Telegram Update object
        update = Update.de_json(update_json, app_bot.bot)
        logger.info("Received update: %s", update)
        # Process the update asynchronously in a new event loop
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(app_bot.process_update(update))
        return jsonify({"ok": True})
    except Exception as e:
        logger.error("Error processing update: %s", e)
        return jsonify({"ok": False, "error": str(e)}), 500