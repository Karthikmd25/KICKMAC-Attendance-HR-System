const Notification = require('../models/Notification');

// @desc Admin: get recent notifications
// @route GET /api/admin/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ forRole: { $in: ['admin', 'all'] } })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = notifications.filter(
      (n) => !n.readBy.some((id) => id.toString() === req.user._id.toString())
    ).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

// @desc Admin: mark a notification as read
// @route PUT /api/admin/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.readBy.some((id) => id.toString() === req.user._id.toString())) {
      notification.readBy.push(req.user._id);
      await notification.save();
    }

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error.message);
    res.status(500).json({ message: 'Server error while updating notification' });
  }
};

// @desc Admin: mark all notifications as read
// @route PUT /api/admin/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    const notifications = await Notification.find({
      forRole: { $in: ['admin', 'all'] },
      readBy: { $ne: req.user._id },
    });

    await Promise.all(
      notifications.map((n) => {
        n.readBy.push(req.user._id);
        return n.save();
      })
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error.message);
    res.status(500).json({ message: 'Server error while updating notifications' });
  }
};