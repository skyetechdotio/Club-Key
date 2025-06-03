import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatWindow from "@/components/chat/chat-window";
import { ChatUser } from "@/context/chat-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Helmet } from 'react-helmet';

export default function MessagesPage() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    userId ? parseInt(userId) : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal("login");
      navigate("/");
    }
  }, [isAuthenticated, openAuthModal, navigate]);

  // Fetch conversations/contacts
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: isAuthenticated,
  });

  // If user ID is provided in URL, fetch that user's details
  const { data: selectedUserData, isLoading: isLoadingSelectedUser } = useQuery({
    queryKey: [`/api/users/${activeConversationId}`],
    queryFn: async () => {
      if (!activeConversationId) return null;
      
      try {
        // Look for the user in existing conversations first
        const existingConversation = conversations && Array.isArray(conversations)
          ? conversations.find(conv => conv.otherUser.id === activeConversationId)
          : undefined;
        
        if (existingConversation) {
          return existingConversation.otherUser;
        }
        
        // If not found in conversations, fetch from the API
        const response = await fetch(`/api/users/${activeConversationId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch user with ID ${activeConversationId}`);
        }
        
        const userData = await response.json();
        return {
          id: userData.id,
          name: userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}`
            : userData.username,
          profileImage: userData.profileImage,
          isOnline: false // We don't track this in real-time yet
        };
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user details",
          variant: "destructive",
        });
        return null;
      }
    },
    enabled: isAuthenticated && !!activeConversationId,
  });

  // Filter contacts based on search query
  useEffect(() => {
    if (!conversations || !Array.isArray(conversations)) {
      setFilteredContacts([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredContacts(conversations);
      return;
    }

    const filtered = conversations.filter(convo => 
      convo.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredContacts(filtered);
  }, [searchQuery, conversations]);

  // Set active conversation from URL param
  useEffect(() => {
    if (userId) {
      setActiveConversationId(parseInt(userId));
    } else if (conversations && Array.isArray(conversations) && conversations.length > 0) {
      // If no specific user ID in URL, select the first conversation
      setActiveConversationId(conversations[0].otherUser.id);
    }
  }, [userId, conversations]);

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      // Today: show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      // Yesterday
      return 'Yesterday';
    } else {
      // Earlier: show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleConversationSelect = (userId: number) => {
    setActiveConversationId(userId);
    // Update URL without page reload
    navigate(`/messages/${userId}`, { replace: true });
  };

  // Prepare recipient data for chat window
  const chatRecipient: ChatUser | null = selectedUserData 
    ? {
        id: selectedUserData.id,
        name: selectedUserData.name,
        profileImage: selectedUserData.profileImage
      }
    : null;

  return (
    <>
      <Helmet>
        <title>Messages | Linx</title>
        <meta name="description" content="Chat with your golf hosts or guests. Coordinate tee times, ask questions, and finalize your golf plans." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold text-neutral-dark">Messages</h1>
          <p className="text-neutral-medium">Chat with your hosts and guests</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-16rem)]">
          {/* Contacts/Conversations Sidebar */}
          <div className="lg:col-span-1 border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                <Input 
                  placeholder="Search messages"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="all" className="flex-grow flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="flex-grow overflow-auto">
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filteredContacts && filteredContacts.length > 0 ? (
                  <div className="divide-y">
                    {filteredContacts.map((conversation) => (
                      <button
                        key={conversation.id}
                        className={cn(
                          "w-full text-left p-3 hover:bg-secondary transition-colors",
                          activeConversationId === conversation.otherUser.id && "bg-secondary"
                        )}
                        onClick={() => handleConversationSelect(conversation.otherUser.id)}
                      >
                        <div className="flex items-center">
                          <div className="relative mr-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={conversation.otherUser.profileImage} alt={conversation.otherUser.name} />
                              <AvatarFallback>
                                {conversation.otherUser.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.otherUser.isOnline && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <p className="font-medium truncate">{conversation.otherUser.name}</p>
                              <span className="text-xs text-neutral-medium">
                                {formatLastMessageTime(conversation.otherUser.lastMessageTime)}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-medium truncate">
                              {conversation.otherUser.lastMessage}
                            </p>
                          </div>
                          {conversation.otherUser.unreadCount > 0 && (
                            <div className="ml-2 bg-primary text-primary-foreground rounded-full h-5 min-w-5 flex items-center justify-center text-xs">
                              {conversation.otherUser.unreadCount}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-4 text-center">
                    <div>
                      <p className="text-neutral-medium mb-2">No conversations found</p>
                      {searchQuery ? (
                        <p className="text-sm text-neutral-medium">
                          No results for "{searchQuery}"
                        </p>
                      ) : (
                        <p className="text-sm text-neutral-medium">
                          Messages from your bookings will appear here
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="unread" className="flex-grow overflow-auto">
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filteredContacts && filteredContacts.some(c => c.otherUser.unreadCount > 0) ? (
                  <div className="divide-y">
                    {filteredContacts
                      .filter(c => c.otherUser.unreadCount > 0)
                      .map((conversation) => (
                        <button
                          key={conversation.id}
                          className={cn(
                            "w-full text-left p-3 hover:bg-secondary transition-colors",
                            activeConversationId === conversation.otherUser.id && "bg-secondary"
                          )}
                          onClick={() => handleConversationSelect(conversation.otherUser.id)}
                        >
                          <div className="flex items-center">
                            <div className="relative mr-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={conversation.otherUser.profileImage} alt={conversation.otherUser.name} />
                                <AvatarFallback>
                                  {conversation.otherUser.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.otherUser.isOnline && (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <p className="font-medium truncate">{conversation.otherUser.name}</p>
                                <span className="text-xs text-neutral-medium">
                                  {formatLastMessageTime(conversation.otherUser.lastMessageTime)}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-medium truncate">
                                {conversation.otherUser.lastMessage}
                              </p>
                            </div>
                            <div className="ml-2 bg-primary text-primary-foreground rounded-full h-5 min-w-5 flex items-center justify-center text-xs">
                              {conversation.otherUser.unreadCount}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-neutral-medium">No unread messages</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 h-full">
            {isLoadingSelectedUser ? (
              <div className="h-full flex items-center justify-center border rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : chatRecipient ? (
              <ChatWindow recipient={chatRecipient} />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <p className="text-neutral-medium mb-4">Select a conversation to start chatting</p>
                  <p className="text-sm text-neutral-medium">
                    Messages between you and your hosts/guests will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
