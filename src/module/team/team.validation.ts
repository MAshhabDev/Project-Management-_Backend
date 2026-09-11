
import z from 'zod';

const CreateTeamZodSchema = z.object({
  organizationId: z.string('Organization ID is required' ),
  name: z
    .string( 'Team name is required' )
    .min(2, 'Team name must be at least 2 characters long')
    .max(50, 'Team name cannot exceed 50 characters'),
  description: z.string().optional(),
});

const AddTeamMemberZodSchema = z.object({
  userId: z.string( 'User ID to add is required' ),
});

export const TeamValidation = {
  CreateTeamZodSchema,
  AddTeamMemberZodSchema,
};