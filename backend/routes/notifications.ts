import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { notifyNewBooking, notifyBookingStatusChange, notifyNewMessage } from '../notifications';

const router = Router();

// Get notifications for the current user
router.get('/', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = req.user!.id;
    const notifications = await storage.getNotificationsByUserId(userId);
    return res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get unread notification count
router.get('/unread/count', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = req.user!.id;
    const unreadNotifications = await storage.getUnreadNotificationsByUserId(userId);
    return res.json({ count: unreadNotifications.length });
  } catch (error) {
    console.error('Error fetching unread notifications count:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark a notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const notificationId = parseInt(req.params.id);
  
  if (isNaN(notificationId)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }

  try {
    const notification = await storage.getNotification(notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    if (notification.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updatedNotification = await storage.markNotificationAsRead(notificationId);
    return res.json(updatedNotification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark all notifications as read
router.post('/read-all', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = req.user!.id;
    await storage.markAllNotificationsAsRead(userId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Manual notification trigger endpoints (for testing or admin use)
router.post('/trigger/booking/:id', async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user?.isHost) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const bookingId = parseInt(req.params.id);
  
  if (isNaN(bookingId)) {
    return res.status(400).json({ message: 'Invalid booking ID' });
  }

  try {
    await notifyNewBooking(bookingId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error triggering booking notification:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/trigger/booking-status/:id', async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user?.isHost) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const bookingId = parseInt(req.params.id);
  const { status } = req.body;
  
  if (isNaN(bookingId) || !status) {
    return res.status(400).json({ message: 'Invalid booking ID or status' });
  }

  try {
    await notifyBookingStatusChange(bookingId, status);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error triggering booking status notification:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/trigger/message/:id', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const messageId = parseInt(req.params.id);
  
  if (isNaN(messageId)) {
    return res.status(400).json({ message: 'Invalid message ID' });
  }

  try {
    await notifyNewMessage(messageId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error triggering message notification:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;