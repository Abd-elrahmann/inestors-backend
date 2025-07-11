const Transaction = require('../../models/Transaction');
const Investor = require('../../models/Investor');
const ErrorResponse = require('../../utils/errorResponse');
const { success, error, getPaginationInfo } = require('../../utils/responseHandler');
const fs = require('fs');
const path = require('path');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private/Admin
exports.getTransactions = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-transactionDate', 
      type, 
      startDate, 
      endDate,
      investorId
    } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    // Filter by investor if provided
    if (investorId) {
      query.investorId = investorId;
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
    
    // Count total documents
    const total = await Transaction.countDocuments(query);
    
    // Get pagination info
    const { startIndex, pagination } = getPaginationInfo(page, limit, total);
    
    // Get transactions
    const transactions = await Transaction.find(query)
      .populate('investorId', 'fullName nationalId')
      .populate('createdBy', 'username fullName')
      .sort(sort)
      .skip(startIndex)
      .limit(pagination.limit);
    
    return success(res, 200, 'Transactions retrieved successfully', { transactions }, pagination);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('investorId', 'fullName nationalId amountContributed')
      .populate('createdBy', 'username fullName');
    
    if (!transaction) {
      return error(res, 404, `Transaction not found with id of ${req.params.id}`);
    }
    
    // Check if user is admin or the investor's transaction
    if (req.user.role !== 'admin' && transaction.investorId._id.toString() !== req.user.id) {
      return error(res, 403, 'Not authorized to access this transaction');
    }
    
    return success(res, 200, 'Transaction retrieved successfully', { transaction });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private/Admin
exports.createTransaction = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    // Check if investor exists
    const investor = await Investor.findById(req.body.investorId);
    
    if (!investor) {
      return error(res, 404, `Investor not found with id of ${req.body.investorId}`);
    }
    
    // Create transaction
    const transaction = await Transaction.create(req.body);
    
    return success(res, 201, 'Transaction created successfully', { transaction });
  } catch (err) {
    next(err);
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private/Admin
exports.updateTransaction = async (req, res, next) => {
  try {
    let transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return error(res, 404, `Transaction not found with id of ${req.params.id}`);
    }
    
    // Don't allow changing the investor or transaction type
    delete req.body.investorId;
    delete req.body.type;
    
    transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    return success(res, 200, 'Transaction updated successfully', { transaction });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private/Admin
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return error(res, 404, `Transaction not found with id of ${req.params.id}`);
    }
    
    // Delete any attachments
    if (transaction.attachments && transaction.attachments.length > 0) {
      transaction.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }
    
    await transaction.deleteOne();
    
    return success(res, 200, 'Transaction deleted successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Upload transaction attachment
// @route   POST /api/transactions/:transactionId/attachments
// @access  Private/Admin
exports.uploadTransactionAttachment = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    
    if (!transaction) {
      return error(res, 404, `Transaction not found with id of ${req.params.transactionId}`);
    }
    
    if (!req.file) {
      return error(res, 400, 'Please upload a file');
    }
    
    // Add attachment to transaction
    transaction.attachments.push({
      name: req.body.name || req.file.originalname,
      path: req.file.path
    });
    
    await transaction.save();
    
    return success(res, 200, 'Attachment uploaded successfully', { 
      attachment: transaction.attachments[transaction.attachments.length - 1]
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get transaction attachments
// @route   GET /api/transactions/:transactionId/attachments
// @access  Private
exports.getTransactionAttachments = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    
    if (!transaction) {
      return error(res, 404, `Transaction not found with id of ${req.params.transactionId}`);
    }
    
    // Check if user is admin or the investor's transaction
    if (req.user.role !== 'admin' && transaction.investorId.toString() !== req.user.id) {
      return error(res, 403, 'Not authorized to access these attachments');
    }
    
    return success(res, 200, 'Transaction attachments retrieved successfully', { 
      attachments: transaction.attachments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete transaction attachment
// @route   DELETE /api/transactions/:transactionId/attachments/:attachmentId
// @access  Private/Admin
exports.deleteTransactionAttachment = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    
    if (!transaction) {
      return error(res, 404, `Transaction not found with id of ${req.params.transactionId}`);
    }
    
    // Find attachment
    const attachment = transaction.attachments.id(req.params.attachmentId);
    
    if (!attachment) {
      return error(res, 404, 'Attachment not found');
    }
    
    // Delete file from disk
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }
    
    // Remove attachment from transaction
    transaction.attachments.pull(req.params.attachmentId);
    await transaction.save();
    
    return success(res, 200, 'Attachment deleted successfully');
  } catch (err) {
    next(err);
  }
}; 