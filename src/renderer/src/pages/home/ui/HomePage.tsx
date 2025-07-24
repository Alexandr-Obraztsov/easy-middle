import { Label } from "@radix-ui/react-label";
import { PATHS } from "@shared/const";
import { cn } from "@shared/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@shared/ui/accordion";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Textarea } from "@shared/ui/textarea";
import { CodeIcon, MessageCircleIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const chatTypes = [
  {
    name: "Interview",
    icon: <MessageCircleIcon className="size-4" />,
    value: "interview",
  },
  {
    name: "Live coding",
    icon: <CodeIcon className="size-4" />,
    value: "live-coding",
  },
  {
    name: "Custom",
    icon: <PencilIcon className="size-4" />,
    value: "custom",
  },
] as const;

type ChatType = (typeof chatTypes)[number]["value"];

export const HomePage = () => {
  const navigate = useNavigate();

  const [selectedChatType, setSelectedChatType] =
    useState<ChatType>("interview");

  const handleChatTypeChange = (value: ChatType) => {
    setSelectedChatType(value);
  };

  const handleStartChat = () => {
    navigate(PATHS.CHAT);
  };

  return (
    <div className="bg-background w-screen h-screen">
      <div className="container p-6 flex flex-col">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-base text-primary-foreground font-semibold leading-none">
            Тип чата
          </h1>
          <p className="text-muted-foreground text-sm">
            Выберите тип чата для начала общения.
          </p>
        </header>

        {/* Chat types */}
        <div className="flex gap-4 mt-4">
          {chatTypes.map((chatType) => (
            <button
              key={chatType.value}
              onClick={() => handleChatTypeChange(chatType.value)}
              className={cn(
                "bg-card border-2 border-border flex flex-col gap-3 justify-center items-center flex-1 p-4 text-card-foreground cursor-pointer",
                selectedChatType === chatType.value && "border-primary"
              )}
            >
              {chatType.icon}
              <span className="text-sm font-medium">{chatType.name}</span>
            </button>
          ))}
        </div>

        {/* Custom prompt */}
        {selectedChatType === "custom" && (
          <div className="flex flex-col gap-2 mt-6">
            <Label htmlFor="custom-prompt">Кастомный промпт</Label>
            <Textarea id="custom-prompt" placeholder="Я твой хозяин..." />
          </div>
        )}

        <div className="flex flex-col gap-2 mt-6">
          <Label htmlFor="custom-prompt">
            API ключ (получите его на{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Gemini
            </a>
            )
          </Label>
          <Input placeholder="**********************" type="password" />
        </div>

        <Accordion type="single" collapsible className="mt-2">
          <AccordionItem value="item-1">
            <AccordionTrigger>Настройки модели</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button onClick={handleStartChat}>Start Chat</Button>
      </div>
    </div>
  );
};
