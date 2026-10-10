import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const MAX_MB = 5;
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 5 },
});

// Reads the first bytes of the file to find what it really is
const detectType = (buf) => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.subarray(0, 4).toString('ascii') === '%PDF') return 'pdf';
  return null;
};

// fields: [{ name: 'certificate', maxCount: 1 }, ...]
// pdfFields: names of fields where a PDF is also allowed (documents). Other fields take images only.
export const acceptFiles = (fields, { pdfFields = [] } = {}) => {
  const run = parser.fields(fields);

  return (req, res, next) => {
    run(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest(`File is too large. Maximum size is ${MAX_MB} MB`));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(ApiError.badRequest(`Unexpected file field: ${err.field}`));
        }
        return next(ApiError.badRequest(err.message));
      }

      for (const [field, list] of Object.entries(req.files || {})) {
        const allowPdf = pdfFields.includes(field);
        for (const file of list) {
          const type = detectType(file.buffer);
          if (!type || (type === 'pdf' && !allowPdf)) {
            return next(
              ApiError.badRequest(
                allowPdf
                  ? `"${field}" must be a JPG, PNG, WEBP or PDF file`
                  : `"${field}" must be a JPG, PNG or WEBP image`
              )
            );
          }
        }
      }
      next();
    });
  };
};