import { useState } from 'react';
import { Bell, Check, MessageSquare, Calendar, Filter, X } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState('all');

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
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking':
      case 'booking_status':
        return <Calendar className="h-5 w-5" />;
      case 'message':
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getFilteredNotifications = () => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.isRead);
    if (filter === 'booking') return notifications.filter(n => n.type === 'booking' || n.type === 'booking_status');
    if (filter === 'message') return notifications.filter(n => n.type === 'message');
    return notifications;
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your booking status, messages, and more
          </p>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>All notifications</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('unread')}>
                  <span className="mr-2 h-4 w-4 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                  </span>
                  <span>Unread only</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('booking')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Bookings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('message')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Messages</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {unreadCount > 0 && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => markAllAsRead()}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent notifications</CardTitle>
          <CardDescription>
            {filter !== 'all' 
              ? `Showing ${filteredNotifications.length} ${filter} notification${filteredNotifications.length !== 1 ? 's' : ''}`
              : `You have ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg mb-1">No notifications</p>
              <p className="text-sm text-center max-w-sm">
                {filter !== 'all' 
                  ? `You don't have any ${filter} notifications yet.` 
                  : "You don't have any notifications yet. We'll notify you when something important happens."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-4 py-4 cursor-pointer hover:bg-muted/50 px-4 -mx-4 transition-colors",
                    !notification.isRead && "bg-muted/25"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                    !notification.isRead ? "bg-primary text-primary-foreground" : ""
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-base font-medium leading-none",
                        !notification.isRead && "font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {!notification.isRead && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-destructive"></span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/75 mt-1">
                      {format(new Date(notification.createdAt), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}