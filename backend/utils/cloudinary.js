import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("File uploaded on Cloudinary. File src: " + response.url);
    //once file is uploaded, we would like to delete it from our server
    fs.unlinkSync(localFilePath);
    return response;
  } catch (err) {
    console.log("Error on Cloudinary ", err);
    // Only unlink if the file exists
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        cloudinary.uploader.destroy(publicId);
        console.log("Deleted From Cloudinary. Public id: ", publicId)
    } catch(err) {
        console.log("Error deleting from cloudinary", err);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };
