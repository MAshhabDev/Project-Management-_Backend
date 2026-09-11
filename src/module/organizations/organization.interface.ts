import { Role } from '../../../generated/prisma/enums';

export interface ICreateOrganization {
  name: string;
}

export interface IInviteMember {
  email: string;
  role?: Role;
}