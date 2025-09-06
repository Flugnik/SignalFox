import { chromium, firefox } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { takeEnhancedTradingViewScreenshot } from './tradingview-enhanced.js';

export async function takeScreenshot(url) {
    // Используем улучшенную функцию для TradingView
    if (url.includes('tradingview.com')) {
        console.log('🚀 Using enhanced TradingView screenshot function...');
        try {
            const result = await takeEnhancedTradingViewScreenshot(url);
            return result; // Возвращаем весь объект с названием и путем
        } catch (error) {
            console.warn('Enhanced TradingView function failed, falling back to basic method:', error.message);
            // Продолжаем с базовой функцией
        }
    }
    
    // Базовая функция для обычных сайтов
    let browser = null;
    
    try {
        console.log(`Taking screenshot of: ${url}`);
        
        // Попробуем сначала Firefox, если не получится - Chromium с минимальными настройками
        try {
            browser = await firefox.launch({
                headless: true,
                timeout: 30000
            });
            console.log('Using Firefox browser');
        } catch (firefoxError) {
            console.log('Firefox failed, trying Chromium...', firefoxError.message);
            browser = await chromium.launch({
                headless: true,
                timeout: 30000,
                args: ['--no-sandbox']
            });
            console.log('Using Chromium browser');
        }

        const page = await browser.newPage();
        
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        // Устанавливаем User Agent
        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        } catch (uaError) {
            console.log('User agent not supported by this browser');
        }

        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });

        await page.waitForTimeout(5000);

        await fs.mkdir('screenshots', { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.png`;
        const screenshotPath = path.join('screenshots', filename);

        await page.screenshot({ 
            path: screenshotPath,
            fullPage: false,
            type: 'png'
        });

        console.log(`Screenshot saved: ${screenshotPath}`);
        return screenshotPath;

    } catch (error) {
        console.error('Error taking screenshot:', error);
        throw error;
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.warn('Error closing browser:', closeError.message);
            }
        }
    }
}

export async function takeScreenshotsForAllUrls() {
    try {
        const dataFile = 'data/urls.json';
        const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
        
        if (!data.urls || data.urls.length === 0) {
            console.log('No URLs to screenshot');
            return [];
        }

        const results = [];
        
        for (const urlItem of data.urls) {
            try {
                console.log(`Processing URL: ${urlItem.url}`);
                const screenshotPath = await takeScreenshot(urlItem.url);
                results.push({
                    url: urlItem.url,
                    screenshotPath,
                    success: true
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Failed to screenshot ${urlItem.url}:`, error);
                results.push({
                    url: urlItem.url,
                    error: error.message,
                    success: false
                });
            }
        }

        return results;
        
    } catch (error) {
        console.error('Error in takeScreenshotsForAllUrls:', error);
        throw error;
    }
}