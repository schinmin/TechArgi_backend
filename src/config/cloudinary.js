const crypto = require('node:crypto');
const { v2: cloudinary } = require('cloudinary');
const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = require('./env');

function getCloudinary() {
  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    const error = new Error('Cloudinary is not configured');
    error.statusCode = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret
  });
  return cloudinary;
}

function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const uploader = getCloudinary().uploader.upload_stream({
      folder: 'techargi/products',
      public_id: `product-${crypto.randomUUID()}`,
      resource_type: 'image'
    }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    uploader.end(buffer);
  });
}

async function deleteImage(publicId) {
  if (!publicId) return;
  await getCloudinary().uploader.destroy(publicId, { resource_type: 'image' });
}

module.exports = { uploadImage, deleteImage };