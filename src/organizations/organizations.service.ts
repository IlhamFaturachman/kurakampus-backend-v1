import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Organization } from '@prisma/client';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  FilterOrganizationDto,
  SortOrder,
  ImportCsvResponseDto,
  FilterOptionsDto,
  StatsResponseDto,
  PaginatedResponseDto,
  ImportErrorDetail,
} from './dto';
import {
  parseCsvContent,
  generateCsvContent,
  getCsvTemplate,
} from './utils/csv.helper';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new organization
   */
  async create(dto: CreateOrganizationDto): Promise<Organization> {
    // Check for duplicate
    const existing = await this.prisma.organization.findFirst({
      where: {
        namaInstansi: dto.namaInstansi,
        namaOrganisasi: dto.namaOrganisasi,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Organisasi dengan nama yang sama sudah ada di instansi ini',
      );
    }

    const organization = await this.prisma.organization.create({
      data: {
        namaInstansi: dto.namaInstansi,
        daerahInstansi: dto.daerahInstansi,
        namaOrganisasi: dto.namaOrganisasi,
        kontak: dto.kontak,
        jenisOrganisasi: dto.jenisOrganisasi,
        bidangOrganisasi: dto.bidangOrganisasi,
        tahunBerdiri: dto.tahunBerdiri,
        penjelasanSingkat: dto.penjelasanSingkat,
        proker: dto.proker || [],
      },
    });

    return organization;
  }

  /**
   * Get all organizations with pagination and filtering
   */
  async findAll(
    filter: FilterOrganizationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const {
      namaInstansi,
      daerahInstansi,
      jenisOrganisasi,
      bidangOrganisasi,
      tahunBerdiriMin,
      tahunBerdiriMax,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = filter;

    // Build where clause
    const where: Prisma.OrganizationWhereInput = {};

    // Exact match filters
    if (namaInstansi) {
      where.namaInstansi = namaInstansi;
    }

    if (daerahInstansi) {
      where.daerahInstansi = daerahInstansi;
    }

    // Array filters (OR condition)
    if (jenisOrganisasi && jenisOrganisasi.length > 0) {
      where.jenisOrganisasi = { in: jenisOrganisasi };
    }

    if (bidangOrganisasi && bidangOrganisasi.length > 0) {
      where.bidangOrganisasi = { in: bidangOrganisasi };
    }

    // Range filter for tahunBerdiri
    if (tahunBerdiriMin !== undefined || tahunBerdiriMax !== undefined) {
      where.tahunBerdiri = {};
      if (tahunBerdiriMin !== undefined) {
        where.tahunBerdiri.gte = tahunBerdiriMin;
      }
      if (tahunBerdiriMax !== undefined) {
        where.tahunBerdiri.lte = tahunBerdiriMax;
      }
    }

    // Global search
    if (search) {
      where.OR = [
        { namaOrganisasi: { contains: search, mode: 'insensitive' } },
        { penjelasanSingkat: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const validSortFields = [
      'namaInstansi',
      'namaOrganisasi',
      'jenisOrganisasi',
      'bidangOrganisasi',
      'tahunBerdiri',
      'createdAt',
      'updatedAt',
    ];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy: Prisma.OrganizationOrderByWithRelationInput = {
      [orderField]: sortOrder.toLowerCase() as 'asc' | 'desc',
    };

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Data organisasi berhasil diambil',
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single organization by ID
   */
  async findOne(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organisasi tidak ditemukan');
    }

    return organization;
  }

  /**
   * Update an organization
   */
  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    // Check if organization exists
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Organisasi tidak ditemukan');
    }

    // Check for duplicate if changing namaInstansi or namaOrganisasi
    if (dto.namaInstansi || dto.namaOrganisasi) {
      const duplicate = await this.prisma.organization.findFirst({
        where: {
          namaInstansi: dto.namaInstansi || existing.namaInstansi,
          namaOrganisasi: dto.namaOrganisasi || existing.namaOrganisasi,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Organisasi dengan nama yang sama sudah ada di instansi ini',
        );
      }
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: dto,
    });

    return organization;
  }

  /**
   * Delete an organization
   */
  async remove(id: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Organisasi tidak ditemukan');
    }

    await this.prisma.organization.delete({
      where: { id },
    });
  }

  /**
   * Bulk delete organizations
   */
  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    const result = await this.prisma.organization.deleteMany({
      where: { id: { in: ids } },
    });

    return { deleted: result.count };
  }

  /**
   * Import organizations from CSV file
   */
  async importFromCsv(
    file: Express.Multer.File,
  ): Promise<ImportCsvResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File CSV tidak ditemukan');
    }

    // Check file type
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'text/plain',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format file tidak valid. Gunakan file CSV (.csv)',
      );
    }

    const csvContent = file.buffer.toString('utf-8');
    const { validRows, invalidRows, totalRows } = parseCsvContent(csvContent);

    if (totalRows === 0) {
      throw new BadRequestException('File CSV kosong atau tidak memiliki data');
    }

    const errors: ImportErrorDetail[] = [...invalidRows];
    let successCount = 0;

    // Process valid rows
    for (const row of validRows) {
      try {
        // Check for duplicate
        const existing = await this.prisma.organization.findFirst({
          where: {
            namaInstansi: row.data.namaInstansi,
            namaOrganisasi: row.data.namaOrganisasi,
          },
        });

        if (existing) {
          errors.push({
            row: row.rowNumber,
            reason: `Duplikat: "${row.data.namaOrganisasi}" sudah ada di "${row.data.namaInstansi}"`,
            data: row.data as Record<string, unknown>,
          });
          continue;
        }

        // Create organization
        await this.prisma.organization.create({
          data: {
            namaInstansi: row.data.namaInstansi!,
            daerahInstansi: row.data.daerahInstansi!,
            namaOrganisasi: row.data.namaOrganisasi!,
            kontak: row.data.kontak!,
            jenisOrganisasi: row.data.jenisOrganisasi!,
            bidangOrganisasi: row.data.bidangOrganisasi!,
            tahunBerdiri: row.data.tahunBerdiri!,
            penjelasanSingkat: row.data.penjelasanSingkat,
            proker: row.data.proker || [],
          },
        });

        successCount++;
      } catch (error) {
        this.logger.error(`Error importing row ${row.rowNumber}:`, error);
        errors.push({
          row: row.rowNumber,
          reason:
            error instanceof Error ? error.message : 'Error tidak diketahui',
          data: row.data as Record<string, unknown>,
        });
      }
    }

    const failedCount = totalRows - successCount;

    return {
      success: successCount > 0,
      message:
        successCount > 0
          ? `Berhasil mengimport ${successCount} dari ${totalRows} data`
          : 'Tidak ada data yang berhasil diimport',
      totalRows,
      successCount,
      failedCount,
      errors: errors.sort((a, b) => a.row - b.row),
    };
  }

  /**
   * Export organizations to CSV format
   */
  async exportToCsv(filter: FilterOrganizationDto): Promise<string> {
    // Use findAll but with high limit to get all matching data
    const filterWithoutPagination = { ...filter, page: 1, limit: 10000 };
    const result = await this.findAll(filterWithoutPagination);

    // Type assertion for the data
    const organizations = result.data as Array<{
      namaInstansi: string;
      daerahInstansi: string;
      namaOrganisasi: string;
      kontak: string;
      jenisOrganisasi: string;
      bidangOrganisasi: string;
      tahunBerdiri: number;
      penjelasanSingkat?: string | null;
      proker?: unknown;
    }>;

    return generateCsvContent(organizations);
  }

  /**
   * Get CSV template
   */
  getCsvTemplate(): string {
    return getCsvTemplate();
  }

  /**
   * Get filter options (unique values for dropdowns)
   */
  async getFilterOptions(): Promise<FilterOptionsDto> {
    // Get unique values for each filter field
    const [
      namaInstansiResult,
      daerahInstansiResult,
      jenisOrganisasiResult,
      bidangOrganisasiResult,
    ] = await Promise.all([
      this.prisma.organization.findMany({
        select: { namaInstansi: true },
        distinct: ['namaInstansi'],
        orderBy: { namaInstansi: 'asc' },
      }),
      this.prisma.organization.findMany({
        select: { daerahInstansi: true },
        distinct: ['daerahInstansi'],
        orderBy: { daerahInstansi: 'asc' },
      }),
      this.prisma.organization.findMany({
        select: { jenisOrganisasi: true },
        distinct: ['jenisOrganisasi'],
        orderBy: { jenisOrganisasi: 'asc' },
      }),
      this.prisma.organization.findMany({
        select: { bidangOrganisasi: true },
        distinct: ['bidangOrganisasi'],
        orderBy: { bidangOrganisasi: 'asc' },
      }),
    ]);

    return {
      namaInstansi: namaInstansiResult.map(
        (r: { namaInstansi: string }) => r.namaInstansi,
      ),
      daerahInstansi: daerahInstansiResult.map(
        (r: { daerahInstansi: string }) => r.daerahInstansi,
      ),
      jenisOrganisasi: jenisOrganisasiResult.map(
        (r: { jenisOrganisasi: string }) => r.jenisOrganisasi,
      ),
      bidangOrganisasi: bidangOrganisasiResult.map(
        (r: { bidangOrganisasi: string }) => r.bidangOrganisasi,
      ),
    };
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<StatsResponseDto> {
    // Get total count
    const totalOrganizations = await this.prisma.organization.count();

    // Get counts by jenis
    const byJenisResult = await this.prisma.organization.groupBy({
      by: ['jenisOrganisasi'],
      _count: { id: true },
    });
    const byJenis: Record<string, number> = {};
    byJenisResult.forEach((item) => {
      byJenis[item.jenisOrganisasi] = item._count.id;
    });

    // Get counts by bidang
    const byBidangResult = await this.prisma.organization.groupBy({
      by: ['bidangOrganisasi'],
      _count: { id: true },
    });
    const byBidang: Record<string, number> = {};
    byBidangResult.forEach((item) => {
      byBidang[item.bidangOrganisasi] = item._count.id;
    });

    // Get counts by instansi
    const byInstansiResult = await this.prisma.organization.groupBy({
      by: ['namaInstansi'],
      _count: { id: true },
    });
    const byInstansi: Record<string, number> = {};
    byInstansiResult.forEach((item) => {
      byInstansi[item.namaInstansi] = item._count.id;
    });

    // Get 5 recent organizations
    const recentOrganizations = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      totalOrganizations,
      byJenis,
      byBidang,
      byInstansi,
      recentOrganizations,
    };
  }
}
