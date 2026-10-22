import axiosClient from './axiosClient.js'

const uploadApi = {
  // folder: 'common' | 'restaurants' | 'menu-items' | 'avatars'
  // Returns { success, data: { url, publicId }, message } - url is a Cloudinary https URL
  uploadImage: async (file, folder = 'common') => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await axiosClient.post('/uploads/images', formData, {
      params: { folder },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

export default uploadApi
