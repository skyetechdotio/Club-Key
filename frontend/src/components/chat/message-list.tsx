import { Message } from "@/context/chat-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const { user } = useAuth();

  const formatMessageTime = (date: Date) => {
    return format(new Date(date), "h:mm a");
  };

  const formatMessageDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear()
    ) {
      return "Today";
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear()
    ) {
      return "Yesterday";
    }
    
    return format(messageDate, "MMMM d, yyyy");
  };

  // Group messages by date
  const groupedMessages: { [date: string]: Message[] } = {};
  
  messages.forEach(message => {
    const date = formatMessageDate(new Date(message.createdAt));
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-medium">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.keys(groupedMessages).map(date => (
        <div key={date} className="space-y-3">
          <div className="text-center">
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
              {date}
            </span>
          </div>
          
          {groupedMessages[date].map(message => {
            const isOwnMessage = message.senderId === user?.id;
            
            return (
              <div 
                key={message.id} 
                className={cn(
                  "flex",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
              >
                <div 
                  className={cn(
                    "max-w-[75%] px-4 py-2 rounded-lg",
                    isOwnMessage 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-muted rounded-bl-none"
                  )}
                >
                  <p className="break-words">{message.content}</p>
                  <p 
                    className={cn(
                      "text-xs mt-1",
                      isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {formatMessageTime(new Date(message.createdAt))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
