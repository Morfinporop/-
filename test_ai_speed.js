// Тест скорости работы нейросети
const TEST_PROMPT = "Привет! Как дела? Расскажи немного о себе.";
const API_KEY = "sk-or-v1-0a695c426542872b96dfaab73b55b6179254886c7c4ad4fbd508ef0019a2addc4";

async function testAISpeed() {
  console.log('🚀 Начинаем тест скорости нейросети...');
  console.log(`📝 Тестовый промпт: "${TEST_PROMPT}"`);
  
  const models = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'microsoft/phi-3.5-mini-instruct:free',
    'google/gemma-2-9b-it:free',
    'qwen/qwen-2.5-32b-instruct:free'
  ];
  
  for (const model of models) {
    console.log(`\n🔍 Тестируем модель: ${model}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://moai-studio.app',
          'X-Title': 'MoAI Studio Test'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'Ты полезный ассистент. Отвечай кратко.' },
            { role: 'user', content: TEST_PROMPT }
          ],
          max_tokens: 100,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        console.log(`❌ Ошибка: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Успешно! Время: ${duration}мс`);
      console.log(`📊 Ответ (первые 50 символов): ${data.choices[0].message.content.substring(0, 50)}...`);
      
    } catch (error) {
      console.log(`❌ Ошибка запроса: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Тест завершен!');
}

// Запускаем тест
testAISpeed().catch(console.error);