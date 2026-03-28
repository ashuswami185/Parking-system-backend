const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

// Temporary in-memory OTP store (in production use Redis or DB model)
const otpStore = new Map();

// Helper to send email
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER || 'ethereal_user', 
      pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
  });
  
  try {
    const mailOptions = {
        from: `NEEPCO Portal <noreply@neepco.com>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    if (options.html) {
      mailOptions.html = options.html;
    }

    if (process.env.SMTP_HOST) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log(`[EMAIL MOCK] To: ${options.email} | Subject: ${options.subject}`);
      console.log(`[EMAIL MOCK] Message: \n${options.message}`);
      if (options.html) console.log(`[EMAIL MOCK] HTML Content Included`);
    }
  } catch(e) {
    console.error('Email sending failed:', e);
  }
};

// Welcome Email Template Helper
const getWelcomeEmailTemplate = (name) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #004F71; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #004F71; margin: 0;">Welcome to NEEPCO Portal</h1>
      </div>
      <div style="line-height: 1.6;">
        <p>Dear <strong>${name}</strong>,</p>
        <p>Your account has been successfully created and verified on the <strong>NEEPCO Procurement Data & Vendor Payment Portal</strong>.</p>
        <p>You can now log in to the portal using your registered email address and password to manage your procurement data and vendor payments securely.</p>
        <div style="background-color: #f1f8fc; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #004F71;">
          <h3 style="margin-top: 0; color: #004F71;">Key Features:</h3>
          <ul style="margin-bottom: 0;">
            <li>Real-time procurement data access</li>
            <li>Vendor payment tracking</li>
            <li>Official documentation portal</li>
            <li>Secure data management</li>
          </ul>
        </div>
        <p>If you have any questions or require support, please feel free to reach out to our team.</p>
        <p>Best regards,<br>
        <strong>NEEPCO Portal Team</strong></p>
      </div>
      <div style="margin-top: 30px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
        <p>This is an automated message, please do not reply to this email.</p>
        <p>&copy; ${new Date().getFullYear()} NEEPCO Ltd.</p>
      </div>
    </div>
  `;
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, role, vendorId, companyName, phone, address } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user object without vendorId initially
    const userData = {
      name,
      email,
      password,
      role: role || 'vendor',
      companyName,
      phone,
      address
    };

    // Only add vendorId if it's provided and not an empty string
    if (vendorId && vendorId.trim() !== '') {
      userData.vendorId = vendorId.trim();
    }

    // Create user
    const user = await User.create(userData);

    // Create audit log
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      action: 'create_user',
      module: 'auth',
      details: `User registered with role: ${user.role}`,
      ipAddress: req.ip
    });

    // Send Welcome Email
    const welcomeMessage = `Dear ${user.name},\n\nWelcome to the NEEPCO Procurement Portal! Your account has been successfully created.\n\nYou can now log in to the portal using your email address and password to manage your procurement data and vendor payments.\n\nThank you,\nNEEPCO Portal Team`;
    
    await sendEmail({
      email: user.email,
      subject: 'Welcome to NEEPCO Portal',
      message: welcomeMessage,
      html: getWelcomeEmailTemplate(user.name)
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendorId: user.vendorId,
        companyName: user.companyName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Normalize email to lowercase (since User model has lowercase: true)
    const normalizedEmail = email.toLowerCase().trim();

    // Check for user
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive. Please contact administrator.' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create audit log
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      action: 'login',
      module: 'auth',
      details: 'User logged in successfully',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendorId: user.vendorId,
        companyName: user.companyName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      companyName: req.body.companyName
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    
    // Store in memory (expires in 10 mins)
    otpStore.set(email, {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
      userData: req.body
    });

    // Send email
    const message = `Your OTP for NEEPCO Portal registration is: ${otp}\n\nIt is valid for 10 minutes.`;
    await sendEmail({
      email,
      subject: 'NEEPCO Registration OTP',
      message
    });

    res.status(200).json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register user with OTP
// @route   POST /api/auth/register-with-otp
// @access  Public
exports.registerWithOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ message: 'OTP not requested or expired' });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const { name, password, role, vendorId, companyName, address } = record.userData; // Removed phone

    // Create user object without vendorId initially
    const userData = {
      name,
      email,
      password,
      role: role || 'vendor',
      companyName,
      address
    };

    // Only add vendorId if it's provided and not an empty string
    if (vendorId && vendorId.trim() !== '') {
      userData.vendorId = vendorId.trim();
    }

    // Create user
    const user = await User.create(userData);

    // Create audit log
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      action: 'create_user',
      module: 'auth',
      details: `User registered with role: ${user.role} via OTP`,
      ipAddress: req.ip
    });

    // Clear OTP
    otpStore.delete(email);

    // Send Welcome Email
    const welcomeMessage = `Dear ${user.name},\n\nWelcome to the NEEPCO Procurement Portal! Your account has been successfully created and verified via OTP.\n\nYou can now log in to the portal using your email address and password to manage your procurement data and vendor payments.\n\nThank you,\nNEEPCO Portal Team`;
    
    await sendEmail({
      email: user.email,
      subject: 'Welcome to NEEPCO Portal',
      message: welcomeMessage,
      html: getWelcomeEmailTemplate(user.name)
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendorId: user.vendorId,
        companyName: user.companyName
      }
    });
  } catch (error) {
    console.error('Register with OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};
