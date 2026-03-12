const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  sendOtp,
  registerWithOtp
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const registerValidation = [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password must be at least 8 characters long, contain 1 uppercase, 1 lowercase, 1 number, and 1 special character')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
  body('companyName', 'Company Name is required').not().isEmpty(),
  body('address', 'Address is required').not().isEmpty()
];

const loginValidation = [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists(),
];

router.post('/send-otp', registerValidation, sendOtp);
router.post('/register-with-otp', registerWithOtp);
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);

module.exports = router;

