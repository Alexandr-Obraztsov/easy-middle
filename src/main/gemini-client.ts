import {
  GoogleGenAI,
  Content,
  Part,
  FunctionDeclaration,
  GenerateContentResponse,
} from "@google/genai";

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  useVertexAI?: boolean;
  project?: string;
  location?: string;
  apiVersion?: "v1" | "v1alpha" | "v1beta";
}

export interface GeminiMessage {
  role: "user" | "model";
  content: string;
  timestamp: Date;
  parts?: Part[];
}

export interface GeminiResponse {
  text: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  functionCalls?: any[];
}

export interface StreamChunk {
  text: string;
  done: boolean;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private conversationHistory: GeminiMessage[] = [];
  private config: Required<
    Omit<GeminiConfig, "useVertexAI" | "project" | "location">
  > &
    Pick<GeminiConfig, "useVertexAI" | "project" | "location">;
  private currentChatSession: any = null;

  constructor(config: GeminiConfig) {
    if (!config.apiKey && !config.useVertexAI) {
      throw new Error("API ключ обязателен для работы с Gemini Developer API");
    }

    this.config = {
      apiKey: config.apiKey || "",
      model: config.model || "gemini-2.0-flash-001",
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 0.8,
      topK: config.topK ?? 40,
      maxOutputTokens: config.maxOutputTokens ?? 8192,
      apiVersion: config.apiVersion || "v1beta",
      useVertexAI: config.useVertexAI,
      project: config.project,
      location: config.location,
    };

    this.initializeClient();
  }

  private initializeClient(): void {
    if (this.config.useVertexAI) {
      // Vertex AI инициализация
      this.ai = new GoogleGenAI({
        vertexai: true,
        project: this.config.project!,
        location: this.config.location!,
        apiVersion: this.config.apiVersion,
      });
    } else {
      // Gemini Developer API инициализация
      this.ai = new GoogleGenAI({
        apiKey: this.config.apiKey,
        apiVersion: this.config.apiVersion,
      });
    }

    console.log(
      `✅ Gemini клиент инициализирован (${
        this.config.useVertexAI ? "Vertex AI" : "Developer API"
      })`
    );
  }

