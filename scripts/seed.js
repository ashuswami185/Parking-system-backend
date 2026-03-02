require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Normalize email to lowercase (since User model has lowercase: true)
    const adminEmail = 'admin123@gmail.com'.toLowerCase();

    // Check if admin user already exists
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (adminExists) {
      console.log('Admin user already exists. Skipping seed.');
      console.log('Admin email:', adminExists.email);
      console.log('Admin role:', adminExists.role);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: 'Aashish@123',
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin123@gmail.com');
    console.log('🔑 Password: Aashish@123');
    console.log('👤 Role: Admin');
    console.log('📝 User ID:', admin._id);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    console.error('Full error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedAdmin();

