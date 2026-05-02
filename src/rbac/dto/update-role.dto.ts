import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permissionIds?: string[];
}
