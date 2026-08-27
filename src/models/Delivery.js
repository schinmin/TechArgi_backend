const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'Pending' },
  customer: { name: { type: String, required: true }, phone: { type: String, required: true }, address: { type: String, required: true }, deliveryNotes: String }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
