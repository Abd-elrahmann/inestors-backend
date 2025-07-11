const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');
const { success, error } = require('../../utils/responseHandler');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    return success(res, 200, 'Users retrieved successfully', {
      users,
      count: users.length
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return error(res, 404, 'User not found');
    }

    return success(res, 200, 'User retrieved successfully', { user });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, fullName, email, nationalId, role } = req.body;

    // Validate required fields
    if (!username || !password || !fullName || !email || !nationalId) {
      return error(res, 400, 'Please provide all required fields: username, password, fullName, email, and nationalId');
    }

    // Create user
    const user = await User.create({
      username,
      password,
      fullName,
      email,
      nationalId,
      role: role || 'user'
    });

    return success(res, 201, 'User created successfully', {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        nationalId: user.nationalId,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { fullName, username, email, nationalId, role, isActive, password } = req.body;
    const fieldsToUpdate = {};

    if (fullName) fieldsToUpdate.fullName = fullName;
    if (username) fieldsToUpdate.username = username;
    if (email) fieldsToUpdate.email = email;
    if (nationalId) fieldsToUpdate.nationalId = nationalId;
    if (role) fieldsToUpdate.role = role;
    if (typeof isActive === 'boolean') fieldsToUpdate.isActive = isActive;
    if (password) fieldsToUpdate.password = password;

    const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return error(res, 404, 'User not found');
    }

    return success(res, 200, 'User updated successfully', { user });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return error(res, 400, 'You cannot delete your own account');
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return error(res, 404, 'User not found');
    }

    await User.findByIdAndDelete(req.params.id);

    return success(res, 200, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle user status (activate/deactivate)
// @route   PUT /api/users/:id/toggle-status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id) {
      return error(res, 400, 'You cannot deactivate your own account');
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return error(res, 404, 'User not found');
    }

    user.isActive = !user.isActive;
    await user.save();

    return success(res, 200, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, { user });
  } catch (err) {
    next(err);
  }
}; 