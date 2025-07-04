const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Investor = require('./src/models/Investor');

async function loginAsAdmin() {
  try {
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login successful!');
      return loginData.token;
    } else {
      const errorData = await loginResponse.json();
      console.log('Login failed:', errorData);
      return null;
    }
  } catch (error) {
    console.error('Error during login:', error);
    return null;
  }
}

// Test creating an investor
async function testCreateInvestor(token) {
  try {
    if (!token) {
      console.log('No token provided, skipping investor creation');
      return;
    }
    
    console.log('Creating test investor...');
    const response = await fetch('http://localhost:5000/api/investors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: 'John Doe',
        nationalId: '1234567890',
        amountContributed: 10000,
        startDate: new Date(),
        phone: '1234567890',
        email: 'john@example.com',
        isActive: true
      })
    });

    const data = await response.json();
    console.log('Create investor response:', data);
    
    if (response.ok) {
      return data.data.investor._id;
    }
    return null;
  } catch (error) {
    console.error('Error creating investor:', error);
    return null;
  }
}

// Test creating a profit record
async function testCreateProfit(token) {
  try {
    if (!token) {
      console.log('No token provided, skipping profit creation');
      return;
    }
    
    console.log('Creating test profit record...');
    const response = await fetch('http://localhost:5000/api/profits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        profitYear: 2023,
        quarter: 4,
        totalProfit: 50000,
        distributionDate: new Date(),
        notes: 'End of year profit'
      })
    });

    const data = await response.json();
    console.log('Create profit response:', data);
    
    if (response.ok) {
      return data.data.profit._id;
    }
    return null;
  } catch (error) {
    console.error('Error creating profit:', error);
    return null;
  }
}

// Test creating a transaction
async function testCreateTransaction(token, investorId) {
  try {
    if (!token || !investorId) {
      console.log('No token or investor ID provided, skipping transaction creation');
      return;
    }
    
    console.log('Creating test transaction...');
    const response = await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        investorId: investorId,
        type: 'deposit',
        amount: 5000,
        transactionDate: new Date(),
        reference: 'Initial deposit',
        notes: 'Test transaction'
      })
    });

    const data = await response.json();
    console.log('Create transaction response:', data);
  } catch (error) {
    console.error('Error creating transaction:', error);
  }
}

// Run tests
async function runTests() {
  console.log('Testing API...');
  
  // Login as admin
  const token = await loginAsAdmin();
  
  if (token) {
    // Create test data
    const investorId = await testCreateInvestor(token);
    await testCreateProfit(token);
    
    if (investorId) {
      await testCreateTransaction(token, investorId);
    }
  }
}

runTests(); 

mongoose.connect('mongodb://localhost:27017/investors-system')
  .then(async () => {
    console.log('✅ متصل بقاعدة البيانات');
    
    // إنشاء مساهم جديد
    const newInvestor = new Investor({
      fullName: 'محمد أحمد',
      nationalId: '12345678901',
      amountContributed: 300000,
      startDate: new Date('2025-06-27'),
      phone: '07700000000',
      email: 'mohamed@example.com',
      isActive: true,
      currency: 'IQD'
    });
    
    await newInvestor.save();
    console.log('✅ تم إضافة المساهم الجديد');
    console.log(`📅 تاريخ الانضمام: ${newInvestor.startDate}`);
    console.log(`💰 المبلغ: ${newInvestor.amountContributed} ${newInvestor.currency}`);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ خطأ:', err);
    mongoose.disconnect();
  }); 