import express from "express";
import { userController } from "./user.controller";
import { auth } from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";

const router = express.Router();

router.patch(
  "/update-profile",
  auth(Role.ADMIN, Role.MANAGER, Role.MEMBER),
  upload.single("profileImage"), 
  userController.updateProfileController
);

export const userRoutes = router;