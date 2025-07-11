const Investor = require('../../models/Investor');
const Transaction = require('../../models/Transaction');
const YearlyProfitDistribution = require('../../models/YearlyProfitDistribution');
const ErrorResponse = require('../../utils/errorResponse');
const { success, error, getPaginationInfo } = require('../../utils/responseHandler');
const fs = require('fs');
const path = require('path');

// @desc    Get all investors
// @route   GET /api/investors
// @access  Private
exports.getInvestors = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, sort = 'fullName', isActive, search, includeInactive } = req.query;
    
    // تحسين الأداء: تحديد الحد الأقصى للـ limit
    const maxLimit = Math.min(parseInt(limit), 100);
    
    // Build query
    const query = {};
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else if (includeInactive !== 'true') {
      // إذا لم يطلب صراحة includeInactive، أظهر النشطين فقط افتراضياً
      query.isActive = true;
    }
    // إذا كان includeInactive=true، لن نضيف فلتر isActive (سيظهر الكل)
    
    // Search by name or national ID
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Count total documents (مع cache للعدد)
    const total = await Investor.countDocuments(query);
    
    // Get pagination info
    const { startIndex, pagination } = getPaginationInfo(page, maxLimit, total);
    
    // تحسين الأداء: جلب الحقول المطلوبة فقط
    const selectFields = 'fullName nationalId amountContributed currency sharePercentage startDate phone isActive createdAt';
    
    // Get investors with optimized query
    const investors = await Investor.find(query)
      .select(selectFields)
      .sort({ [sort]: 1 })
      .skip(startIndex)
      .limit(pagination.limit)
      .lean(); // استخدام lean() لتحسين الأداء
    
    return success(res, 200, 'Investors retrieved successfully', { investors }, pagination);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single investor
// @route   GET /api/investors/:id
// @access  Private
exports.getInvestor = async (req, res, next) => {
  try {
    const investor = await Investor.findById(req.params.id);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.id}`);
    }
    
    return success(res, 200, 'Investor retrieved successfully', { investor });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new investor
// @route   POST /api/investors
// @access  Private/Admin
exports.createInvestor = async (req, res, next) => {
  try {
    const investor = await Investor.create(req.body);
    
    return success(res, 201, 'Investor created successfully', { investor });
  } catch (err) {
    next(err);
  }
};

// @desc    Update investor
// @route   PUT /api/investors/:id
// @access  Private/Admin
exports.updateInvestor = async (req, res, next) => {
  try {
    let investor = await Investor.findById(req.params.id);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.id}`);
    }
    
    investor = await Investor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    return success(res, 200, 'Investor updated successfully', { investor });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete investor
