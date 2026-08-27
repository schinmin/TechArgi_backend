const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

module.exports = (userId) => jwt.sign({ id: userId }, jwtSecret, { expiresIn: jwtExpiresIn });
