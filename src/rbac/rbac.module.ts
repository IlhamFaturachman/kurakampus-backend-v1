import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RolesController } from './roles/roles.controller';
import { PermissionsController } from './permissions/permissions.controller';

@Module({
  providers: [RbacService],
  controllers: [RolesController, PermissionsController],
})
export class RbacModule {}
