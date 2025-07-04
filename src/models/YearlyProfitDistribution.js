const mongoose = require('mongoose');

const YearlyProfitDistributionSchema = new mongoose.Schema({
  // ربط بالسنة المالية
  financialYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinancialYear',
    required: [true, 'السنة المالية مطلوبة']
  },
  
  // ربط بالمساهم
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor',
    required: [true, 'المساهم مطلوب']
  },
  
  // تاريخ بداية احتساب الأرباح للمساهم (قد يختلف عن بداية السنة المالية)
  startDate: {
    type: Date,
    required: [true, 'تاريخ بداية احتساب الأرباح مطلوب']
  },
  
  // تفاصيل حساب الأرباح
  calculation: {
    // المبلغ المساهم به
    investmentAmount: {
      type: Number,
      required: [true, 'مبلغ المساهمة مطلوب'],
      min: [0, 'مبلغ المساهمة لا يمكن أن يكون سالب']
    },
    
    // عدد الأيام التي قضتها المساهمة
    totalDays: {
      type: Number,
      required: [true, 'عدد الأيام مطلوب'],
      min: [0, 'عدد الأيام لا يمكن أن يكون سالب']
    },
    
    // معدل الربح اليومي المستخدم في الحساب
    dailyProfitRate: {
      type: Number,
      required: [true, 'معدل الربح اليومي مطلوب'],
      min: [0, 'معدل الربح اليومي لا يمكن أن يكون سالب']
    },
    
    // الربح المحسوب
    calculatedProfit: {
      type: Number,
      required: [true, 'الربح المحسوب مطلوب'],
      min: [0, 'الربح المحسوب لا يمكن أن يكون سالب']
    }
  },
  
  // تفاصيل الفترات (للمساهمات المتغيرة خلال السنة)
  periods: [{
    startDate: {
      type: Date,
      required: [true, 'تاريخ بداية الفترة مطلوب']
    },
    endDate: {
      type: Date,
      required: [true, 'تاريخ نهاية الفترة مطلوب']
    },
    amount: {
      type: Number,
      required: [true, 'مبلغ الفترة مطلوب'],
      min: [0, 'مبلغ الفترة لا يمكن أن يكون سالب']
    },
    days: {
      type: Number,
      required: [true, 'عدد أيام الفترة مطلوب'],
      min: [0, 'عدد أيام الفترة لا يمكن أن يكون سالب']
    },
    profit: {
      type: Number,
      required: [true, 'ربح الفترة مطلوب'],
      min: [0, 'ربح الفترة لا يمكن أن يكون سالب']
    }
  }],
  
  // العملة
  currency: {
    type: String,
    enum: ['IQD', 'USD'],
    default: 'USD',
    required: [true, 'العملة مطلوبة']
  },
  
  // حالة التوزيع
  status: {
    type: String,
    enum: ['calculated', 'approved', 'distributed', 'rolled_over'],
    default: 'calculated'
  },
  
  // إعدادات تدوير الأرباح
  rolloverSettings: {
    isRolledOver: {
      type: Boolean,
      default: false
    },
    rolloverAmount: {
      type: Number,
      default: 0,
      min: [0, 'مبلغ الترحيل لا يمكن أن يكون سالب']
    },
    rolloverDate: {
      type: Date
    }
  },
  
  // تاريخ التوزيع (يتم تحديثه عند الموافقة على التوزيع وعند التوزيع الفعلي)
  distributionDate: {
    type: Date
  },
  
  // ملاحظات
  notes: {
    type: String
  },
  
  // من قام بإنشاء/تأكيد التوزيع
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // تواريخ الإنشاء والتحديث
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

// Virtual لحساب إجمالي الأرباح من جميع الفترات
YearlyProfitDistributionSchema.virtual('totalProfitFromPeriods').get(function() {
  return this.periods.reduce((total, period) => total + period.profit, 0);
});

// Virtual لحساب إجمالي الأيام من جميع الفترات
YearlyProfitDistributionSchema.virtual('totalDaysFromPeriods').get(function() {
  return this.periods.reduce((total, period) => total + period.days, 0);
});

// Virtual لحساب متوسط المبلغ المستثمر
YearlyProfitDistributionSchema.virtual('averageInvestmentAmount').get(function() {
  if (this.periods.length === 0) return 0;
  
  const totalWeightedAmount = this.periods.reduce((total, period) => {
    return total + (period.amount * period.days);
  }, 0);
  
  const totalDays = this.totalDaysFromPeriods;
  return totalDays > 0 ? totalWeightedAmount / totalDays : 0;
});

