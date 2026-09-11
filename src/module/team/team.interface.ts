export interface ICreateTeam {
  organizationId: string;
  name: string;
  description?: string;
}

export interface IAddTeamMember {
  userId: string;
}