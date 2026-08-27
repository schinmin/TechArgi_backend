const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { uploadImage, deleteImage } = require('../config/cloudinary');

exports.list = asyncHandler(async (request, response) => {
  const filter = {};
  if (request.query.lowStock === 'true') filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
  if (request.query.category) filter.category = request.query.category;
  response.json({ success: true, data: { products: await Product.find(filter).populate('category', 'name') } });
});
exports.create = asyncHandler(async (request, response) => {
  const productData = { ...request.body };
  delete productData.imagePublicId;
  let uploadedImage;
  try {
    if (request.file) {
      uploadedImage = await uploadImage(request.file.buffer, request.file.mimetype, request.file.originalname);
      productData.image = uploadedImage.url;
      productData.imagePublicId = uploadedImage.publicId;
    }
    const product = await Product.create(productData);
    response.status(201).json({ success: true, data: { product } });
  } catch (error) {
    if (uploadedImage) await deleteImage(uploadedImage.publicId).catch(() => {});
    throw error;
  }
});
exports.get = asyncHandler(async (request, response, next) => { const product = await Product.findById(request.params.id).populate('category', 'name'); if (!product) return next(new AppError('Product not found', 404)); response.json({ success: true, data: { product } }); });
exports.update = asyncHandler(async (request, response, next) => {
  const existingProduct = await Product.findById(request.params.id).select('+imagePublicId');
  if (!existingProduct) return next(new AppError('Product not found', 404));
  const productData = { ...request.body };
  delete productData.imagePublicId;
  let uploadedImage;
  try {
    if (request.file) {
      uploadedImage = await uploadImage(request.file.buffer, request.file.mimetype, request.file.originalname);
      productData.image = uploadedImage.url;
      productData.imagePublicId = uploadedImage.publicId;
    }
    const product = await Product.findByIdAndUpdate(request.params.id, productData, { new: true, runValidators: true });
    if (uploadedImage && existingProduct.imagePublicId) {
      await deleteImage(existingProduct.imagePublicId).catch(() => {});
    }
    response.json({ success: true, data: { product } });
  } catch (error) {
    if (uploadedImage) await deleteImage(uploadedImage.publicId).catch(() => {});
    throw error;
  }
});
exports.remove = asyncHandler(async (request, response, next) => {
  const product = await Product.findById(request.params.id).select('+imagePublicId');
  if (!product) return next(new AppError('Product not found', 404));
  await product.deleteOne();
  await deleteImage(product.imagePublicId).catch(() => {});
  response.status(204).send();
});
exports.stock = asyncHandler(async (request, response, next) => { const product = await Product.findByIdAndUpdate(request.params.id, { $set: { stockQuantity: request.body.stockQuantity } }, { new: true, runValidators: true }); if (!product) return next(new AppError('Product not found', 404)); response.json({ success: true, data: { product } }); });
exports.listCategories = asyncHandler(async (request, response) => response.json({ success: true, data: { categories: await Category.find({ isActive: true }) } }));
exports.createCategory = asyncHandler(async (request, response) => response.status(201).json({ success: true, data: { category: await Category.create(request.body) } }));
exports.updateCategory = asyncHandler(async (request, response, next) => { const category = await Category.findByIdAndUpdate(request.params.id, request.body, { new: true, runValidators: true }); if (!category) return next(new AppError('Category not found', 404)); response.json({ success: true, data: { category } }); });
