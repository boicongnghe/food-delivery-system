// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
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
