const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const { success, error } = require('../../utils/responseHandler');


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return error(res, 400, 'Please provide email and password');
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return error(res, 401, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      return error(res, 401, 'Your account has been deactivated');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return error(res, 401, 'Invalid credentials');
    }

    // Update last login
    await user.updateLastLogin();

    // Create token
    const token = user.getSignedJwtToken();

    // Set cookie options
    const cookieExpireDays = process.env.JWT_COOKIE_EXPIRE || 30; // Default to 30 days
    const options = {
      expires: new Date(
        Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    // Add secure flag in production
    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }

    return res
      .status(200)
      .cookie('token', token, options)
      .json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          nationalId: user.nationalId,
          role: user.role
        }
      });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  return success(res, 200, 'User logged out successfully');
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    return success(res, 200, 'User details retrieved successfully', {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        nationalId: user.nationalId,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const { fullName, username, nationalId } = req.body;
    const fieldsToUpdate = {};

    if (fullName) fieldsToUpdate.fullName = fullName;
    if (username) fieldsToUpdate.username = username;
    if (nationalId) fieldsToUpdate.nationalId = nationalId;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    return success(res, 200, 'User details updated successfully', {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        nationalId: user.nationalId,
        role: user.role,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return error(res, 400, 'Please provide current and new password');
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return error(res, 401, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return success(res, 200, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
}; 