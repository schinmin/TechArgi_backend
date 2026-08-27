const router = require('express').Router();
const controller = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/auth');
router.use(protect, authorize('Admin'));
router.get('/daily', controller.daily);
router.get('/monthly', controller.monthly);
router.get('/yearly', controller.yearly);
module.exports = router;