// @route   DELETE /api/investors/:id
// @access  Private/Admin
exports.deleteInvestor = async (req, res, next) => {
  try {
    const investor = await Investor.findById(req.params.id);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.id}`);
    }
    
    const { forceDelete = 'false' } = req.query;
    const isForceDelete = forceDelete === 'true';
    
    if (isForceDelete) {
      // الحذف النهائي - حذف كامل مع جميع البيانات
      const [transactions, distributions] = await Promise.all([
        Transaction.countDocuments({ investorId: req.params.id }),
        YearlyProfitDistribution.countDocuments({ investorId: req.params.id })
      ]);
      
      // حذف البيانات المرتبطة بشكل متوازي
      const deletePromises = [];
      
      if (transactions > 0) {
        deletePromises.push(Transaction.deleteMany({ investorId: req.params.id }));
      }
      
      if (distributions > 0) {
        deletePromises.push(YearlyProfitDistribution.deleteMany({ investorId: req.params.id }));
      }
      
      deletePromises.push(investor.deleteOne());
      
      await Promise.all(deletePromises);
      
      // تحديث النسب بشكل منفصل ومُحسن
      setImmediate(async () => {
        try {
          await Investor.updateAllSharePercentages();
        } catch (updateError) {
          console.error('Error updating share percentages after deletion:', updateError);
        }
      });
      
      return success(res, 200, 'Investor and all related data deleted permanently. Share percentages will be updated shortly.');
    } else {
      // الحذف من التوزيعات - تحويل إلى غير نشط
      investor.isActive = false;
      await investor.save();
      
      // تحديث النسب بشكل منفصل
      setImmediate(async () => {
        try {
          await Investor.updateAllSharePercentages();
        } catch (updateError) {
          console.error('Error updating share percentages after deactivation:', updateError);
        }
      });
      
      return success(res, 200, 'Investor marked as inactive and removed from profit distributions. Share percentages will be updated shortly.');
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get investor balance
// @route   GET /api/investors/:id/balance
// @access  Private
exports.getInvestorBalance = async (req, res, next) => {
  try {
    const investor = await Investor.findById(req.params.id);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.id}`);
    }
    
    const balance = await investor.getCurrentBalance();
    
    return success(res, 200, 'Investor balance retrieved successfully', { 
      investor: investor._id,
      fullName: investor.fullName,
      amountContributed: investor.amountContributed,
      sharePercentage: investor.sharePercentage,
      currentBalance: balance
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get investor transactions
// @route   GET /api/investors/:id/transactions
// @access  Private
exports.getInvestorTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-transactionDate' } = req.query;
    
    const investor = await Investor.findById(req.params.id);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.id}`);
    }
    
    // Count total transactions
    const total = await Transaction.countDocuments({ investorId: req.params.id });
    
    // Get pagination info
    const { startIndex, pagination } = getPaginationInfo(page, limit, total);
    
    // Get transactions
    const transactions = await Transaction.find({ investorId: req.params.id })
      .sort(sort)
      .skip(startIndex)
      .limit(pagination.limit);
    
    return success(res, 200, 'Investor transactions retrieved successfully', { transactions }, pagination);
  } catch (err) {
    next(err);
  }
};

// @desc    Get investor profit distributions
// @route   GET /api/investors/:id/profits
// @access  Private
exports.getInvestorProfits = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-distributionDate' } = req.query;
    
    const investor = await Investor.findById(req.params.id);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.id}`);
    }
    
    // Count total profit distributions
    const total = await YearlyProfitDistribution.countDocuments({ investorId: req.params.id });
    
    // Get pagination info
    const { startIndex, pagination } = getPaginationInfo(page, limit, total);
    
    // Get profit distributions (using new system)
    const profits = await YearlyProfitDistribution.find({ investorId: req.params.id })
      .populate('financialYearId', 'year totalProfit currency')
      .sort(sort)
      .skip(startIndex)
      .limit(pagination.limit);
    
    return success(res, 200, 'Investor profit distributions retrieved successfully', { profits }, pagination);
  } catch (err) {
    next(err);
  }
};

// @desc    Upload investor document
// @route   POST /api/investors/:investorId/documents
// @access  Private/Admin
exports.uploadInvestorDocument = async (req, res, next) => {
  try {
    const investor = await Investor.findById(req.params.investorId);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.investorId}`);
    }
    
    if (!req.file) {
      return error(res, 400, 'Please upload a file');
    }
    
    // Add document to investor
    investor.documents.push({
      name: req.body.name || req.file.originalname,
      path: req.file.path
    });
    
    await investor.save();
    
    return success(res, 200, 'Document uploaded successfully', { 
      document: investor.documents[investor.documents.length - 1]
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get investor documents
// @route   GET /api/investors/:investorId/documents
// @access  Private
exports.getInvestorDocuments = async (req, res, next) => {
  try {
    const investor = await Investor.findById(req.params.investorId);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.investorId}`);
    }
    
    return success(res, 200, 'Investor documents retrieved successfully', { 
      documents: investor.documents
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete investor document
// @route   DELETE /api/investors/:investorId/documents/:documentId
// @access  Private/Admin
exports.deleteInvestorDocument = async (req, res, next) => {
  try {
    const investor = await Investor.findById(req.params.investorId);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.params.investorId}`);
    }
    
    // Find document
    const document = investor.documents.id(req.params.documentId);
    
    if (!document) {
      return error(res, 404, 'Document not found');
    }
    
    // Delete file from disk
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }
    
    // Remove document from investor
    investor.documents.pull(req.params.documentId);
    await investor.save();
    
    return success(res, 200, 'Document deleted successfully');
  } catch (err) {
    next(err);
  }
}; 

module.exports = exports; 