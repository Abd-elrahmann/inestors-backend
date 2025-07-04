const mongoose = require('mongoose');

const FinancialYearSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: [true, 'السنة المالية مطلوبة'],
    min: [2000, 'السنة يجب أن تكون أكبر من 2000'],
    max: [2100, 'السنة يجب أن تكون أقل من 2100']
  },
  
  // معرف فريد للفترة المالية (اختياري)
  periodName: {
    type: String,
    trim: true,
    maxlength: [100, 'اسم الفترة لا يمكن أن يتجاوز 100 حرف']
  },
  
  // نوع الفترة المالية
  periodType: {
    type: String,
    enum: ['annual', 'quarterly', 'monthly', 'project', 'custom'],
    default: 'custom'
  },
  
  // إجمالي الربح للسنة
  totalProfit: {
    type: Number,
    required: [true, 'إجمالي الربح مطلوب'],
    min: [0, 'الربح لا يمكن أن يكون سالب']
  },
  
  // نسبة الربح السنوية (%)
  profitPercentage: {
    type: Number,
    min: [0, 'نسبة الربح لا يمكن أن تكون سالبة'],
    max: [1000, 'نسبة الربح لا يمكن أن تتجاوز 1000%']
  },
  
  // تفاصيل مصادر الأرباح (اختياري)
  profitBreakdown: {
    totalRevenue: {
      type: Number,
      min: [0, 'الإيرادات لا يمكن أن تكون سالبة']
    },
    operatingCosts: {
      type: Number,
      min: [0, 'التكاليف لا يمكن أن تكون سالبة']
    },
    administrativeCosts: {
      type: Number,
      min: [0, 'المصروفات الإدارية لا يمكن أن تكون سالبة']
    },
    taxes: {
      type: Number,
      min: [0, 'الضرائب لا يمكن أن تكون سالبة']
    },
    otherExpenses: {
      type: Number,
      min: [0, 'المصروفات الأخرى لا يمكن أن تكون سالبة']
    }
  },
  
  // مصدر البيانات المالية
  profitSource: {
    type: String,
    enum: ['financial_statements', 'accounting_records', 'manual_calculation', 'other'],
    default: 'manual_calculation'
  },
  
  currency: {
    type: String,
    enum: ['IQD', 'USD'],
    default: 'USD',
    required: [true, 'العملة مطلوبة']
  },
  
  // تاريخ بداية ونهاية الفترة المالية
  startDate: {
    type: Date,
    required: [true, 'تاريخ بداية الفترة مطلوب']
  },
  
  endDate: {
    type: Date,
    required: [true, 'تاريخ نهاية الفترة مطلوب']
  },
  
  // عدد أيام الفترة المالية (يمكن أن تكون أي فترة زمنية)
  totalDays: {
    type: Number,
    min: [1, 'عدد الأيام يجب أن يكون على الأقل يوم واحد']
  },
  
  // ربح الدولار الواحد في اليوم
  dailyProfitRate: {
    type: Number,
    min: [0, 'معدل الربح اليومي لا يمكن أن يكون سالب']
  },
  
  // حالة السنة المالية
  status: {
    type: String,
    enum: ['draft', 'active', 'calculated', 'approved', 'distributed', 'closed'],
    default: 'draft'
  },
  
  // إعدادات تدوير الأرباح
  rolloverSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    // نسبة الأرباح التي يتم ترحيلها (0-100)
    rolloverPercentage: {
      type: Number,
      default: 100,
      min: [0, 'نسبة الترحيل لا يمكن أن تكون سالبة'],
      max: [100, 'نسبة الترحيل لا يمكن أن تتجاوز 100%']
    },
    // التدوير التلقائي
    autoRollover: {
      type: Boolean,
      default: false
    },
    // تاريخ التدوير التلقائي (عادة بداية السنة الجديدة)
    autoRolloverDate: {
      type: Date
    },
    // حالة التدوير التلقائي
    autoRolloverStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },
  
  // ملاحظات
  notes: {
    type: String
  },
  
  // من قام بإنشاء السنة المالية
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'منشئ السنة المالية مطلوب']
  },
  
  // من قام بالموافقة على التوزيعات
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // تاريخ الموافقة
  approvedAt: {
    type: Date
  },
  
  // من قام بتوزيع الأرباح
  distributedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // تاريخ التوزيع
  distributedAt: {
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

// Virtual للحصول على توزيعات الأرباح لهذه السنة
FinancialYearSchema.virtual('profitDistributions', {
  ref: 'YearlyProfitDistribution',
  localField: '_id',
  foreignField: 'financialYearId',
  justOne: false
});

// حساب معدل الربح اليومي تلقائياً
// ملاحظة: يتم حساب المعدل الفعلي عند حساب التوزيعات بناءً على رأس المال المستثمر
FinancialYearSchema.methods.calculateDailyProfitRate = function() {
  // لا نحسب المعدل هنا لأنه يحتاج إلى رأس المال المستثمر
  // سيتم حساب المعدل الصحيح في عملية حساب التوزيعات
  // نعيد قيمة افتراضية صغيرة لتجنب العرض الخاطئ
  if (!this.dailyProfitRate) {
    this.dailyProfitRate = 0;
  }
  return this.dailyProfitRate;
};

// حساب عدد الأيام بين تاريخين
FinancialYearSchema.methods.calculateDaysBetween = function(startDate, endDate) {
  const start = new Date(Math.max(new Date(startDate), this.startDate));
  const end = new Date(Math.min(new Date(endDate), this.endDate));
  
  if (start > end) return 0;
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 لتضمين اليوم الأول
  
  return diffDays;
};

// حساب ربح مساهمة معينة
FinancialYearSchema.methods.calculateInvestmentProfit = function(amount, startDate, endDate) {
  const days = this.calculateDaysBetween(startDate, endDate);
  const profit = amount * days * this.dailyProfitRate;
  
  return {
    amount: amount,
    days: days,
    dailyRate: this.dailyProfitRate,
    totalProfit: profit,
    formattedProfit: this.formatCurrency(profit)
  };
};

// تنسيق العملة
FinancialYearSchema.methods.formatCurrency = function(amount) {
  const symbols = {
    'IQD': 'د.ع',
    'USD': '$'
  };
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  return `${formattedAmount} ${symbols[this.currency] || this.currency}`;
};

// التحقق من صحة التواريخ
FinancialYearSchema.pre('save', function(next) {
  // التأكد من أن تاريخ النهاية أكبر من تاريخ البداية
  if (this.endDate <= this.startDate) {
    return next(new Error('تاريخ نهاية الفترة يجب أن يكون أكبر من تاريخ البداية'));
  }
  
  // حساب عدد الأيام تلقائياً
  const diffTime = Math.abs(this.endDate - this.startDate);
  this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  // حساب معدل الربح اليومي
  this.calculateDailyProfitRate();
  
  // تحديث وقت التعديل
  this.updatedAt = Date.now();
  
  next();
});

// فهرس لاسم الفترة (يجب أن يكون فريد)
FinancialYearSchema.index({ periodName: 1 }, { unique: true });

// فهرس للحالة والسنة
FinancialYearSchema.index({ status: 1, year: -1 });

module.exports = mongoose.model('FinancialYear', FinancialYearSchema); 