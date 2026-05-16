const MODELS = [
  'inclusionai/ring-2.6-1t:free',
  'baidu/cobuddy:free',
  'poolside/laguna-m.1:free',
  'poolside/laguna-xs.2:free'
];

const getKey = (): string => {
  const a = [115,107,45,111,114,45,118,49,45];
  const b = [99,56,97,48,55,52,100,48,53,98,55,55,100,102,49,55,53,54,56,51,57,50,100,101,101,49,99,49,52,98,98,54,97,98,57,54,54,52,52,57,48,99,98,49,48,100,51,55,49,101,50,52,52,54,98,97,57,101,54,48,100,53,53];
  return String.fromCharCode(...a) + String.fromCharCode(...b);
};

const chatHistoryMap: Map<string, { role: string; content: string }[]> = new Map();

export function clearAIHistory(chatId: string) {
  chatHistoryMap.delete(chatId);
}

function getHistory(chatId: string) {
  if (!chatHistoryMap.has(chatId)) {
    chatHistoryMap.set(chatId, []);
  }
  return chatHistoryMap.get(chatId)!;
}

export async function askAnoAI(
  chatId: string,
  prompt: string,
  _onThinking: (id: string) => void,
  onResult: (id: string, text: string) => void,
  thinkingId: string
): Promise<void> {

  const history = getHistory(chatId);
  history.push({ role: 'user', content: prompt });
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  const key = getKey();
  const msgs = [
    { 
      role: 'system', 
      content: 'Answer in the same language as the user. No emoji. No errors. Be concise, smart, helpful. Remember previous messages.' 
    },
    ...history
  ];

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'MoAI Studio'
        },
        body: JSON.stringify({
          model,
          messages: msgs,
          max_tokens: 512
        })
      });

      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;

      if (text && text.trim().length > 0) {
        history.push({ role: 'assistant', content: text });
        onResult(thinkingId, text);
        return;
      }
    } catch (err) {
      console.error('Error with model:', model, err);
    }
  }

  onResult(thinkingId, "Ошибка сети. Модели сейчас перегружены, попробуйте еще раз.");
}
