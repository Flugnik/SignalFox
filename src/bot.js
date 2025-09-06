import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs/promises';
import path from 'path';
import { buildTradingViewUrl, normalizeSymbol } from './tradingview-url-builder.js';
// Убираем неиспользуемые импорты индикаторов
import { parseTimeframe, getTimeframeDescription, getPopularTimeframes, TIMEFRAME_PRESETS } from './tradingview-timeframes.js';

const DATA_FILE = 'data/urls.json';

class SignalBot {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
        this.adminChatId = null;
        this.setupCommands();
        this.initDataFile();
    }

    async initDataFile() {
        try {
            await fs.mkdir('data', { recursive: true });
            try {
                await fs.access(DATA_FILE);
            } catch {
                await fs.writeFile(DATA_FILE, JSON.stringify({ urls: [], adminChatId: null }));
            }
        } catch (error) {
            console.error('Error initializing data file:', error);
        }
    }

    async loadData() {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            return JSON.parse(data);
        } catch {
            return { urls: [], adminChatId: null };
        }
    }

    async saveData(data) {
        try {
            await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    setupCommands() {
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const data = await this.loadData();
            
            if (!data.adminChatId) {
                data.adminChatId = chatId;
                await this.saveData(data);
                this.adminChatId = chatId;
            }

            const welcomeMessage = `
Добро пожаловать в Signal Fox Bot! 🦊

Основные команды:
/symbol <код> [таймфрейм] - создать TradingView URL
/add <url> - добавить ссылку для мониторинга
/test <url> - сделать тестовый скриншот
/timeframes - таймфреймы
/indicators - индикаторы
/help - полная справка

Пример: /symbol SBER 1h
            `;
            
            this.bot.sendMessage(chatId, welcomeMessage);
        });

        this.bot.onText(/\/add (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const url = match[1].trim();

            if (!this.isValidUrl(url)) {
                this.bot.sendMessage(chatId, '❌ Неверный формат URL');
                return;
            }

            const data = await this.loadData();
            const urlId = Date.now().toString();
            data.urls.push({ id: urlId, url, addedAt: new Date().toISOString() });
            await this.saveData(data);

            this.bot.sendMessage(chatId, `✅ URL добавлен с ID: ${urlId}\\n${url}`);
        });

        this.bot.onText(/\/remove (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const urlId = match[1].trim();

            const data = await this.loadData();
            const initialLength = data.urls.length;
            data.urls = data.urls.filter(item => item.id !== urlId);

            if (data.urls.length < initialLength) {
                await this.saveData(data);
                this.bot.sendMessage(chatId, `✅ URL с ID ${urlId} удален`);
            } else {
                this.bot.sendMessage(chatId, `❌ URL с ID ${urlId} не найден`);
            }
        });

        this.bot.onText(/\/list/, async (msg) => {
            const chatId = msg.chat.id;
            const data = await this.loadData();

            if (data.urls.length === 0) {
                this.bot.sendMessage(chatId, 'Список URL пуст');
                return;
            }

            let message = 'Список отслеживаемых URL:\\n\\n';
            data.urls.forEach((item, index) => {
                message += `${index + 1}. ID: ${item.id}\\n${item.url}\\n\\n`;
            });

            this.bot.sendMessage(chatId, message);
        });

        this.bot.onText(/\/test (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const url = match[1].trim();

            if (!this.isValidUrl(url)) {
                this.bot.sendMessage(chatId, '❌ Неверный формат URL');
                return;
            }

            this.bot.sendMessage(chatId, '📸 Делаю тестовый скриншот...');
            
            try {
                const { takeScreenshot } = await import('./screenshot.js');
                const result = await takeScreenshot(url);
                
                // Обрабатываем новый формат результата
                let screenshotPath, instrumentName, originalUrl;
                if (typeof result === 'string') {
                    // Старый формат - просто путь
                    screenshotPath = result;
                    instrumentName = 'Unknown';
                    originalUrl = url;
                } else {
                    // Новый формат - объект с данными
                    screenshotPath = result.path;
                    instrumentName = result.instrumentName || 'Unknown';
                    originalUrl = result.url || url;
                }
                
                await this.bot.sendPhoto(chatId, screenshotPath, {
                    caption: `📈 ${instrumentName}\n\n🔗 ${originalUrl}`
                });
                
                await fs.unlink(screenshotPath);
            } catch (error) {
                console.error('Screenshot error:', error);
                this.bot.sendMessage(chatId, `❌ Ошибка при создании скриншота: ${error.message}`);
            }
        });

        this.bot.onText(/\/symbol (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const input = match[1].trim();
            
            try {
                // Парсим входные данные: символ и опционально таймфрейм
                // Форматы: "SBER", "SBER 1h", "SBER,1h", "SBER-1h"
                const parts = input.split(/[\s,\-]+/);
                const symbol = parts[0].toUpperCase();
                const timeframeInput = parts[1] || '1d';
                
                const normalizedSymbol = normalizeSymbol(symbol);
                const timeframe = parseTimeframe(timeframeInput);
                const timeframeDesc = getTimeframeDescription(timeframeInput);
                
                // Создаем URL с таймфреймом
                const basicUrl = buildTradingViewUrl(normalizedSymbol, timeframe);
                
                const message = `📊 ${symbol} (${timeframeDesc})

${basicUrl}

Примеры: /symbol SBER 1h, /symbol GAZP 15m
Команды: /add <url>, /test <url>, /timeframes`;
                
                this.bot.sendMessage(chatId, message);
            } catch (error) {
                this.bot.sendMessage(chatId, `❌ Ошибка создания URL: ${error.message}`);
            }
        });

        this.bot.onText(/\/timeframes/, (msg) => {
            const chatId = msg.chat.id;
            const popularTimeframes = getPopularTimeframes();
            
            const timeframesList = popularTimeframes.map(tf => {
                return `⏰ ${tf.code} - ${tf.description}`;
            }).join('\n');
            
            const strategiesInfo = Object.entries(TIMEFRAME_PRESETS).map(([strategy, timeframes]) => {
                return `📊 ${strategy}: ${timeframes.join(', ')}`;
            }).join('\n');
            
            const message = `⏰ Популярные таймфреймы:

${timeframesList}

📈 Рекомендации по стратегиям:

${strategiesInfo}

💡 Примеры использования:
/symbol SBER 1h - Сбер на часовом графике
/symbol GAZP 15m - Газпром на 15-минутном
/symbol LKOH 1d - Лукойл на дневном`;
            
            this.bot.sendMessage(chatId, message);
        });

        this.bot.onText(/\/indicators/, (msg) => {
            const chatId = msg.chat.id;
            const presetsInfo = Object.entries(INDICATOR_PRESETS).map(([name, indicators]) => {
                return `📊 ${name}: ${indicators.join(', ')}`;
            }).join('\n');
            
            const message = `📈 Доступные наборы индикаторов:

${presetsInfo}

🔧 Используйте: /symbol <код> [таймфрейм] для получения URL

💡 Индикаторы могут не отображаться без авторизации в TradingView, но URL будет оптимизирован для лучшего отображения.`;
            
            this.bot.sendMessage(chatId, message);
        });

        this.bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            const helpMessage = `
📖 Справка по командам:

/start - запустить бота
/add <url> - добавить ссылку для мониторинга
/remove <id> - удалить ссылку по ID
/list - показать все отслеживаемые ссылки
/test <url> - сделать тестовый скриншот
/symbol <код> [таймфрейм] - создать TradingView URL
/timeframes - показать доступные таймфреймы
/indicators - показать доступные индикаторы
/help - показать эту справку

Примеры:
/symbol SBER - Сбер на дневном графике
/symbol SBER 1h - Сбер на часовом графике
/symbol GAZP 15m - Газпром на 15-минутном
/timeframes - посмотреть таймфреймы
/indicators - посмотреть индикаторы
            `;
            
            this.bot.sendMessage(chatId, helpMessage);
        });
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    async sendScreenshotToAdmin(url, screenshotPath, instrumentName = 'Unknown') {
        const data = await this.loadData();
        if (data.adminChatId) {
            try {
                await this.bot.sendPhoto(data.adminChatId, screenshotPath, {
                    caption: `📈 ${instrumentName}\n\n🔗 ${url}`
                });
            } catch (error) {
                console.error('Error sending screenshot to admin:', error);
            }
        }
    }
}

export default SignalBot;