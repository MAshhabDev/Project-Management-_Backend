import { ProjectStatus } from '../../../generated/prisma/enums';

export interface ICreateProject {
  organizationId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface IProjectFilterQuery {
  page?: string;
  limit?: string;
  searchTerm?: string;
  status?: ProjectStatus;
  organizationId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}