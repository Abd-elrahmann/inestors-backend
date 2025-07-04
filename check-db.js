const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load models
const User = require('./src/models/User');
const Investor = require('./src/models/Investor');
const FinancialYear = require('./src/models/FinancialYear');
const YearlyProfitDistribution = require('./src/models/YearlyProfitDistribution');
const Transaction = require('./src/models/Transaction');

// Load environment variables
dotenv.config();

// Database connection string
const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/investors-system';

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(DB_URI);
    console.log('MongoDB connected\n');

    // Check users
    const users = await User.find();
    console.log(`Users (${users.length}):`);
    users.forEach(user => {
      console.log(`- ${user.username}, ${user.fullName}, Role: ${user.role}`);
    });
    console.log();

    // Check investors
    const investors = await Investor.find();
    console.log(`Investors (${investors.length}):`);
    investors.forEach(investor => {
      console.log(`- ${investor.fullName}, ID: ${investor._id}, Amount: ${investor.amountContributed}, Share: ${investor.sharePercentage || 0}%, Active: ${investor.isActive}`);
    });
    console.log();

    // Check transactions
    const transactions = await Transaction.find().populate('investorId', 'fullName');
    console.log(`Transactions (${transactions.length}):`);
    transactions.forEach(transaction => {
      console.log(`- Investor: ${transaction.investorId?.fullName}, Type: ${transaction.type}, Amount: ${transaction.amount}, Date: ${transaction.transactionDate}`);
    });
    console.log();

    // Check financial years
    const financialYears = await FinancialYear.find();
    console.log(`Financial Years (${financialYears.length}):`);
    financialYears.forEach(year => {
      console.log(`- Year: ${year.year}, Period: ${year.periodName || 'غير محدد'}, Total Profit: ${year.totalProfit}, Currency: ${year.currency}`);
      console.log(`  Status: ${year.status}, Total Days: ${year.totalDays}, Daily Rate: ${year.dailyProfitRate}`);
      console.log(`  Start: ${year.startDate}, End: ${year.endDate}`);
    });
    console.log();

    // Check profit distributions
    const distributions = await YearlyProfitDistribution.find()
      .populate('investorId', 'fullName')
      .populate('financialYearId', 'year totalProfit');
    console.log(`Profit Distributions (${distributions.length}):`);
    distributions.forEach(dist => {
      console.log(`- Investor: ${dist.investorId?.fullName}, Year: ${dist.financialYearId?.year}`);
      console.log(`  Investment Amount: ${dist.calculation?.investmentAmount}, Days: ${dist.calculation?.totalDays}`);
      console.log(`  Daily Rate: ${dist.calculation?.dailyProfitRate}, Calculated Profit: ${dist.calculation?.calculatedProfit}`);
      console.log(`  Status: ${dist.status}, Currency: ${dist.currency}`);
    });
    console.log();

    // Calculate analysis
    console.log('=== ANALYSIS ===');
    
    if (financialYears.length > 0) {
      const activeYear = financialYears.find(y => y.status === 'calculated' || y.status === 'active');
      if (activeYear) {
        console.log(`Active Financial Year: ${activeYear.year}`);
        console.log(`- Total Profit: ${activeYear.totalProfit} ${activeYear.currency}`);
        console.log(`- Total Days: ${activeYear.totalDays}`);
        console.log(`- Current Daily Rate: ${activeYear.dailyProfitRate}`);
        
        // Calculate total invested capital
        let totalInvestedCapital = 0;
        console.log('\nInvestor Capital Analysis:');
        
        for (const investor of investors) {
          if (!investor.isActive) continue;
          
          // Get transactions for this investor in the financial year
          const investorTransactions = transactions.filter(t => 
            t.investorId._id.toString() === investor._id.toString() &&
            t.transactionDate >= activeYear.startDate &&
            t.transactionDate <= activeYear.endDate &&
            (t.type === 'deposit' || t.type === 'withdrawal')
          );
          
          let investorCapital = 0;
          let currentAmount = 0;
          let lastDate = activeYear.startDate;
          
          // Sort transactions by date
          const sortedTransactions = investorTransactions.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
          
          for (const transaction of sortedTransactions) {
            const transactionDate = new Date(transaction.transactionDate);
            
            // Calculate previous period contribution
            if (currentAmount > 0) {
              const diffTime = Math.abs(transactionDate - lastDate);
              const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              investorCapital += currentAmount * days;
            }
            
            // Update current amount
            if (transaction.type === 'deposit') {
              currentAmount += transaction.amount;
            } else if (transaction.type === 'withdrawal') {
              currentAmount = Math.max(0, currentAmount - transaction.amount);
            }
            
            lastDate = transactionDate;
          }
          
          // Calculate final period
          if (currentAmount > 0) {
            const diffTime = Math.abs(activeYear.endDate - lastDate);
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            investorCapital += currentAmount * days;
          }
          
          totalInvestedCapital += investorCapital;
          
          console.log(`- ${investor.fullName}: Capital Weight = ${investorCapital}, Transactions = ${investorTransactions.length}`);
        }
        
        console.log(`\nTotal Invested Capital (weighted): ${totalInvestedCapital}`);
        
        // Calculate correct daily profit rate
        const correctDailyRate = totalInvestedCapital > 0 ? 
          activeYear.totalProfit / activeYear.totalDays / totalInvestedCapital : 0;
        
        console.log(`Correct Daily Profit Rate: ${correctDailyRate}`);
        console.log(`Stored Daily Profit Rate: ${activeYear.dailyProfitRate}`);
        console.log(`Difference: ${Math.abs(correctDailyRate - activeYear.dailyProfitRate)}`);
        
        // Simple daily rate (wrong calculation)
        const simpleDailyRate = activeYear.totalProfit / activeYear.totalDays;
        console.log(`Simple Daily Rate (wrong): ${simpleDailyRate}`);
      }
    }

    console.log('\n=== End of Database Contents ===');
    console.log(`\nDatabase connection string: ${DB_URI}`);

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase(); 