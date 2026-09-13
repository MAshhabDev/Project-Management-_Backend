import type { UserStatus } from "../../../generated/prisma/enums";

export interface IToggleUserBan {
  status: UserStatus;
}
