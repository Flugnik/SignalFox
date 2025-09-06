import { chromium, firefox } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

/**
 * Автоматическая авторизация в TradingView
 */
export async function autoLogin(page) {
    const credentials = {
        email: 'molocko146@gmail.com',
        password: 'Wpfkj847tnm_397Qa'
    };

    try {
        console.log('🔑 Starting automatic TradingView login...');
        
        // Переходим на главную страницу
        await page.goto('https://ru.tradingview.com/', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        // Ищем кнопку входа
        const loginSelectors = [
            'a[href*="signin"]',
            'button:has-text("Войти")',
            '[data-name="header-user-menu-sign-in"]',
            '.tv-header__user-menu-sign-in',
            'a:has-text("Войти")'
        ];
        
        let loginButton = null;
        for (const selector of loginSelectors) {
            try {
                loginButton = await page.$(selector);
                if (loginButton) {
                    console.log(`🎯 Found login button: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!loginButton) {
            console.warn('⚠️  No login button found, maybe already logged in');
            return false;
        }
        
        // Кликаем на вход
        await loginButton.click();
        await page.waitForTimeout(3000);
        
        // Ищем форму входа или кнопку Google
        const googleSelectors = [
            'button:has-text("Google")',
            '[data-name="google-auth"]',
            '.google-signin-button',
            'button[aria-label*="Google"]'
        ];
        
        let googleButton = null;
        for (const selector of googleSelectors) {
            try {
                googleButton = await page.$(selector);
                if (googleButton) {
                    console.log(`🌟 Found Google login: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (googleButton) {
            // Авторизация через Google
            await googleButton.click();
            await page.waitForTimeout(3000);
            
            // Вводим email
            const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 10000 });
            await emailInput.fill(credentials.email);
            
            // Нажимаем Next/Далее
            const nextButton = await page.$('button:has-text("Next"), button:has-text("Далее"), #identifierNext');
            if (nextButton) {
                await nextButton.click();
                await page.waitForTimeout(3000);
            }
            
            // Вводим пароль
            const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
            await passwordInput.fill(credentials.password);
            
            // Нажимаем Next/Войти
            const submitButton = await page.$('button:has-text("Next"), button:has-text("Войти"), #passwordNext');
            if (submitButton) {
                await submitButton.click();
                await page.waitForTimeout(5000);
            }
            
        } else {
            // Прямая авторизация TradingView
            console.log('🔐 Using direct TradingView login');
            
            const emailInput = await page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 10000 });
            await emailInput.fill(credentials.email);
            
            const passwordInput = await page.waitForSelector('input[name="password"], input[type="password"]');
            await passwordInput.fill(credentials.password);
            
            const submitButton = await page.$('button[type="submit"], button:has-text("Войти"), button:has-text("Sign in")');
            if (submitButton) {
                await submitButton.click();
                await page.waitForTimeout(5000);
            }
        }
        
        // Проверяем успешность авторизации
        await page.waitForTimeout(5000);
        
        // Ищем признаки успешной авторизации
        const authCheckSelectors = [
            '[data-name="header-user-menu"]',
            '.tv-header__user-menu',
            'button[aria-label*="User menu"]',
            '.js-userbox'
        ];
        
        let isLoggedIn = false;
        for (const selector of authCheckSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    console.log('✅ Login successful!');
                    isLoggedIn = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!isLoggedIn) {
            console.warn('⚠️  Login status unclear, proceeding anyway');
        }
        
        // Сохраняем cookies после успешной авторизации
        const context = page.context();
        const cookies = await context.cookies();
        
        const cookiesPath = path.join('data', 'auth-cookies.json');
        await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log(`💾 Saved ${cookies.length} authentication cookies`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Auto-login failed:', error.message);
        return false;
    }
}

/**
 * Загружает сохраненные cookies авторизации
 */
export async function loadAuthCookies() {
    try {
        const cookiesPath = path.join('data', 'auth-cookies.json');
        const cookiesData = await fs.readFile(cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesData);
        console.log(`🍪 Loaded ${cookies.length} auth cookies from file`);
        return cookies;
    } catch (error) {
        console.log('⚠️  No auth cookies found');
        return null;
    }
}