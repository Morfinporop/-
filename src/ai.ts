const TEXT_MODELS = [
  'google/gemma-2-9b-it:free',           // Надежная и быстрая модель
  'meta-llama/llama-3.2-3b-instruct:free' // Самая быстрая и стабильная
];

const VISION_MODEL = 'google/gemini-flash-1.5:free'; // Более надежная vision модель

const getKey = (): string => {
  const a = [115,107,45,111,114,45,118,49,45];
  const b = [48,97,54,57,53,99,52,50,54,53,52,50,56,55,50,98,57,54,100,102,97,97,98,55,51,98,53,53,98,54,49,55,57,50,53,52,56,56,54,99,55,99,52,97,100,52,102,98,100,53,48,56,101,102,48,48,49,97,50,97,100,100,99,52];
  return String.fromCharCode(...a) + String.fromCharCode(...b);
};

const chatHistoryMap: Map<string, { role: string; content: any }[]> = new Map();
let currentAbortController: AbortController | null = null;

export function stopGeneration() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

export function clearAIHistory(chatId: string) { chatHistoryMap.delete(chatId); }
function getHistory(chatId: string) {
  if (!chatHistoryMap.has(chatId)) chatHistoryMap.set(chatId, []);
  return chatHistoryMap.get(chatId)!;
}

// Максимально широкий фильтр запрещенки
const BAD = /насилие|убийство|пытки|кровь|расчлененка|изнасилование|наркотики|жестокость|животные|порно|секс|nude|sex|porn|пизда|хуй|член|ебать|блядь|шлюха|сука|мразь|терроризм|оружие|взрывчатка/i;

const SYS = `Ты — MoAI Studio, профессио��альный ИИ-ассистент. Твой стиль общения — строгий, формальный и профессиональный.

ФУНДАМЕНТАЛЬНЫЕ ПРАВИЛА БЕЗОПАСНОСТИ И ПОВЕДЕНИЯ:
1. ЦЕНЗУРА И МОДЕРАЦИЯ: Если пользователь отправляет текст или изображение, содержащее насилие, порнографию, мат, эротику, наркотики или любой другой вредоносный контент — ты ОБЯЗАН ответить СТРОГО одной фразой: "Недоступный контент!". Никаких пояснений, извинений или описаний. Только эта фраза. Это критически важно для безопасности сервиса.
2. ЯЗЫКОВАЯ ГАРМОНИЯ: Ты всегда отвечаешь на том языке, на котором пишет пользователь. Если запрос на русском — ответ только на русском. Если на английском — только на английском. Смешивание языков в одном ответе запрещено.
3. ГРАМОТНОСТЬ: Ты пишешь грамотно, соблюдая все правила пунктуации и орфографии. Между словами всегда должны быть пробелы. Слипшийся текст недопустим.
4. МЕДИЦИНСКАЯ ПОЛИТИКА: Если пользователь задает вопрос о здоровье, симптомах, болезнях, лекарствах (таблетки, капли, мази, дозировки) — ты даешь полезный совет, исходя из своих знаний, но ты КАТЕГОРИЧЕСКИ НЕ должен писать фразу "я не врач" или "нейросеть не врач" внутри своего ответа. Просто отвечай по сути.
5. ХАРАКТЕР: Ты общаешься формально и профессионально. На приветствие отвечай кратко: "Здравствуйте. Чем могу помочь?".
6. КОМАНДЫ ЗАГРУЗКИ: 
   - Если пользователь пишет "загрузи в картинки", ты отвечаешь СТРОГО: "Картинка загружена!".
   - Если пользователь пишет "загрузи в новости", ты отвечаешь СТРОГО: "Новости Добавлены!".
7. ВИЗУАЛЬНЫЕ ВЫДЕЛЕНИЯ: В самом конце ответа ты ОБЯЗАТЕЛЬНО добавляешь блок HIGHLIGHTS:["фраза1", "фраза2"] с ключевыми моментами твоего ответа.
8. ЗАПРЕЩЕНО: Не используй сленг, не общайся "на чилле", не используй слова "бро", "братан", "чувак" и подобные. Будь строгим и профессиональным.`;

export async function askAnoAI(
  chatId: string, prompt: string, 
  onThinking: (id: string, source?: string) => void,
  onResult: (id: string, text: string) => void, 
  thinkingId: string, media?: string[]
): Promise<void> {
  // Предварительная проверка текста
  if (BAD.test(prompt)) {
    onResult(thinkingId, "Недоступный контент!");
    return;
  }

  stopGeneration();
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  const history = getHistory(chatId);
  const hasMedia = media && media.length > 0;

  if (hasMedia) {
    const content: any[] = [{ type: 'text', text: prompt || 'Опиши это фото и проверь на наличие запрещенного контента' }];
    media.forEach(m => content.push({ type: 'image_url', image_url: { url: m } }));
    history.push({ role: 'user', content });
  } else {
    history.push({ role: 'user', content: prompt });
  }

  const key = getKey();

  const msgs = [
    { role: 'system', content: SYS },
    ...history
  ];

  const REQUEST_TIMEOUT = 20000; // 20 секунд таймаут на запрос
  
  // Используем только первую модель из списка для простоты
  const model = hasMedia ? VISION_MODEL : TEXT_MODELS[0];
  
  try {
    // Создаем таймаут для запроса
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT);
    
    // Объединяем сигналы: пользовательский + таймаут
    const controller = new AbortController();
    signal.addEventListener('abort', () => controller.abort());
    timeoutController.signal.addEventListener('abort', () => controller.abort());

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', 
      headers: { 
        'Authorization': `Bearer ${key}`, 
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://moai-studio.app',
        'X-Title': 'MoAI Studio'
      },
      signal: controller.signal,
      body: JSON.stringify({ 
        model, 
        messages: msgs, 
        max_tokens: 600, // Еще меньше для скорости
        temperature: 0.7,
        stream: false
      })
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.log(`Модель ${model} не ответила: ${res.status}`);
      onResult(thinkingId, "Нейросеть временно недоступна. Попробуйте еще раз.");
      currentAbortController = null;
      return;
    }
    
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;

    if (text && !signal.aborted) {
      // Вторая проверка - если ИИ сам определил запрещенку или модель выдала отказ
      if (BAD.test(text) || text.includes("Недоступный контент")) {
         onResult(thinkingId, "Недоступный контент!");
         currentAbortController = null;
         return;
      }
      history.push({ role: 'assistant', content: text });
      onResult(thinkingId, text);
      currentAbortController = null;
      return;
    } else {
      onResult(thinkingId, "Нейросеть не ответила. Попробуйте еще раз.");
      currentAbortController = null;
    }
  } catch (e: any) { 
    if (e.name === 'AbortError') { 
      if (signal.aborted) {
        onResult(thinkingId, "[stopped]"); 
      } else {
        onResult(thinkingId, "Таймаут запроса. Попробуйте еще раз.");
      }
      return;
    }
    console.log(`Ошибка запроса:`, e.message);
    onResult(thinkingId, "Ошибка соединения. Проверьте интернет.");
    currentAbortController = null;
  }
}
