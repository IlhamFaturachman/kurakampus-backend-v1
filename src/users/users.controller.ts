import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('user.create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Permissions('read:users')
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.usersService.findAll(+page || 1, +limit || 10);
  }

  @Get(':id')
  @Permissions('read:users')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('write:users')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/roles')
  @Permissions('write:users')
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto);
  }

  @Delete(':id/roles/:assignmentId')
  @Permissions('write:users')
  removeRole(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.usersService.removeRole(id, assignmentId);
  }

  @Delete(':id')
  @Permissions('delete:users')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
