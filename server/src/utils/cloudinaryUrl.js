import cloudinary from '../config/cloudinary.js';

export const ROOT_FOLDER = 'food-delivery';

// Only accept URLs exactly as returned by our upload endpoint:
// https://res.cloudinary.com/<cloud>/image/upload/v<version>/food-delivery/<...>.<ext>
const URL_PATTERN = /^\/([^/]+)\/image\/upload\/v\d+\/(food-delivery\/[^.]+)\.(jpe?g|png|webp)$/i;

/**
 * Returns the Cloudinary public ID of an image uploaded by this system,
 * or null if the URL is not from our Cloudinary account / root folder.
 */
export const getPublicIdFromUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.search || url.hash) {
    return null;
  }

  const match = url.pathname.match(URL_PATTERN);
  if (!match || match[1] !== cloudinary.config().cloud_name) {
    return null;
  }

  return decodeURIComponent(match[2]);
};
