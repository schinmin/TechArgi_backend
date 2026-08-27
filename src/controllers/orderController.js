const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { createOrder } = require('../services/orderService');
exports.create = asyncHandler(async (request, response) => response.status(201).json({ success: true, data: { order: await createOrder(request.body, request.user._id) } }));
exports.list = asyncHandler(async (request, response) => response.json({ success: true, data: { orders: await Order.find().populate('createdBy', 'name').sort('-createdAt') } }));
exports.get = asyncHandler(async (request, response, next) => { const order = await Order.findById(request.params.id).populate('items.productId'); if (!order) return next(Object.assign(new Error('Order not found'), { statusCode: 404 })); response.json({ success: true, data: { order } }); });
exports.updateStatus = asyncHandler(async (request, response, next) => { const order = await Order.findByIdAndUpdate(request.params.id, { orderStatus: request.body.orderStatus, paymentStatus: request.body.paymentStatus }, { new: true, runValidators: true }); if (!order) return next(Object.assign(new Error('Order not found'), { statusCode: 404 })); response.json({ success: true, data: { order } }); });
