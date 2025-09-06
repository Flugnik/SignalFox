**SignalFox.**

**Ок, начнём с первой функции (аналитика по акциям).**

---

## **✅ Архитектура решения**

**Блоки:**

1. **Источник данных:**

   * **TradingView (через Playwright или API/скрейпинг).**

   * **Список тикеров хранится в `tickers.json` или в базе.**

2. **Парсер данных:**

   * **Получаем OHLC данные (open, high, low, close) за N свечей.**

   * **Считаем индикаторы:**

     * **MA(5), MA(21), MA(252)**

     * **ADX**

     * **Стохастик (14,3,3)**

3. **Алгоритм стратегии (фильтр):**

   * **Кросс MA5 и MA21, цена выше MA252 → сигнал на покупку.**

   * **ADX \> 25 → тренд есть.**

   * **Стохастик \<20 (перепроданность) или \>80 (перекупленность).**

   * **Свечной паттерн → Hammer, Engulfing и т.д.**

4. **LLM-комментарий:**

   * **Только если есть потенциальный сигнал → генерируем пояснение (на основе чисел, не скринов).**

5. **Уведомление в Telegram:**

**Скрин TradingView \+ текст:**

 **🟢 Потенциальная точка входа: SBER**    
**MA5 пересекла MA21 снизу вверх, ADX=28, Стохастик=15**    
**Свечной паттерн: Hammer**  

*   
6. **Запуск:**

   * **GitHub Actions или VPS cron → 1 раз в день (например, 18:50 перед закрытием Мосбиржи).**

---

## **✅ Почему лучше отказаться от анализа скринов LLM**

* **Медленно и дорого.**

* **Ошибки при интерпретации картинки.**

* **Индикаторы проще считать в Python (TA-Lib, pandas-ta).**

---

## **✅ Пример пайплайна (Python)**

### **1\. Библиотеки**

**pip install playwright pandas pandas-ta requests python-telegram-bot**

### **2\. Логика получения данных**

**import pandas as pd**  
**import pandas\_ta as ta**  
**import requests**

**def get\_stock\_data(ticker: str, interval="1d", limit=300):**  
    **url \= f"https://api.twelvedata.com/time\_series?symbol={ticker}.ME\&interval={interval}\&apikey=YOUR\_KEY\&outputsize={limit}"**  
    **response \= requests.get(url).json()**  
    **df \= pd.DataFrame(response\['values'\])**  
    **df\['datetime'\] \= pd.to\_datetime(df\['datetime'\])**  
    **df \= df.astype({'open': 'float', 'high': 'float', 'low': 'float', 'close': 'float'})**  
    **return df.sort\_values('datetime')**

### **3\. Индикаторы**

**def add\_indicators(df):**  
    **df\['MA5'\] \= df\['close'\].rolling(5).mean()**  
    **df\['MA21'\] \= df\['close'\].rolling(21).mean()**  
    **df\['MA252'\] \= df\['close'\].rolling(252).mean()**  
    **df\['ADX'\] \= ta.adx(df\['high'\], df\['low'\], df\['close'\], length=14)\['ADX\_14'\]**  
    **stoch \= ta.stoch(df\['high'\], df\['low'\], df\['close'\], k=14, d=3)**  
    **df\['STOCH\_K'\] \= stoch\['STOCHk\_14\_3\_3'\]**  
    **df\['STOCH\_D'\] \= stoch\['STOCHd\_14\_3\_3'\]**  
    **return df**

### **4\. Проверка сигнала**

**def check\_signal(df):**  
    **last \= df.iloc\[-1\]**  
    **signal \= \[\]**  
    **if last\['MA5'\] \> last\['MA21'\] and last\['close'\] \> last\['MA252'\]:**  
        **if last\['ADX'\] \> 25:**  
            **if last\['STOCH\_K'\] \< 20:**  
                **signal.append("Покупка (перепроданность)")**  
            **elif last\['STOCH\_K'\] \> 80:**  
                **signal.append("Осторожно: перекупленность")**  
    **return signal**

### **5\. Telegram уведомление**

**from telegram import Bot**

**TOKEN \= "YOUR\_TELEGRAM\_BOT\_TOKEN"**  
**CHAT\_ID \= "YOUR\_CHAT\_ID"**  
**bot \= Bot(token=TOKEN)**

