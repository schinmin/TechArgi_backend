const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function serialize(user) { return { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone }; }
function issueToken(user) { return jwt.sign({ id: user._id }, jwtSecret, { expiresIn: jwtExpiresIn }); }

exports.register = asyncHandler(async (request, response, next) => {
  const { name, email, password, role, phone } = request.body;
  const isAdminCreatingUser = request.user?.role === 'Admin';
  const requestedRole = isAdminCreatingUser ? role : 'Customer';
  if (role === 'Admin' && request.user?.role !== 'Admin') {
    const userCount = await User.countDocuments();
    if (userCount > 0) return next(new AppError('Only an admin can create another admin', 403));
  }
     let dbEmail = await User.findOne({email:email});
     if(dbEmail){
       let dbPhone = await User.findOne({phone:phone});
       if(dbPhone)return next(new AppError("Your phone number is already used"));
      return next(new AppError("Your email and phone number is already used"))
     }
  const user = await User.create({ name, email, password, role: requestedRole || 'Customer', phone });
  response.status(201).json({ success: true, data: { user: serialize(user), token: issueToken(user) } });
});

exports.login = asyncHandler(async (request, response, next) => {
  const user = await User.findOne({ email: request.body.email }).select('+password');
  if (!user || !(await user.comparePassword(request.body.password))) return next(new AppError('Invalid email or password', 401));
  response.json({ success: true, data: { user: serialize(user), token: issueToken(user) } });
});

exports.me = asyncHandler(async (request, response) => response.json({ success: true, data: { user: request.user } }));
exports.updateProfile = asyncHandler(async (request, response) => {
  const allowed = ['name', 'phone'];
  const updates = Object.fromEntries(Object.entries(request.body).filter(([key]) => allowed.includes(key)));
  const user = await User.findByIdAndUpdate(request.user._id, updates, { new: true, runValidators: true }).select('-password');
  response.json({ success: true, data: { user } });
});
