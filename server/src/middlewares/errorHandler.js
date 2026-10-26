const UPLOAD_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: 'Ảnh vượt quá dung lượng cho phép (tối đa 5MB)',
  LIMIT_UNEXPECTED_FILE: 'Tên trường file không hợp lệ (dùng "image")',
};

const DUPLICATE_FIELD_MESSAGES = {
  sku: 'Mã SKU đã được dùng cho món khác',
  name: 'Tên này đã tồn tại',
  email: 'Email đã được sử dụng',
  owner: 'Tài khoản đã có nhà hàng',
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Multer errors are client mistakes (file too large, wrong field...)
  if (err.name === 'MulterError') {
    err.statusCode = 400;
    err.message = UPLOAD_ERROR_MESSAGES[err.code] || err.message;
  }

  // MongoDB unique index violation (e.g. two requests creating the same SKU at the same time)
  if (err.code === 11000) {
    // Compound keys start with "restaurant" - report the business field instead
    const field = Object.keys(err.keyPattern || {}).find((key) => key !== 'restaurant') || 'unknown';
    err.statusCode = 409;
    err.message = 'Dữ liệu đã tồn tại';
    err.errors = [{ field, message: DUPLICATE_FIELD_MESSAGES[field] || 'Giá trị đã được sử dụng' }];
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error(err);
  }

  const response = {
    success: false,
    message: statusCode >= 500 && isProduction ? 'Internal server error' : err.message,
    errors: Array.isArray(err.errors) ? err.errors : [],
  };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
