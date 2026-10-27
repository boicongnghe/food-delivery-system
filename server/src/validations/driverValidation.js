import Joi from 'joi';

export const updateDriverSettingsSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim().max(20).allow(''),
  avatarUrl: Joi.string().trim().max(500).uri({ scheme: ['http', 'https'] }).allow(''),
  vehicle: Joi.string().trim().max(100).allow(''),
  licensePlate: Joi.string().trim().max(20).allow(''),
  bankName: Joi.string().trim().max(100).allow(''),
  bankAccountName: Joi.string().trim().max(100).allow(''),
  bankAccountNumber: Joi.string().trim().pattern(/^\d{6,20}$/).allow(''),
})
  .min(1)
  .custom((settings, helpers) => {
    const bankFields = ['bankName', 'bankAccountName', 'bankAccountNumber'];
    const hasBankDetails = bankFields.some(field => settings[field]);
    const hasAllBankDetails = bankFields.every(field => settings[field]);

    if (hasBankDetails && !hasAllBankDetails) {
      return helpers.error('object.bankDetails');
    }

    return settings;
  })
  .messages({
    'object.bankDetails': 'Vui lòng điền đầy đủ tên ngân hàng, chủ tài khoản và số tài khoản',
  });

export const changeDriverPasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Vui lòng nhập mật khẩu hiện tại',
    'any.required': 'Vui lòng nhập mật khẩu hiện tại',
  }),
  newPassword: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Vui lòng nhập mật khẩu mới',
    'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
    'any.required': 'Vui lòng nhập mật khẩu mới',
  }),
});
