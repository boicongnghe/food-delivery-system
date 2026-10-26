import axiosClient from './axiosClient.js'

const uploadApi = {
  // folder: 'restaurants' | 'menu-items'
  // Returns { success, data: { url, publicId }, message } - url is a Cloudinary https URL
  uploadImage: async (file, folder) => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await axiosClient.post('/uploads/images', formData, {
      params: { folder },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Delete an image you uploaded but did not save (server refuses images still in use)
  deleteUnusedImage: async (url) => {
    const response = await axiosClient.delete('/uploads/images', { data: { url } })
    return response.data
  },
}

export default uploadApi
