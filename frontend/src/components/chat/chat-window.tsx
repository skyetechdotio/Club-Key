import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MessageList from "./message-list";
import MessageInput from "./message-input";
import { useChat } from "@/hooks/use-chat";
import { Message, ChatUser } from "@/context/chat-context";
import { Loader2 } from "lucide-react";

interface ChatWindowProps {
  recipient: ChatUser;
  bookingId?: number;
}

export default function ChatWindow({ recipient, bookingId }: ChatWindowProps) {
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    markMessagesAsRead 
  } = useChat(recipient.id, bookingId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Mark messages as read when window is focused
    if (messages && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages, markMessagesAsRead]);

  const handleSendMessage = (content: string) => {
    if (content.trim() === "") return;
    
    sendMessage(content);
    setNewMessage("");
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading conversation...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">
            Error Loading Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load messages. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium flex items-center">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src={recipient.profileImage} alt={recipient.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {recipient.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {recipient.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto p-4">
          <MessageList messages={messages || []} />
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t">
          <MessageInput 
            value={newMessage}
            onChange={setNewMessage}
            onSend={handleSendMessage}
          />
        </div>
      </CardContent>
    </Card>
  );
}
