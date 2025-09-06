# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SignalFox is an automated Telegram bot for taking screenshots of trading signals from TradingView and other financial websites. The bot manages URL monitoring lists, takes scheduled screenshots, and sends them via Telegram.

## Architecture

- **Node.js/ES6 Modules** with `"type": "module"` in package.json
- **Playwright** for web automation and screenshot capture
- **node-telegram-bot-api** for Telegram bot functionality  
- **File-based storage** using JSON files in `data/` directory
- **GitHub Actions** for scheduled automation

## Key Components

### Bot Logic (`src/bot.js`)
- Telegram bot command handlers for URL management
- Admin authentication (first user becomes admin)
- URL validation and storage operations
- Screenshot integration with Telegram messaging

### Screenshot Module (`src/screenshot.js`)
- Playwright browser automation (Firefox fallback to Chromium)
- Full-page screenshot capture with 1920x1080 viewport
- Batch processing for multiple URLs with 2-second delays
- Automatic cleanup of screenshot files

### Main Entry Point (`src/index.js`)
- Environment detection for bot vs screenshot modes
- Scheduled screenshot execution for GitHub Actions
- Bot startup for interactive use

## Common Development Commands

```bash
# Install dependencies (including Playwright browsers)
npm install
npx playwright install chromium

# Start interactive bot
npm start

# Run in development mode with auto-restart
npm run dev

# Take screenshots for all stored URLs
npm run screenshot
```

## Environment Configuration

Required environment variables:
- `TELEGRAM_TOKEN` - Bot token from @BotFather

The bot automatically creates data storage structure:
- `data/urls.json` - URL list and admin chat ID
- `screenshots/` - Temporary screenshot files (auto-cleaned)

## GitHub Actions Workflow

- Runs hourly 9:00-18:00 UTC on weekdays (`screenshot.yml`)
- Uses `--screenshot` flag to run in non-interactive mode
- Requires `TELEGRAM_TOKEN` secret in repository settings
- Installs Playwright dependencies in Ubuntu environment

## Bot Commands

- `/start` - Initialize bot and become admin
- `/add <url>` - Add URL to monitoring list
- `/remove <id>` - Remove URL by timestamp ID
- `/list` - Show all monitored URLs
- `/test <url>` - Take immediate test screenshot
- `/symbol <code>` - Generate correct TradingView URL for symbol
- `/help` - Show command reference

### Symbol Command Examples
- `/symbol SBER` - Creates URL for Sberbank (MOEX:SBER)
- `/symbol MOEX:GAZP` - Creates URL for Gazprom
- `/symbol AAPL` - Creates URL for Apple (defaults to MOEX:AAPL)

## Data Storage Format

URLs are stored in `data/urls.json`:
```json
{
  "urls": [
    {
      "id": "1693234567890",
      "url": "https://example.com",
      "addedAt": "2023-08-28T12:34:56.789Z"
    }
  ],
  "adminChatId": 123456789
}
```

## Browser Configuration

- Firefox preferred (fallback to Chromium if Firefox fails)
- Headless mode for both GitHub Actions and local development
- Custom User-Agent for Chromium compatibility
- 30-second timeouts for page loading
- Special TradingView handling:
  - 10-second wait for chart loading
  - Authorization detection (warns if login required)
  - Public chart support (use URLs like `/chart/4bXWtkrP/`)
  - Resource blocking for faster loading

## TradingView Integration Notes

- **Enhanced screenshot system** - automatically detects and corrects TradingView URLs
- **Symbol verification** - checks if displayed symbol matches requested symbol
- **Smart loading detection** - waits for chart data, not just page load
- **URL generation** - use `/symbol` command to create correct URLs
- **Fallback system** - falls back to basic screenshots if enhanced method fails

### TradingView URL Best Practices
- Use generated URLs from `/symbol` command for best results
- Avoid shared chart URLs (they remember the creator's last viewed symbol)
- Format: `https://ru.tradingview.com/chart/?symbol=MOEX%3ASBER&interval=1D`
- Supported symbols: MOEX, RUS, NASDAQ, NYSE exchanges