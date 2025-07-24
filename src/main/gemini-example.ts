import { GeminiClient } from "./gemini-client";

// Пример использования обновленного класса GeminiClient
export async function geminiExample(): Promise<void> {
  // Инициализация клиента для Gemini Developer API
  const gemini = new GeminiClient({
    apiKey: "YOUR_API_KEY_HERE", // Замените на ваш API ключ
    model: "gemini-2.0-flash-001",
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    apiVersion: "v1beta",
  });

  // Пример для Vertex AI (раскомментируйте если используете Vertex AI)
  /*
  const geminiVertexAI = new GeminiClient({
    apiKey: '', // Не нужен для Vertex AI
    useVertexAI: true,
    project: 'your-project-id',
    location: 'us-central1',
    model: 'gemini-2.0-flash-001',
    temperature: 0.7
  })
  */

  try {
    // Тест соединения
    console.log("🔄 Тестируем соединение с Gemini...");
    const isConnected = await gemini.testConnection();

    if (!isConnected) {
      console.error("❌ Не удалось подключиться к Gemini API");
      return;
    }

    console.log("✅ Соединение с Gemini установлено");

    // Получение информации о модели
    const modelInfo = gemini.getModelInfo();
    console.log("📋 Информация о модели:", modelInfo);

    // Пример 1: Одноразовый запрос
    console.log("\n--- 🚀 Одноразовый запрос ---");
    const singleResponse = await gemini.generateContent(
      "Привет! Расскажи короткую шутку про программистов."
    );
    console.log("💬 Ответ:", singleResponse.text);
    if (singleResponse.usage) {
      console.log("📊 Использовано токенов:", singleResponse.usage);
    }

    // Пример 2: Стриминговый запрос
    console.log("\n--- 🌊 Стриминговый запрос ---");
    console.log("💬 Стрим ответа:");
    for await (const chunk of gemini.generateContentStream(
      "Напиши короткое стихотворение про TypeScript"
    )) {
      if (!chunk.done) {
        process.stdout.write(chunk.text);
      }
    }
    console.log("\n✅ Стрим завершен");

    // Пример 3: Сессия чата с системным промптом
    console.log("\n--- 💭 Начинаем сессию чата ---");
    gemini.startChatSession(
      "Ты - помощник программиста. Отвечай кратко и по делу. Используй эмодзи в ответах."
    );

    const chatResponse1 = await gemini.sendMessage(
      "Как объявить переменную в TypeScript?"
    );
    console.log("💬 Ответ 1:", chatResponse1.text);

    const chatResponse2 = await gemini.sendMessage(
      "А как сделать её опциональной?"
    );
    console.log("💬 Ответ 2:", chatResponse2.text);

    // Пример 4: Стриминговый чат
    console.log("\n--- 🌊 Стриминговый чат ---");
    console.log("💬 Стрим ответа на вопрос:");
    for await (const chunk of gemini.sendMessageStream(
      "Объясни что такое дженерики в TypeScript простыми словами"
    )) {
      if (!chunk.done) {
        process.stdout.write(chunk.text);
      }
    }
    console.log("\n✅ Стрим чата завершен");

    // Получение истории разговора
    console.log("\n--- 📚 История разговора ---");
    const history = gemini.getConversationHistory();
    history.forEach((message, index) => {
      const truncated =
        message.content.length > 100
          ? message.content.substring(0, 100) + "..."
          : message.content;
      console.log(
        `${index + 1}. [${message.role === "user" ? "👤" : "🤖"}] ${truncated}`
      );
    });

    // Пример 5: Обновление конфигурации
    console.log("\n--- ⚙️ Обновляем конфигурацию ---");
    gemini.updateConfig({
      temperature: 0.9,
      maxOutputTokens: 4096,
    });

    const creativeResponse = await gemini.sendMessage(
      "Придумай креативное название для приложения чата с ИИ"
    );
    console.log("🎨 Креативный ответ:", creativeResponse.text);

    // Очистка истории
    console.log("\n--- 🧹 Очищаем историю ---");
    gemini.clearHistory();
    console.log("✅ История очищена");
  } catch (error) {
    console.error("❌ Ошибка при работе с Gemini:", error);
  }
}

// Функция для интеграции с главным процессом Electron
export function setupGeminiInMainProcess(): GeminiClient | null {
  // Получаем API ключ из переменных окружения или конфига
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "YOUR_API_KEY_HERE";

  if (apiKey === "YOUR_API_KEY_HERE") {
    console.warn(
      "⚠️  API ключ Gemini не настроен. Установите переменную окружения GEMINI_API_KEY или GOOGLE_API_KEY"
    );
    return null;
  }

  try {
    const gemini = new GeminiClient({
      apiKey,
      model: "gemini-2.0-flash-001",
      temperature: 0.7,
      apiVersion: "v1beta",
    });

    console.log("✅ Gemini клиент инициализирован в главном процессе");
    return gemini;
  } catch (error) {
    console.error("❌ Ошибка инициализации Gemini:", error);
    return null;
  }
}

// Пример использования с функциями (Function Calling)
export async function geminiWithFunctionsExample(): Promise<void> {
  const gemini = new GeminiClient({
    apiKey: "YOUR_API_KEY_HERE",
    model: "gemini-2.0-flash-001",
  });

  // Определяем функцию для управления освещением
  const controlLightFunction = {
    name: "controlLight",
    description: "Управляет освещением в комнате",
    parametersJsonSchema: {
      type: "object",
      properties: {
        brightness: {
          type: "number",
          description: "Яркость от 0 до 100",
        },
        colorTemperature: {
          type: "string",
          description: "Цветовая температура: warm, neutral, cool",
        },
      },
      required: ["brightness", "colorTemperature"],
    },
  };

  try {
    const response = await gemini.generateContentWithFunctions(
      "Сделай свет потеплее и приглуши до 30%",
      [controlLightFunction],
      "ANY"
    );

    console.log("🔧 Ответ с вызовом функции:", response.text);
    console.log("📞 Вызовы функций:", response.functionCalls);
  } catch (error) {
    console.error("❌ Ошибка при работе с функциями:", error);
  }
}
