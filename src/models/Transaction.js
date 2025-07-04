const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor',
    required: [true, 'Investor ID is required']
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'profit', 'fee', 'transfer'],
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Transaction amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  // سنة الأرباح - تربط الأرباح بالسنة المالية المناسبة
  profitYear: {
    type: Number,
    min: [2000, 'السنة يجب أن تكون أكبر من 2000'],
    max: [2100, 'السنة يجب أن تكون أقل من 2100'],
    // هذا الحقل مطلوب فقط للمعاملات من نوع 'profit'
    validate: {
      validator: function(value) {
        // إذا كان نوع المعاملة 'profit'، فإن سنة الأرباح مطلوبة
        if (this.type === 'profit' && !value) {
          return false;
        }
        return true;
      },
      message: 'سنة الأرباح مطلوبة للمعاملات من نوع الأرباح'
    }
  },
  currency: {
    type: String,
    enum: ['IQD', 'USD'],
    default: 'IQD',
    required: [true, 'Please provide currency']
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  reference: {
    type: String
  },
  notes: {
    type: String
  },
  receiptNumber: {
    type: String
  },
  attachments: [{
    name: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
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

// Pre-save hook to update timestamps
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save hook to update investor's balance
TransactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Investor = mongoose.model('Investor');
    const investor = await Investor.findById(this.investorId);
    
    if (!investor) {
      return next(new Error('Investor not found'));
    }
    
    // If this is a deposit and it's marked as contribution
    if (this.type === 'deposit' && this.isContribution) {
      investor.amountContributed += this.amount;
      await investor.save();
      
      // Update share percentages for all investors
      await investor.updateSharePercentage();
    }
  }
  
  next();
});

// Generate receipt number
TransactionSchema.pre('save', function(next) {
  if (this.isNew && !this.receiptNumber) {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    this.receiptNumber = `TRX-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema); 