const express = require('express');

const {
  getFinancialYears,
  getFinancialYear,
  createFinancialYear,
  updateFinancialYear,
  deleteFinancialYear,
  calculateDistributions,
  getDistributions,
  approveDistributions,
  rolloverProfits,
  distributeProfits,
  closeFinancialYear,
  getFinancialYearSummary,
  toggleAutoRollover,
  executeAutoRollover
} = require('../controllers/financialYears');

// Load auth middleware
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/financial-years - Get all financial years
router.get('/', getFinancialYears);

// POST /api/financial-years - Create new financial year (Admin only)
router.post('/', authorize('admin'), createFinancialYear);

// GET /api/financial-years/:id - Get single financial year
router.get('/:id', getFinancialYear);

// PUT /api/financial-years/:id - Update financial year (Admin only)
router.put('/:id', authorize('admin'), updateFinancialYear);

// DELETE /api/financial-years/:id - Delete financial year (Admin only)
router.delete('/:id', authorize('admin'), deleteFinancialYear);

// POST /api/financial-years/:id/calculate-distributions - Calculate profit distributions (Admin only)
router.post('/:id/calculate-distributions', authorize('admin'), calculateDistributions);

// GET /api/financial-years/:id/distributions - Get profit distributions
router.get('/:id/distributions', getDistributions);

// PUT /api/financial-years/:id/approve-distributions - Approve profit distributions (Admin only)
router.put('/:id/approve-distributions', authorize('admin'), approveDistributions);

// POST /api/financial-years/:id/distribute-profits - Distribute profits without rollover (Admin only)
router.post('/:id/distribute-profits', authorize('admin'), distributeProfits);

// POST /api/financial-years/:id/rollover-profits - Rollover profits to next year (Admin only)
router.post('/:id/rollover-profits', authorize('admin'), rolloverProfits);

// PUT /api/financial-years/:id/close - Close financial year (Admin only)
router.put('/:id/close', authorize('admin'), closeFinancialYear);

// GET /api/financial-years/:id/summary - Get financial year summary
router.get('/:id/summary', getFinancialYearSummary);

// POST /api/financial-years/:id/toggle-auto-rollover - Toggle auto rollover (Admin only)
router.post('/:id/toggle-auto-rollover', authorize('admin'), toggleAutoRollover);

// POST /api/financial-years/:id/execute-auto-rollover - Execute auto rollover (Admin only)
router.post('/:id/execute-auto-rollover', authorize('admin'), executeAutoRollover);

module.exports = router; 