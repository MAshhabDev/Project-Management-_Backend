import { Router } from 'express';
import { Role } from '../../../generated/prisma/enums';
import { auth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { organizationController } from './organization.controller';
import { OrganizationValidation } from './organization.validation';

const router = Router();

router.post(
  '/',
  auth(),
  validateRequest(OrganizationValidation.CreateOrganizationZodSchema),
  organizationController.createOrganization
);

router.get(
  '/',
  auth(),
  organizationController.getMyOrganizations
);

router.get(
  '/:id',
  auth(),
  organizationController.getOrganizationById
);

router.post(
  '/:id/invite',
  auth(Role.ADMIN, Role.MANAGER),
  validateRequest(OrganizationValidation.InviteMemberZodSchema),
  organizationController.inviteMember
);

export const organizationRoutes = router;