import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

export interface IUpdateUserPayload {
  name?: string;
}

const updateProfile = async (
  userId: string,
  payload: IUpdateUserPayload,
  file?: Express.Multer.File
) => {

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      imageUrl: true,
      imagePublicId: true,
    },
  });

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }

  let imageUrl = currentUser.imageUrl;
  let imagePublicId = currentUser.imagePublicId;

  if (file && file.buffer) {
    const cloudinaryResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
              folder: "saas_user_profiles",
            },
            (error, result) => {
              if (error) {
                return reject(
                  new AppError(
                    httpStatus.INTERNAL_SERVER_ERROR,
                    `Cloudinary Upload Error: ${error.message}`
                  )
                );
              }
              if (!result) {
                return reject(
                  new AppError(
                    httpStatus.INTERNAL_SERVER_ERROR,
                    "No result returned from Cloudinary"
                  )
                );
              }
              resolve(result);
            }
          )
          .end(file.buffer);
      }
    );

    imageUrl = cloudinaryResult.secure_url;
    imagePublicId = cloudinaryResult.public_id;

    if (currentUser.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(currentUser.imagePublicId);
      } catch (destroyError) {
        console.error("Failed to delete old image from Cloudinary:", destroyError);
      }
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name && { name: payload.name }),
      ...(imageUrl && { imageUrl }),
      ...(imagePublicId && { imagePublicId }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

export const userService = {
  updateProfile,
};