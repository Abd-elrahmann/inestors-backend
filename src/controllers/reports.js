const Investor = require('../models/Investor');
const FinancialYear = require('../models/FinancialYear');
const YearlyProfitDistribution = require('../models/YearlyProfitDistribution');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');
const { success, error } = require('../utils/responseHandler');
const { 
  exportProfitDistributionToPDF, 
  exportProfitDistributionToExcel,
  exportInvestorReportToPDF,
  cleanupOldExports 
} = require('../utils/reportExporter');

// @desc    Get investor list report
// @route   GET /api/reports/investors
// @access  Private
exports.getInvestorListReport = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Get all investors
    const investors = await Investor.find(query).sort({ fullName: 1 });
    
    // Calculate total contribution
    const totalContribution = investors.reduce((sum, investor) => sum + investor.amountContributed, 0);
    
    // Format data for report
    const reportData = await Promise.all(investors.map(async (investor) => {
      const balance = await investor.getCurrentBalance();
      
      return {
        id: investor._id,
        fullName: investor.fullName,
        nationalId: investor.nationalId,
        amountContributed: investor.amountContributed,
        sharePercentage: investor.sharePercentage,
        startDate: investor.startDate,
        isActive: investor.isActive,
        currentBalance: balance
      };
    }));
    
    return success(res, 200, 'Investor list report generated successfully', {
      reportName: 'rpt_InvestorList',
      generatedAt: new Date(),
      totalInvestors: investors.length,
      totalContribution,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get profit distribution report
// @route   GET /api/reports/profits
// @access  Private
exports.getProfitDistributionReport = async (req, res, next) => {
  try {
    const { year, quarter } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by year if provided
    if (year) {
      query.profitYear = parseInt(year);
    }
    
    // Filter by quarter if provided
    if (quarter) {
      query.quarter = parseInt(quarter);
    }
    
    // Get financial years (replacing old profit system)
    const financialYears = await FinancialYear.find(query.profitYear ? { year: query.profitYear } : {}).sort({ year: -1 });
    
    // Format data for report
    const reportData = await Promise.all(financialYears.map(async (financialYear) => {
      // Get distributions for this financial year
      const distributions = await YearlyProfitDistribution.find({ 
        financialYearId: financialYear._id 
      }).populate('investorId', 'fullName nationalId');
      
      // Calculate distribution stats
      const totalDistributed = distributions.reduce((sum, dist) => sum + dist.calculation.calculatedProfit, 0);
      const distributionCount = distributions.length;
      
      return {
        id: financialYear._id,
        profitYear: financialYear.year,
        totalProfit: financialYear.totalProfit,
        currency: financialYear.currency,
        startDate: financialYear.startDate,
        endDate: financialYear.endDate,
        status: financialYear.status,
        distributionCount,
        totalDistributed,
        dailyProfitRate: financialYear.dailyProfitRate,
        distributions: distributions.map(dist => ({
          id: dist._id,
          investorName: dist.investorId.fullName,
          nationalId: dist.investorId.nationalId,
          investmentAmount: dist.calculation.investmentAmount,
          totalDays: dist.calculation.totalDays,
          calculatedProfit: dist.calculation.calculatedProfit,
          status: dist.status
        }))
      };
    }));
    
    // Calculate totals
    const totalProfit = financialYears.reduce((sum, fy) => sum + fy.totalProfit, 0);
    const totalDistributed = reportData.reduce((sum, data) => sum + data.totalDistributed, 0);
    
    return success(res, 200, 'تم إنشاء تقرير توزيع الأرباح بنجاح', {
      reportName: 'rpt_FinancialYearDistribution',
      generatedAt: new Date(),
      totalRecords: financialYears.length,
      totalProfit,
      totalDistributed,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get transactions report
// @route   GET /api/reports/transactions
// @access  Private
exports.getTransactionsReport = async (req, res, next) => {
  try {
    const { investorId, startDate, endDate, type } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by investor if provided
    if (investorId) {
      query.investorId = investorId;
    }
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.transactionDate = {};
      
      if (startDate) {
        query.transactionDate.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.transactionDate.$lte = new Date(endDate);
      }
    }
    
    // Get transactions
    const transactions = await Transaction.find(query)
      .populate('investorId', 'fullName nationalId')
      .sort({ transactionDate: -1 });
    
    // Calculate totals by type
    const totals = {
      deposit: 0,
      withdrawal: 0,
      profit: 0,
      fee: 0,
      transfer: 0
    };
    
    transactions.forEach(transaction => {
      if (totals[transaction.type] !== undefined) {
        totals[transaction.type] += transaction.amount;
      }
    });
    
    // Format data for report
    const reportData = transactions.map(transaction => ({
      id: transaction._id,
      investorName: transaction.investorId.fullName,
      nationalId: transaction.investorId.nationalId,
      type: transaction.type,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      reference: transaction.reference,
      notes: transaction.notes,
      receiptNumber: transaction.receiptNumber
    }));
    
    return success(res, 200, 'Transactions report generated successfully', {
      reportName: 'rpt_Transactions',
      generatedAt: new Date(),
      totalTransactions: transactions.length,
      totals,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get investor summary report
// @route   GET /api/reports/investor-summary/:id
// @access  Private
exports.getInvestorSummaryReport = async (req, res, next) => {
  try {
    const { year } = req.query;
    const investorId = req.params.id;
    
    // Check if investor exists
    const investor = await Investor.findById(investorId);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${investorId}`);
    }
    
    // Build transaction query
    const transactionQuery = {
      investorId
    };
    
    // Build profit distribution query
    const profitQuery = {
      investorId
    };
    
    // Filter by year if provided
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      
      transactionQuery.transactionDate = {
        $gte: startDate,
        $lte: endDate
      };
      
      const financialYears = await FinancialYear.find({ year: parseInt(year) });
      if (financialYears.length > 0) {
        profitQuery.financialYearId = { $in: financialYears.map(fy => fy._id) };
      }
    }
    
    // Get transactions
    const transactions = await Transaction.find(transactionQuery).sort({ transactionDate: -1 });
    
    // Get profit distributions (using new system)
    const profitDistributions = await YearlyProfitDistribution.find(profitQuery)
      .populate({
        path: 'financialYearId',
        select: 'year totalProfit startDate endDate'
      })
      .sort({ 'financialYearId.year': -1 });
    
    // Calculate totals
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
    const profits = profitDistributions.reduce((sum, pd) => sum + pd.calculation.calculatedProfit, 0);
    const currentBalance = investor.amountContributed + deposits - withdrawals + profits;
    
    // Calculate share percentage
    const totalContributions = await Investor.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$amountContributed' } } }
    ]);
    
    const sharePercentage = totalContributions.length > 0 
      ? (investor.amountContributed / totalContributions[0].total) * 100
      : 0;
    
    // Format transactions for report
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      reference: transaction.reference,
      notes: transaction.notes,
      receiptNumber: transaction.receiptNumber
    }));
    
    // Format profit distributions for report
    const formattedProfits = profitDistributions.map(dist => ({
      id: dist._id,
      profitYear: dist.financialYearId?.year, // استخدام السنة المالية الصحيحة
      totalFinancialYearProfit: dist.financialYearId?.totalProfit, // إجمالي ربح السنة المالية
      investmentAmount: dist.calculation?.investmentAmount, // مبلغ الاستثمار
      totalDays: dist.calculation?.totalDays, // عدد الأيام
      calculatedProfit: dist.calculation?.calculatedProfit, // الربح المحسوب
      dailyProfitRate: dist.calculation?.dailyProfitRate, // معدل الربح اليومي
      distributionDate: dist.distributedAt, // تاريخ التوزيع
      status: dist.status,
      currency: dist.currency
    }));
    
    return success(res, 200, 'Investor summary report generated successfully', {
      reportName: 'rpt_InvestorSummary',
      generatedAt: new Date(),
      investor: {
        id: investor._id,
        fullName: investor.fullName,
        nationalId: investor.nationalId,
        amountContributed: investor.amountContributed,
        sharePercentage,
        startDate: investor.startDate,
        isActive: investor.isActive
      },
      summary: {
        year: year || 'All Time',
        amountContributed: investor.amountContributed,
        totalDeposits: deposits,
        totalWithdrawals: withdrawals,
        totalProfits: profits,
        currentBalance
      },
      transactions: formattedTransactions,
      profits: formattedProfits
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export financial year profit distribution to PDF
// @route   GET /api/reports/financial-years/:id/export/pdf
// @access  Private
exports.exportFinancialYearToPDF = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    // الحصول على توزيعات الأرباح
    const distributions = await YearlyProfitDistribution.find({
      financialYearId: req.params.id
    }).populate('investorId', 'fullName nationalId');
    
    if (distributions.length === 0) {
      return error(res, 400, 'لا توجد توزيعات أرباح لتصديرها');
    }
    
    // تصدير التقرير
    const { fileName, filePath } = await exportProfitDistributionToPDF(financialYear, distributions);
    
    // إرسال الملف
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('خطأ في إرسال الملف:', err);
        return error(res, 500, 'خطأ في تحميل الملف');
      }
    });
    
  } catch (err) {
    next(err);
  }
};

// @desc    Export financial year profit distribution to Excel
// @route   GET /api/reports/financial-years/:id/export/excel
// @access  Private
exports.exportFinancialYearToExcel = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    // الحصول على توزيعات الأرباح
    const distributions = await YearlyProfitDistribution.find({
      financialYearId: req.params.id
    }).populate('investorId', 'fullName nationalId');
    
    if (distributions.length === 0) {
      return error(res, 400, 'لا توجد توزيعات أرباح لتصديرها');
    }
    
    // تصدير التقرير
    const { fileName, filePath } = await exportProfitDistributionToExcel(financialYear, distributions);
    
    // إرسال الملف
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('خطأ في إرسال الملف:', err);
        return error(res, 500, 'خطأ في تحميل الملف');
      }
    });
    
  } catch (err) {
    next(err);
  }
};

// @desc    Export investor summary report to PDF
// @route   GET /api/reports/investors/:id/export/pdf
// @access  Private
exports.exportInvestorSummaryToPDF = async (req, res, next) => {
  try {
    const { year } = req.query;
    const investorId = req.params.id;
    
    // التحقق من وجود المساهم
    const investor = await Investor.findById(investorId);
    
    if (!investor) {
      return error(res, 404, `المساهم غير موجود برقم ${investorId}`);
    }
    
    // بناء استعلام المعاملات
    const transactionQuery = { investorId };
    
    // تصفية حسب السنة إذا تم تحديدها
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      
      transactionQuery.transactionDate = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // الحصول على المعاملات
    const transactions = await Transaction.find(transactionQuery).sort({ transactionDate: -1 });
    
    // الحصول على توزيعات الأرباح
    const profitQuery = { investorId };
    if (year) {
      const financialYears = await FinancialYear.find({ year: parseInt(year) });
      if (financialYears.length > 0) {
        profitQuery.financialYearId = { $in: financialYears.map(fy => fy._id) };
      }
    }
    
    const profitDistributions = await YearlyProfitDistribution.find(profitQuery)
      .populate('financialYearId', 'year totalProfit');
    
    // حساب الملخص
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
    const profits = profitDistributions.reduce((sum, pd) => sum + pd.calculation.calculatedProfit, 0);
    const currentBalance = investor.amountContributed + deposits - withdrawals + profits;
    
    const summary = {
      year: year || 'جميع السنوات',
      amountContributed: investor.amountContributed,
      totalDeposits: deposits,
      totalWithdrawals: withdrawals,
      totalProfits: profits,
      currentBalance
    };
    
    // تصدير التقرير
    const { fileName, filePath } = await exportInvestorReportToPDF(investor, transactions, profitDistributions, summary);
    
    // إرسال الملف
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('خطأ في إرسال الملف:', err);
        return error(res, 500, 'خطأ في تحميل الملف');
      }
    });
    
  } catch (err) {
    next(err);
  }
};

// @desc    Clean up old export files
// @route   POST /api/reports/cleanup
// @access  Private/Admin
exports.cleanupExports = async (req, res, next) => {
  try {
    cleanupOldExports();
    
    return success(res, 200, 'تم تنظيف الملفات القديمة بنجاح');
  } catch (err) {
    next(err);
  }
}; 