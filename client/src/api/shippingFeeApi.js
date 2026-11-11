import axiosClient from './axiosClient.js';

const shippingFeeApi = {
  // Lấy cấu hình giá cước shipper hiện tại & thông tin cập nhật
  getShippingFeeSettings: async () => {
    const response = await axiosClient.get('/admin/settings/shipping-fee');
    return response.data;
  },

  // Admin cập nhật các thông số tính cước shipper
  updateShippingFeeSettings: async (values) => {
    const response = await axiosClient.put('/admin/settings/shipping-fee', values);
    return response.data;
  },
};

export default shippingFeeApi;

