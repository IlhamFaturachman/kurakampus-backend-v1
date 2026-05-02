import { IsUUID, IsOptional } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  roleId: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
