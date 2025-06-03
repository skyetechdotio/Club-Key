import { createContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  bookingId?: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatUser {
  id: number;
  name: string;
  profileImage?: string;
}

interface ChatContextType {
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  getMessages: (userId: number, bookingId?: number) => Promise<Message[]>;
  sendMessage: (receiverId: number, content: string, bookingId?: number) => Promise<Message>;
  markMessageAsRead: (messageId: number) => Promise<void>;
  unreadMessageCount: number;
}

export const ChatContext = createContext<ChatContextType>({
  connect: () => {},
  disconnect: () => {},
  isConnected: false,
  getMessages: async () => [],
  sendMessage: async () => ({} as Message),
  markMessageAsRead: async () => {},
  unreadMessageCount: 0,
});

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
      return () => disconnect();
    }
  }, [isAuthenticated, user?.id]);

  const connect = () => {
    if (!isAuthenticated || !user || socket?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        setIsConnected(true);
        
        // Send authentication message
        if (user) {
          newSocket.send(JSON.stringify({
            type: "auth",
            userId: user.id,
          }));
        }
        
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "message" && data.data) {
            // Handle new incoming message
            if (data.data.receiverId === user.id && !data.data.isRead) {
              setUnreadMessageCount(prev => prev + 1);
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      newSocket.onclose = () => {
        setIsConnected(false);
        
        // Try to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
      
      newSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        newSocket.close();
      };
      
      setSocket(newSocket);
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const getMessages = async (userId: number, bookingId?: number): Promise<Message[]> => {
    try {
      if (bookingId) {
        const response = await fetch(`/api/messages/booking/${bookingId}`, {
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        
        const messages = await response.json();
        
        // Update unread count
        updateUnreadCount(messages);
        
        return messages;
      } else {
        const response = await fetch(`/api/messages/conversation/${userId}`, {
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        
        const messages = await response.json();
        
        // Update unread count
        updateUnreadCount(messages);
        
        return messages;
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  };

  const updateUnreadCount = (messages: Message[]) => {
    if (!user) return;
    
    const unreadCount = messages.filter(
      (message) => message.receiverId === user.id && !message.isRead
    ).length;
    
    setUnreadMessageCount(unreadCount);
  };

  const sendMessage = async (receiverId: number, content: string, bookingId?: number): Promise<Message> => {
    try {
      const messageData = {
        senderId: user?.id,
        receiverId,
        content,
        ...(bookingId ? { bookingId } : {})
      };
      
      const response = await apiRequest("POST", "/api/messages", messageData);
      const newMessage = await response.json();
      
      return newMessage;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const markMessageAsRead = async (messageId: number): Promise<void> => {
    try {
      await apiRequest("PUT", `/api/messages/${messageId}/read`, {});
      setUnreadMessageCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        connect,
        disconnect,
        isConnected,
        getMessages,
        sendMessage,
        markMessageAsRead,
        unreadMessageCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
