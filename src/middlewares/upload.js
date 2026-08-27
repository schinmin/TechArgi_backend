const multer = require('multer');
const AppError = require('../utils/AppError');

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new AppError('Only image files are allowed', 400));
    }
    callback(null, true);
  }
});

function productImage(request, response, next) {
  parser.single('image')(request, response, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Image must be 5MB or smaller', 400));
    }
    next(error);
  });
}

module.exports = productImage;