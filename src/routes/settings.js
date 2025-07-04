const express = require('express');
const {
  getSettings,
  updateSettings,
  updateExchangeRates,
  convertCurrency,
  getDisplayAmount,
  resetSettings,
  getSupportedCurrencies
} = require('../controllers/settings');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// All routes are protected
router.use(protect);

// GET /api/settings - Get system settings
router.route('/')
  .get(getSettings)
  .put(authorize('admin'), updateSettings);

// PUT /api/settings/exchange-rates - Update exchange rates (Admin only)
router.route('/exchange-rates')
  .put(authorize('admin'), updateExchangeRates);

// POST /api/settings/convert - Convert currency amount
router.route('/convert')
  .post(convertCurrency);

// POST /api/settings/display-amount - Get display amount based on settings
router.route('/display-amount')
  .post(getDisplayAmount);

// POST /api/settings/reset - Reset settings to default (Admin only)
router.post('/reset', authorize('admin'), resetSettings);

// GET /api/settings/currencies - Get supported currencies
router.get('/currencies', getSupportedCurrencies);

module.exports = router; 