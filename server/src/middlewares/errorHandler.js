// eslint-disable-next-line no-unused-vars
const UPLOAD_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: 'Ảnh vượt quá dung lượng cho phép (tối đa 5MB)',
  LIMIT_UNEXPECTED_FILE: 'Tên trường file không hợp lệ (dùng "image")',
};

const errorHandler = (err, req, res, next) => {
  // Multer errors are client mistakes (file too large, wrong field...)
  if (err.name === 'MulterError') {
    err.statusCode = 400;
    err.message = UPLOAD_ERROR_MESSAGES[err.code] || err.message;
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error(err);
  }

  const response = {
    success: false,
    message: statusCode >= 500 && isProduction ? 'Internal server error' : err.message,
    errors: err.errors || [],
  };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
