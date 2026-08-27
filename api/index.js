const app = require('../src/app');
const { connectDatabase } = require('../src/config/db');

module.exports = async (request, response) => {
  try {
    await connectDatabase();
    return app(request, response);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return response.status(503).json({
      success: false,
      message: 'Service temporarily unavailable'
    });
  }
};