import { Router } from 'express';
import { teamController } from './team.controller';
import { TeamValidation } from './team.validation';
import { Role } from '../../../generated/prisma/enums';
import { validateRequest } from '../../middleware/validateRequest';
import { auth } from '../../middleware/auth';

const router = Router();

router.post(
  '/',
  auth(Role.ADMIN, Role.MANAGER),
  validateRequest(TeamValidation.CreateTeamZodSchema),
  teamController.createTeam
);

router.post(
  '/:id/members',
  auth(Role.ADMIN, Role.MANAGER),
  validateRequest(TeamValidation.AddTeamMemberZodSchema),
  teamController.addTeamMember
);

router.get(
  '/:id',
  auth(),
  teamController.getTeamById
);

export const teamRoutes = router;