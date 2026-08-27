const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { corsOrigin } = require('./config/env');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
app.use(helmet());
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));
app.get('/health', (request, response) => response.json({ success: true, message: 'POS API is healthy' }));
app.get('/api/v1', (request, response) => response.json({
	success: true,
	message: 'Techargi POS API v1',
	endpoints: ['/auth', '/products', '/orders', '/deliveries', '/reports']
}));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use((request, response) => response.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);
module.exports = app;
