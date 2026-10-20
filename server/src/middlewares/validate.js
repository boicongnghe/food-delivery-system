import ApiError from '../utils/ApiError.js';

/**
 * Middleware factory for validating request data against a Joi schema
 * @param {import('joi').ObjectSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
      }));

      throw new ApiError(400, 'Dữ liệu không hợp lệ', errorDetails);
    }

    req[source] = value;
    next();
  };
};

export default validate;
