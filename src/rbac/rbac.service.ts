import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

// Permissions that only SuperAdmin (manage:all) should be able to assign
const RESTRICTED_PERMISSIONS = ['manage:all'];

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────── Roles ────────────────────

  /**
   * Find all roles.
   * - SuperAdmin (manage:all): sees everything
   * - Org user: sees system roles + their own org's custom roles
   */
  async findAllRoles(user: any) {
    const isSuperAdmin = user.permissions?.includes('manage:all');

    const where = isSuperAdmin
      ? {} // SuperAdmin sees all
      : {
          OR: [
            { organizationId: null }, // System/global roles
            ...this.getUserOrgIds(user).map((orgId) => ({
              organizationId: orgId,
            })),
          ],
        };

    return this.prisma.role.findMany({
      where,
      include: {
        _count: {
          select: { rolePermissions: true, userRoles: true },
        },
        organization: {
          select: { id: true, namaOrganisasi: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async findOneRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        organization: {
          select: { id: true, namaOrganisasi: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async createRole(dto: CreateRoleDto, user: any) {
    const isSuperAdmin = user.permissions?.includes('manage:all');
    const orgId = dto.organizationId || null;

    // Non-SuperAdmin must scope to their own org
    if (!isSuperAdmin) {
      if (!orgId) {
        throw new ForbiddenException(
          'You must specify an organizationId to create a custom role',
        );
      }

      const userOrgIds = this.getUserOrgIds(user);
      if (!userOrgIds.includes(orgId)) {
        throw new ForbiddenException(
          'You can only create roles for your own organization',
        );
      }

      // Validate permission IDs — block restricted permissions
      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await this.validatePermissionIds(dto.permissionIds);
      }
    }

    // Check for duplicate name within the same org scope
    const existing = await this.prisma.role.findFirst({
      where: { name: dto.name, organizationId: orgId },
    });
    if (existing)
      throw new ConflictException(
        'Role with this name already exists in this scope',
      );

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description,
          organizationId: orgId,
          isSystem: false, // Custom roles are never system roles
        },
      });

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((pId: string) => ({
            roleId: role.id,
            permissionId: pId,
          })),
        });
      }

      return role;
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto, user: any) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const isSuperAdmin = user.permissions?.includes('manage:all');

    // Non-SuperAdmin can only edit roles from their own org
    if (!isSuperAdmin) {
      if (role.isSystem) {
        throw new ForbiddenException('You cannot edit system roles');
      }

      if (!role.organizationId) {
        throw new ForbiddenException('You cannot edit global roles');
      }

      const userOrgIds = this.getUserOrgIds(user);
      if (!userOrgIds.includes(role.organizationId)) {
        throw new ForbiddenException(
          'You can only edit roles for your own organization',
        );
      }

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await this.validatePermissionIds(dto.permissionIds);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      if (dto.permissionIds) {
        // Sync permissions: Delete old, add new
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((pId: string) => ({
              roleId: id,
              permissionId: pId,
            })),
          });
        }
      }

      return updatedRole;
    });
  }

  async removeRole(id: string, user: any) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem)
      throw new ConflictException('Cannot delete system roles');

    const isSuperAdmin = user.permissions?.includes('manage:all');

    if (!isSuperAdmin) {
      if (!role.organizationId) {
        throw new ForbiddenException('You cannot delete global roles');
      }

      const userOrgIds = this.getUserOrgIds(user);
      if (!userOrgIds.includes(role.organizationId)) {
        throw new ForbiddenException(
          'You can only delete roles for your own organization',
        );
      }
    }

    return this.prisma.role.delete({ where: { id } });
  }

  // ──────────────────── Permissions ────────────────────

  /**
   * Find all permissions.
   * - SuperAdmin: sees everything
   * - Others: hide restricted permissions (manage:all, etc.)
   */
  async findAllPermissions(user: any) {
    const isSuperAdmin = user.permissions?.includes('manage:all');

    return this.prisma.permission.findMany({
      where: isSuperAdmin ? {} : { name: { notIn: RESTRICTED_PERMISSIONS } },
      orderBy: { module: 'asc' },
    });
  }

  // ──────────────────── Helpers ────────────────────

  /**
   * Extract organization IDs from the user's role assignments.
   */
  private getUserOrgIds(user: any): string[] {
    if (!user.userRoles) return [];
    return user.userRoles
      .filter((ur: any) => ur.organizationId)
      .map((ur: any) => ur.organizationId);
  }

  /**
   * Validate that none of the given permission IDs map to restricted permissions.
   */
  private async validatePermissionIds(permissionIds: string[]) {
    const restrictedPerms = await this.prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        name: { in: RESTRICTED_PERMISSIONS },
      },
    });

    if (restrictedPerms.length > 0) {
      const names = restrictedPerms.map((p) => p.name).join(', ');
      throw new ForbiddenException(
        `You cannot assign restricted permissions: ${names}`,
      );
    }
  }
}
