import { Router } from 'express';
import { organizationController } from './organization.controller';
import { organizationValidation } from './organization.validation';
import { validateRequest } from '../../middlewares/validateRequest';
import { auth } from '../../middlewares/auth';
import { Role } from '../../../generated/prisma/enums';

const router = Router();

// Create Organization (Any logged-in user can create)
router.post(
  '/',
  auth(),
  validateRequest(organizationValidation.CreateOrganizationZodSchema),
  organizationController.createOrganization
);

// Get My Organizations
router.get(
  '/',
  auth(),
  organizationController.getMyOrganizations
);

// Get Organization Details by ID (Multi-tenancy Protected)
router.get(
  '/:id',
  auth(),
  organizationController.getOrganizationById
);

// Invite Member to Organization (Owner/Manager Only)
router.post(
  '/:id/invite',
  auth(Role.ADMIN, Role.MANAGER),
  validateRequest(organizationValidation.InviteMemberZodSchema),
  organizationController.inviteMember
);

export const organizationRoutes = router;