import { useState } from 'react';
import { Bell, Check, MessageSquare, Calendar, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [, setLocation] = useLocation();

  const handleNotificationClick = (notification: Notification) => {
    // Mark notification as read
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'booking':
      case 'booking_status':
        setLocation(`/bookings/${notification.relatedId}`);
        break;
      case 'message':
        setLocation('/messages');
        break;
      default:
        break;
    }
    
    // Close popover
    setOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking':
      case 'booking_status':
        return <Calendar className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>You have {unreadCount} unread notifications</CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => markAllAsRead()}
                className="h-8 gap-1 text-xs"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Bell className="h-10 w-10 mb-2 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex gap-3 p-4 cursor-pointer hover:bg-muted transition-colors",
                        !notification.isRead && "bg-muted/50"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        !notification.isRead ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}>
                        {getIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium leading-none",
                            !notification.isRead && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full"
              onClick={() => {
                setLocation('/notifications');
                setOpen(false);
              }}
            >
              View all notifications
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}