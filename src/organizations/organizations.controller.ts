import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  FilterOrganizationDto,
  BulkDeleteDto,
  OrganizationResponseDto,
  PaginatedResponseDto,
  ImportCsvResponseDto,
  FilterOptionsDto,
  StatsResponseDto,
  BulkDeleteResponseDto,
} from './dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ==================== CRUD ENDPOINTS ====================

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Membuat organisasi baru' })
  @ApiResponse({
    status: 201,
    description: 'Organisasi berhasil dibuat',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  @ApiResponse({ status: 401, description: 'Tidak terautentikasi' })
  @ApiResponse({ status: 409, description: 'Organisasi sudah ada' })
  async create(@Body() dto: CreateOrganizationDto) {
    const organization = await this.organizationsService.create(dto);
    return {
      success: true,
      message: 'Organisasi berhasil dibuat',
      data: organization,
    };
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Mendapatkan daftar organisasi dengan pagination dan filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar organisasi berhasil diambil',
  })
  @ApiQuery({
    name: 'namaInstansi',
    required: false,
    description: 'Filter berdasarkan nama instansi',
  })
  @ApiQuery({
    name: 'daerahInstansi',
    required: false,
    description: 'Filter berdasarkan daerah',
  })
  @ApiQuery({
    name: 'jenisOrganisasi',
    required: false,
    description: 'Filter berdasarkan jenis (comma-separated)',
  })
  @ApiQuery({
    name: 'bidangOrganisasi',
    required: false,
    description: 'Filter berdasarkan bidang (comma-separated)',
  })
  @ApiQuery({
    name: 'tahunBerdiriMin',
    required: false,
    type: Number,
    description: 'Filter tahun berdiri minimum',
  })
  @ApiQuery({
    name: 'tahunBerdiriMax',
    required: false,
    type: Number,
    description: 'Filter tahun berdiri maksimum',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Pencarian global',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Nomor halaman (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Jumlah per halaman (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field untuk sorting (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Urutan sorting (default: DESC)',
  })
  async findAll(
    @Query() filter: FilterOrganizationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    return this.organizationsService.findAll(filter);
  }

  @Get('filters/options')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Mendapatkan opsi filter (nilai unik untuk dropdown)',
  })
  @ApiResponse({
    status: 200,
    description: 'Opsi filter berhasil diambil',
    type: FilterOptionsDto,
  })
  async getFilterOptions(): Promise<{
    success: boolean;
    message: string;
    data: FilterOptionsDto;
  }> {
    const options = await this.organizationsService.getFilterOptions();
    return {
      success: true,
      message: 'Opsi filter berhasil diambil',
      data: options,
    };
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Mendapatkan statistik organisasi' })
  @ApiResponse({
    status: 200,
    description: 'Statistik berhasil diambil',
    type: StatsResponseDto,
  })
  async getStats(): Promise<{
    success: boolean;
    message: string;
    data: StatsResponseDto;
  }> {
    const stats = await this.organizationsService.getStats();
    return {
      success: true,
      message: 'Statistik berhasil diambil',
      data: stats,
    };
  }

  @Get('csv-template')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Download template CSV untuk import' })
  @ApiResponse({
    status: 200,
    description: 'Template CSV',
    content: {
      'text/csv': {
        schema: { type: 'string' },
      },
    },
  })
  getCsvTemplate(@Res() res: Response) {
    const template = this.organizationsService.getCsvTemplate();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=organizations_template.csv',
    );
    res.send(template);
  }

  @Get('export-csv')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Export data organisasi ke CSV' })
  @ApiResponse({
    status: 200,
    description: 'File CSV organisasi',
    content: {
      'text/csv': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiQuery({ name: 'namaInstansi', required: false })
  @ApiQuery({ name: 'daerahInstansi', required: false })
  @ApiQuery({ name: 'jenisOrganisasi', required: false })
  @ApiQuery({ name: 'bidangOrganisasi', required: false })
  @ApiQuery({ name: 'tahunBerdiriMin', required: false, type: Number })
  @ApiQuery({ name: 'tahunBerdiriMax', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  async exportCsv(
    @Query() filter: FilterOrganizationDto,
    @Res() res: Response,
  ) {
    const csvContent = await this.organizationsService.exportToCsv(filter);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `organizations_export_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csvContent);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Mendapatkan detail organisasi berdasarkan ID' })
  @ApiParam({ name: 'id', description: 'UUID organisasi' })
  @ApiResponse({
    status: 200,
    description: 'Detail organisasi',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organisasi tidak ditemukan' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const organization = await this.organizationsService.findOne(id);
    return {
      success: true,
      message: 'Detail organisasi berhasil diambil',
      data: organization,
    };
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Memperbarui organisasi' })
  @ApiParam({ name: 'id', description: 'UUID organisasi' })
  @ApiResponse({
    status: 200,
    description: 'Organisasi berhasil diperbarui',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  @ApiResponse({ status: 401, description: 'Tidak terautentikasi' })
  @ApiResponse({ status: 404, description: 'Organisasi tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Duplikat organisasi' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const organization = await this.organizationsService.update(id, dto);
    return {
      success: true,
      message: 'Organisasi berhasil diperbarui',
      data: organization,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menghapus organisasi' })
  @ApiParam({ name: 'id', description: 'UUID organisasi' })
  @ApiResponse({
    status: 200,
    description: 'Organisasi berhasil dihapus',
  })
  @ApiResponse({ status: 401, description: 'Tidak terautentikasi' })
  @ApiResponse({ status: 404, description: 'Organisasi tidak ditemukan' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.organizationsService.remove(id);
    return {
      success: true,
      message: 'Organisasi berhasil dihapus',
    };
  }

  // ==================== BULK OPERATIONS ====================

  @Post('bulk-delete')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menghapus banyak organisasi sekaligus' })
  @ApiResponse({
    status: 200,
    description: 'Organisasi berhasil dihapus',
    type: BulkDeleteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Data tidak valid' })
  @ApiResponse({ status: 401, description: 'Tidak terautentikasi' })
  async bulkDelete(@Body() dto: BulkDeleteDto): Promise<BulkDeleteResponseDto> {
    const result = await this.organizationsService.bulkDelete(dto.ids);
    return {
      success: true,
      message: `Berhasil menghapus ${result.deleted} organisasi`,
      deleted: result.deleted,
    };
  }

  // ==================== CSV OPERATIONS ====================

  @Post('import-csv')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (_req, file, callback) => {
        if (!file.originalname.match(/\.(csv)$/i)) {
          return callback(
            new Error('Hanya file CSV yang diperbolehkan'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Import organisasi dari file CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File CSV untuk diimport',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Hasil import CSV',
    type: ImportCsvResponseDto,
  })
  @ApiResponse({ status: 400, description: 'File tidak valid atau kosong' })
  @ApiResponse({ status: 401, description: 'Tidak terautentikasi' })
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportCsvResponseDto> {
    return this.organizationsService.importFromCsv(file);
  }
}
