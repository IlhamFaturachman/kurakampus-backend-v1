import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Check for existing email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already registered');

    // Auto-generate username from email if not provided
    const username = dto.username || dto.email.split('@')[0];
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          username,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: 'ACTIVE',
          emailVerified: true, // Admin-created users are pre-verified
        },
      });

      // Assign roles if provided
      if (dto.roleIds && dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
          })),
        });
      }

      // Re-fetch with roles included
      const fullUser = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: { role: true, organization: true },
          },
        },
      });

      return this.formatUser(fullUser);
    });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where: { deletedAt: null },
        include: {
          userRoles: {
            include: {
              role: true,
              organization: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      data: users.map((user) => this.formatUser(user)),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true,
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUser(user);
  }

  async update(id: string, dto: import('./dto/update-user.dto').UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async assignRole(
    userId: string,
    dto: import('./dto/assign-role.dto').AssignRoleDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Check if assignment already exists
    const existing = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId: dto.roleId,
        organizationId: dto.organizationId || null,
      },
    });

    if (existing) return existing;

    return this.prisma.userRole.create({
      data: {
        userId,
        roleId: dto.roleId,
        organizationId: dto.organizationId || null,
      },
    });
  }

  async removeRole(userId: string, roleAssignmentId: string) {
    const assignment = await this.prisma.userRole.findUnique({
      where: { id: roleAssignmentId },
    });

    if (!assignment || assignment.userId !== userId) {
      throw new NotFoundException('Role assignment not found');
    }

    return this.prisma.userRole.delete({
      where: { id: roleAssignmentId },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private formatUser(user: any) {
    const { password, ...rest } = user;
    const roles = user.userRoles.map((ur: any) => ({
      id: ur.role.id,
      name: ur.role.name,
      organization: ur.organization
        ? { id: ur.organization.id, name: ur.organization.namaOrganisasi }
        : null,
      assignedAt: ur.assignedAt,
    }));

    return {
      ...rest,
      roles,
    };
  }
}
