const mongoose = require('mongoose');
const FinancialYear = require('./src/models/FinancialYear');
const Investor = require('./src/models/Investor');
const Transaction = require('./src/models/Transaction');
const YearlyProfitDistribution = require('./src/models/YearlyProfitDistribution');

async function clearAllData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/investorsystem');
    console.log('✅ متصل بقاعدة البيانات');

    console.log('\n🗑️ مسح جميع البيانات...');
    
    // مسح جميع البيانات
    const deletedFinancialYears = await FinancialYear.deleteMany({});
    const deletedInvestors = await Investor.deleteMany({});
    const deletedTransactions = await Transaction.deleteMany({});
    const deletedDistributions = await YearlyProfitDistribution.deleteMany({});

    console.log('\n📊 نتائج المسح:');
    console.log(`- السنوات المالية: ${deletedFinancialYears.deletedCount} سجل محذوف`);
    console.log(`- المستثمرون: ${deletedInvestors.deletedCount} سجل محذوف`);
    console.log(`- المعاملات: ${deletedTransactions.deletedCount} سجل محذوف`);
    console.log(`- توزيعات الأرباح: ${deletedDistributions.deletedCount} سجل محذوف`);

    console.log('\n✅ تم مسح جميع البيانات بنجاح!');
    console.log('📋 قاعدة البيانات فارغة الآن ومستعدة لبيانات جديدة');

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في مسح البيانات:', error.message);
    process.exit(1);
  }
}

clearAllData(); 