// طريقة لحساب الأرباح من المعاملات
YearlyProfitDistributionSchema.methods.calculateFromTransactions = async function(transactions, financialYear) {
  const Transaction = mongoose.model('Transaction');
  const periods = [];
  
  // ترتيب المعاملات حسب التاريخ
  const sortedTransactions = transactions.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  
  let currentAmount = 0;
  let lastDate = financialYear.startDate;
  
  for (const transaction of sortedTransactions) {
    const transactionDate = new Date(transaction.transactionDate);
    
    // إذا كان هناك مبلغ في الفترة السابقة، احسب ربحها
    if (currentAmount > 0 && transactionDate > lastDate) {
      const days = financialYear.calculateDaysBetween(lastDate, transactionDate);
      const profit = currentAmount * days * financialYear.dailyProfitRate;
      
      periods.push({
        startDate: lastDate,
        endDate: new Date(transactionDate.getTime() - 24 * 60 * 60 * 1000), // يوم قبل المعاملة
        amount: currentAmount,
        days: days,
        profit: profit
      });
    }
    
    // تحديث المبلغ الحالي
    if (transaction.type === 'deposit') {
      currentAmount += transaction.amount;
    } else if (transaction.type === 'withdrawal') {
      currentAmount = Math.max(0, currentAmount - transaction.amount);
    }
    
    lastDate = transactionDate;
  }
  
  // حساب الفترة الأخيرة حتى نهاية السنة المالية
  if (currentAmount > 0) {
    const days = financialYear.calculateDaysBetween(lastDate, financialYear.endDate);
    const profit = currentAmount * days * financialYear.dailyProfitRate;
    
    periods.push({
      startDate: lastDate,
      endDate: financialYear.endDate,
      amount: currentAmount,
      days: days,
      profit: profit
    });
  }
  
  // تحديث البيانات
  this.periods = periods;
  this.calculation.totalDays = this.totalDaysFromPeriods;
  this.calculation.calculatedProfit = this.totalProfitFromPeriods;
  this.calculation.investmentAmount = this.averageInvestmentAmount;
  this.calculation.dailyProfitRate = financialYear.dailyProfitRate;
  this.currency = financialYear.currency;
  
  return this;
};

// طريقة لتدوير الأرباح
YearlyProfitDistributionSchema.methods.rolloverProfits = async function(percentage = 100) {
  if (this.status !== 'approved') {
    throw new Error('لا يمكن تدوير الأرباح إلا بعد الموافقة على التوزيع');
  }
  
  const rolloverAmount = (this.calculation.calculatedProfit * percentage) / 100;
  
  // إنشاء معاملة إيداع جديدة للأرباح المدورة
  const Transaction = mongoose.model('Transaction');
  const FinancialYear = mongoose.model('FinancialYear');
  const financialYear = await FinancialYear.findById(this.financialYearId);
  
  const newTransaction = await Transaction.create({
    investorId: this.investorId,
    type: 'profit',
    amount: rolloverAmount,
    currency: this.currency,
    profitYear: financialYear?.year, // إضافة سنة الأرباح
    transactionDate: new Date(),
    reference: `تدوير أرباح السنة المالية ${financialYear?.year || 'غير محدد'}`,
    notes: `تدوير ${percentage}% من الأرباح (${new Intl.NumberFormat('ar-EG').format(this.calculation.calculatedProfit)} ${this.currency}) إلى رأس المال`,
    createdBy: this.approvedBy
  });
  
  // تحديث إعدادات التدوير
  this.rolloverSettings.isRolledOver = true;
  this.rolloverSettings.rolloverAmount = rolloverAmount;
  this.rolloverSettings.rolloverDate = new Date();
  this.status = 'rolled_over';
  
  await this.save();
  
  return {
    transaction: newTransaction,
    rolloverAmount: rolloverAmount,
    percentage: percentage
  };
};

// طريقة لتنسيق الأرباح
YearlyProfitDistributionSchema.methods.formatProfit = function() {
  const symbols = {
    'IQD': 'د.ع',
    'USD': '$'
  };
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(this.calculation.calculatedProfit);
  
  return `${formattedAmount} ${symbols[this.currency] || this.currency}`;
};

// Pre-save hook
YearlyProfitDistributionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// فهارس مركبة
YearlyProfitDistributionSchema.index({ financialYearId: 1, investorId: 1 }, { unique: true });
YearlyProfitDistributionSchema.index({ status: 1, financialYearId: 1 });
YearlyProfitDistributionSchema.index({ investorId: 1, createdAt: -1 });

module.exports = mongoose.model('YearlyProfitDistribution', YearlyProfitDistributionSchema); 