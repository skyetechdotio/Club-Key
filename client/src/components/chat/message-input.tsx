import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false
}: MessageInputProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (disabled || isLoading || !value.trim()) return;
    
    try {
      setIsLoading(true);
      await onSend(value);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        className="min-h-[60px] resize-none"
      />
      <Button
        size="icon"
        type="button"
        onClick={handleSend}
        disabled={disabled || isLoading || !value.trim()}
        className="bg-primary hover:bg-primary-dark h-10 w-10"
      >
        <SendHorizonal className="h-5 w-5" />
      </Button>
    </div>
  );
}
