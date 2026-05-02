import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissionsData = [
  // System
  { name: 'manage:all', module: 'system', description: 'Full access' },
  
  // Roles & Users
  { name: 'role.create', module: 'rbac', description: 'Create roles' },
  { name: 'role.edit', module: 'rbac', description: 'Edit roles' },
  { name: 'role.delete', module: 'rbac', description: 'Delete roles' },
  { name: 'user.create', module: 'users', description: 'Create users' },
  { name: 'user.assign_role', module: 'users', description: 'Assign roles to users' },
  { name: 'user.view_all', module: 'users', description: 'View all users' },

  // Organizations
  { name: 'org.create', module: 'organizations', description: 'Create organizations' },
  { name: 'org.edit', module: 'organizations', description: 'Edit organizations' },
  { name: 'org.delete', module: 'organizations', description: 'Delete organizations' },
  { name: 'org.view_all', module: 'organizations', description: 'View all organizations' },
  { name: 'org.manage_members', module: 'organizations', description: 'Manage members in organization' },

  // Proposals
  { name: 'proposal.create', module: 'proposals', description: 'Create proposal' },
  { name: 'proposal.edit', module: 'proposals', description: 'Edit proposal' },
  { name: 'proposal.approve', module: 'proposals', description: 'Approve proposal' },
  { name: 'proposal.view_all', module: 'proposals', description: 'View all proposals' },
  { name: 'proposal.view_own', module: 'proposals', description: 'View own proposals' },

  // Budgets & LPJ
  { name: 'budget.create', module: 'budget', description: 'Create budget' },
  { name: 'budget.edit', module: 'budget', description: 'Edit budget' },
  { name: 'budget.approve', module: 'budget', description: 'Approve budget' },
  { name: 'budget.view', module: 'budget', description: 'View budget' },
  { name: 'lpj.create', module: 'lpj', description: 'Create LPJ' },
  { name: 'lpj.approve', module: 'lpj', description: 'Approve LPJ' },
  { name: 'lpj.export', module: 'lpj', description: 'Export LPJ' },
  { name: 'lpj.upload_receipt', module: 'lpj', description: 'Upload receipts' },
];

const rolesData = [
  { name: 'SUPER_ADMIN', description: 'Super Admin', isSystem: true, permissions: ['manage:all'] },
  { name: 'ADMIN_KAMPUS', description: 'Admin Kampus', isSystem: true, permissions: [
    'org.view_all', 'org.edit', 'user.view_all', 'user.assign_role', 
    'proposal.view_all', 'proposal.approve', 'lpj.approve'
  ]},
  { name: 'KETUA_ORGANISASI', description: 'Ketua Organisasi', isSystem: false, permissions: [
    'proposal.create', 'proposal.edit', 'proposal.view_own', 'budget.create', 'budget.edit', 
    'lpj.create', 'lpj.export', 'org.edit', 'org.manage_members',
    'role.create', 'role.edit', 'role.delete',
  ]},
  { name: 'DOSEN_PEMBINA', description: 'Dosen Pembina', isSystem: false, permissions: [
    'proposal.view_all', 'proposal.approve', 'budget.approve', 'lpj.approve'
  ]},
  { name: 'MAHASISWA', description: 'Mahasiswa (Default)', isSystem: true, permissions: [
    'proposal.view_own', 'budget.view', 'org.view_all'
  ]},
];

async function main() {
  console.log('🌱 Starting refined seeding...');

  // 1. Seed Permissions
  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: perm,
      create: perm,
    });
  }

  // 1.5 Clean up unused system roles (only system roles without an org)
  const validRoleNames = rolesData.map((r) => r.name);
  await prisma.role.deleteMany({
    where: {
      name: { notIn: validRoleNames },
      organizationId: null, // Only clean global/system roles, leave org-specific custom roles alone
    },
  });

  // 2. Seed Roles & link permissions
  for (const roleInfo of rolesData) {
    const { permissions, ...roleData } = roleInfo;
    const existingRole = await prisma.role.findFirst({
      where: { name: roleData.name, organizationId: null },
    });

    const role = existingRole
      ? await prisma.role.update({ where: { id: existingRole.id }, data: roleData })
      : await prisma.role.create({ data: { ...roleData, organizationId: null } });

    // Sync permissions: clear old links, then re-create
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permName of permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  }

  // 3. Seed test users
  const hashedPassword = await argon2.hash('password123');
  
  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@kurakampus.com' },
    update: {},
    create: {
      email: 'superadmin@kurakampus.com',
      username: 'superadmin',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  const superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN', organizationId: null } });
  if (superAdminRole) {
    const existing = await prisma.userRole.findFirst({
      where: { userId: superAdmin.id, roleId: superAdminRole.id, organizationId: null }
    });
    if (!existing) {
      await prisma.userRole.create({
        data: { userId: superAdmin.id, roleId: superAdminRole.id, organizationId: null },
      });
    }
  }

  console.log('✅ Seeding finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
