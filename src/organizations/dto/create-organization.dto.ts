import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Nama instansi/universitas',
    example: 'Universitas Brawijaya',
    maxLength: 255,
  })
  @IsString({ message: 'Nama instansi harus berupa string' })
  @IsNotEmpty({ message: 'Nama instansi wajib diisi' })
  @MaxLength(255, { message: 'Nama instansi maksimal 255 karakter' })
  @Transform(({ value }: { value: string }) => value?.trim())
  namaInstansi: string;

  @ApiProperty({
    description: 'Daerah/kota lokasi instansi',
    example: 'Malang',
    maxLength: 100,
  })
  @IsString({ message: 'Daerah instansi harus berupa string' })
  @IsNotEmpty({ message: 'Daerah instansi wajib diisi' })
  @MaxLength(100, { message: 'Daerah instansi maksimal 100 karakter' })
  @Transform(({ value }: { value: string }) => value?.trim())
  daerahInstansi: string;

  @ApiProperty({
    description: 'Nama organisasi',
    example: 'BEM Fakultas Teknik',
    maxLength: 255,
  })
  @IsString({ message: 'Nama organisasi harus berupa string' })
  @IsNotEmpty({ message: 'Nama organisasi wajib diisi' })
  @MaxLength(255, { message: 'Nama organisasi maksimal 255 karakter' })
  @Transform(({ value }: { value: string }) => value?.trim())
  namaOrganisasi: string;

  @ApiProperty({
    description: 'Kontak organisasi (nomor telepon/email)',
    example: '081234567890',
    maxLength: 100,
  })
  @IsString({ message: 'Kontak harus berupa string' })
  @IsNotEmpty({ message: 'Kontak wajib diisi' })
  @MaxLength(100, { message: 'Kontak maksimal 100 karakter' })
  @Transform(({ value }: { value: string }) => value?.trim())
  kontak: string;

  @ApiProperty({
    description: 'Jenis organisasi',
    example: 'BEM',
    enum: ['BEM', 'UKM', 'Himpunan', 'Komunitas', 'Lainnya'],
  })
  @IsString({ message: 'Jenis organisasi harus berupa string' })
  @IsNotEmpty({ message: 'Jenis organisasi wajib diisi' })
  @MaxLength(50, { message: 'Jenis organisasi maksimal 50 karakter' })
  @Transform(({ value }: { value: string }) => value?.trim())
  jenisOrganisasi: string;

  @ApiProperty({
    description: 'Bidang organisasi',
    example: 'Kemahasiswaan',
    enum: [
      'Olahraga',
      'Seni',
      'Akademik',
      'Sosial',
      'Keagamaan',
      'Kemahasiswaan',
      'Lainnya',
    ],
  })
  @IsString({ message: 'Bidang organisasi harus berupa string' })
  @IsNotEmpty({ message: 'Bidang organisasi wajib diisi' })
  @MaxLength(50, { message: 'Bidang organisasi maksimal 50 karakter' })
  @Transform(({ value }: { value: string }) => value?.trim())
  bidangOrganisasi: string;

  @ApiProperty({
    description: 'Tahun berdiri organisasi',
    example: 2010,
    minimum: 1900,
    maximum: new Date().getFullYear(),
  })
  @IsInt({ message: 'Tahun berdiri harus berupa angka' })
  @Min(1900, { message: 'Tahun berdiri minimal 1900' })
  @Max(new Date().getFullYear(), {
    message: `Tahun berdiri maksimal ${new Date().getFullYear()}`,
  })
  tahunBerdiri: number;

  @ApiPropertyOptional({
    description: 'Penjelasan singkat tentang organisasi',
    example:
      'Badan Eksekutif Mahasiswa Fakultas Teknik yang bergerak di bidang kemahasiswaan.',
  })
  @IsOptional()
  @IsString({ message: 'Penjelasan singkat harus berupa string' })
  @Transform(({ value }: { value: string }) => value?.trim())
  penjelasanSingkat?: string;

  @ApiPropertyOptional({
    description: 'Program kerja organisasi',
    example: ['Ospek Fakultas', 'Bakti Sosial', 'Seminar Teknologi'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Proker harus berupa array' })
  @IsString({ each: true, message: 'Setiap proker harus berupa string' })
  @Transform(({ value }: { value: string | string[] }) => {
    if (typeof value === 'string') {
      return value
        .split(';')
        .map((item) => item.trim())
        .filter((item) => item);
    }
    return value;
  })
  proker?: string[];
}