  /**
   * Генерирует контент без сохранения контекста
   */
  public async generateContent(
    prompt: string | Content[]
  ): Promise<GeminiResponse> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.config.model,
        contents: prompt,
        config: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });

      return this.formatResponse(response);
    } catch (error) {
      console.error("Ошибка при генерации контента:", error);
      throw new Error(`Не удалось сгенерировать контент: ${error}`);
    }
  }

  /**
   * Генерирует стриминговый контент
   */
  public async *generateContentStream(
    prompt: string | Content[]
  ): AsyncGenerator<StreamChunk> {
    try {
      const response = await this.ai.models.generateContentStream({
        model: this.config.model,
        contents: prompt,
        config: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });

      for await (const chunk of response) {
        yield {
          text: chunk.text || "",
          done: false,
        };
      }

      yield { text: "", done: true };
    } catch (error) {
      console.error("Ошибка при стриминге контента:", error);
      throw new Error(`Не удалось создать стрим: ${error}`);
    }
  }

  /**
   * Начинает новую сессию чата
   */
  public startChatSession(systemPrompt?: string, history?: Content[]): void {
    try {
      const initialHistory = history || [];

      if (systemPrompt) {
        initialHistory.unshift({
          role: "user",
          parts: [{ text: systemPrompt }],
        });
        initialHistory.push({
          role: "model",
          parts: [{ text: "Понял, готов к работе!" }],
        });
      }

      this.currentChatSession = this.ai.chats.create({
        model: this.config.model,
        history: initialHistory,
        config: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });

      this.conversationHistory = [];

      if (systemPrompt) {
        this.conversationHistory.push({
          role: "user",
          content: systemPrompt,
          timestamp: new Date(),
        });
        this.conversationHistory.push({
          role: "model",
          content: "Понял, готов к работе!",
          timestamp: new Date(),
        });
      }

      console.log("✅ Сессия чата с Gemini начата");
    } catch (error) {
      console.error("Ошибка при создании сессии чата:", error);
      throw new Error(`Не удалось создать сессию чата: ${error}`);
    }
  }

  /**
   * Отправляет сообщение в текущую сессию чата
   */
  public async sendMessage(message: string | Part[]): Promise<GeminiResponse> {
    if (!this.currentChatSession) {
      throw new Error("Сессия чата не начата. Используйте startChatSession()");
    }

    try {
      const messageContent = typeof message === "string" ? message : message;

      // Добавляем сообщение пользователя в историю
      this.conversationHistory.push({
        role: "user",
        content:
          typeof message === "string" ? message : JSON.stringify(message),
        timestamp: new Date(),
        parts: typeof message === "string" ? undefined : message,
      });

      const response = await this.currentChatSession.sendMessage(
        messageContent
      );
      const formattedResponse = this.formatResponse(response);

      // Добавляем ответ модели в историю
      this.conversationHistory.push({
        role: "model",
        content: formattedResponse.text,
        timestamp: new Date(),
      });

      return formattedResponse;
    } catch (error) {
      console.error("Ошибка при отправке сообщения в чат:", error);
      throw new Error(`Не удалось отправить сообщение: ${error}`);
    }
  }

  /**
   * Отправляет стриминговое сообщение в чат
   */
  public async *sendMessageStream(
    message: string | Part[]
  ): AsyncGenerator<StreamChunk> {
    if (!this.currentChatSession) {
      throw new Error("Сессия чата не начата. Используйте startChatSession()");
    }

    try {
      const messageContent = typeof message === "string" ? message : message;

      // Добавляем сообщение пользователя в историю
      this.conversationHistory.push({
        role: "user",
        content:
          typeof message === "string" ? message : JSON.stringify(message),
        timestamp: new Date(),
        parts: typeof message === "string" ? undefined : message,
      });

      let fullResponse = "";
      const response = await this.currentChatSession.sendMessageStream(
        messageContent
      );

      for await (const chunk of response) {
        const text = chunk.text || "";
        fullResponse += text;
        yield {
          text,
          done: false,
        };
      }

      // Добавляем полный ответ в историю
      this.conversationHistory.push({
        role: "model",
        content: fullResponse,
        timestamp: new Date(),
      });

      yield { text: "", done: true };
    } catch (error) {
      console.error("Ошибка при стриминге сообщения:", error);
      throw new Error(`Не удалось создать стрим сообщения: ${error}`);
    }
  }

  /**
   * Генерирует контент с вызовом функций
   */
  public async generateContentWithFunctions(
    prompt: string | Content[],
    functionDeclarations: FunctionDeclaration[],
    functionCallMode: "AUTO" | "ANY" | "NONE" = "AUTO"
  ): Promise<GeminiResponse> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.config.model,
        contents: prompt,
        config: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
          tools: [{ functionDeclarations }],
          toolConfig: {
            functionCallingConfig: {
              mode: functionCallMode as any,
            },
            allowedFunctionNames: functionDeclarations.map((f) => f.name),
          },
        },
      });

      return this.formatResponse(response);
    } catch (error) {
      console.error("Ошибка при генерации контента с функциями:", error);
      throw new Error(`Не удалось сгенерировать контент с функциями: ${error}`);
    }
  }

  /**
   * Создает живую сессию для реального времени
   */
  public async createLiveSession(): Promise<any> {
    try {
      const liveSession = await this.ai.live.connect({
        model: this.config.model,
        config: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });

      console.log("✅ Живая сессия Gemini создана");
      return liveSession;
    } catch (error) {
      console.error("Ошибка при создании живой сессии:", error);
      throw new Error(`Не удалось создать живую сессию: ${error}`);
    }
  }

  /**
   * Загружает файл в API
   */
  public async uploadFile(filePath: string, mimeType: string): Promise<any> {
    try {
      const file = await this.ai.files.upload({
        path: filePath,
        mimeType,
      });

      console.log(`✅ Файл загружен: ${file.name}`);
      return file;
    } catch (error) {
      console.error("Ошибка при загрузке файла:", error);
      throw new Error(`Не удалось загрузить файл: ${error}`);
    }
  }

  /**
   * Получает список загруженных файлов
   */
  public async listFiles(): Promise<any[]> {
    try {
      const files = await this.ai.files.list();
      return files;
    } catch (error) {
      console.error("Ошибка при получении списка файлов:", error);
      throw new Error(`Не удалось получить список файлов: ${error}`);
    }
  }

  /**
   * Форматирует ответ от API
   */
  private formatResponse(response: GenerateContentResponse): GeminiResponse {
    return {
      text: response.text || "",
      finishReason: response.candidates?.[0]?.finishReason,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
      functionCalls: response.functionCalls || [],
    };
  }

  /**
   * Получает историю разговора
   */
  public getConversationHistory(): GeminiMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Очищает историю разговора
   */
  public clearHistory(): void {
    this.conversationHistory = [];
    this.currentChatSession = null;
    console.log("✅ История разговора очищена");
  }

  /**
   * Получает информацию о модели
   */
  public getModelInfo(): {
    name: string;
    config: Omit<Required<GeminiConfig>, "apiKey">;
  } {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey, ...configWithoutKey } = this.config;
    return {
      name: this.config.model,
      config: configWithoutKey as any,
    };
  }

  /**
   * Обновляет конфигурацию модели
   */
  public updateConfig(newConfig: Partial<Omit<GeminiConfig, "apiKey">>): void {
    this.config = { ...this.config, ...newConfig } as any;
    this.initializeClient();

    // Если есть активная сессия, перезапускаем её
    if (this.currentChatSession) {
      const history = this.conversationHistory;
      this.startChatSession();
      this.conversationHistory = history;
    }

    console.log("✅ Конфигурация Gemini обновлена");
  }

  /**
   * Проверяет доступность API
   */
  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.generateContent("Привет! Это тест соединения.");
      return result.text.length > 0;
    } catch (error) {
      console.error("❌ Тест соединения с Gemini не удался:", error);
      return false;
    }
  }
}
