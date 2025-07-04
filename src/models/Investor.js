const mongoose = require('mongoose');

const InvestorSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide investor name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  nationalId: {
    type: String,
    required: [true, 'Please provide national ID'],
    unique: true,
    trim: true,
    maxlength: [20, 'National ID cannot be more than 20 characters']
  },
  amountContributed: {
    type: Number,
    required: [true, 'Please provide contribution amount'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    enum: ['IQD', 'USD'],
    default: 'IQD',
    required: [true, 'Please provide currency']
  },
  sharePercentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  startDate: {
    type: Date,
    required: [true, 'تاريخ انضمام المستثمر مطلوب'],
    validate: {
      validator: function(value) {
        return value instanceof Date && !isNaN(value);
      },
      message: 'تاريخ انضمام المستثمر غير صالح'
    }
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot be more than 20 characters'],
    required: false
  },
  email: {
    type: String,
    match: [
      /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
      'Please provide a valid email'
    ],
    trim: true,
    required: false
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  documents: [{
    name: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// إضافة indexes لتحسين الأداء
InvestorSchema.index({ nationalId: 1 }, { unique: true });
InvestorSchema.index({ isActive: 1 });
InvestorSchema.index({ fullName: 1 });
InvestorSchema.index({ startDate: 1 });
InvestorSchema.index({ fullName: 'text', nationalId: 'text' }); // للبحث النصي

// Virtual for getting all transactions for this investor
InvestorSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'investorId',
  justOne: false
});

// Virtual for getting all profit distributions for this investor
InvestorSchema.virtual('profitDistributions', {
  ref: 'ProfitDistribution',
  localField: '_id',
  foreignField: 'investorId',
  justOne: false
});

// Calculate current balance
InvestorSchema.methods.getCurrentBalance = async function() {
  // Get all transactions
  await this.populate('transactions');
  
  let balance = this.amountContributed;
  
  // Add deposits and subtract withdrawals
  if (this.transactions) {
    this.transactions.forEach(transaction => {
      if (transaction.type === 'deposit') {
        balance += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        balance -= transaction.amount;
      }
    });
  }
  
  // Add profit distributions
  await this.populate('profitDistributions');
  if (this.profitDistributions) {
    this.profitDistributions.forEach(distribution => {
      balance += distribution.profitAmount;
    });
  }
  
  return balance;
};

// Update share percentage
InvestorSchema.methods.updateSharePercentage = async function() {
  // Get total contributions from all active investors
  const totalContributions = await mongoose.model('Investor').aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$amountContributed' } } }
  ]);
  
  if (totalContributions && totalContributions.length > 0) {
    this.sharePercentage = (this.amountContributed / totalContributions[0].total) * 100;
    await this.save();
  }
  
  return this.sharePercentage;
};

// دالة تحديث نسب المساهمة لجميع المساهمين النشطين
InvestorSchema.statics.updateAllSharePercentages = async function() {
  try {
    // الحصول على جميع المساهمين النشطين
    const activeInvestors = await this.find({ isActive: true }).select('amountContributed sharePercentage');
    
    if (activeInvestors.length === 0) {
      return true;
    }
    
    // حساب إجمالي المبلغ المستثمر للمساهمين النشطين
    const totalInvestment = activeInvestors.reduce((sum, investor) => sum + investor.amountContributed, 0);
  
    if (totalInvestment === 0) {
      return true;
    }
    
    // تحديث نسبة كل مساهم باستخدام bulk operation
    const bulkOps = activeInvestors.map(investor => ({
      updateOne: {
        filter: { _id: investor._id },
        update: { 
          sharePercentage: (investor.amountContributed / totalInvestment) * 100,
          updatedAt: new Date()
        }
      }
    }));
    
    await this.bulkWrite(bulkOps);
    
    return true;
  } catch (error) {
    console.error('Error updating share percentages:', error);
    throw error;
  }
};

// Pre-save hook to update timestamps
InvestorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// إزالة الـ hooks المعقدة وتبسيط العمليات
// سيتم تحديث النسب يدوياً عند الحاجة لتحسين الأداء

module.exports = mongoose.model('Investor', InvestorSchema); 