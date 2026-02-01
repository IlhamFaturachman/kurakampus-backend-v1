import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FilterOrganizationDto {
  @ApiPropertyOptional({
    description: 'Filter berdasarkan nama instansi',
    example: 'Universitas Brawijaya',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  namaInstansi?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan daerah instansi',
    example: 'Malang',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  daerahInstansi?: string;

  @ApiPropertyOptional({
    description:
      'Filter berdasarkan jenis organisasi (bisa multiple, pisahkan dengan koma)',
    example: 'BEM,UKM',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item);
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  jenisOrganisasi?: string[];

  @ApiPropertyOptional({
    description:
      'Filter berdasarkan bidang organisasi (bisa multiple, pisahkan dengan koma)',
    example: 'Olahraga,Seni',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item);
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  bidangOrganisasi?: string[];

  @ApiPropertyOptional({
    description: 'Filter tahun berdiri minimum',
    example: 2000,
    minimum: 1900,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  tahunBerdiriMin?: number;

  @ApiPropertyOptional({
    description: 'Filter tahun berdiri maksimum',
    example: 2024,
    maximum: new Date().getFullYear(),
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(new Date().getFullYear())
  tahunBerdiriMax?: number;

  @ApiPropertyOptional({
    description:
      'Pencarian global (nama organisasi, penjelasan singkat, proker)',
    example: 'teknologi',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Nomor halaman',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Jumlah data per halaman',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Field untuk sorting',
    example: 'createdAt',
    default: 'createdAt',
    enum: [
      'namaInstansi',
      'namaOrganisasi',
      'jenisOrganisasi',
      'bidangOrganisasi',
      'tahunBerdiri',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Urutan sorting',
    example: 'DESC',
    default: 'DESC',
    enum: SortOrder,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  @Transform(({ value }: { value: string }) => value?.toUpperCase())
  sortOrder?: SortOrder = SortOrder.DESC;
}
