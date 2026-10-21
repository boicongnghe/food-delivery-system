import { v2 as cloudinary } from 'cloudinary';

// Credentials come from CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
// (the SDK reads this variable automatically)
cloudinary.config({ secure: true });

export const isCloudinaryConfigured = () => {
  const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } = cloudinary.config();
  return Boolean(cloudName && apiKey && apiSecret);
};

export default cloudinary;
