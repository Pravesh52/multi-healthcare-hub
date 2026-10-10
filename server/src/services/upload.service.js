import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const ensureConfigured = () => {
  if (!isCloudinaryConfigured()) throw new ApiError(503, 'File upload is not configured yet');
};

// isPrivate = true: no public link exists. Only a signed, expiring link can open it.
export const uploadBuffer = (buffer, { folder, isPrivate = false }) => {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `multihealth/${folder}`,
        resource_type: 'image', // images and PDFs both go here
        type: isPrivate ? 'authenticated' : 'upload',
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
};

// Cleanup must never break the real request, so errors are only logged
export const deleteAsset = async (publicId, isPrivate = false) => {
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      type: isPrivate ? 'authenticated' : 'upload',
      invalidate: true,
    });
  } catch (err) {
    logger.error(`Could not delete asset ${publicId}: ${err.message}`);
  }
};

// A download link for a private file that stops working after `seconds`
export const signedDocUrl = (publicId, format, seconds = 300) => {
  ensureConfigured();
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + seconds,
  });
};