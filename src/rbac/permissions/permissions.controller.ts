import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { RbacService } from '../rbac.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @Permissions('read:roles')
  findAll(@Req() req) {
    return this.rbacService.findAllPermissions(req.user);
  }
}
