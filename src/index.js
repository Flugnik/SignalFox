import dotenv from 'dotenv';
import SignalBot from './bot.js';
import { takeScreenshotsForAllUrls } from './screenshot.js';
import fs from 'fs/promises';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

if (!TELEGRAM_TOKEN) {
    console.error('Error: TELEGRAM_TOKEN not found in environment variables');
    process.exit(1);
}

async function runScheduledScreenshots() {
    try {
        console.log('Starting scheduled screenshot task...');
        const results = await takeScreenshotsForAllUrls();
        
        const bot = new SignalBot(TELEGRAM_TOKEN);
        
        for (const result of results) {
            if (result.success) {
                try {
                    await bot.sendScreenshotToAdmin(result.url, result.screenshotPath);
                    await fs.unlink(result.screenshotPath);
                    console.log(`Sent and cleaned up screenshot for ${result.url}`);
                } catch (error) {
                    console.error(`Failed to send screenshot for ${result.url}:`, error);
                }
            } else {
                console.error(`Screenshot failed for ${result.url}: ${result.error}`);
            }
        }
        
        console.log('Scheduled screenshot task completed');
        process.exit(0);
        
    } catch (error) {
        console.error('Error in scheduled screenshots:', error);
        process.exit(1);
    }
}

function startBot() {
    console.log('Starting Telegram bot...');
    const bot = new SignalBot(TELEGRAM_TOKEN);
    console.log('Bot is running...');
}

const mode = process.env.NODE_ENV || 'bot';

if (mode === 'screenshot' || process.argv.includes('--screenshot')) {
    runScheduledScreenshots();
} else {
    startBot();
}