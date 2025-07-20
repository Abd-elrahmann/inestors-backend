const cron = require('node-cron');
const FinancialYear = require('../models/FinancialYear');
const YearlyProfitDistribution = require('../models/YearlyProfitDistribution');
const { cleanupOldExports } = require('../services/reportExporter');

const autoRolloverTask = cron.schedule('0 2 * * *', async () => {

  try {
    const today = new Date();
    
    const eligibleYears = await FinancialYear.find({
      'rolloverSettings.autoRollover': true,
      'rolloverSettings.autoRolloverDate': { $lte: today },
      'rolloverSettings.autoRolloverStatus': 'pending',
      status: 'calculated'
    });
    
    
    for (const financialYear of eligibleYears) {
      try {
        
        const distributions = await YearlyProfitDistribution.find({
          financialYearId: financialYear._id,
          status: 'approved'
        }).populate('investorId', 'fullName');
        
        if (distributions.length === 0) {
          
          financialYear.rolloverSettings.autoRolloverStatus = 'failed';
          await financialYear.save();
          continue;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (const distribution of distributions) {
          try {
            await distribution.rolloverProfits(
              financialYear.rolloverSettings.rolloverPercentage
            );
            successCount++;
          } catch (rolloverError) {
            failCount++;
          }
        }
        
        if (failCount === 0) {
          financialYear.rolloverSettings.autoRolloverStatus = 'completed';
          financialYear.rolloverSettings.enabled = true;
        } else {
          financialYear.rolloverSettings.autoRolloverStatus = 'failed';
        }
        
        await financialYear.save();
        
      } catch (yearError) {
        
        financialYear.rolloverSettings.autoRolloverStatus = 'failed';
        await financialYear.save();
      }
    }
    
    
  } catch (error) {
  }
}, {
    scheduled: false 
});

const cleanupTask = cron.schedule('0 3 * * 0', async () => {
  
  try {
    cleanupOldExports();
  } catch (error) {
  }
}, {
  scheduled: false
});

const cleanupNotificationsTask = cron.schedule('0 1 * * *', async () => {
  
  try {
    const Notification = require('../models/Notification');
    const today = new Date();
    
    // حذف الإشعارات المنتهية الصلاحية
    const result = await Notification.deleteMany({
      expiresAt: { $lt: today }
    });
    
    
  } catch (error) {
  }
}, {
  scheduled: false
});

const updateProfitsTask = cron.schedule('*/30 * * * *', async () => {
  
  try {
    const activeYears = await FinancialYear.find({
      status: 'calculated',
      startDate: { $lte: new Date() },
      endDate: { $gt: new Date() }
    });
    
    
    for (const year of activeYears) {
      try {
        
        const FinancialYearController = require('../api/controllers/financialYears');
        
        const mockReq = {
          params: { id: year._id },
          body: { forceFullPeriod: false },
          user: { id: null } 
        };
        
        const mockRes = {
          status: () => mockRes,
          json: () => mockRes
        };
        
        const mockNext = (error) => {
          if (error) {
          }
        };
        
        await FinancialYearController.calculateDistributions(mockReq, mockRes, mockNext);

      } catch (yearError) {
      }
    }
    
    
  } catch (error) {
  }
}, {
  scheduled: true 
});

const startScheduler = () => {
  
  autoRolloverTask.start();
  cleanupTask.start();
  cleanupNotificationsTask.start();
  updateProfitsTask.start(); 
  
};

// Stop all scheduled tasks
const stopScheduler = () => {
  
  autoRolloverTask.stop();
  cleanupTask.stop();
  cleanupNotificationsTask.stop();
  updateProfitsTask.stop(); 
  
};

// Run auto rollover task manually
const runAutoRollover = async () => {
  autoRolloverTask.fireOnTick();
};

// Run cleanup task manually
const runCleanup = async () => {
  cleanupTask.fireOnTick();
};

const runProfitsUpdate = async () => {
  updateProfitsTask.fireOnTick();
};

module.exports = {
  startScheduler,
  stopScheduler,
  runAutoRollover,
  runCleanup,
  runProfitsUpdate, 
  autoRolloverTask,
  cleanupTask,
  cleanupNotificationsTask,
  updateProfitsTask 
}; 