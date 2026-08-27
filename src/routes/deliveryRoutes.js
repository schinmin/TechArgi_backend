const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('../controllers/deliveryController');
const { protect, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
router.get('/', protect, controller.list);
router.post('/', protect, authorize('Admin', 'Cashier'), [body('order').isMongoId(), body('assignedTo').isMongoId(), body('customer.name').notEmpty(), body('customer.phone').notEmpty(), body('customer.address').notEmpty(), validate], controller.create);
router.patch('/:id/status', protect, authorize('Admin', 'Delivery Person'), body('status').isIn(['Pending', 'In Progress', 'Out for Delivery', 'Delivered', 'Cancelled']), validate, controller.updateStatus);
module.exports = router;
