const Settings = require('../models/Settings');
const ErrorResponse = require('../utils/errorResponse');
const { success, error } = require('../utils/responseHandler');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return error(res, 404, 'لم يتم العثور على إعدادات النظام');
    }
    return success(res, 200, 'تم جلب الإعدادات بنجاح', { settings });
  } catch (err) {
    next(err);
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      {
        $set: {
          ...req.body,
          updatedBy: req.user.id,
          updatedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true,
        upsert: true
      }
    );
    
    return success(res, 200, 'تم تحديث الإعدادات بنجاح', { settings });
  } catch (err) {
    next(err);
  }
};

// @desc    Update exchange rates
// @route   PUT /api/settings/exchange-rates
// @access  Private/Admin
exports.updateExchangeRates = async (req, res, next) => {
  try {
    const { USD_TO_IQD } = req.body;
    
    if (!USD_TO_IQD || USD_TO_IQD <= 0) {
      return error(res, 400, 'يرجى إدخال سعر صرف صحيح للدولار مقابل الدينار العراقي');
    }
    
    const settings = await Settings.findOneAndUpdate(
      {},
      {
        $set: {
          'exchangeRates.USD_TO_IQD': USD_TO_IQD,
          'exchangeRates.IQD_TO_USD': 1 / USD_TO_IQD,
          lastRateUpdate: new Date(),
          updatedBy: req.user.id,
          updatedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true,
        upsert: true
      }
    );
    
    return success(res, 200, 'تم تحديث أسعار الصرف بنجاح', {
      settings,
      exchangeRates: settings.exchangeRates
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Convert currency amount
// @route   POST /api/settings/convert
// @access  Private
exports.convertCurrency = async (req, res, next) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;
    
    if (!amount || !fromCurrency || !toCurrency) {
      return error(res, 400, 'يرجى توفير المبلغ والعملتين');
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return error(res, 404, 'لم يتم العثور على إعدادات النظام');
    }

    const convertedAmount = settings.convertCurrency(amount, fromCurrency, toCurrency);
    
    return success(res, 200, 'تم تحويل المبلغ بنجاح', {
      originalAmount: amount,
      fromCurrency,
      toCurrency,
      convertedAmount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get currency display format
// @route   POST /api/settings/display-amount
// @access  Private
exports.getDisplayAmount = async (req, res, next) => {
  try {
    const { amount, currency } = req.body;
    
    if (!amount || !currency) {
      return error(res, 400, 'يرجى توفير المبلغ والعملة');
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return error(res, 404, 'لم يتم العثور على إعدادات النظام');
    }

    const displayData = settings.getDisplayAmount(amount, currency);
    
    return success(res, 200, 'تم جلب المبلغ المعروض بنجاح', displayData);
  } catch (err) {
    next(err);
  }
};

// @desc    Reset settings to default
// @route   POST /api/settings/reset
// @access  Private/Admin
exports.resetSettings = async (req, res, next) => {
  try {
    // Delete existing settings
    await Settings.deleteMany({});
    
    // Create new default settings
    const settings = await Settings.create({});
    
    return success(res, 200, 'Settings reset to default successfully', { settings });
  } catch (err) {
    next(err);
  }
};

// @desc    Get supported currencies
// @route   GET /api/settings/currencies
// @access  Private
exports.getSupportedCurrencies = async (req, res, next) => {
  try {
    const currencies = [
      {
        code: 'IQD',
        name: 'دينار عراقي',
        symbol: 'د.ع',
        isDefault: true
      },
      {
        code: 'USD',
        name: 'دولار أمريكي',
        symbol: '$',
        isDefault: false
      }
    ];
    
    return success(res, 200, 'Supported currencies retrieved successfully', { currencies });
  } catch (err) {
    next(err);
  }
}; 