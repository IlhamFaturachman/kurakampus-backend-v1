import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RbacService } from '../rbac.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @Permissions('read:roles')
  findAll(@Req() req) {
    return this.rbacService.findAllRoles(req.user);
  }

  @Get(':id')
  @Permissions('read:roles')
  findOne(@Param('id') id: string) {
    return this.rbacService.findOneRole(id);
  }

  @Post()
  @Permissions('write:roles')
  create(@Body() createRoleDto: CreateRoleDto, @Req() req) {
    return this.rbacService.createRole(createRoleDto, req.user);
  }

  @Patch(':id')
  @Permissions('write:roles')
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req,
  ) {
    return this.rbacService.updateRole(id, updateRoleDto, req.user);
  }

  @Delete(':id')
  @Permissions('delete:roles')
  remove(@Param('id') id: string, @Req() req) {
    return this.rbacService.removeRole(id, req.user);
  }
}
