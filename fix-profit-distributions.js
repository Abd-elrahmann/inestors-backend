require('dotenv').config();
const mongoose = require('mongoose');
const YearlyProfitDistribution = require('./src/models/YearlyProfitDistribution');
const Investor = require('./src/models/Investor');
const FinancialYear = require('./src/models/FinancialYear');
const connectDB = require('./src/config/db');

async function fixProfitDistributions() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB...');

    // Get all profit distributions
    const distributions = await YearlyProfitDistribution.find({}).populate('investorId').populate('financialYearId');
    console.log(`Found ${distributions.length} profit distributions to fix...`);

    let fixed = 0;
    for (const dist of distributions) {
      if (!dist.startDate && dist.investorId && dist.financialYearId) {
        const investorStartDate = new Date(dist.investorId.startDate);
        const financialYearStartDate = new Date(dist.financialYearId.startDate);
        
        // Use the later date between investor start date and financial year start date
        const effectiveStartDate = investorStartDate > financialYearStartDate ? investorStartDate : financialYearStartDate;
        
        dist.startDate = effectiveStartDate;
        await dist.save();
        fixed++;
        
        console.log(`Fixed distribution for investor ${dist.investorId.fullName} - Set startDate to ${effectiveStartDate.toISOString()}`);
      }
    }

    console.log(`\nFixed ${fixed} profit distributions`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixProfitDistributions(); 