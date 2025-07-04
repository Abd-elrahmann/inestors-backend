const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // نوع الإشعار
  type: {
    type: String,
    enum: [
      'profit_calculated',
      'profit_approved', 
      'profit_distributed',
      'profit_rolled_over',
      'financial_year_created',
      'financial_year_closed',
      'auto_rollover_completed',
      'auto_rollover_failed',
      'transaction_created',
      'system_alert'
    ],
    required: [true, 'نوع الإشعار مطلوب']
  },
  
  // عنوان الإشعار
  title: {
    type: String,
    required: [true, 'عنوان الإشعار مطلوب'],
    maxlength: [200, 'عنوان الإشعار لا يمكن أن يتجاوز 200 حرف']
  },
  
  // محتوى الإشعار
  message: {
    type: String,
    required: [true, 'محتوى الإشعار مطلوب'],
    maxlength: [1000, 'محتوى الإشعار لا يمكن أن يتجاوز 1000 حرف']
  },
  
  // المستقبل (يمكن أن يكون مستخدم أو مستثمر)
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investor'
    }
  },
  
  // البيانات المرتبطة بالإشعار
  relatedData: {
    financialYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialYear'
    },
    profitDistributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'YearlyProfitDistribution'
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    amount: {
      type: Number
    },
    currency: {
      type: String,
      enum: ['IQD', 'USD']
    }
  },
  
  // حالة الإشعار
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  
  // أولوية الإشعار
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // تاريخ قراءة الإشعار
  readAt: {
    type: Date
  },
  
  // من أنشأ الإشعار (النظام أو مستخدم)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // تاريخ انتهاء صلاحية الإشعار
  expiresAt: {
    type: Date
  },
  
  // تاريخ الإنشاء والتحديث
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// فهرس للبحث السريع
NotificationSchema.index({ 'recipient.userId': 1, status: 1, createdAt: -1 });
NotificationSchema.index({ 'recipient.investorId': 1, status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// طريقة لتمييز الإشعار كمقروء
NotificationSchema.methods.markAsRead = async function() {
  this.status = 'read';
  this.readAt = new Date();
  await this.save();
  return this;
};

// طريقة لأرشفة الإشعار
NotificationSchema.methods.archive = async function() {
  this.status = 'archived';
  await this.save();
  return this;
};

// طريقة ثابتة لإنشاء إشعار جديد
NotificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // يمكن هنا إضافة منطق إرسال الإشعارات الفورية (WebSocket, Push Notifications, etc.)
  
  return notification;
};

// طريقة ثابتة لإنشاء إشعارات متعددة
NotificationSchema.statics.createBulkNotifications = async function(notifications) {
  const createdNotifications = await this.insertMany(notifications);
  
  // يمكن هنا إضافة منطق إرسال الإشعارات الفورية للمجموعة
  
  return createdNotifications;
};

// Hook قبل الحفظ لتحديث وقت التعديل
NotificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema); 