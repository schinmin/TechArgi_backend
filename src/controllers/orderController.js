const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { createOrder } = require('../services/orderService');
exports.create = asyncHandler(async (request, response) => {
	const input = { ...request.body };
	if (request.user.role === 'Customer') {
		input.discount = 0;
		delete input.paymentStatus;
		delete input.orderStatus;
	}
	response.status(201).json({ success: true, data: { order: await createOrder(input, request.user._id) } });
});
exports.list = asyncHandler(async (request, response) => {
	const filter = ['Admin', 'Cashier'].includes(request.user.role) ? {} : { createdBy: request.user._id };
	response.json({ success: true, data: { orders: await Order.find(filter).populate('createdBy', 'name').sort('-createdAt') } });
});
exports.get = asyncHandler(async (request, response, next) => {
	const filter = ['Admin', 'Cashier'].includes(request.user.role)
		? { _id: request.params.id }
		: { _id: request.params.id, createdBy: request.user._id };
	const order = await Order.findOne(filter).populate('items.productId');
	if (!order) return next(Object.assign(new Error('Order not found'), { statusCode: 404 }));
	response.json({ success: true, data: { order } });
});
exports.updateStatus = asyncHandler(async (request, response, next) => { const order = await Order.findByIdAndUpdate(request.params.id, { orderStatus: request.body.orderStatus, paymentStatus: request.body.paymentStatus }, { new: true, runValidators: true }); if (!order) return next(Object.assign(new Error('Order not found'), { statusCode: 404 })); response.json({ success: true, data: { order } }); });
