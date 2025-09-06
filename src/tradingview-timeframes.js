/**
 * Модуль для работы с таймфреймами TradingView
 */

/**
 * Доступные таймфреймы TradingView
 */
export const TIMEFRAMES = {
    // Секундные
    '1s': '1S',
    '5s': '5S',
    '10s': '10S',
    '15s': '15S',
    '30s': '30S',
    
    // Минутные
    '1m': '1',
    '3m': '3', 
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '45m': '45',
    
    // Часовые
    '1h': '60',
    '2h': '120',
    '3h': '180',
    '4h': '240',
    '6h': '360',
    '8h': '480',
    '12h': '720',
    
    // Дневные
    '1d': '1D',
    '3d': '3D',
    
    // Недельные и месячные
    '1w': '1W',
    '1M': '1M',
    '3M': '3M',
    '6M': '6M',
    '12M': '12M'
};

/**
 * Популярные таймфреймы для разных стратегий
 */
export const TIMEFRAME_PRESETS = {
    // Скальпинг
    'scalping': ['1m', '3m', '5m'],
    
    // Дневная торговля
    'day_trading': ['5m', '15m', '30m', '1h'],
    
    // Свинг трейдинг  
    'swing_trading': ['1h', '4h', '1d'],
    
    // Инвестиции
    'investing': ['1d', '1w', '1M'],
    
    // Технический анализ
    'technical': ['15m', '1h', '4h', '1d']
};

/**
 * Описания таймфреймов на русском языке
 */
export const TIMEFRAME_DESCRIPTIONS = {
    '1m': '1 минута',
    '3m': '3 минуты', 
    '5m': '5 минут',
    '15m': '15 минут',
    '30m': '30 минут',
    '1h': '1 час',
    '2h': '2 часа',
    '4h': '4 часа',
    '1d': '1 день',
    '1w': '1 неделя',
    '1M': '1 месяц'
};

/**
 * Преобразует пользовательский ввод таймфрейма в формат TradingView
 * @param {string} userInput - Пользовательский ввод (например, "5m", "1h", "1d")
 * @returns {string} - Таймфрейм в формате TradingView
 */
export function parseTimeframe(userInput) {
    const normalized = userInput.toLowerCase().trim();
    
    // Прямое соответствие
    if (TIMEFRAMES[normalized]) {
        return TIMEFRAMES[normalized];
    }
    
    // Попробуем распарсить различные форматы
    const patterns = [
        { regex: /^(\d+)m$/i, format: (match) => match[1] }, // 5m -> 5
        { regex: /^(\d+)h$/i, format: (match) => (parseInt(match[1]) * 60).toString() }, // 1h -> 60
        { regex: /^(\d+)d$/i, format: (match) => match[1] + 'D' }, // 1d -> 1D
        { regex: /^(\d+)w$/i, format: (match) => match[1] + 'W' }, // 1w -> 1W
        { regex: /^(\d+)mo$/i, format: (match) => match[1] + 'M' } // 1mo -> 1M
    ];
    
    for (const pattern of patterns) {
        const match = normalized.match(pattern.regex);
        if (match) {
            return pattern.format(match);
        }
    }
    
    // По умолчанию возвращаем дневной график
    return '1D';
}

/**
 * Получает описание таймфрейма на русском языке
 * @param {string} timeframe - Таймфрейм (например, "5m", "1h")
 * @returns {string} - Описание на русском
 */
export function getTimeframeDescription(timeframe) {
    return TIMEFRAME_DESCRIPTIONS[timeframe] || timeframe;
}

/**
 * Создает список популярных таймфреймов с описаниями
 * @returns {Array} - Массив объектов с таймфреймами
 */
export function getPopularTimeframes() {
    const popular = ['5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    
    return popular.map(tf => ({
        code: tf,
        description: getTimeframeDescription(tf),
        tradingview: TIMEFRAMES[tf]
    }));
}

/**
 * Проверяет валидность таймфрейма
 * @param {string} timeframe - Таймфрейм для проверки
 * @returns {boolean} - true если таймфрейм валидный
 */
export function isValidTimeframe(timeframe) {
    const normalized = timeframe.toLowerCase().trim();
    return !!TIMEFRAMES[normalized] || !!parseTimeframe(normalized);
}

/**
 * Получает рекомендуемые таймфреймы для стратегии
 * @param {string} strategy - Стратегия ('scalping', 'day_trading', etc.)
 * @returns {Array} - Массив рекомендуемых таймфреймов
 */
export function getRecommendedTimeframes(strategy) {
    return TIMEFRAME_PRESETS[strategy] || TIMEFRAME_PRESETS['technical'];
}