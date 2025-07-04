const cron = require('node-cron');
const FinancialYear = require('../models/FinancialYear');
const YearlyProfitDistribution = require('../models/YearlyProfitDistribution');
const { cleanupOldExports } = require('./reportExporter');

// Daily task to check auto rollover (runs every day at 2:00 AM)
const autoRolloverTask = cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Starting auto rollover check...');
  
  try {
    const today = new Date();
    
    // البحث عن السنوات المالية المؤهلة للتدوير التلقائي
    const eligibleYears = await FinancialYear.find({
      'rolloverSettings.autoRollover': true,
      'rolloverSettings.autoRolloverDate': { $lte: today },
      'rolloverSettings.autoRolloverStatus': 'pending',
      status: 'calculated'
    });
    
    console.log(`🔍 Found ${eligibleYears.length} financial year(s) eligible for auto rollover`);
    
    for (const financialYear of eligibleYears) {
      try {
        console.log(`⚙️ Processing financial year ${financialYear.year}...`);
        
        // الحصول على التوزيعات الموافق عليها
        const distributions = await YearlyProfitDistribution.find({
          financialYearId: financialYear._id,
          status: 'approved'
        }).populate('investorId', 'fullName');
        
        if (distributions.length === 0) {
          console.log(`⚠️ No approved profit distributions found for year ${financialYear.year}`);
          
          // تحديث الحالة إلى فشل
          financialYear.rolloverSettings.autoRolloverStatus = 'failed';
          await financialYear.save();
          continue;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        // تدوير الأرباح لكل مساهم
        for (const distribution of distributions) {
          try {
            await distribution.rolloverProfits(
              financialYear.rolloverSettings.rolloverPercentage
            );
            successCount++;
            console.log(`✅ Successfully rolled over profits for investor ${distribution.investorId.fullName}`);
          } catch (rolloverError) {
            failCount++;
            console.error(`❌ Error rolling over profits for investor ${distribution.investorId.fullName}:`, rolloverError.message);
          }
        }
        
        // تحديث حالة التدوير
        if (failCount === 0) {
          financialYear.rolloverSettings.autoRolloverStatus = 'completed';
          financialYear.rolloverSettings.enabled = true;
          console.log(`🎉 Successfully rolled over all profits for year ${financialYear.year}`);
        } else {
          financialYear.rolloverSettings.autoRolloverStatus = 'failed';
          console.log(`⚠️ Failed to rollover ${failCount} out of ${distributions.length} distributions for year ${financialYear.year}`);
        }
        
        await financialYear.save();
        
      } catch (yearError) {
        console.error(`❌ Error processing financial year ${financialYear.year}:`, yearError.message);
        
        // تحديث الحالة إلى فشل
        financialYear.rolloverSettings.autoRolloverStatus = 'failed';
        await financialYear.save();
      }
    }
    
    console.log('✅ Auto rollover check completed');
    
  } catch (error) {
    console.error('❌ Error in auto rollover task:', error);
  }
}, {
  scheduled: false // لا تبدأ تلقائياً
});

// Weekly task to cleanup old files (runs every Sunday at 3:00 AM)
const cleanupTask = cron.schedule('0 3 * * 0', async () => {
  console.log('🧹 Starting cleanup of old files...');
  
  try {
    cleanupOldExports();
    console.log('✅ Old files cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error in old files cleanup:', error);
  }
}, {
  scheduled: false
});

// Daily task to cleanup expired notifications (runs every day at 1:00 AM)
const cleanupNotificationsTask = cron.schedule('0 1 * * *', async () => {
  console.log('🔔 Starting cleanup of expired notifications...');
  
  try {
    const Notification = require('../models/Notification');
    const today = new Date();
    
    // حذف الإشعارات المنتهية الصلاحية
    const result = await Notification.deleteMany({
      expiresAt: { $lt: today }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} expired notification(s)`);
    
  } catch (error) {
    console.error('❌ Error in notifications cleanup:', error);
  }
}, {
  scheduled: false
});

// ✨ مجدول تحديث الأرباح (يعمل كل 30 دقيقة)
const updateProfitsTask = cron.schedule('*/30 * * * *', async () => {
  console.log('💰 بدء تحديث الأرباح التلقائي...');
  
  try {
    // البحث عن السنوات المالية النشطة
    const activeYears = await FinancialYear.find({
      status: 'calculated',
      startDate: { $lte: new Date() },
      endDate: { $gt: new Date() }
    });
    
    console.log(`🔍 تم العثور على ${activeYears.length} سنة مالية نشطة`);
    
    for (const year of activeYears) {
      try {
        console.log(`⚙️ معالجة السنة المالية ${year.year}...`);
        
        // استدعاء دالة حساب التوزيعات مباشرة
        const FinancialYearController = require('../controllers/financialYears');
        
        // إنشاء mock request و response للدالة
        const mockReq = {
          params: { id: year._id },
          body: { forceFullPeriod: false },
          user: { id: null } // النظام التلقائي
        };
        
        const mockRes = {
          status: () => mockRes,
          json: () => mockRes
        };
        
        const mockNext = (error) => {
          if (error) {
            console.error(`❌ فشل تحديث أرباح السنة ${year.year}:`, error.message);
          }
        };
        
        await FinancialYearController.calculateDistributions(mockReq, mockRes, mockNext);
        console.log(`✅ تم تحديث أرباح السنة ${year.year} بنجاح`);
        
      } catch (yearError) {
        console.error(`❌ خطأ في معالجة السنة ${year.year}:`, yearError.message);
      }
    }
    
    console.log('✅ اكتمل تحديث الأرباح التلقائي');
    
  } catch (error) {
    console.error('❌ خطأ في مهمة تحديث الأرباح:', error);
  }
}, {
  scheduled: true // ✅ تشغيل التحديث التلقائي
});

// Start all scheduled tasks
const startScheduler = () => {
  console.log('⏰ Starting scheduler system...');
  
  autoRolloverTask.start();
  cleanupTask.start();
  cleanupNotificationsTask.start();
  updateProfitsTask.start(); // ✨ تشغيل مجدول تحديث الأرباح
  
  console.log('✅ All scheduled tasks started successfully');
};

// Stop all scheduled tasks
const stopScheduler = () => {
  console.log('⏹️ Stopping scheduler system...');
  
  autoRolloverTask.stop();
  cleanupTask.stop();
  cleanupNotificationsTask.stop();
  updateProfitsTask.stop(); // ✨ إيقاف مجدول تحديث الأرباح
  
  console.log('✅ All scheduled tasks stopped successfully');
};

// Run auto rollover task manually
const runAutoRollover = async () => {
  console.log('🔄 Running auto rollover manually...');
  autoRolloverTask.fireOnTick();
};

// Run cleanup task manually
const runCleanup = async () => {
  console.log('🧹 Running cleanup manually...');
  cleanupTask.fireOnTick();
};

// ✨ تشغيل مهمة تحديث الأرباح يدوياً
const runProfitsUpdate = async () => {
  console.log('💰 تشغيل تحديث الأرباح يدوياً...');
  updateProfitsTask.fireOnTick();
};

module.exports = {
  startScheduler,
  stopScheduler,
  runAutoRollover,
  runCleanup,
  runProfitsUpdate, // ✨ تصدير الدالة الجديدة
  autoRolloverTask,
  cleanupTask,
  cleanupNotificationsTask,
  updateProfitsTask // ✨ تصدير المجدول الجديد
}; 