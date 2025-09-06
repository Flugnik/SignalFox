/**
 * Построитель URL для TradingView с принудительной установкой символа
 */

/**
 * Создает правильный URL TradingView для конкретного символа
 * @param {string} symbol - Символ (например, "MOEX:SBER", "RUS:SMLT")  
 * @param {string} interval - Таймфрейм (по умолчанию "1D")
 * @returns {string} - Готовый URL для TradingView
 */
export function buildTradingViewUrl(symbol, interval = '1D') {
    // Базовый URL без конкретного чарта
    const baseUrl = 'https://ru.tradingview.com/chart/';
    
    // Правильное кодирование символа - только заменяем : на %3A
    const encodedSymbol = symbol.replace(':', '%3A');
    
    // Создаем URL вручную, чтобы избежать двойного кодирования
    return `${baseUrl}?symbol=${encodedSymbol}&interval=${interval}`;
}

/**
 * Извлекает символ из существующего URL TradingView
 * @param {string} url - URL TradingView
 * @returns {string|null} - Символ или null
 */
export function extractSymbolFromTradingViewUrl(url) {
    try {
        const urlObj = new URL(url);
        const symbolParam = urlObj.searchParams.get('symbol');
        if (symbolParam) {
            return decodeURIComponent(symbolParam);
        }
        return null;
    } catch (error) {
        console.error('Error extracting symbol from URL:', error);
        return null;
    }
}

/**
 * Корректирует существующий URL TradingView, заменяя символ
 * @param {string} originalUrl - Исходный URL  
 * @param {string} newSymbol - Новый символ
 * @returns {string} - Исправленный URL
 */
export function correctTradingViewUrl(originalUrl, newSymbol) {
    try {
        const urlObj = new URL(originalUrl);
        
        // Убираем ID чарта из пути, если он есть
        urlObj.pathname = '/chart/';
        
        // Устанавливаем новый символ с правильным кодированием
        const encodedSymbol = newSymbol.replace(':', '%3A');
        urlObj.searchParams.set('symbol', encodedSymbol);
        
        return urlObj.toString();
    } catch (error) {
        console.error('Error correcting URL:', error);
        // Если не получается исправить, создаем новый
        return buildTradingViewUrl(newSymbol);
    }
}

/**
 * Список популярных российских символов для TradingView
 */
export const POPULAR_RU_SYMBOLS = {
    'SBER': 'MOEX:SBER',
    'GAZP': 'MOEX:GAZP', 
    'LKOH': 'MOEX:LKOH',
    'ROSN': 'MOEX:ROSN',
    'NVTK': 'MOEX:NVTK',
    'SMLT': 'RUS:SMLT',
    'RTKM': 'MOEX:RTKM',
    'YNDX': 'MOEX:YNDX',
    'PLZL': 'MOEX:PLZL',
    'MGNT': 'MOEX:MGNT'
};

/**
 * Нормализует символ к правильному формату
 * @param {string} symbol - Символ (может быть краткий или полный)
 * @returns {string} - Нормализованный символ  
 */
export function normalizeSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase().trim();
    
    // Если уже есть биржа в символе
    if (upperSymbol.includes(':')) {
        return upperSymbol;
    }
    
    // Ищем в популярных символах
    if (POPULAR_RU_SYMBOLS[upperSymbol]) {
        return POPULAR_RU_SYMBOLS[upperSymbol];
    }
    
    // По умолчанию добавляем MOEX
    return `MOEX:${upperSymbol}`;
}

/**
 * Создает URL для множественных символов (для тестирования)
 * @param {string[]} symbols - Массив символов
 * @returns {Object} - Объект с символами и URL
 */
export function buildMultipleUrls(symbols) {
    return symbols.map(symbol => {
        const normalizedSymbol = normalizeSymbol(symbol);
        return {
            original: symbol,
            normalized: normalizedSymbol,
            url: buildTradingViewUrl(normalizedSymbol)
        };
    });
}