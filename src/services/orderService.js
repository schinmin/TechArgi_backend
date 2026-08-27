const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { taxRate } = require('../config/env');

async function createOrder(input, userId) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const ids = input.items.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: ids }, isAvailable: true }).session(session);
      const byId = new Map(products.map((product) => [String(product._id), product]));
      const items = input.items.map((item) => {
        const product = byId.get(String(item.productId));
        if (!product) throw new AppError(`Product ${item.productId} is unavailable`, 400);
        if (product.stockQuantity < item.quantity) throw new AppError(`Insufficient stock for ${product.name}`, 400);
        return { productId: product._id, quantity: item.quantity, price: product.price, cost: product.cost, name: product.name };
      });
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discount = Math.max(0, Number(input.discount || 0));
      const tax = Math.round((subtotal - discount) * taxRate * 100) / 100;
      const totalAmount = Math.round((subtotal - discount + tax) * 100) / 100;
      for (const item of items) await Product.updateOne({ _id: item.productId }, { $inc: { stockQuantity: -item.quantity } }, { session });
      [result] = await Order.create([{ ...input, items, subtotal, discount, tax, totalAmount, createdBy: userId, orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}` }], { session });
    });
    return result;
  } finally { await session.endSession(); }
}
module.exports = { createOrder };
