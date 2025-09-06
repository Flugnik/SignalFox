/**
 * Модуль для работы с индикаторами TradingView
 */

/**
 * Популярные индикаторы TradingView и их коды
 */
export const POPULAR_INDICATORS = {
    // Скользящие средние
    'MA': 'MA@tv-basicstudies',           // Moving Average
    'EMA': 'EMA@tv-basicstudies',         // Exponential Moving Average
    'SMA': 'SMA@tv-basicstudies',         // Simple Moving Average
    
    // Осцилляторы
    'RSI': 'RSI@tv-basicstudies',         // Relative Strength Index
    'MACD': 'MACD@tv-basicstudies',       // MACD
    'Stoch': 'Stoch@tv-basicstudies',     // Stochastic
    
    // Объемы
    'Volume': 'Volume@tv-basicstudies',    // Volume
    
    // Уровни поддержки/сопротивления
    'PivotPoints': 'PivotPointsHighLow@tv-basicstudies',
    
    // Bollinger Bands
    'BB': 'BB@tv-basicstudies',
    
    // Ichimoku
    'Ichimoku': 'IchimokuCloud@tv-basicstudies'
};

/**
 * Стандартные настройки для популярных индикаторов
 */
export const INDICATOR_PRESETS = {
    // Набор для скальпинга
    'scalping': ['EMA', 'RSI', 'Volume'],
    
    // Набор для дневной торговли
    'day_trading': ['MA', 'MACD', 'RSI', 'Volume'],
    
    // Набор для долгосрочных инвестиций
    'investing': ['MA', 'BB', 'Volume'],
    
    // Технический анализ
    'technical': ['MA', 'EMA', 'RSI', 'MACD', 'BB']
};

/**
 * Создает URL TradingView с индикаторами
 * @param {string} symbol - Символ инструмента
 * @param {string[]} indicators - Массив кодов индикаторов
 * @param {string} interval - Таймфрейм
 * @returns {string} - URL с индикаторами
 */
export function buildTradingViewUrlWithIndicators(symbol, indicators = [], interval = '1D') {
    const baseUrl = 'https://ru.tradingview.com/chart/';
    const encodedSymbol = symbol.replace(':', '%3A');
    
    let url = `${baseUrl}?symbol=${encodedSymbol}&interval=${interval}`;
    
    // Добавляем индикаторы, если они есть
    if (indicators.length > 0) {
        const indicatorCodes = indicators.map(ind => {
            return POPULAR_INDICATORS[ind] || ind;
        });
        
        // TradingView использует параметр "studies" для индикаторов
        const studiesParam = indicatorCodes.join(',');
        url += `&studies=${encodeURIComponent(studiesParam)}`;
    }
    
    return url;
}

/**
 * Создает URL с предустановленным набором индикаторов
 * @param {string} symbol - Символ инструмента
 * @param {string} preset - Название набора ('scalping', 'day_trading', etc.)
 * @param {string} interval - Таймфрейм
 * @returns {string} - URL с набором индикаторов
 */
export function buildTradingViewUrlWithPreset(symbol, preset = 'technical', interval = '1D') {
    const indicators = INDICATOR_PRESETS[preset] || INDICATOR_PRESETS['technical'];
    return buildTradingViewUrlWithIndicators(symbol, indicators, interval);
}

/**
 * Создает URL с настройками для российского рынка
 * @param {string} symbol - Символ инструмента
 * @param {string} interval - Таймфрейм
 * @returns {string} - URL оптимизированный для российских акций
 */
export function buildRussianStockUrl(symbol, interval = '1D') {
    // Для российских акций используем специальный набор
    const russianIndicators = ['MA', 'EMA', 'RSI', 'Volume'];
    
    const baseUrl = 'https://ru.tradingview.com/chart/';
    const encodedSymbol = symbol.replace(':', '%3A');
    
    // Добавляем настройки для московской биржи
    let url = `${baseUrl}?symbol=${encodedSymbol}&interval=${interval}`;
    
    // Пробуем добавить стандартные индикаторы через параметр studies
    const indicatorCodes = russianIndicators.map(ind => POPULAR_INDICATORS[ind]);
    url += `&studies=${encodeURIComponent(indicatorCodes.join(','))}`;
    
    // Добавляем настройки отображения
    url += '&style=1'; // Candlestick style
    url += '&timezone=Europe%2FMoscow'; // Moscow timezone
    
    return url;
}

/**
 * Создает упрощенный URL без сложных индикаторов (для стабильности)
 * @param {string} symbol - Символ инструмента
 * @param {string} interval - Таймфрейм
 * @returns {string} - Простой URL
 */
export function buildSimpleTradingViewUrl(symbol, interval = '1D') {
    const baseUrl = 'https://ru.tradingview.com/chart/';
    const encodedSymbol = symbol.replace(':', '%3A');
    
    return `${baseUrl}?symbol=${encodedSymbol}&interval=${interval}&style=1&timezone=Europe%2FMoscow`;
}