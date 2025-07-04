const mongoose = require('mongoose');
const Investor = require('./src/models/Investor');
const Transaction = require('./src/models/Transaction');
const YearlyProfitDistribution = require('./src/models/YearlyProfitDistribution');
require('./src/config/db');

async function optimizeDatabase() {
  try {
    console.log('🚀 بدء تحسين قاعدة البيانات...\n');

    // انتظار الاتصال بقاعدة البيانات
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
        mongoose.connection.once('error', reject);
        
        // timeout بعد 10 ثوانِ
        setTimeout(() => reject(new Error('Database connection timeout')), 10000);
      }
    });

    console.log('✅ متصل بقاعدة البيانات');

    // 1. إنشاء indexes للمستثمرين
    console.log('\n📊 إنشاء indexes للمستثمرين...');
    
    // حذف indexes الموجودة أولاً (إذا كانت موجودة)
    try {
      await Investor.collection.dropIndexes();
      console.log('  ✅ تم حذف indexes القديمة');
    } catch (error) {
      console.log('  ℹ️  لا توجد indexes قديمة للحذف');
    }

    // إنشاء indexes جديدة
    await Investor.collection.createIndex({ nationalId: 1 }, { 
      unique: true, 
      background: true,
      name: 'nationalId_unique'
    });
    console.log('  ✅ index للهوية الوطنية');

    await Investor.collection.createIndex({ isActive: 1 }, { 
      background: true,
      name: 'isActive_index'
    });
    console.log('  ✅ index للحالة النشطة');

    await Investor.collection.createIndex({ fullName: 1 }, { 
      background: true,
      name: 'fullName_index'
    });
    console.log('  ✅ index للاسم');

    await Investor.collection.createIndex({ startDate: 1 }, { 
      background: true,
      name: 'startDate_index'
    });
    console.log('  ✅ index لتاريخ البداية');

    await Investor.collection.createIndex({ 
      fullName: 'text', 
      nationalId: 'text' 
    }, { 
      background: true,
      name: 'search_text_index'
    });
    console.log('  ✅ index للبحث النصي');

    // 2. إنشاء indexes للمعاملات
    console.log('\n💰 إنشاء indexes للمعاملات...');
    
    try {
      await Transaction.collection.dropIndexes();
      console.log('  ✅ تم حذف indexes القديمة');
    } catch (error) {
      console.log('  ℹ️  لا توجد indexes قديمة للحذف');
    }

    await Transaction.collection.createIndex({ investorId: 1 }, { 
      background: true,
      name: 'investorId_index'
    });
    console.log('  ✅ index لمعرف المستثمر');

    await Transaction.collection.createIndex({ transactionDate: -1 }, { 
      background: true,
      name: 'transactionDate_desc'
    });
    console.log('  ✅ index لتاريخ المعاملة');

    await Transaction.collection.createIndex({ type: 1 }, { 
      background: true,
      name: 'type_index'
    });
    console.log('  ✅ index لنوع المعاملة');

    // 3. إنشاء indexes لتوزيعات الأرباح
    console.log('\n📈 إنشاء indexes لتوزيعات الأرباح...');
    
    try {
      await YearlyProfitDistribution.collection.dropIndexes();
      console.log('  ✅ تم حذف indexes القديمة');
    } catch (error) {
      console.log('  ℹ️  لا توجد indexes قديمة للحذف');
    }

    await YearlyProfitDistribution.collection.createIndex({ investorId: 1 }, { 
      background: true,
      name: 'investorId_index'
    });
    console.log('  ✅ index لمعرف المستثمر');

    await YearlyProfitDistribution.collection.createIndex({ year: -1 }, { 
      background: true,
      name: 'year_desc'
    });
    console.log('  ✅ index للسنة');

    // 4. عرض إحصائيات قاعدة البيانات
    console.log('\n📊 إحصائيات قاعدة البيانات:');
    
    const investorStats = await Investor.collection.stats();
    console.log(`  📋 المستثمرون: ${investorStats.count} مستثمر، الحجم: ${Math.round(investorStats.size / 1024)} KB`);
    
    const transactionStats = await Transaction.collection.stats();
    console.log(`  💰 المعاملات: ${transactionStats.count} معاملة، الحجم: ${Math.round(transactionStats.size / 1024)} KB`);
    
    try {
      const profitStats = await YearlyProfitDistribution.collection.stats();
      console.log(`  📈 توزيعات الأرباح: ${profitStats.count} توزيع، الحجم: ${Math.round(profitStats.size / 1024)} KB`);
    } catch (error) {
      console.log('  📈 توزيعات الأرباح: لا توجد بيانات بعد');
    }

    // 5. اختبار سرعة الاستعلامات
    console.log('\n⚡ اختبار سرعة الاستعلامات:');
    
    const startTime = Date.now();
    const activeInvestors = await Investor.find({ isActive: true }).limit(10);
    const queryTime = Date.now() - startTime;
    console.log(`  🔍 البحث عن المستثمرين النشطين: ${queryTime}ms (وجد ${activeInvestors.length} مستثمر)`);

    const searchStartTime = Date.now();
    const searchResults = await Investor.find({ 
      $text: { $search: 'احمد' } 
    }).limit(5);
    const searchTime = Date.now() - searchStartTime;
    console.log(`  🔍 البحث النصي: ${searchTime}ms (وجد ${searchResults.length} نتيجة)`);

    console.log('\n🎉 تم تحسين قاعدة البيانات بنجاح!');
    console.log('\n💡 نصائح للأداء:');
    console.log('  • استخدم pagination مع حد أقصى 100 نتيجة');
    console.log('  • استخدم lean() للاستعلامات القراءة فقط');
    console.log('  • فعّل compression في الإنتاج');
    console.log('  • راقب استخدام الذاكرة والشبكة');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في تحسين قاعدة البيانات:', error);
    process.exit(1);
  }
}

// تشغيل التحسين
optimizeDatabase(); 