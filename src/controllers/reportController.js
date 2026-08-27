const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
function range(start, end) { return { $gte: new Date(start), $lt: new Date(end) }; }
async function report(start, end, group) {
  const [summary, payments, topItems, trend] = await Promise.all([
    Order.aggregate([{ $match: { orderStatus: 'Completed', createdAt: range(start, end) } }, { $unwind: '$items' }, { $group: { _id: '$_id', totalSales: { $first: '$totalAmount' }, totalCost: { $sum: { $multiply: ['$items.cost', '$items.quantity'] } } } }, { $group: { _id: null, totalSales: { $sum: '$totalSales' }, totalCost: { $sum: '$totalCost' } } }]),
    Order.aggregate([{ $match: { orderStatus: 'Completed', createdAt: range(start, end) } }, { $group: { _id: '$paymentMethod', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { orderStatus: 'Completed', createdAt: range(start, end) } }, { $unwind: '$items' }, { $group: { _id: '$items.productId', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } }, { $sort: { quantity: -1 } }, { $limit: 10 }]),
    Order.aggregate([{ $match: { orderStatus: 'Completed', createdAt: range(start, end) } }, { $unwind: '$items' }, { $group: { _id: group, sales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, profit: { $sum: { $multiply: [{ $subtract: ['$items.price', '$items.cost'] }, '$items.quantity'] } } } }, { $sort: { _id: 1 } }])
  ]);
  const item = summary[0] || { totalSales: 0, totalCost: 0 };
  return { totalSales: item.totalSales, totalProfit: item.totalSales - item.totalCost, paymentMethodBreakdown: payments, topItems, trend };
}
exports.daily = asyncHandler(async (request, response) => { const date = request.query.date || new Date().toISOString().slice(0, 10); response.json({ success: true, data: await report(`${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`, { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }) }); });
exports.monthly = asyncHandler(async (request, response) => { const year = Number(request.query.year); const month = Number(request.query.month); const start = new Date(Date.UTC(year, month - 1, 1)); const end = new Date(Date.UTC(year, month, 1)); response.json({ success: true, data: await report(start, end, { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }) }); });
exports.yearly = asyncHandler(async (request, response) => { const year = Number(request.query.year); response.json({ success: true, data: await report(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1)), { $dateToString: { format: '%Y-%m', date: '$createdAt' } }) }); });
