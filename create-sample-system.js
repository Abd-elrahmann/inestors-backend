const mongoose = require('mongoose');
const FinancialYear = require('./src/models/FinancialYear');
const Investor = require('./src/models/Investor');
const Transaction = require('./src/models/Transaction');

async function createCompleteSystem() {
  try {
    await mongoose.connect('mongodb://localhost:27017/investorsystem');
    console.log('✅ متصل بقاعدة البيانات');

    // إنشاء 3 مستثمرين
    console.log('\n👥 إنشاء المستثمرين...');
    
    const investors = [
      {
        fullName: 'أحمد محمد علي',
        nationalId: '123456789',
        phone: '07901234567',
        email: 'ahmed@example.com',
        address: 'بغداد، العراق',
        amountContributed: 100000, // 100 ألف دينار
        startDate: new Date('2025-01-01'),
        status: 'active'
      },
      {
        fullName: 'فاطمة حسن أحمد',
        nationalId: '987654321',
        phone: '07707654321',
        email: 'fatima@example.com',
        address: 'البصرة، العراق',
        amountContributed: 200000, // 200 ألف دينار
        startDate: new Date('2025-01-15'),
        status: 'active'
      },
      {
        fullName: 'خالد عبد الله محمود',
        nationalId: '456789123',
        phone: '07801122334',
        email: 'khaled@example.com',
        address: 'أربيل، العراق',
        amountContributed: 300000, // 300 ألف دينار
        startDate: new Date('2025-02-01'),
        status: 'active'
      }
    ];

    const savedInvestors = [];
    for (const investorData of investors) {
      const investor = new Investor({
        ...investorData,
        createdBy: new mongoose.Types.ObjectId()
      });
      const saved = await investor.save();
      savedInvestors.push(saved);
      console.log(`✅ تم إنشاء المستثمر: ${investor.fullName} - ${investor.amountContributed.toLocaleString()} IQD`);
    }

    // إنشاء المعاملات لكل مستثمر
    console.log('\n💰 إنشاء المعاملات...');
    
    for (const investor of savedInvestors) {
      const transaction = new Transaction({
        investorId: investor._id,
        type: 'deposit',
        amount: investor.amountContributed,
        currency: 'IQD',
        transactionDate: investor.startDate,
        description: 'الإيداع الأولي',
        status: 'completed',
        createdBy: investor._id
      });
      await transaction.save();
      console.log(`✅ معاملة إيداع: ${investor.fullName} - ${transaction.amount.toLocaleString()} IQD`);
    }

    // إنشاء السنة المالية بالحسابات الصحيحة
    console.log('\n📅 إنشاء السنة المالية 2025...');
    
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // 365 يوم
    
    // إجمالي رأس المال المستثمر
    const totalInvestedCapital = savedInvestors.reduce((sum, inv) => sum + inv.amountContributed, 0);
    
    // نسبة الربح المرغوبة (مثال: 20% سنوياً)
    const annualProfitPercentage = 20; // 20%
    const totalProfit = totalInvestedCapital * (annualProfitPercentage / 100);
    
    // حساب معدل الربح اليومي الصحيح
    const dailyProfitRate = (annualProfitPercentage / 100) / totalDays;

    console.log('\n📊 حسابات السنة المالية:');
    console.log(`- تاريخ البداية: ${startDate.toLocaleDateString('ar-SA')}`);
    console.log(`- تاريخ النهاية: ${endDate.toLocaleDateString('ar-SA')}`);
    console.log(`- إجمالي الأيام: ${totalDays} يوم`);
    console.log(`- إجمالي رأس المال: ${totalInvestedCapital.toLocaleString()} IQD`);
    console.log(`- نسبة الربح السنوية: ${annualProfitPercentage}%`);
    console.log(`- إجمالي الربح المتوقع: ${totalProfit.toLocaleString()} IQD`);
    console.log(`- معدل الربح اليومي: ${(dailyProfitRate * 100).toFixed(6)}% يومياً`);
    console.log(`- معدل الربح اليومي (رقمي): ${dailyProfitRate.toFixed(8)}`);

    const financialYear = new FinancialYear({
      year: 2025,
      name: 'السنة المالية 2025',
      type: 'annual',
      startDate: startDate,
      endDate: endDate,
      totalDays: totalDays,
      profitPercentage: annualProfitPercentage,
      totalProfit: totalProfit,
      dailyProfitRate: dailyProfitRate,
      currency: 'IQD',
      status: 'draft',
      createdBy: savedInvestors[0]._id
    });

    const savedFinancialYear = await financialYear.save();
    console.log('\n✅ تم إنشاء السنة المالية بنجاح!');

    // التحقق النهائي
    console.log('\n🔍 التحقق النهائي من البيانات:');
    
    const verification = await FinancialYear.findById(savedFinancialYear._id);
    console.log(`- ID السنة المالية: ${verification._id}`);
    console.log(`- السنة: ${verification.year}`);
    console.log(`- نسبة الربح: ${verification.profitPercentage}%`);
    console.log(`- معدل الربح اليومي: ${verification.dailyProfitRate.toFixed(8)}`);
    console.log(`- إجمالي الربح: ${verification.totalProfit.toLocaleString()} IQD`);
    console.log(`- الحالة: ${verification.status}`);

    // عرض تفاصيل المستثمرين
    console.log('\n👥 ملخص المستثمرين:');
    for (const investor of savedInvestors) {
      const share = (investor.amountContributed / totalInvestedCapital) * 100;
      const expectedAnnualProfit = (investor.amountContributed * annualProfitPercentage) / 100;
      console.log(`📈 ${investor.fullName}:`);
      console.log(`   - رأس المال: ${investor.amountContributed.toLocaleString()} IQD`);
      console.log(`   - نسبة المساهمة: ${share.toFixed(2)}%`);
      console.log(`   - الربح السنوي المتوقع: ${expectedAnnualProfit.toLocaleString()} IQD`);
    }

    console.log('\n🎉 تم إنشاء النظام الكامل بنجاح!');
    console.log('📋 يمكنك الآن:');
    console.log('   1. تحديث الواجهة الأمامية لرؤية البيانات');
    console.log('   2. حساب توزيع الأرباح من واجهة السنوات المالية');
    console.log('   3. مراجعة التقارير والإحصائيات');

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في إنشاء النظام:', error.message);
    process.exit(1);
  }
}

createCompleteSystem(); 