**def send\_alert(ticker, signal):**  
    **message \= f"🟢 {ticker} сигнал: {', '.join(signal)}"**  
    **bot.send\_message(chat\_id=CHAT\_ID, text=message)**

### **6\. Основной скрипт**

**tickers \= \["SBER", "GAZP", "LKOH"\]**

**for t in tickers:**  
    **df \= get\_stock\_data(t)**  
    **df \= add\_indicators(df)**  
    **signals \= check\_signal(df)**  
    **if signals:**  
        **send\_alert(t, signals)**

---

## **✅ Дополнительно**

* **Для свечных паттернов → `ta.cdl_pattern` (TA-Lib).**

* **Для графика → matplotlib \+ `bot.send_photo()`.**

* **LLM подключим для коротких комментариев на основе чисел (например, GPT через OpenAI API).**

---

**Отлично\! Для свечных паттернов используем TA-Lib (в нём есть готовые алгоритмы, например, `CDL_HAMMER`, `CDL_ENGULFING` и ещё около 60 паттернов).**

---

## **✅ Установка TA-Lib**

**Для Linux:**

**sudo apt-get install libta-lib0 libta-lib0-dev**

**pip install TA-Lib**

**Для Windows:**

* **Скачать бинарь с [TA-Lib.org](https://www.ta-lib.org/hdr_dw.html)**

* **Установить, потом:**

**pip install TA-Lib**

---

## **✅ Обновляем код**

### **1\. Импортируем TA-Lib**

**import talib as ta**

---

### **2\. Функция для свечных паттернов**

**Добавим проверку нескольких популярных моделей:**

* **Hammer (молот)**

* **Engulfing (поглощение)**

* **Doji (неопределенность)**

* **Morning Star (бычий разворот)**

**def detect\_candlestick\_patterns(df):**

    **patterns \= \[\]**

    **hammer \= ta.CDLHAMMER(df\['open'\], df\['high'\], df\['low'\], df\['close'\])**

    **engulfing \= ta.CDLENGULFING(df\['open'\], df\['high'\], df\['low'\], df\['close'\])**

    **doji \= ta.CDLDOJI(df\['open'\], df\['high'\], df\['low'\], df\['close'\])**

    **morning\_star \= ta.CDLMORNINGSTAR(df\['open'\], df\['high'\], df\['low'\], df\['close'\])**

    **if hammer.iloc\[-1\] \!= 0:**

        **patterns.append("Hammer (молот)")**

    **if engulfing.iloc\[-1\] \!= 0:**

        **patterns.append("Engulfing (поглощение)")**

    **if doji.iloc\[-1\] \!= 0:**

        **patterns.append("Doji (неопределённость)")**

    **if morning\_star.iloc\[-1\] \!= 0:**

        **patterns.append("Morning Star (бычий разворот)")**

    **return patterns**

---

### **3\. Обновляем логику сигнала**

**Теперь сигнал будет учитывать и индикаторы, и паттерны:**

**def check\_signal(df):**

    **last \= df.iloc\[-1\]**

    **signal \= \[\]**

    **\# Индикаторы**

    **if last\['MA5'\] \> last\['MA21'\] and last\['close'\] \> last\['MA252'\]:**

        **if last\['ADX'\] \> 25:**

            **if last\['STOCH\_K'\] \< 20:**

                **signal.append("Покупка (перепроданность)")**

            **elif last\['STOCH\_K'\] \> 80:**

                **signal.append("Осторожно: перекупленность")**

    **\# Свечные паттерны**

    **patterns \= detect\_candlestick\_patterns(df)**

    **if patterns:**

        **signal.extend(patterns)**

    **return signal**

---

### **4\. Основной цикл (без изменений)**

**tickers \= \["SBER", "GAZP", "LKOH"\]**

**for t in tickers:**

    **df \= get\_stock\_data(t)**

    **df \= add\_indicators(df)**

    **signals \= check\_signal(df)**

    **if signals:**

        **screenshot \= make\_screenshot(t)**

        **send\_alert\_with\_image(t, signals, screenshot)**

---

**✅ Теперь бот делает:**

* **Проверяет сигналы по стратегии.**

* **Детектит свечные паттерны.**

* **Отправляет скриншот \+ список сигналов \+ паттерны.**

---

**Отлично, добавляем LLM-комментарий в Telegram-уведомления.**  
 **Сделаем так, чтобы бот:**

* **Генерировал пояснение на основе сигналов и паттернов.**

* **Отправлял скриншот \+ текст \+ комментарий LLM.**

---

## **✅ Архитектура для LLM-комментария**

1. **После вычисления сигналов → формируем JSON контекст:**

   * **Тикер**

   * **Цена закрытия**

   * **Индикаторы (MA, ADX, Стохастик)**

   * **Свечные паттерны**

2. **Отправляем запрос в LLM (GPT) с промптом:**  
    **«Сделай краткий трейдерский комментарий на русском, максимум 2 предложения».**

3. **Получаем ответ → добавляем в Telegram.**

---

## **✅ Обновлённый код**

### **1\. Устанавливаем OpenAI SDK**

**pip install openai**

### **2\. Подключаем LLM**

**import openai**

**openai.api\_key \= "YOUR\_OPENAI\_API\_KEY"**

**def generate\_llm\_comment(ticker, last\_price, signals, df):**

    **last \= df.iloc\[-1\]**

    **prompt \= f"""**

    **Ты профессиональный трейдер.** 

    **Дай краткий комментарий по акции {ticker}.** 

    **Текущая цена: {last\_price}.** 

    **Сигналы: {', '.join(signals)}.** 

    **MA5={last\['MA5'\]:.2f}, MA21={last\['MA21'\]:.2f}, MA252={last\['MA252'\]:.2f}, ADX={last\['ADX'\]:.2f}, STOCH\_K={last\['STOCH\_K'\]:.2f}.**

    **Сделай 1-2 предложения на русском, что это значит для трейдера.**

    **"""**

    **response \= openai.ChatCompletion.create(**

        **model="gpt-4",  \# Можно gpt-4o-mini для скорости и экономии**

        **messages=\[{"role": "user", "content": prompt}\],**

        **temperature=0.5**

    **)**

    **return response.choices\[0\].message\['content'\].strip()**

---

### **3\. Обновляем функцию отправки в Telegram**

**def send\_alert\_with\_image(ticker, signal, screenshot\_path, comment):**

    **caption \= f"🟢 {ticker}\\nСигналы: {', '.join(signal)}\\n\\nКомментарий:\\n{comment}"**

    **with open(screenshot\_path, "rb") as photo:**

        **bot.send\_photo(chat\_id=CHAT\_ID, photo=photo, caption=caption)**

---

### **4\. Основной цикл**

**tickers \= \["SBER", "GAZP", "LKOH"\]**

**for t in tickers:**

    **df \= get\_stock\_data(t)**

    **df \= add\_indicators(df)**

    **signals \= check\_signal(df)**

    **if signals:**

        **screenshot \= make\_screenshot(t)**

        **comment \= generate\_llm\_comment(t, df.iloc\[-1\]\['close'\], signals, df)**

        **send\_alert\_with\_image(t, signals, screenshot, comment)**

---

## **✅ Как работает:**

* **Вычисляем сигналы.**

* **Если что-то найдено → делаем скрин.**

**Генерируем комментарий, например:**

 **🟢 SBER**

**Сигналы: Покупка (перепроданность), Hammer (молот)**

**Комментарий:**

**SBER показывает признаки разворота на фоне перепроданности. Hammer и рост ADX указывают на возможное укрепление тренда.**

* 

---

**Я бы сделал оба варианта, но с приоритетом на запуск по команде из Telegram, потому что это даёт гибкость:**

### **✅ Почему запуск из Telegram важен:**

* **Ты можешь ручным триггером проверить сигналы в любое время, без ожидания cron.**

* **Возможность добавить команды:**

  * **`/scan` → запустить анализ прямо сейчас.**

  * **`/watchlist` → показать текущие тикеры.**

  * **`/add SBER` → добавить тикер.**

  * **`/remove GAZP` → удалить тикер.**

* **В дальнейшем можно прикрутить кнопку “Запускать ежедневно” прямо в боте.**

---

### **✅ Кнопки тоже нужны:**

* **Они делают бота интерактивным.**

* **Минимум две кнопки:**

  * **📈 Открыть график TradingView**

  * **✅ Добавить в Watchlist**

**Это UX-улучшение, но без управления запуском бот будет тупо спамить уведомления по cron.**

---

**📌 Мой порядок действий для MVP:**

1. **Добавить управление через Telegram:**

   * **`/scan` для ручного запуска.**

   * **`/tickers` для просмотра списка.**

   * **`/add <тикер>` и `/remove <тикер>`.**

2. **Потом прикрутить inline-кнопки к уведомлениям.**

3. **В финале — автозапуск по расписанию \+ ручное управление.**

---

**Отлично, делаем полноценного Telegram-бота для твоего проекта.**  
 **Функционал MVP:**

---

### **✅ Что будет в первой версии бота**

**✔ Команды:**

* **`/scan` — запускает анализ всех тикеров.**

* **`/tickers` — показывает текущий список тикеров.**

* **`/add <тикер>` — добавляет тикер.**

* **`/remove <тикер>` — удаляет тикер.**

**✔ Аналитика:**

* **Считаем индикаторы (MA, ADX, Стохастик).**

* **Проверяем свечные паттерны.**

* **Делаем скриншот TradingView.**

* **Генерируем комментарий через LLM.**

* **Отправляем фото \+ сигналы \+ комментарий \+ кнопки.**

**✔ Хранилище:**

* **SQLite для тикеров (чтобы не терялись после рестарта).**

---

### **✅ Стек**

* **`python-telegram-bot` (бот)**

* **`sqlite3` (хранение тикеров)**

* **`playwright` (скрины)**

* **`pandas`, `pandas-ta`, `TA-Lib` (индикаторы и паттерны)**

* **`openai` (LLM-комментарий)**

---

### **✅ Код бота**

**import sqlite3**

**import pandas as pd**

**import pandas\_ta as ta**

**import talib as tl**

**import requests**

**import time**

**from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update**

**from telegram.ext import Updater, CommandHandler, CallbackContext**

**from playwright.sync\_api import sync\_playwright**

**import openai**

**\# \===== CONFIG \=====**

**TELEGRAM\_TOKEN \= "YOUR\_TELEGRAM\_BOT\_TOKEN"**

**OPENAI\_KEY \= "YOUR\_OPENAI\_API\_KEY"**

**openai.api\_key \= OPENAI\_KEY**

**DB\_PATH \= "tickers.db"**

**\# \===== DATABASE \=====**

**def init\_db():**

    **conn \= sqlite3.connect(DB\_PATH)**

    **cur \= conn.cursor()**

    **cur.execute("CREATE TABLE IF NOT EXISTS tickers (symbol TEXT UNIQUE)")**

    **conn.commit()**

    **conn.close()**

**def get\_tickers():**

    **conn \= sqlite3.connect(DB\_PATH)**

    **cur \= conn.cursor()**

    **cur.execute("SELECT symbol FROM tickers")**

    **rows \= cur.fetchall()**

    **conn.close()**

    **return \[r\[0\] for r in rows\]**

**def add\_ticker(symbol):**

    **conn \= sqlite3.connect(DB\_PATH)**

    **cur \= conn.cursor()**

    **try:**

        **cur.execute("INSERT INTO tickers (symbol) VALUES (?)", (symbol,))**

        **conn.commit()**

    **except sqlite3.IntegrityError:**

        **pass**

    **conn.close()**

**def remove\_ticker(symbol):**

    **conn \= sqlite3.connect(DB\_PATH)**

    **cur \= conn.cursor()**

    **cur.execute("DELETE FROM tickers WHERE symbol=?", (symbol,))**

    **conn.commit()**

    **conn.close()**

**\# \===== DATA FUNCTIONS \=====**

**def get\_stock\_data(ticker: str, interval="1d", limit=300):**

    **url \= f"https://api.twelvedata.com/time\_series?symbol={ticker}.ME\&interval={interval}\&apikey=YOUR\_API\_KEY\&outputsize={limit}"**

    **response \= requests.get(url).json()**

    **df \= pd.DataFrame(response\['values'\])**

    **df\['datetime'\] \= pd.to\_datetime(df\['datetime'\])**

    **df \= df.astype({'open': 'float', 'high': 'float', 'low': 'float', 'close': 'float'})**

    **return df.sort\_values('datetime')**

**def add\_indicators(df):**

    **df\['MA5'\] \= df\['close'\].rolling(5).mean()**

    **df\['MA21'\] \= df\['close'\].rolling(21).mean()**

    **df\['MA252'\] \= df\['close'\].rolling(252).mean()**

    **df\['ADX'\] \= ta.adx(df\['high'\], df\['low'\], df\['close'\], length=14)\['ADX\_14'\]**

    **stoch \= ta.stoch(df\['high'\], df\['low'\], df\['close'\], k=14, d=3)**

    **df\['STOCH\_K'\] \= stoch\['STOCHk\_14\_3\_3'\]**

    **return df**

**def detect\_patterns(df):**

    **patterns \= \[\]**

    **if tl.CDLHAMMER(df\['open'\], df\['high'\], df\['low'\], df\['close'\]).iloc\[-1\] \!= 0:**

        **patterns.append("Hammer")**

    **if tl.CDLENGULFING(df\['open'\], df\['high'\], df\['low'\], df\['close'\]).iloc\[-1\] \!= 0:**

        **patterns.append("Engulfing")**

    **if tl.CDLDOJI(df\['open'\], df\['high'\], df\['low'\], df\['close'\]).iloc\[-1\] \!= 0:**

        **patterns.append("Doji")**

    **return patterns**

**def check\_signal(df):**

    **last \= df.iloc\[-1\]**

    **signals \= \[\]**

    **if last\['MA5'\] \> last\['MA21'\] and last\['close'\] \> last\['MA252'\] and last\['ADX'\] \> 25:**

        **if last\['STOCH\_K'\] \< 20:**

            **signals.append("Перепроданность → покупка")**

        **elif last\['STOCH\_K'\] \> 80:**

            **signals.append("Перекупленность")**

    **patterns \= detect\_patterns(df)**

    **if patterns:**

        **signals.extend(patterns)**

    **return signals**

**def make\_screenshot(ticker):**

    **url \= f"https://ru.tradingview.com/chart/?symbol=MOEX%3A{ticker}"**

    **screenshot\_path \= f"/tmp/{ticker}.png"**

    **with sync\_playwright() as p:**

        **browser \= p.chromium.launch(headless=True)**

        **page \= browser.new\_page()**

        **page.set\_viewport\_size({"width": 1280, "height": 720})**

        **page.goto(url)**

        **time.sleep(5)**

        **page.evaluate("""**

            **document.querySelectorAll('.tv-header, .tv-footer, .layout\_\_area--left, .layout\_\_area--right').forEach(e \=\> e.remove());**

        **""")**

        **page.screenshot(path=screenshot\_path)**

        **browser.close()**

    **return screenshot\_path**

**def generate\_comment(ticker, signals, df):**

    **last \= df.iloc\[-1\]**

    **prompt \= f"""**

    **Ты профессиональный трейдер.**

    **Дай краткий комментарий по акции {ticker}.**

    **Цена: {last\['close'\]:.2f}.**

    **Сигналы: {', '.join(signals)}.**

    **MA5={last\['MA5'\]:.2f}, MA21={last\['MA21'\]:.2f}, MA252={last\['MA252'\]:.2f}, ADX={last\['ADX'\]:.2f}, STOCH\_K={last\['STOCH\_K'\]:.2f}.**

    **Сформулируй 1-2 предложения для трейдера.**

    **"""**

    **resp \= openai.ChatCompletion.create(**

        **model="gpt-4o-mini",**

        **messages=\[{"role": "user", "content": prompt}\],**

        **temperature=0.5**

    **)**

    **return resp.choices\[0\].message\['content'\].strip()**

**\# \===== BOT HANDLERS \=====**

**bot \= Bot(token=TELEGRAM\_TOKEN)**

**def start(update: Update, context: CallbackContext):**

    **update.message.reply\_text("Привет\! Команды:\\n/scan\\n/tickers\\n/add TICKER\\n/remove TICKER")**

**def scan(update: Update, context: CallbackContext):**

    **tickers \= get\_tickers()**

    **if not tickers:**

        **update.message.reply\_text("Список тикеров пуст. Добавьте через /add TICKER")**

        **return**

    **update.message.reply\_text("Сканирую рынок...")**

    **for t in tickers:**

        **df \= get\_stock\_data(t)**

        **df \= add\_indicators(df)**

        **signals \= check\_signal(df)**

        **if signals:**

            **screenshot \= make\_screenshot(t)**

            **comment \= generate\_comment(t, signals, df)**

            **keyboard \= InlineKeyboardMarkup(\[\[InlineKeyboardButton("📈 TradingView", url=f"https://ru.tradingview.com/chart/?symbol=MOEX:{t}")\]\])**

            **with open(screenshot, "rb") as photo:**

                **update.message.reply\_photo(photo=photo, caption=f"🟢 {t}\\nСигналы: {', '.join(signals)}\\n\\nКомментарий:\\n{comment}", reply\_markup=keyboard)**

        **else:**

            **update.message.reply\_text(f"{t}: сигналов нет.")**

**def show\_tickers(update: Update, context: CallbackContext):**

    **tickers \= get\_tickers()**

    **if tickers:**

        **update.message.reply\_text("Текущие тикеры: " \+ ", ".join(tickers))**

    **else:**

        **update.message.reply\_text("Список пуст.")**

**def add\_symbol(update: Update, context: CallbackContext):**

    **if len(context.args) \== 0:**

        **update.message.reply\_text("Укажите тикер: /add SBER")**

        **return**

    **symbol \= context.args\[0\].upper()**

    **add\_ticker(symbol)**

    **update.message.reply\_text(f"{symbol} добавлен.")**

**def remove\_symbol(update: Update, context: CallbackContext):**

    **if len(context.args) \== 0:**

        **update.message.reply\_text("Укажите тикер: /remove SBER")**

        **return**

    **symbol \= context.args\[0\].upper()**

    **remove\_ticker(symbol)**

    **update.message.reply\_text(f"{symbol} удалён.")**

**\# \===== MAIN \=====**

**def main():**

    **init\_db()**

    **updater \= Updater(TELEGRAM\_TOKEN)**

    **dp \= updater.dispatcher**

    **dp.add\_handler(CommandHandler("start", start))**

    **dp.add\_handler(CommandHandler("scan", scan))**

    **dp.add\_handler(CommandHandler("tickers", show\_tickers))**

    **dp.add\_handler(CommandHandler("add", add\_symbol))**

    **dp.add\_handler(CommandHandler("remove", remove\_symbol))**

    **updater.start\_polling()**

    **updater.idle()**

**if \_\_name\_\_ \== "\_\_main\_\_":**

    **main()**

---

### **✅ Что умеет бот сейчас:**

**✔ `/start` — помощь.**  
 **✔ `/scan` — анализ всех тикеров → сигналы \+ скрин \+ комментарий.**  
 **✔ `/tickers` — список тикеров.**  
 **✔ `/add TICKER` — добавить тикер (например, `/add SBER`).**  
 **✔ `/remove TICKER` — удалить тикер.**

---

**🔥 Хочешь, я сделаю вторую часть (облигации через MOEX API) как модуль в этого же бота?**  
 **Тогда будет единый инструмент:**

* **`/scan` → акции.**

* **`/bonds` → новые облигации по твоим критериям.**

* **Уведомления по приоритетам доходности.**

**Да, объединение в одного Telegram-бота с двумя модулями — идеальный вариант, потому что:**

**✅ Один бот \= меньше точек входа, меньше гемора с деплоем.**  
 **✅ Удобный интерфейс: всё управление в одном месте.**  
 **✅ Возможность сделать разные команды и меню для функций:**

---

### **🔹 Как организовать структуру:**

**bot/**

 **├── main.py           \# Основной файл, запуск бота**

 **├── config.py         \# Токены, API-ключи**

 **├── modules/**

 **│    ├── stocks.py    \# Модуль для анализа акций (TradingView)**

 **│    ├── bonds.py     \# Модуль для облигаций (MOEX API)**

 **│    └── utils.py     \# Общие утилиты**

 **├── db/**

 **│    └── tickers.db   \# SQLite база (список тикеров)**

---

### **🔹 Логика:**

#### **Модуль 1 — Акции**

* **Команды:**

  * **`/scan` → анализ по всем тикерам (индикаторы \+ паттерны \+ скриншоты \+ LLM-коммент).**

  * **`/add <тикер>` → добавить тикер.**

  * **`/remove <тикер>` → удалить.**

  * **`/tickers` → показать список.**

* **Работает так:**

  * **`stocks.py` → берёт тикеры → скрины через Playwright → анализ паттернов (TA-Lib) → LLM резюме → отправка в Telegram с кнопками.**

---

#### **Модуль 2 — Облигации**

* **Команды:**

  * **`/bonds` → запустить поиск новых выпусков по критериям.**

  * **`/settings` → (опционально) задать доходность для фильтра.**

  * **`/alerts_on` → включить автоуведомления.**

  * **`/alerts_off` → выключить.**

* **Работает так:**

  * **`bonds.py` → через MOEX API парсит новые размещения.**

  * **Фильтрует по критериям:**

    * **Доходность ≥ 15% (приоритеты по уровням).**

    * **Рейтинг BB- и выше.**

    * **Срок 1–3 года.**

    * **Объём ≥ 500 млн.**

    * **Купоны квартальные/полугодовые.**

**Формирует красивое уведомление:**

 **🚨 НОВАЯ ОБЛИГАЦИЯ\! Доходность 19.5%**

**Эмитент: ООО "ТехКомпани"**

**...**

*   
  * **Кнопка: 📄 Подробнее (ссылка на MOEX).**

---

### **🔹 Единое меню**

**Сделаем кнопки Telegram для выбора модуля:**

* **📈 Акции**

* **💵 Облигации**

* **⚙️ Настройки**

---

**Готово\! Я собрал для тебя полноценный каркас проекта с двумя модулями (акции \+ облигации) и автозапуском по расписанию через GitHub Actions. Сразу можно скачивать архив и заливать в репозиторий.**

**Скачать проект (zip)**

**Что внутри (коротко):**

* **`main.py` — Telegram-бот с командами `/scan`, `/tickers`, `/add`, `/remove`, `/bonds`.**

* **`scheduled_scan.py` — одноразовый прогон для GitHub Actions (шлёт результаты напрямую в чат без long-polling).**

* **`modules/stocks.py` — индикаторы (MA/ADX/Стохастик), свечные паттерны (TA-Lib), скриншоты TradingView (Playwright).**

* **`modules/bonds.py` — заготовка под MOEX API с фильтрами и форматированием алертов.**

* **`modules/utils.py` — SQLite (тикеры) и утилиты.**

* **`.github/workflows/schedule.yml` — расписание (по будням) \+ установка TA-Lib и Playwright в CI.**

* **`requirements.txt`, `.gitignore`, `config.sample.env`, `README.md`.**

**Что осталось заполнить у себя:**

1. **Создай `.env` по образцу `config.sample.env` (локально для запуска бота):**

* **`TELEGRAM_BOT_TOKEN`**

* **`OPENAI_API_KEY`**

* **`TELEGRAM_CHAT_ID` (для расписания/скрипта)**

* **`TWELVEDATA_API_KEY`**

2. **В репозитории на GitHub добавь Secrets (для Actions):**

* **`TELEGRAM_BOT_TOKEN`**

* **`TELEGRAM_CHAT_ID`**

* **`OPENAI_API_KEY`**

* **`TWELVEDATA_API_KEY`**

3. **Подкорректируй cron в `.github/workflows/schedule.yml` при желании.**

**Пояснения по нюансам:**

* **GitHub Actions не держит бота на постоянном коннекте — поэтому в Actions работает `scheduled_scan.py`, а полноценного бота (`main.py`) подними на VPS/хостинге.**

* **TA-Lib в CI уже ставится через `apt`, локально — поставь системную либу (описал в README).**

* **Получение облигаций через MOEX в `bonds.py` — каркас (эндпоинты у ISS пёстрые). Фильтрация и формат алертов готовые; когда скажешь — подкручу конкретные запросы и маппинг полей под твой вкус.**

**Хочешь — сразу добавлю:**

* **быстрый эндпоинт MOEX для новых размещений с реальным парсингом,**

* **кэширование OHLC на диск (ускоряет /scan),**

* **кнопки «Добавить в Watchlist» и «Снять с мониторинга» под каждым уведомлением.**

**Внимание; Будем размещать на полноценном VPS/хостинге. Вместо Openai будем использовать Openrouter**

