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
    max: [100, 'Percentage cannot exceed 100'],
    default: 0
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
InvestorSchema.index({ fullName: 'text', nationalId: 'text' });

// Virtual for transactions
InvestorSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'investorId',
  justOne: false
});

// Virtual for profit distributions
InvestorSchema.virtual('profitDistributions', {
  ref: 'ProfitDistribution',
  localField: '_id',
  foreignField: 'investorId',
  justOne: false
});

// Calculate current balance
InvestorSchema.methods.getCurrentBalance = async function() {
  await this.populate('transactions profitDistributions');
  
  let balance = this.amountContributed;
  
  if (this.transactions) {
    this.transactions.forEach(t => {
      balance += t.type === 'deposit' ? t.amount : -t.amount;
    });
  }
  
  if (this.profitDistributions) {
    balance += this.profitDistributions.reduce((sum, d) => sum + d.profitAmount, 0);
  }
  
  return balance;
};

// Update single investor's share percentage
InvestorSchema.methods.updateSharePercentage = async function() {
  const total = await this.constructor.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$amountContributed' } } }
  ]);
  
  if (total.length > 0 && total[0].total > 0) {
    this.sharePercentage = parseFloat(
      ((this.amountContributed / total[0].total) * 100).toFixed(2)
    );
    await this.save();
  }
  
  return this.sharePercentage;
};

// Update all active investors' share percentages
InvestorSchema.statics.updateAllSharePercentages = async function() {
  // Get total contributions from active investors
  const totalResult = await this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$amountContributed' } } }
  ]);
  
  if (totalResult.length === 0 || totalResult[0].total === 0) {
    return false;
  }
  
  const totalInvestment = totalResult[0].total;
  
  // Update all active investors in bulk
  const result = await this.updateMany(
    { isActive: true },
    [{
      $set: {
        sharePercentage: {
          $round: [
            { $multiply: [
              { $divide: ['$amountContributed', totalInvestment] },
              100
            ]},
            2
          ]
        },
        updatedAt: new Date()
      }
    }]
  );
  
  return result.modifiedCount > 0;
};

// Pre-save hook to update share percentage when amount changes
InvestorSchema.pre('save', async function(next) {
  if (this.isModified('amountContributed') || this.isModified('isActive')) {
    const totalResult = await this.constructor.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$amountContributed' } } }
    ]);
    
    if (totalResult.length > 0 && totalResult[0].total > 0 && this.isActive) {
      this.sharePercentage = parseFloat(
        ((this.amountContributed / totalResult[0].total) * 100).toFixed(2)
      );
    } else {
      this.sharePercentage = 0;
    }
  }
  next();
});

module.exports = mongoose.model('Investor', InvestorSchema);