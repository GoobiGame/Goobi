# /api/webhook.py
import os
import json
import asyncio
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import Application, CommandHandler, InlineQueryHandler, ContextTypes
from telegram.error import BadRequest

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
WEBAPP_URL = "https://goobi.vercel.app"  # Your mini app front-end
BOT_USERNAME = "goobigamebot"            # Your bot's username (without @)

# Build the bot application in local_mode for serverless
app_bot = (
    Application.builder()
    .token(TOKEN)
    .local_mode(True)
    .build()
)

# /start command: show a button linking to the mini app
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Processing /start command")
    keyboard = [[InlineKeyboardButton("Play Goobi", web_app={"url": WEBAPP_URL})]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        text="Welcome to GoobiBot! Click below to open the game.",
        reply_markup=reply_markup
    )

# Inline query: show a single “Play Goobi” result
async def inline_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info(f"Processing inline query: {update.inline_query.query}")
    query = update.inline_query.query.lower().strip()

    # We ignore the user's actual query for now, just show “Play Goobi”
    results = []
    results.append(
        InlineQueryResultArticle(
            id="play",
            title="Play Goobi",
            input_message_content=InputTextMessageContent("Click to play Goobi: t.me/goobigamebot/goobi"),
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("Play Goobi", url="t.me/goobigamebot/goobi")]
            ])
        )
    )

    await update.inline_query.answer(results)

# Register handlers
app_bot.add_handler(CommandHandler("start", start))
app_bot.add_handler(InlineQueryHandler(inline_query))

def handler(request):
    """
    Vercel entry point for Telegram webhook calls.
    """
    try:
        update_json = request.get_json(force=True)
        update = Update.de_json(update_json, app_bot.bot)
        logger.info("Received update: %s", update)

        # Process the update in an event loop
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