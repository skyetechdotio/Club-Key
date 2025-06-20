import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

export type Notification = {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedId: number;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: ({ signal }) => 
      apiRequest('GET', '/api/notifications', undefined, { signal })
        .then(res => res.json()),
    enabled: false, // Disable notifications for now since API doesn't exist
  });

  // Fetch unread notification count
  const { 
    data: unreadCountData, 
    refetch: refetchUnreadCount 
  } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread/count'],
    queryFn: ({ signal }) => 
      apiRequest('GET', '/api/notifications/unread/count', undefined, { signal })
        .then(res => res.json()),
    enabled: false, // Disable notifications for now since API doesn't exist
  });

  // Update unread count when data changes
  useEffect(() => {
    if (unreadCountData) {
      setUnreadCount(unreadCountData.count);
    }
  }, [unreadCountData]);

  // Mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PATCH', `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate notifications queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to mark notification as read: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/notifications/read-all');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate notifications queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
      
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to mark all notifications as read: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    refetchUnreadCount,
  };
}