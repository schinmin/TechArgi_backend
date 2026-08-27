const Delivery = require('../models/Delivery');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
exports.list = asyncHandler(async (request, response) => { const filter = request.user.role === 'Delivery Person' ? { assignedTo: request.user._id } : {}; response.json({ success: true, data: { deliveries: await Delivery.find(filter).populate('order assignedTo') } }); });
exports.create = asyncHandler(async (request, response) => response.status(201).json({ success: true, data: { delivery: await Delivery.create(request.body) } }));
exports.updateStatus = asyncHandler(async (request, response, next) => { const delivery = await Delivery.findByIdAndUpdate(request.params.id, { status: request.body.status }, { new: true, runValidators: true }); if (!delivery) return next(new AppError('Delivery not found', 404)); response.json({ success: true, data: { delivery } }); });
