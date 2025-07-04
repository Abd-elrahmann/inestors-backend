const Notification = require('../models/Notification');
const User = require('../models/User');
const Investor = require('../models/Investor');
const ErrorResponse = require('../utils/errorResponse');
const { success, error, getPaginationInfo } = require('../utils/responseHandler');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type, priority } = req.query;
    
    // Build query
    const query = {
      'recipient.userId': req.user.id
    };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    // Filter by priority if provided
    if (priority) {
      query.priority = priority;
    }
    
    // Count total documents
    const total = await Notification.countDocuments(query);
    
    // Get pagination info
    const { startIndex, pagination } = getPaginationInfo(page, limit, total);
    
    // Get notifications
    const notifications = await Notification.find(query)
      .populate('createdBy', 'fullName email')
      .populate('relatedData.financialYearId', 'year totalProfit')
      .populate('relatedData.profitDistributionId')
      .populate('relatedData.transactionId', 'type amount')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(pagination.limit);
    
    return success(res, 200, 'الإشعارات تم استرجاعها بنجاح', { notifications }, pagination);
  } catch (err) {
    next(err);
  }
};

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('relatedData.financialYearId', 'year totalProfit')
      .populate('relatedData.profitDistributionId')
      .populate('relatedData.transactionId', 'type amount');
    
    if (!notification) {
      return error(res, 404, `الإشعار غير موجود برقم ${req.params.id}`);
    }
    
    // Check if user has access to this notification
    if (notification.recipient.userId && notification.recipient.userId.toString() !== req.user.id) {
      return error(res, 403, 'ليس لديك صلاحية لعرض هذا الإشعار');
    }
    
    return success(res, 200, 'الإشعار تم استرجاعه بنجاح', { notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return error(res, 404, `الإشعار غير موجود برقم ${req.params.id}`);
    }
    
    // Check if user has access to this notification
    if (notification.recipient.userId && notification.recipient.userId.toString() !== req.user.id) {
      return error(res, 403, 'ليس لديك صلاحية لتعديل هذا الإشعار');
    }
    
    await notification.markAsRead();
    
    return success(res, 200, 'تم تمييز الإشعار كمقروء', { notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { 
        'recipient.userId': req.user.id,
        status: 'unread'
      },
      { 
        status: 'read',
        readAt: new Date()
      }
    );
    
    return success(res, 200, 'تم تمييز جميع الإشعارات كمقروءة', {
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Archive notification
// @route   PUT /api/notifications/:id/archive
// @access  Private
exports.archiveNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return error(res, 404, `الإشعار غير موجود برقم ${req.params.id}`);
    }
    
    // Check if user has access to this notification
    if (notification.recipient.userId && notification.recipient.userId.toString() !== req.user.id) {
      return error(res, 403, 'ليس لديك صلاحية لأرشفة هذا الإشعار');
    }
    
    await notification.archive();
    
    return success(res, 200, 'تم أرشفة الإشعار بنجاح', { notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return error(res, 404, `الإشعار غير موجود برقم ${req.params.id}`);
    }
    
    // Check if user has access to this notification
    if (notification.recipient.userId && notification.recipient.userId.toString() !== req.user.id) {
      return error(res, 403, 'ليس لديك صلاحية لحذف هذا الإشعار');
    }
    
    await notification.deleteOne();
    
    return success(res, 200, 'تم حذف الإشعار بنجاح');
  } catch (err) {
    next(err);
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
exports.getNotificationStats = async (req, res, next) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { 'recipient.userId': req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const priorityStats = await Notification.aggregate([
      { $match: { 'recipient.userId': req.user._id, status: 'unread' } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const typeStats = await Notification.aggregate([
      { $match: { 'recipient.userId': req.user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format stats
    const formattedStats = {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, { unread: 0, read: 0, archived: 0 }),
      
      byPriority: priorityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, { low: 0, medium: 0, high: 0, urgent: 0 }),
      
      byType: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      
      totalUnread: stats.find(s => s._id === 'unread')?.count || 0,
      totalNotifications: stats.reduce((sum, stat) => sum + stat.count, 0)
    };
    
    return success(res, 200, 'إحصائيات الإشعارات تم استرجاعها بنجاح', formattedStats);
  } catch (err) {
    next(err);
  }
};

// @desc    Create notification (Admin only)
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res, next) => {
  try {
    const notificationData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const notification = await Notification.createNotification(notificationData);
    
    return success(res, 201, 'تم إنشاء الإشعار بنجاح', { notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Send notification to all users (Admin only)
// @route   POST /api/notifications/broadcast
// @access  Private/Admin
exports.broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, type = 'system_alert', priority = 'medium', expiresAt } = req.body;
    
    // Get all active users
    const users = await User.find({ isActive: true });
    
    if (users.length === 0) {
      return error(res, 400, 'لا يوجد مستخدمين نشطين لإرسال الإشعار إليهم');
    }
    
    // Create notifications for all users
    const notifications = users.map(user => ({
      type,
      title,
      message,
      priority,
      recipient: { userId: user._id },
      createdBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    }));
    
    const createdNotifications = await Notification.createBulkNotifications(notifications);
    
    return success(res, 201, 'تم إرسال الإشعار لجميع المستخدمين بنجاح', {
      totalSent: createdNotifications.length,
      notifications: createdNotifications
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to create profit-related notifications
exports.createProfitNotifications = async (type, financialYear, distributions, createdBy) => {
  try {
    const notifications = [];
    
    // Get all active users (admins and accountants)
    const users = await User.find({ isActive: true });
    
    // Create notifications for users
    for (const user of users) {
      let title, message;
      
      switch (type) {
        case 'profit_calculated':
          title = `تم حساب أرباح السنة المالية ${financialYear.year}`;
          message = `تم حساب توزيعات الأرباح للسنة المالية ${financialYear.year} بإجمالي ${financialYear.totalProfit} ${financialYear.currency}. عدد المساهمين: ${distributions.length}`;
          break;
        case 'profit_approved':
          title = `تم الموافقة على أرباح السنة المالية ${financialYear.year}`;
          message = `تم الموافقة على توزيعات الأرباح للسنة المالية ${financialYear.year}. يمكن الآن توزيعها أو تدويرها.`;
          break;
        case 'profit_rolled_over':
          title = `تم تدوير أرباح السنة المالية ${financialYear.year}`;
          message = `تم تدوير أرباح السنة المالية ${financialYear.year} بنسبة ${financialYear.rolloverSettings.rolloverPercentage}% إلى رأس المال.`;
          break;
        default:
          title = `تحديث السنة المالية ${financialYear.year}`;
          message = `تم تحديث السنة المالية ${financialYear.year}`;
      }
      
      notifications.push({
        type,
        title,
        message,
        priority: 'medium',
        recipient: { userId: user._id },
        relatedData: {
          financialYearId: financialYear._id,
          amount: financialYear.totalProfit,
          currency: financialYear.currency
        },
        createdBy
      });
    }
    
    // Create notifications for investors
    for (const distribution of distributions) {
      const investor = await Investor.findById(distribution.investorId);
      if (investor) {
        let title, message;
        
        switch (type) {
          case 'profit_calculated':
            title = `تم حساب أرباحك للسنة المالية ${financialYear.year}`;
            message = `تم حساب أرباحك للسنة المالية ${financialYear.year}. مبلغ الأرباح: ${distribution.calculation.calculatedProfit} ${financialYear.currency}`;
            break;
          case 'profit_approved':
            title = `تم الموافقة على أرباحك للسنة المالية ${financialYear.year}`;
            message = `تم الموافقة على أرباحك للسنة المالية ${financialYear.year}. مبلغ الأرباح: ${distribution.calculation.calculatedProfit} ${financialYear.currency}`;
            break;
          case 'profit_rolled_over':
            title = `تم تدوير أرباحك للسنة المالية ${financialYear.year}`;
            message = `تم تدوير أرباحك للسنة المالية ${financialYear.year} بمبلغ ${distribution.rolloverSettings.rolloverAmount} ${financialYear.currency} إلى رأس المال.`;
            break;
          default:
            title = `تحديث أرباحك للسنة المالية ${financialYear.year}`;
            message = `تم تحديث أرباحك للسنة المالية ${financialYear.year}`;
        }
        
        notifications.push({
          type,
          title,
          message,
          priority: 'high',
          recipient: { investorId: investor._id },
          relatedData: {
            financialYearId: financialYear._id,
            profitDistributionId: distribution._id,
            amount: distribution.calculation.calculatedProfit,
            currency: financialYear.currency
          },
          createdBy
        });
      }
    }
    
    if (notifications.length > 0) {
      await Notification.createBulkNotifications(notifications);
    }
    
    return notifications.length;
  } catch (error) {
    console.error('خطأ في إنشاء إشعارات الأرباح:', error);
    return 0;
  }
}; 