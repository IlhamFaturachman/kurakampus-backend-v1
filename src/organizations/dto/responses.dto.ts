import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Standard Response wrapper
export class StandardResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operasi berhasil' })
  message: string;

  @ApiPropertyOptional()
  data?: T;
}

// Pagination Meta
export class PaginationMeta {
  @ApiProperty({ example: 1, description: 'Halaman saat ini' })
  page: number;

  @ApiProperty({ example: 10, description: 'Jumlah data per halaman' })
  limit: number;

  @ApiProperty({ example: 100, description: 'Total data' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total halaman' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Ada halaman selanjutnya' })
  hasNextPage: boolean;

  @ApiProperty({ example: false, description: 'Ada halaman sebelumnya' })
  hasPreviousPage: boolean;
}

// Paginated Response
export class PaginatedResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Data berhasil diambil' })
  message: string;

  @ApiProperty({ type: 'array' })
  data: T[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;
}

// CSV Import Error Detail
export class ImportErrorDetail {
  @ApiProperty({ example: 3, description: 'Nomor baris yang error' })
  row: number;

  @ApiProperty({ example: 'Duplikat entry', description: 'Alasan error' })
  reason: string;

  @ApiPropertyOptional({ description: 'Data pada baris tersebut' })
  data?: Record<string, unknown>;
}

// CSV Import Response
export class ImportCsvResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Import CSV berhasil' })
  message: string;

  @ApiProperty({ example: 100, description: 'Total baris yang diproses' })
  totalRows: number;

  @ApiProperty({
    example: 95,
    description: 'Jumlah data yang berhasil diimport',
  })
  successCount: number;

  @ApiProperty({ example: 5, description: 'Jumlah data yang gagal diimport' })
  failedCount: number;

  @ApiProperty({
    type: [ImportErrorDetail],
    description: 'Detail error untuk setiap baris yang gagal',
  })
  errors: ImportErrorDetail[];
}

// Filter Options Response
export class FilterOptionsDto {
  @ApiProperty({
    example: ['Universitas Brawijaya', 'ITS', 'Unair'],
    description: 'Daftar nama instansi unik',
  })
  namaInstansi: string[];

  @ApiProperty({
    example: ['Malang', 'Surabaya', 'Jakarta'],
    description: 'Daftar daerah instansi unik',
  })
  daerahInstansi: string[];

  @ApiProperty({
    example: ['BEM', 'UKM', 'Himpunan'],
    description: 'Daftar jenis organisasi unik',
  })
  jenisOrganisasi: string[];

  @ApiProperty({
    example: ['Olahraga', 'Seni', 'Akademik', 'Sosial'],
    description: 'Daftar bidang organisasi unik',
  })
  bidangOrganisasi: string[];
}

// Statistics by category
export class CategoryStats {
  [key: string]: number;
}

// Statistics Response
export class StatsResponseDto {
  @ApiProperty({ example: 150, description: 'Total organisasi' })
  totalOrganizations: number;

  @ApiProperty({
    example: { BEM: 25, UKM: 80, Himpunan: 45 },
    description: 'Statistik berdasarkan jenis organisasi',
  })
  byJenis: CategoryStats;

  @ApiProperty({
    example: { Olahraga: 30, Seni: 40, Akademik: 50, Sosial: 30 },
    description: 'Statistik berdasarkan bidang organisasi',
  })
  byBidang: CategoryStats;

  @ApiProperty({
    example: { 'Universitas Brawijaya': 60, ITS: 50, Unair: 40 },
    description: 'Statistik berdasarkan instansi',
  })
  byInstansi: CategoryStats;

  @ApiProperty({
    description: '5 organisasi terbaru',
    type: 'array',
  })
  recentOrganizations: unknown[];
}

// Bulk Delete Response
export class BulkDeleteResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Berhasil menghapus 5 organisasi' })
  message: string;

  @ApiProperty({ example: 5, description: 'Jumlah data yang berhasil dihapus' })
  deleted: number;
}

// Organization Response (for single item)
export class OrganizationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Universitas Brawijaya' })
  namaInstansi: string;

  @ApiProperty({ example: 'Malang' })
  daerahInstansi: string;

  @ApiProperty({ example: 'BEM Fakultas Teknik' })
  namaOrganisasi: string;

  @ApiProperty({ example: '081234567890' })
  kontak: string;

  @ApiProperty({ example: 'BEM' })
  jenisOrganisasi: string;

  @ApiProperty({ example: 'Kemahasiswaan' })
  bidangOrganisasi: string;

  @ApiProperty({ example: 2010 })
  tahunBerdiri: number;

  @ApiPropertyOptional({ example: 'Badan Eksekutif Mahasiswa Fakultas Teknik' })
  penjelasanSingkat?: string;

  @ApiPropertyOptional({ example: ['Ospek Fakultas', 'Bakti Sosial'] })
  proker?: string[];

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
