const express = require('express');
const router = express.Router();

const {
  getInvestorListReport,
  getProfitDistributionReport,
  getTransactionsReport,
  getInvestorSummaryReport,
  exportFinancialYearToPDF,
  exportFinancialYearToExcel,
  exportInvestorSummaryToPDF,
  cleanupExports
} = require('../controllers/reports');

// Auth middleware
const { protect, authorize } = require('../middlewares/auth');

// Routes
router.route('/investors')
  .get(protect, authorize('admin'), getInvestorListReport);

router.route('/profits')
  .get(protect, authorize('admin'), getProfitDistributionReport);

router.route('/transactions')
  .get(protect, authorize('admin'), getTransactionsReport);

router.route('/investor-summary/:id')
  .get(protect, authorize('admin'), getInvestorSummaryReport);

// GET /api/reports/investor-summary/:id - Get investor summary report
router.get('/investor-summary/:id', getInvestorSummaryReport);

// Export routes
// GET /api/reports/financial-years/:id/export/pdf - Export financial year to PDF
router.get('/financial-years/:id/export/pdf', exportFinancialYearToPDF);

// GET /api/reports/financial-years/:id/export/excel - Export financial year to Excel
router.get('/financial-years/:id/export/excel', exportFinancialYearToExcel);

// GET /api/reports/investors/:id/export/pdf - Export investor summary to PDF
router.get('/investors/:id/export/pdf', exportInvestorSummaryToPDF);

// POST /api/reports/cleanup - Clean up old export files (Admin only)
router.post('/cleanup', authorize('admin'), cleanupExports);

module.exports = router; 