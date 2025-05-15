import { useState, useEffect, useCallback } from "react";
import { useContext } from "react";
import { ChatContext, Message } from "@/context/chat-context";
import { useAuth } from "@/hooks/use-auth";

export function useChat(recipientId?: number, bookingId?: number) {
  const chatContext = useContext(ChatContext);
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!recipientId || !user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedMessages = await chatContext.getMessages(recipientId, bookingId);
      setMessages(fetchedMessages);
    } catch (err) {
      setError(err as Error);
      setMessages(null);
    } finally {
      setIsLoading(false);
    }
  }, [chatContext, recipientId, bookingId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!recipientId || !user) return;
    
    try {
      const newMessage = await chatContext.sendMessage(recipientId, content, bookingId);
      
      setMessages(prevMessages => {
        if (!prevMessages) return [newMessage];
        return [...prevMessages, newMessage];
      });
      
      return newMessage;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [chatContext, recipientId, bookingId, user]);

  const markMessagesAsRead = useCallback(async () => {
    if (!messages || !user) return;
    
    try {
      const unreadMessages = messages.filter(
        message => message.receiverId === user.id && !message.isRead
      );
      
      for (const message of unreadMessages) {
        await chatContext.markMessageAsRead(message.id);
        
        // Update local message state to reflect read status
        setMessages(prevMessages => {
          if (!prevMessages) return null;
          
          return prevMessages.map(msg => 
            msg.id === message.id ? { ...msg, isRead: true } : msg
          );
        });
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [chatContext, messages, user]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markMessagesAsRead,
    refreshMessages: fetchMessages,
  };
}
