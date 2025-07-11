const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // العملة الافتراضية للنظام
  defaultCurrency: {
    type: String,
    enum: ['IQD', 'USD'],
    default: 'IQD'
  },
  
  // عملة العرض
  displayCurrency: {
    type: String,
    enum: ['IQD', 'USD', 'BOTH'],
    default: 'IQD'
  },
  
  // التحويل التلقائي للعملة
  autoConvertCurrency: {
    type: Boolean,
    default: false
  },
  
  // أسعار الصرف
  exchangeRates: {
    USD_TO_IQD: {
      type: Number,
      default: 1310.32
    },
    IQD_TO_USD: {
      type: Number,
      default: 1/1310.32
    }
  },
  
  // آخر تحديث لأسعار الصرف
  lastRateUpdate: {
    type: Date,
    default: Date.now
  },
  
  // معلومات التحديث
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// تحويل مبلغ من عملة إلى أخرى
SettingsSchema.methods.convertCurrency = function(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  if (fromCurrency === 'USD' && toCurrency === 'IQD') {
    return amount * this.exchangeRates.USD_TO_IQD;
  }
  
  if (fromCurrency === 'IQD' && toCurrency === 'USD') {
    return amount * this.exchangeRates.IQD_TO_USD;
  }
  
  return amount;
};

// الحصول على المبلغ المعروض حسب إعدادات النظام
SettingsSchema.methods.getDisplayAmount = function(amount, originalCurrency) {
  // إذا كان التحويل التلقائي مفعل، حول المبلغ إلى العملة الافتراضية
  const shouldConvert = this.autoConvertCurrency || this.defaultCurrency !== originalCurrency;
  
  if (!shouldConvert) {
    return {
      amount: amount,
      currency: originalCurrency,
      displayText: this.formatCurrency(amount, originalCurrency)
    };
  }
  
  const convertedAmount = this.convertCurrency(amount, originalCurrency, this.defaultCurrency);
  
  if (this.displayCurrency === 'BOTH') {
    return {
      amount: convertedAmount,
      currency: this.defaultCurrency,
      originalAmount: amount,
      originalCurrency: originalCurrency,
      displayText: `${this.formatCurrency(convertedAmount, this.defaultCurrency)} (${this.formatCurrency(amount, originalCurrency)})`
    };
  }
  
  return {
    amount: convertedAmount,
    currency: this.defaultCurrency,
    displayText: this.formatCurrency(convertedAmount, this.defaultCurrency)
  };
};

// تنسيق عرض العملة
SettingsSchema.methods.formatCurrency = function(amount, currency) {
  const symbols = {
    'IQD': 'د.ع',
    'USD': '$'
  };
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount);
  
  return `${formattedAmount} ${symbols[currency] || currency}`;
};

// Method to update exchange rates
SettingsSchema.methods.updateExchangeRates = function(usdToIqd) {
  this.exchangeRates.USD_TO_IQD = usdToIqd;
  this.exchangeRates.IQD_TO_USD = 1 / usdToIqd;
  this.lastRateUpdate = new Date();
  return this.save();
};

// Static method to get or create settings
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

// Pre-save hook to update timestamps
SettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Settings', SettingsSchema); 