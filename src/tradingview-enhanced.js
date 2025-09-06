import { chromium, firefox } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { autoLogin, loadAuthCookies } from './tradingview-auth.js';

/**
 * Загружает cookies из JSON файла и конвертирует в формат Playwright
 */
async function loadCookies() {
    try {
        const cookiesPath = path.join('data', 'cookies.json');
        const cookiesData = await fs.readFile(cookiesPath, 'utf8');
        const rawCookies = JSON.parse(cookiesData);
        
        // Конвертируем cookies в формат Playwright
        const cookies = rawCookies
            .filter(cookie => cookie.name && cookie.value) // Фильтруем пустые cookies
            .map(cookie => {
                const playwrightCookie = {
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path || '/',
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: convertSameSite(cookie.sameSite)
                };
                
                // Добавляем expires только для постоянных cookies
                if (cookie.expirationDate && !cookie.session) {
                    playwrightCookie.expires = Math.floor(cookie.expirationDate);
                }
                
                return playwrightCookie;
            });
        
        console.log(`🍪 Loaded and converted ${cookies.length} cookies from file`);
        return cookies;
    } catch (error) {
        console.log('⚠️  No cookies file found, proceeding without authorization');
        return null;
    }
}

/**
 * Конвертирует sameSite значение из Chrome формата в Playwright формат
 */
function convertSameSite(sameSite) {
    switch (sameSite) {
        case 'no_restriction':
            return 'None';
        case 'lax':
            return 'Lax';
        case 'strict':
            return 'Strict';
        default:
            return 'Lax'; // По умолчанию
    }
}

/**
 * Извлекает символ из URL TradingView
 */
function extractSymbolFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const symbolParam = urlObj.searchParams.get('symbol');
        if (symbolParam) {
            // Декодируем символ (например RUS%3ASMLT -> RUS:SMLT)
            return decodeURIComponent(symbolParam);
        }
        return null;
    } catch (error) {
        console.error('Error extracting symbol from URL:', error);
        return null;
    }
}

/**
 * Улучшенная функция создания скриншотов TradingView
 */
export async function takeEnhancedTradingViewScreenshot(url) {
    let browser = null;
    
    try {
        console.log(`📊 Enhanced TradingView screenshot: ${url}`);
        
        const expectedSymbol = extractSymbolFromUrl(url);
        console.log(`🎯 Expected symbol: ${expectedSymbol || 'Unknown'}`);
        
        // Запускаем браузер
        try {
            browser = await firefox.launch({
                headless: true,  // Быстрый режим
                timeout: 30000
            });
            console.log('🦊 Using Firefox browser');
        } catch (firefoxError) {
            browser = await chromium.launch({
                headless: true,  // Быстрый режим
                timeout: 30000,
                args: ['--no-sandbox', '--disable-web-security']
            });
            console.log('🌐 Using Chromium browser');
        }

        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        // Устанавливаем User Agent если возможно
        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        } catch (uaError) {
            console.log('User agent not supported by this browser');
        }

        // Пытаемся авторизоваться - сначала cookies, потом автологин
        let isAuthorized = false;
        
        // Сначала пробуем загрузить сохраненные auth cookies
        const authCookies = await loadAuthCookies();
        if (authCookies) {
            try {
                await page.context().addCookies(authCookies);
                console.log('🍪 Auth cookies loaded successfully');
                isAuthorized = true;
            } catch (cookieError) {
                console.warn('⚠️  Failed to load auth cookies:', cookieError.message);
            }
        }
        
        // Если нет сохраненных cookies, пробуем старые cookies
        if (!isAuthorized) {
            const cookies = await loadCookies();
            if (cookies) {
                try {
                    await page.context().addCookies(cookies);
                    console.log('🍪 Old cookies loaded successfully');
                    isAuthorized = true;
                } catch (cookieError) {
                    console.warn('⚠️  Failed to load old cookies:', cookieError.message);
                }
            }
        }
        
        // Если cookies не помогли, делаем автоматический логин
        if (!isAuthorized) {
            console.log('🔑 Starting automatic login...');
            const loginSuccess = await autoLogin(page);
            if (loginSuccess) {
                isAuthorized = true;
                console.log('✅ Automatic login completed');
            } else {
                console.warn('⚠️  Automatic login failed, continuing without auth');
            }
        }

        // Переходим на страницу
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });

        console.log('⏳ Waiting for initial page load...');
        await page.waitForTimeout(2000); // Уменьшаем ожидание
        
        // БЫСТРЫЙ СКРИНШОТ до появления модальных окон
        console.log('📸 Taking quick screenshot before modals appear...');
        
        // Ждем только базовые элементы графика
        try {
            await page.waitForSelector('.chart-container', { timeout: 8000 });
            console.log('✅ Chart container found');
        } catch (error) {
            console.log('⚠️  Chart container not found, continuing...');
        }
        
        // Еще немного ждем для прорисовки данных
        await page.waitForTimeout(3000);
        
        // Создаем скриншот СРАЗУ
        await fs.mkdir('screenshots', { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `enhanced-screenshot-${timestamp}.png`;
        const screenshotPath = path.join('screenshots', filename);

        await page.screenshot({ 
            path: screenshotPath,
            fullPage: false,
            type: 'png'
        });

        console.log(`📸 Quick screenshot saved: ${screenshotPath}`);
        
        // Получаем название инструмента для отправки
        let instrumentName = 'Unknown';
        try {
            const titleElement = await page.$('[data-name="legend-source-title"]');
            if (titleElement) {
                instrumentName = await titleElement.textContent();
                console.log(`📈 Instrument: ${instrumentName}`);
            }
        } catch (error) {
            console.log('⚠️  Could not get instrument name');
        }
        
        return {
            path: screenshotPath,
            instrumentName: instrumentName,
            url: url,
            success: true
        };

    } catch (error) {
        console.error('❌ Enhanced screenshot failed:', error.message);
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