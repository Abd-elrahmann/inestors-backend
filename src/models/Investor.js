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
    max: [100, 'Percentage cannot be more than 100'],
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
 
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

InvestorSchema.index({ nationalId: 1 }, { unique: true });
InvestorSchema.index({ fullName: 1 });
InvestorSchema.index({ startDate: 1 });
InvestorSchema.index({ fullName: 'text', nationalId: 'text' });

InvestorSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'investorId',
  justOne: false
});

InvestorSchema.virtual('profitDistributions', {
  ref: 'ProfitDistribution',
  localField: '_id',
  foreignField: 'investorId',
  justOne: false
});

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

InvestorSchema.methods.updateSharePercentage = async function() {
  const total = await this.constructor.aggregate([
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

InvestorSchema.statics.updateAllSharePercentages = async function() {
  const totalResult = await this.aggregate([
    { $group: { _id: null, total: { $sum: '$amountContributed' } } }
  ]);
  
  if (totalResult.length === 0 || totalResult[0].total === 0) {
    return false;
  }
  
  const totalInvestment = totalResult[0].total;
  
  const result = await this.updateMany(
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

InvestorSchema.pre('save', async function(next) {
  if (this.isModified('amountContributed')) {
    const totalResult = await this.constructor.aggregate([
      { $group: { _id: null, total: { $sum: '$amountContributed' } } }
    ]);
    
    if (totalResult.length > 0 && totalResult[0].total > 0) {
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