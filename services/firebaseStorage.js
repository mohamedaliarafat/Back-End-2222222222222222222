// services/firebaseStorage.js
const bucket = require('../config/firebase');

async function uploadFileToFirebase(localFilePath, destinationPath) {
  try {
    const file = await bucket.upload(localFilePath, {
      destination: destinationPath,
    });
    const uploadedFile = file[0];

    const [url] = await uploadedFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2030',
    });

    return url;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

module.exports = { uploadFileToFirebase };
