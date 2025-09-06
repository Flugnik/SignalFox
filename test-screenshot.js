import { takeScreenshot } from './src/screenshot.js';

async function test() {
    try {
        console.log('Testing screenshot functionality...');
        const screenshotPath = await takeScreenshot('https://ru.tradingview.com/chart/?symbol=MOEX%3ASBER&interval=1D');
        console.log('✅ Screenshot successful:', screenshotPath);
    } catch (error) {
        console.error('❌ Screenshot failed:', error.message);
    }
}

test();