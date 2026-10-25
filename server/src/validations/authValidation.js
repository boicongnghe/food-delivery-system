import Joi from 'joi';

export const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Họ và tên không được để trống',
    'string.min': 'Họ và tên phải có ít nhất 2 ký tự',
    'any.required': 'Họ và tên là bắt buộc',
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Mật khẩu không được để trống',
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
  phone: Joi.string().allow('', null).optional(),
  role: Joi.string()
    .valid('customer', 'restaurant_owner', 'shipper')
    .default('customer')
    .messages({
      'any.only': 'Vai trò người dùng không hợp lệ',
    }),
  restaurantDetails: Joi.object({
    restaurantName: Joi.string().trim().required().messages({
      'string.empty': 'Tên nhà hàng không được để trống',
      'any.required': 'Tên nhà hàng là bắt buộc',
    }),
    restaurantAddress: Joi.string().trim().required().messages({
      'string.empty': 'Địa chỉ nhà hàng không được để trống',
      'any.required': 'Địa chỉ nhà hàng là bắt buộc',
    }),
    businessItems: Joi.string().trim().required().messages({
      'string.empty': 'Vui lòng nhập sản phẩm / món ăn nhà hàng muốn bán',
      'any.required': 'Mặt hàng kinh doanh là bắt buộc',
    }),
    ownerCitizenId: Joi.string()
      .trim()
      .pattern(/^[0-9]{9,12}$/)
      .required()
      .messages({
        'string.empty': 'Số CCCD của chủ quán không được để trống',
        'string.pattern.base': 'Số CCCD chủ quán phải gồm 9 đến 12 chữ số hợp lệ',
        'any.required': 'Số CCCD của chủ quán là bắt buộc',
      }),
    businessLicense: Joi.object({
      fileName: Joi.string()
        .trim()
        .pattern(/\.pdf$/i)
        .required()
        .messages({
          'string.empty': 'Vui lòng đính kèm file PDF giấy phép kinh doanh',
          'string.pattern.base': 'Giấy phép kinh doanh bắt buộc phải là tệp định dạng PDF (.pdf)',
          'any.required': 'Tên file giấy phép kinh doanh là bắt buộc',
        }),
      fileSize: Joi.number().optional().allow(null, 0),
      fileData: Joi.string().required().messages({
        'string.empty': 'Nội dung file PDF không được để trống',
        'any.required': 'Nội dung file PDF là bắt buộc',
      }),
      uploadedAt: Joi.any().optional(),
    }).required().messages({
      'any.required': 'File PDF giấy phép kinh doanh là bắt buộc đối với nhà hàng',
    }),
  }).when('role', {
    is: 'restaurant_owner',
    then: Joi.required().messages({
      'any.required': 'Thông tin nhà hàng và giấy phép kinh doanh là bắt buộc',
    }),
    otherwise: Joi.optional().allow(null),
  }),
  shipperDetails: Joi.object({
    dateOfBirth: Joi.string().trim().required().messages({
      'string.empty': 'Ngày sinh tài xế không được để trống',
      'any.required': 'Ngày sinh là bắt buộc đối với tài xế',
    }),
    citizenId: Joi.string()
      .trim()
      .pattern(/^[0-9]{9,12}$/)
      .required()
      .messages({
        'string.empty': 'Số CCCD tài xế không được để trống',
        'string.pattern.base': 'Số CCCD tài xế phải gồm 9 đến 12 chữ số hợp lệ',
        'any.required': 'Số CCCD là bắt buộc đối với tài xế',
      }),
    vehicleInfo: Joi.string().trim().required().messages({
      'string.empty': 'Thông tin / giấy tờ xe không được để trống',
      'any.required': 'Thông tin giấy tờ xe là bắt buộc đối với tài xế',
    }),
    vehicleRegistration: Joi.object({
      fileName: Joi.string().allow('', null).optional(),
      fileData: Joi.string().allow('', null).optional(),
    }).optional().allow(null),
    vehicleInsurance: Joi.object({
      hasInsurance: Joi.boolean().optional(),
      submitLater: Joi.boolean().optional(),
      insuranceInfo: Joi.string().allow('', null).optional(),
      fileName: Joi.string().allow('', null).optional(),
      fileData: Joi.string().allow('', null).optional(),
    }).optional().allow(null),
  }).when('role', {
    is: 'shipper',
    then: Joi.required().messages({
      'any.required': 'Thông tin tài xế và giấy tờ xe là bắt buộc',
    }),
    otherwise: Joi.optional().allow(null),
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Mật khẩu không được để trống',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
  otp: Joi.string().trim().length(6).required().messages({
    'string.empty': 'Mã OTP không được để trống',
    'string.length': 'Mã OTP phải gồm đúng 6 chữ số',
    'any.required': 'Mã OTP là bắt buộc',
  }),
  newPassword: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Mật khẩu mới không được để trống',
    'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu mới là bắt buộc',
  }),
});
