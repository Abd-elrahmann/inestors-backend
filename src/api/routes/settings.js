const express = require('express');

const {
  getSettings,
  updateSettings,
  updateExchangeRates,
  convertCurrency,
  getLatestExchangeRate,
  getDisplayAmount,
  resetSettings,
  getSupportedCurrencies
} = require('../controllers/settings');

// Load auth middleware
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes
router.route('/')
  .get(getSettings)
  .put(authorize('admin'), updateSettings);

router.route('/exchange-rates')
  .put(authorize('admin'), updateExchangeRates);

// New route for getting latest exchange rate from FastForex
router.route('/latest-exchange-rate')
  .get(getLatestExchangeRate);

router.route('/convert')
  .post(convertCurrency);

router.route('/display-amount')
  .post(getDisplayAmount);

router.route('/reset')
  .post(authorize('admin'), resetSettings);

router.route('/currencies')
  .get(getSupportedCurrencies);

module.exports = router; 