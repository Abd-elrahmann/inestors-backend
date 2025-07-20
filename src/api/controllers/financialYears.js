const FinancialYear = require('../../models/FinancialYear');
const YearlyProfitDistribution = require('../../models/YearlyProfitDistribution');
const Transaction = require('../../models/Transaction');
const Investor = require('../../models/Investor');
const ErrorResponse = require('../../utils/errorResponse');
const { success, error, getPaginationInfo } = require('../../utils/responseHandler');
const { createProfitNotifications } = require('./notifications');

const updateFinancialYearStatus = async (financialYear) => {
  try {
    const distributionStats = await YearlyProfitDistribution.aggregate([
      { $match: { financialYearId: financialYear._id } },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const totalDistributions = distributionStats.reduce((sum, stat) => sum + stat.count, 0);
    
    if (totalDistributions === 0) {
      return financialYear.status;
    }

    const statusMap = {};
    distributionStats.forEach(stat => {
      statusMap[stat._id] = stat.count;
    });

    let newStatus = financialYear.status;

    if (statusMap.distributed === totalDistributions) {
      newStatus = 'distributed';
    } else if (statusMap.approved === totalDistributions) {
      newStatus = 'approved';
    } else if (statusMap.calculated === totalDistributions) {
      newStatus = 'calculated';
    } else if (statusMap.calculated > 0 || statusMap.approved > 0 || statusMap.distributed > 0) {
      newStatus = 'calculated';
    }

    if (newStatus !== financialYear.status) {
      await FinancialYear.findByIdAndUpdate(financialYear._id, { 
        status: newStatus,
        updatedAt: new Date()
      });
    }

    return newStatus;
  } catch (error) {
    console.error('خطأ في تحديث حالة السنة المالية:', error);
    return financialYear.status;
  }
};

// @desc    Get all financial years
// @route   GET /api/financial-years
// @access  Private
exports.getFinancialYears = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-year', status } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const total = await FinancialYear.countDocuments(query);
    
    const { startIndex, pagination } = getPaginationInfo(page, limit, total);
    
    let financialYears = await FinancialYear.find(query)
      .populate('createdBy', 'fullName email')
      .sort(sort)
      .skip(startIndex)
      .limit(pagination.limit);

    const updatedYears = await Promise.all(
      financialYears.map(async (year) => {
        const updatedStatus = await updateFinancialYearStatus(year);
        return {
          ...year.toObject(),
          status: updatedStatus
        };
      })
    );
    
    return success(res, 200, 'السنوات المالية تم استرجاعها بنجاح', { 
      financialYears: updatedYears 
    }, pagination);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single financial year
// @route   GET /api/financial-years/:id
// @access  Private
exports.getFinancialYear = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate({
        path: 'profitDistributions',
        populate: {
          path: 'investorId',
          select: 'fullName nationalId'
        }
      });
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    return success(res, 200, 'السنة المالية تم استرجاعها بنجاح', { financialYear });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new financial year
// @route   POST /api/financial-years
// @access  Private/Admin
exports.createFinancialYear = async (req, res, next) => {
  try {     
    if (req.body.periodName) {
      const existingPeriod = await FinancialYear.findOne({ periodName: req.body.periodName });
      if (existingPeriod) {
        return error(res, 400, `الفترة المالية "${req.body.periodName}" موجودة بالفعل`);
      }
    }
    
    req.body.createdBy = req.user.id;
    
    const financialYear = await FinancialYear.create(req.body);
    
    return success(res, 201, 'السنة المالية تم إنشاؤها بنجاح', { financialYear });
  } catch (err) {
    next(err);
  }
};

// @desc    Update financial year
// @route   PUT /api/financial-years/:id
// @access  Private/Admin
exports.updateFinancialYear = async (req, res, next) => {
  try {
    let financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    if (financialYear.status === 'calculated' || financialYear.status === 'closed') {
      return error(res, 400, 'لا يمكن تعديل السنة المالية بعد حساب الأرباح');
    }
    
    financialYear = await FinancialYear.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    return success(res, 200, 'السنة المالية تم تحديثها بنجاح', { financialYear });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete financial year
// @route   DELETE /api/financial-years/:id
// @access  Private/Admin
exports.deleteFinancialYear = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    const distributions = await YearlyProfitDistribution.countDocuments({ 
      financialYearId: req.params.id 
    });
    
    if (distributions > 0) {
      return error(res, 400, 'لا يمكن حذف السنة المالية لوجود توزيعات أرباح مرتبطة بها');
    }
    
    await financialYear.deleteOne();
    
    return success(res, 200, 'السنة المالية تم حذفها بنجاح');
  } catch (err) {
    next(err);
  }
};

// @desc    Calculate profit distributions for financial year
// @route   POST /api/financial-years/:id/calculate-distributions
// @access  Private/Admin
exports.calculateDistributions = async (req, res, next) => {

  
  try {
    const { forceFullPeriod = false } = req.body;
    
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    if (financialYear.status === 'closed') {
      return error(res, 400, 'لا يمكن إعادة حساب توزيعات الأرباح للسنة المالية المغلقة');
    }

    const now = new Date();
    const startDate = new Date(financialYear.startDate);
    const endDate = new Date(financialYear.endDate);
    
    let actualElapsedDays;
    let calculationMessage;
    
    if (forceFullPeriod) {
      actualElapsedDays = Math.floor(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      calculationMessage = `تم الحساب للفترة الكاملة: ${actualElapsedDays} يوم`;
    } else if (now >= endDate) {
      actualElapsedDays = Math.floor(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      calculationMessage = `السنة المالية انتهت - تم الحساب للفترة الكاملة: ${actualElapsedDays} يوم`;
    } else if (now >= startDate) {
      const diffTime = Math.abs(now - startDate);
      actualElapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      calculationMessage = actualElapsedDays === 1 ? 
        'السنة المالية بدأت اليوم - تم الحساب ليوم واحد' :
        `السنة المالية نشطة - تم الحساب للأيام المنقضية: ${actualElapsedDays} من ${financialYear.totalDays} يوم`;
    } else {
      return error(res, 400, 'السنة المالية لم تبدأ بعد، لا يمكن حساب الأرباح');
    }



    const investors = await Investor.find({ isActive: true });
    
    if (investors.length === 0) {
      return error(res, 400, 'لا يوجد مساهمين نشطين لحساب الأرباح');
    }

    const existingDistributions = await YearlyProfitDistribution.find({ 
      financialYearId: req.params.id 
    }).select('investorId status');

    const investorsWithApprovedDistributions = existingDistributions
      .filter(dist => dist.status === 'approved' || dist.status === 'distributed')
      .map(dist => dist.investorId.toString());

    const investorsWithoutDistributions = investors.filter(investor => 
      !existingDistributions.some(dist => dist.investorId.toString() === investor._id.toString())
    );

    const investorsWithPendingDistributions = investors.filter(investor => 
      existingDistributions.some(dist => 
        dist.investorId.toString() === investor._id.toString() && 
        dist.status !== 'approved' && 
        dist.status !== 'distributed'
      )
    );

    if (investorsWithApprovedDistributions.length > 0 && investorsWithoutDistributions.length === 0) {
      const existingDistributionsData = await YearlyProfitDistribution.find({ 
        financialYearId: req.params.id 
      }).populate('investorId', 'fullName nationalId startDate');

      return success(res, 200, 'التوزيعات موافق عليها - عرض للاطلاع فقط', {
        financialYear,
        distributions: existingDistributionsData,
        summary: {
          totalApprovedInvestors: investorsWithApprovedDistributions.length,
          message: 'هذه التوزيعات موافق عليها ولا يمكن تعديلها. يمكنك الاطلاع على التفاصيل فقط.',
          status: 'approved'
        }
      });
    }

    if (existingDistributions.length > 0) {
      await YearlyProfitDistribution.deleteMany({ 
        financialYearId: req.params.id,
        status: { $nin: ['approved', 'distributed'] }
      });
    }

    const investorsToProcess = [...investorsWithoutDistributions, ...investorsWithPendingDistributions];
    
    let totalInvestedCapital = 0;
    
    for (const investor of investors) {
      let currentAmount = investor.amountContributed || 0;
      totalInvestedCapital += currentAmount;
    }
    
    const totalDays = financialYear.totalDaysCalculated || (Math.floor((new Date(financialYear.endDate) - new Date(financialYear.startDate)) / (1000 * 60 * 60 * 24)) + 1);
    const dailyProfitRatePerUnit = totalInvestedCapital > 0 && totalDays > 0 ? 
      (financialYear.totalProfit / totalInvestedCapital) / totalDays : 0;
    
    financialYear.dailyProfitRate = Number(dailyProfitRatePerUnit.toFixed(6));
    

    
    const distributions = [];
    let totalCalculatedProfit = 0;

    for (const investor of investorsToProcess) {
      
      
      let currentAmount = investor.amountContributed || 0;
      
      const investorStartDate = new Date(investor.startDate);
      const financialYearStartDate = new Date(financialYear.startDate);
      const financialYearEndDate = new Date(financialYear.endDate);
      
      
      
        const effectiveStartDate = investorStartDate > financialYearStartDate ? investorStartDate : financialYearStartDate;
      
      let effectiveEndDate;
      if (forceFullPeriod || now >= financialYearEndDate) {
        effectiveEndDate = financialYearEndDate;
      } else {
        effectiveEndDate = now;
      }
      
      
      
      let investorDays = 0;
      if (effectiveEndDate >= effectiveStartDate) {
        const startUTC = new Date(Date.UTC(
          effectiveStartDate.getFullYear(),
          effectiveStartDate.getMonth(),
          effectiveStartDate.getDate(),
          0, 0, 0, 0
        ));
        
        const endUTC = new Date(Date.UTC(
          effectiveEndDate.getFullYear(),
          effectiveEndDate.getMonth(),
          effectiveEndDate.getDate(),
          0, 0, 0, 0
        ));
        
        
        
        const diffTime = Math.abs(endUTC - startUTC);
        investorDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (investorDays === 0 || startUTC.getTime() === endUTC.getTime()) {
          
          investorDays = 1;
        } else {
          investorDays += 1;
          
        }
      }
      
      
      
      const investorShare = currentAmount / totalInvestedCapital;
      
      let investorProfit = 0;
      if (forceFullPeriod || now >= financialYearEndDate) {
        investorProfit = investorShare * financialYear.totalProfit;
        
      } else {
        if (investorDays > 0) {
          investorProfit = currentAmount * investorDays * dailyProfitRatePerUnit;

        }
      }
      
      investorProfit = Number(investorProfit.toFixed(3));
      
      
      
      const profitDistribution = {
        financialYearId: financialYear._id,
        investorId: investor._id,
        startDate: effectiveStartDate,
        calculation: {
          investmentAmount: currentAmount,
          totalDays: investorDays,
          dailyProfitRate: dailyProfitRatePerUnit,
          calculatedProfit: investorProfit
        },
        currency: investor.currency || financialYear.currency,
        status: 'calculated',
        createdBy: req.user?._id || req.user?.id
      };
      
      
      
      try {
        const createdDistribution = await YearlyProfitDistribution.create(profitDistribution);
        
      } catch (createError) {
        
        throw createError;
      }
      
      distributions.push({
        investor: {
          _id: investor._id,
          fullName: investor.fullName,
          startDate: investor.startDate
        },
        financialYear: financialYear._id,
        investmentAmount: currentAmount,
        days: investorDays,
        dailyRate: dailyProfitRatePerUnit,
        calculatedProfit: investorProfit,
        status: 'calculated',
        currency: investor.currency || financialYear.currency
      });
      totalCalculatedProfit += investorProfit;
    }

    if (financialYear.status !== 'approved' && financialYear.status !== 'distributed') {
      financialYear.status = 'calculated';
      await financialYear.save();
    }
    
    const profitDifference = Math.abs(financialYear.totalProfit - totalCalculatedProfit);
    const tolerance = 0.01; 
    

    if (profitDifference > tolerance) {
      
    } else {
      
    }
    
    try {
      await createProfitNotifications('profit_calculated', financialYear, distributions, req.user._id || req.user.id);
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }
    
    const successMessage = investorsWithoutDistributions.length > 0 ? 
      'تم حساب توزيعات الأرباح للمساهمين الجدد بنجاح' : 
      'تم إعادة حساب توزيعات الأرباح للمساهمين المعلقين بنجاح';
    
    return success(res, 200, successMessage, {
      financialYear,
      distributions,
      summary: {
        totalNewInvestors: investorsWithoutDistributions.length,
        totalPendingInvestors: investorsWithPendingDistributions.length,
        totalApprovedInvestors: investorsWithApprovedDistributions.length,
        totalCalculatedProfit: Math.round(totalCalculatedProfit * 100) / 100,
        originalProfit: financialYear.totalProfit,
        profitDifference: Math.round(profitDifference * 100) / 100,
        dailyProfitRate: dailyProfitRatePerUnit,
        elapsedDays: actualElapsedDays, 
        totalDaysInYear: totalDays, 
        calculationMessage: calculationMessage, 
        calculationMethod: forceFullPeriod || now >= endDate ? 
          'الفترة الكاملة: ربح المساهم = نسبة المشاركة × إجمالي الربح' :
          'الأيام الجزئية: ربح المساهم = مبلغ المساهمة × عدد الأيام × معدل الربح اليومي'
      }
    });
  } catch (err) {
    
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return error(res, 400, `خطأ في التحقق من البيانات: ${validationErrors.join(', ')}`);
    }
    
    if (err.name === 'CastError') {
      return error(res, 400, 'معرف غير صحيح');
    }
    
    next(err);
  }
};

// @desc    Get profit distributions for financial year
// @route   GET /api/financial-years/:id/distributions
// @access  Private
exports.getDistributions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-calculation.calculatedProfit' } = req.query;
    
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    const total = await YearlyProfitDistribution.countDocuments({
      financialYearId: req.params.id
    });
    
    const { startIndex, pagination } = getPaginationInfo(page, limit, total);
    
    const distributions = await YearlyProfitDistribution.find({
      financialYearId: req.params.id
    })
    .populate('investorId', 'fullName nationalId startDate')
    .populate('createdBy', 'fullName')
    .populate('approvedBy', 'fullName')
    .sort(sort)
    .skip(startIndex)
    .limit(pagination.limit);

    const totalInvestors = distributions.length;
    const totalCalculatedProfit = distributions.reduce((sum, dist) => sum + (dist.calculation?.calculatedProfit || 0), 0);
    const totalDays = distributions.reduce((sum, dist) => sum + (dist.calculation?.totalDays || 0), 0);
    const averageProfit = totalInvestors > 0 ? totalCalculatedProfit / totalInvestors : 0;
    
    return success(res, 200, 'توزيعات الأرباح تم استرجاعها بنجاح', {
      financialYear,
      distributions,
      summary: {
        totalInvestors,
        totalCalculatedProfit,
        totalDays,
        averageProfit,
        dailyProfitRate: financialYear.dailyProfitRate
      }
    }, pagination);
  } catch (err) {
    next(err);
  }
};

// @desc    Approve profit distributions
// @route   PUT /api/financial-years/:id/approve-distributions
// @access  Private/Admin
exports.approveDistributions = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    if (financialYear.status !== 'calculated') {
      return error(res, 400, 'يجب حساب توزيعات الأرباح أولاً');
    }

    const result = await YearlyProfitDistribution.updateMany(
      { 
        financialYearId: req.params.id,
        status: 'calculated'
      },
      { 
        status: 'approved',
        approvedBy: req.user.id,
        distributionDate: new Date()
      }
    );
    
    
    financialYear.status = 'approved';
    financialYear.approvedBy = req.user.id;
    financialYear.approvedAt = new Date();
    await financialYear.save();
    
    
    const distributions = await YearlyProfitDistribution.find({
      financialYearId: req.params.id,
      status: 'approved'
    });
    
    
    try {
      await createProfitNotifications('profit_approved', financialYear, distributions, req.user.id);
    } catch (notificationError) {
      
    }
    
    return success(res, 200, 'تم الموافقة على توزيعات الأرباح بنجاح', {
      approvedCount: result.modifiedCount,
      financialYear
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Rollover profits to next year
// @route   POST /api/financial-years/:id/rollover-profits
// @access  Private/Admin
exports.rolloverProfits = async (req, res, next) => {
  try {
    const { percentage = 100 } = req.body;
    
    if (percentage < 0 || percentage > 100) {
      return error(res, 400, 'نسبة الترحيل يجب أن تكون بين 0 و 100');
    }
    
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    
    const distributions = await YearlyProfitDistribution.find({
      financialYearId: req.params.id,
      status: 'approved'
    }).populate('investorId', 'fullName');
    
    if (distributions.length === 0) {
      return error(res, 400, 'لا توجد توزيعات أرباح موافق عليها للترحيل');
    }
    
    const rolloverResults = [];
    
    
    for (const distribution of distributions) {
      try {
        const result = await distribution.rolloverProfits(percentage);
        rolloverResults.push({
          investor: distribution.investorId.fullName,
          originalProfit: distribution.calculation.calculatedProfit,
          rolloverAmount: result.rolloverAmount,
          transaction: result.transaction
        });
        
        
        distribution.status = 'distributed';
        distribution.distributedAt = new Date();
        await distribution.save();
      } catch (rolloverError) {

      }
    }
    
    
    financialYear.status = 'distributed';
    financialYear.rolloverSettings.enabled = true;
    financialYear.rolloverSettings.rolloverPercentage = percentage;
    financialYear.distributedAt = new Date();
    await financialYear.save();
    
    return success(res, 200, 'تم تدوير الأرباح بنجاح', {
      rolloverPercentage: percentage,
      totalRolledOver: rolloverResults.length,
      rolloverResults
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Distribute profits without rollover
// @route   POST /api/financial-years/:id/distribute-profits
// @access  Private/Admin
exports.distributeProfits = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    if (financialYear.status !== 'approved') {
      return error(res, 400, 'يجب الموافقة على التوزيعات أولاً');
    }
    
    
    const result = await YearlyProfitDistribution.updateMany(
      { 
        financialYearId: req.params.id,
        status: 'approved'
      },
      { 
        status: 'distributed',
        distributionDate: new Date(),
        distributedBy: req.user.id
      }
    );
    
    
    financialYear.status = 'distributed';
    financialYear.distributedAt = new Date();
    financialYear.distributedBy = req.user.id;
    await financialYear.save();
    
    return success(res, 200, 'تم توزيع الأرباح بنجاح', {
      distributedCount: result.modifiedCount,
      financialYear
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Close financial year
// @route   PUT /api/financial-years/:id/close
// @access  Private/Admin
exports.closeFinancialYear = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    if (financialYear.status === 'closed') {
      return error(res, 400, 'السنة المالية مغلقة بالفعل');
    }
    
    
    const pendingDistributions = await YearlyProfitDistribution.countDocuments({
      financialYearId: req.params.id,
      status: { $ne: 'approved' }
    });
    
    if (pendingDistributions > 0) {
      return error(res, 400, 'يجب الموافقة على جميع توزيعات الأرباح قبل إغلاق السنة المالية');
    }
    
    financialYear.status = 'closed';
    await financialYear.save();
    
    return success(res, 200, 'تم إغلاق السنة المالية بنجاح', { financialYear });
  } catch (err) {
    next(err);
  }
};

// @desc    Get financial year summary
// @route   GET /api/financial-years/:id/summary
// @access  Private
exports.getFinancialYearSummary = async (req, res, next) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    

    const distributionStats = await YearlyProfitDistribution.aggregate([
      { $match: { financialYearId: financialYear._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalProfit: { $sum: '$calculation.calculatedProfit' },
          totalDays: { $sum: '$calculation.totalDays' },
          avgProfit: { $avg: '$calculation.calculatedProfit' }
        }
      }
    ]);
    
    
    const totalStats = await YearlyProfitDistribution.aggregate([
      { $match: { financialYearId: financialYear._id } },
      {
        $group: {
          _id: null,
          totalInvestors: { $sum: 1 },
          totalDistributedProfit: { $sum: '$calculation.calculatedProfit' },
          maxProfit: { $max: '$calculation.calculatedProfit' },
          minProfit: { $min: '$calculation.calculatedProfit' },
          avgProfit: { $avg: '$calculation.calculatedProfit' }
        }
      }
    ]);
    
    const summary = {
      financialYear,
      distributionStats,
      totalStats: totalStats[0] || {},
      profitEfficiency: totalStats[0] ? 
        (totalStats[0].totalDistributedProfit / financialYear.totalProfit * 100).toFixed(2) + '%' : '0%'
    };
    
    return success(res, 200, 'ملخص السنة المالية تم استرجاعه بنجاح', summary);
  } catch (err) {
    next(err);
  }
};

// @desc    Enable/disable auto rollover for financial year
// @route   PUT /api/financial-years/:id/auto-rollover
// @access  Private/Admin
exports.toggleAutoRollover = async (req, res, next) => {
  try {
    const { autoRollover, rolloverPercentage = 100, autoRolloverDate } = req.body;
    
    const financialYear = await FinancialYear.findById(req.params.id);
    
    if (!financialYear) {
      return error(res, 404, `السنة المالية غير موجودة برقم ${req.params.id}`);
    }
    
    
    financialYear.rolloverSettings.autoRollover = autoRollover;
    financialYear.rolloverSettings.rolloverPercentage = rolloverPercentage;
    
    if (autoRolloverDate) {
      financialYear.rolloverSettings.autoRolloverDate = new Date(autoRolloverDate);
    }
    
    await financialYear.save();
    
    return success(res, 200, 'تم تحديث إعدادات التدوير التلقائي بنجاح', { 
      financialYear,
      message: autoRollover ? 'تم تفعيل التدوير التلقائي' : 'تم إلغاء التدوير التلقائي'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Execute auto rollover for all eligible financial years
// @route   POST /api/financial-years/execute-auto-rollover
// @access  Private/Admin
exports.executeAutoRollover = async (req, res, next) => {
  try {
    const today = new Date();
    
    
    const eligibleYears = await FinancialYear.find({
      'rolloverSettings.autoRollover': true,
      'rolloverSettings.autoRolloverDate': { $lte: today },
      'rolloverSettings.autoRolloverStatus': 'pending',
      status: 'calculated'
    });
    
    if (eligibleYears.length === 0) {
      return success(res, 200, 'لا توجد سنوات مالية مؤهلة للتدوير التلقائي', {
        processedYears: 0
      });
    }
    
    const results = [];
    
    for (const financialYear of eligibleYears) {
      try {
        
        const distributions = await YearlyProfitDistribution.find({
          financialYearId: financialYear._id,
          status: 'approved'
        }).populate('investorId', 'fullName');
        
        if (distributions.length === 0) {
          
          financialYear.rolloverSettings.autoRolloverStatus = 'failed';
          await financialYear.save();
          
          results.push({
            year: financialYear.year,
            status: 'failed',
            reason: 'لا توجد توزيعات أرباح موافق عليها'
          });
          continue;
        }
        
        const rolloverResults = [];
        
        
        for (const distribution of distributions) {
          try {
            const result = await distribution.rolloverProfits(
              financialYear.rolloverSettings.rolloverPercentage
            );
            rolloverResults.push({
              investor: distribution.investorId.fullName,
              originalProfit: distribution.calculation.calculatedProfit,
              rolloverAmount: result.rolloverAmount,
              transaction: result.transaction
            });
          } catch (rolloverError) {
            
          }
        }
        
        
        financialYear.rolloverSettings.autoRolloverStatus = 'completed';
        financialYear.rolloverSettings.enabled = true;
        await financialYear.save();
        
        results.push({
          year: financialYear.year,
          status: 'completed',
          rolloverPercentage: financialYear.rolloverSettings.rolloverPercentage,
          totalInvestors: rolloverResults.length,
          rolloverResults
        });
        
      } catch (yearError) {
        
        

        financialYear.rolloverSettings.autoRolloverStatus = 'failed';
        await financialYear.save();
        
        results.push({
          year: financialYear.year,
          status: 'failed',
          reason: yearError.message
        });
      }
    }
    
    return success(res, 200, 'تم تنفيذ التدوير التلقائي بنجاح', {
      processedYears: results.length,
      results
    });
  } catch (err) {
    next(err);
  }
}; 