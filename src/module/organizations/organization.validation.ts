import z from 'zod';
import { Role } from '../../../generated/prisma/enums';

const CreateOrganizationZodSchema = z.object({
  name: z
    .string( 'Organization name is required' )
    .min(3, 'Name must be at least 3 characters long')
    .max(50, 'Name cannot exceed 50 characters'),
});

const InviteMemberZodSchema = z.object({
  email: z
    .email('Invalid email address format'),
  role: z.nativeEnum(Role).optional(),
});

export const OrganizationValidation = {
  CreateOrganizationZodSchema,
  InviteMemberZodSchema,
};