const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test user credentials (admin)
const testAdmin = {
  username: 'admin',
  password: 'admin123'
};

// Test functions
async function loginUser(credentials) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
    console.log('✅ Login successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function getUsersList(token) {
  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Users list retrieved successfully');
    console.log('Users count:', response.data.data.count);
    console.log('Users:', response.data.data.users.map(u => ({
      id: u._id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      nationalId: u.nationalId,
      role: u.role,
      isActive: u.isActive
    })));
    return response.data.data.users;
  } catch (error) {
    console.error('❌ Failed to get users list:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function createTestUser(token) {
  try {
    const newUser = {
      username: 'testuser123',
      password: 'password123',
      fullName: 'مستخدم تجريبي',
      email: 'testuser@example.com',
      nationalId: '1234567890123',
      role: 'user'
    };

    const response = await axios.post(`${BASE_URL}/users`, newUser, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Test user created successfully');
    console.log('New user:', response.data.data.user);
    return response.data.data.user;
  } catch (error) {
    console.error('❌ Failed to create test user:', error.response?.data?.error || error.message);
    if (error.response?.data?.error?.includes('already exists')) {
      console.log('ℹ️ Test user already exists, skipping creation');
      return null;
    }
    throw error;
  }
}

async function getSingleUser(token, userId) {
  try {
    const response = await axios.get(`${BASE_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Single user retrieved successfully');
    console.log('User details:', response.data.data.user);
    return response.data.data.user;
  } catch (error) {
    console.error('❌ Failed to get single user:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function updateUser(token, userId) {
  try {
    const updateData = {
      fullName: 'مستخدم تجريبي محدث'
    };

    const response = await axios.put(`${BASE_URL}/users/${userId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ User updated successfully');
    console.log('Updated user:', response.data.data.user);
    return response.data.data.user;
  } catch (error) {
    console.error('❌ Failed to update user:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function toggleUserStatus(token, userId) {
  try {
    const response = await axios.put(`${BASE_URL}/users/${userId}/toggle-status`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ User status toggled successfully');
    console.log('User status:', response.data.data.user.isActive ? 'Active' : 'Inactive');
    return response.data.data.user;
  } catch (error) {
    console.error('❌ Failed to toggle user status:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function deleteUser(token, userId) {
  try {
    const response = await axios.delete(`${BASE_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ User deleted successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to delete user:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🚀 Starting Users API Tests...\n');

  try {
    // 1. Login as admin
    console.log('1️⃣ Testing admin login...');
    const token = await loginUser(testAdmin);
    console.log('');

    // 2. Get users list
    console.log('2️⃣ Testing get users list...');
    const users = await getUsersList(token);
    console.log('');

    // 3. Create test user
    console.log('3️⃣ Testing create user...');
    const newUser = await createTestUser(token);
    console.log('');

    if (newUser) {
      // 4. Get single user
      console.log('4️⃣ Testing get single user...');
      await getSingleUser(token, newUser.id);
      console.log('');

      // 5. Update user
      console.log('5️⃣ Testing update user...');
      await updateUser(token, newUser.id);
      console.log('');

      // 6. Toggle user status
      console.log('6️⃣ Testing toggle user status...');
      await toggleUserStatus(token, newUser.id);
      console.log('');

      // 7. Delete user (cleanup)
      console.log('7️⃣ Testing delete user (cleanup)...');
      await deleteUser(token, newUser.id);
      console.log('');
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('💥 Tests failed:', error.message);
    process.exit(1);
  }
}

// Handle axios defaults
axios.defaults.timeout = 10000;

// Run tests
if (require.main === module) {
  runTests();
}

module.exports = {
  loginUser,
  getUsersList,
  createTestUser,
  getSingleUser,
  updateUser,
  toggleUserStatus,
  deleteUser
}; 