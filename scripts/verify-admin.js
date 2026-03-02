require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const verifyAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    const adminEmail = 'admin123@gmail.com'.toLowerCase();

    // Check if admin user exists
    const admin = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('💡 Run: npm run seed');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('✅ Admin user found!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔑 Role:', admin.role);
    console.log('📊 Active:', admin.isActive);
    console.log('🆔 User ID:', admin._id);

    // Test password match
    const bcrypt = require('bcryptjs');
    const passwordMatch = await bcrypt.compare('Aashish@123', admin.password);
    
    if (passwordMatch) {
      console.log('✅ Password matches correctly!');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('💡 The password in the database might be different.');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying admin:', error.message);
    console.error('Full error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

verifyAdmin();

