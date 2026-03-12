require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Procurement = require('../models/Procurement');
const Payment = require('../models/Payment');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing old data...');
    await Procurement.deleteMany();
    await Payment.deleteMany();
    // Delete non-admin users to keep admin intact
    await User.deleteMany({ role: { $ne: 'admin' } });

    // Drop old deprecated unique indexes if they exist to prevent schema clashes
    try {
        await mongoose.connection.db.collection('procurements').dropIndex('procurementId_1');
    } catch (e) {
        // Ignore if index doesn't exist
    }
    
    try {
        await mongoose.connection.db.collection('payments').dropIndex('paymentId_1');
    } catch (e) {
        // Ignore if index doesn't exist
    }

    console.log('Generating dummy data...');

    // 1. Create Vendors
    const vendor1 = await User.create({
      name: 'Tech Solutions Ltd',
      email: 'vendor1@example.com',
      password: 'Password@123',
      role: 'vendor',
      companyName: 'Tech Solutions Ltd',
      vendorId: 'VEN-1001',
      phone: '9876543210',
      address: '123 Tech Park, IT City',
      isActive: true
    });

    const vendor2 = await User.create({
      name: 'Global Supplies Inc',
      email: 'vendor2@example.com',
      password: 'Password@123',
      role: 'vendor',
      companyName: 'Global Supplies Inc',
      vendorId: 'VEN-1002',
      phone: '9876543211',
      address: '45 Industrial Estate, Commerce Town',
      isActive: true
    });

    // 2. Create Auditor
    const auditor = await User.create({
      name: 'Audit Officer',
      email: 'auditor@example.com',
      password: 'Password@123',
      role: 'auditor',
      isActive: true
    });

    // 3. Create or Update Admin
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        admin = await User.create({
            name: 'Admin User',
            email: 'admin@neepco.com',
            password: 'Password@123',
            role: 'admin',
            isActive: true
        });
    } else {
        // Explicitly update existing admin password to match test account
        admin.password = 'Password@123';
        admin.email = 'admin@neepco.com'; // Ensure we use this email
        await admin.save();
    }

    // 4. Create Procurements
    const procurement1 = await Procurement.create({
      purchaseId: 'PO-2024-001',
      itemName: 'Dell XPS Laptops',
      description: 'Laptops for new engineering team',
      vendorName: vendor1.companyName,
      vendorId: vendor1._id,
      amount: 1500000,
      quantity: 10,
      status: 'completed',
      category: 'Electronics',
      isMSE: false,
      isGeM: true,
      gemOrderId: 'GEM-9901',
      procurementDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      deliveryDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      approvedBy: auditor._id,
      approvalDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    });

    const procurement2 = await Procurement.create({
      purchaseId: 'PO-2024-002',
      itemName: 'Office Furniture',
      description: 'Desks and chairs for HQ',
      vendorName: vendor2.companyName,
      vendorId: vendor2._id,
      amount: 450000,
      quantity: 50,
      status: 'approved',
      category: 'Furniture',
      isMSE: true,
      isGeM: false,
      procurementDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      approvedBy: auditor._id,
      approvalDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    });

    const procurement3 = await Procurement.create({
        purchaseId: 'PO-2024-003',
        itemName: 'Server Racks',
        description: 'Data center expansion',
        vendorName: vendor1.companyName,
        vendorId: vendor1._id,
        amount: 850000,
        quantity: 5,
        status: 'pending',
        category: 'IT Infrastructure',
        isMSE: false,
        isGeM: true,
        gemOrderId: 'GEM-9902',
        procurementDate: new Date(),
        createdBy: admin._id,
    });

    // 5. Create Payments
    await Payment.create({
      vendorId: vendor1._id,
      vendorName: vendor1.companyName,
      procurementId: procurement1._id,
      invoiceNo: 'INV-2024-089',
      amount: 1500000,
      paymentStatus: 'completed',
      paymentMode: 'rtgs',
      transactionId: 'TXN987654321',
      invoiceDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      processedBy: auditor._id
    });

    await Payment.create({
      vendorId: vendor2._id,
      vendorName: vendor2.companyName,
      procurementId: procurement2._id,
      invoiceNo: 'INV-2024-090',
      amount: 450000,
      paymentStatus: 'pending',
      paymentMode: 'bank_transfer',
      invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdBy: admin._id
    });

    console.log('✅ Dummy data seeded successfully!');
    console.log('-----------------------------------');
    console.log('TEST ACCOUNTS:');
    console.log('Admin  : admin@neepco.com    / Password@123');
    console.log('Vendor1: vendor1@example.com / Password@123');
    console.log('Vendor2: vendor2@example.com / Password@123');
    console.log('Auditor: auditor@example.com / Password@123');
    console.log('-----------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
