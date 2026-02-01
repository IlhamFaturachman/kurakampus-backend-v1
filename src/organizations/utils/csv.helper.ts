import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { ImportErrorDetail } from '../dto/responses.dto';

// CSV Header mappings (CSV column name -> DTO field name)
export const CSV_HEADER_MAP: Record<string, keyof CreateOrganizationDto> = {
  'Nama Instansi': 'namaInstansi',
  nama_instansi: 'namaInstansi',
  namaInstansi: 'namaInstansi',
  'Daerah Instansi': 'daerahInstansi',
  daerah_instansi: 'daerahInstansi',
  daerahInstansi: 'daerahInstansi',
  'Nama Organisasi': 'namaOrganisasi',
  nama_organisasi: 'namaOrganisasi',
  namaOrganisasi: 'namaOrganisasi',
  Kontak: 'kontak',
  kontak: 'kontak',
  'Jenis Organisasi': 'jenisOrganisasi',
  jenis_organisasi: 'jenisOrganisasi',
  jenisOrganisasi: 'jenisOrganisasi',
  'Bidang Organisasi': 'bidangOrganisasi',
  bidang_organisasi: 'bidangOrganisasi',
  bidangOrganisasi: 'bidangOrganisasi',
  'Tahun Berdiri': 'tahunBerdiri',
  tahun_berdiri: 'tahunBerdiri',
  tahunBerdiri: 'tahunBerdiri',
  'Penjelasan Singkat': 'penjelasanSingkat',
  penjelasan_singkat: 'penjelasanSingkat',
  penjelasanSingkat: 'penjelasanSingkat',
  Proker: 'proker',
  proker: 'proker',
};

// Export CSV headers
export const CSV_EXPORT_HEADERS = [
  'Nama Instansi',
  'Daerah Instansi',
  'Nama Organisasi',
  'Kontak',
  'Jenis Organisasi',
  'Bidang Organisasi',
  'Tahun Berdiri',
  'Penjelasan Singkat',
  'Proker',
];

// CSV Template content
export const CSV_TEMPLATE = `Nama Instansi,Daerah Instansi,Nama Organisasi,Kontak,Jenis Organisasi,Bidang Organisasi,Tahun Berdiri,Penjelasan Singkat,Proker
Universitas Brawijaya,Malang,BEM FT,081234567890,BEM,Kemahasiswaan,2010,Badan Eksekutif Mahasiswa Fakultas Teknik,"Program Kerja 1; Program Kerja 2; Program Kerja 3"
Institut Teknologi Sepuluh Nopember,Surabaya,UKM Sepakbola,082345678901,UKM,Olahraga,2005,Unit Kegiatan Mahasiswa Sepakbola,"Liga Internal; Turnamen Antar Fakultas"`;

export interface ParsedCsvRow {
  rowNumber: number;
  data: Partial<CreateOrganizationDto>;
  isValid: boolean;
  errors: string[];
}

export interface CsvParseResult {
  validRows: ParsedCsvRow[];
  invalidRows: ImportErrorDetail[];
  totalRows: number;
}

/**
 * Parse CSV content and map to CreateOrganizationDto format
 */
export function parseCsvContent(csvContent: string): CsvParseResult {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return { validRows: [], invalidRows: [], totalRows: 0 };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Map headers to DTO fields
  const fieldMap: (keyof CreateOrganizationDto | null)[] = headers.map(
    (header) => {
      const trimmedHeader = header.trim();
      return CSV_HEADER_MAP[trimmedHeader] || null;
    },
  );

  const validRows: ParsedCsvRow[] = [];
  const invalidRows: ImportErrorDetail[] = [];

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowNumber = i + 1;
    const rowData: Partial<CreateOrganizationDto> = {};
    const errors: string[] = [];

    // Map values to fields
    values.forEach((value, index) => {
      const field = fieldMap[index];
      if (field && value !== undefined && value !== '') {
        const trimmedValue = value.trim();

        if (field === 'tahunBerdiri') {
          const year = parseInt(trimmedValue, 10);
          if (isNaN(year)) {
            errors.push(`Tahun berdiri tidak valid: "${trimmedValue}"`);
          } else if (year < 1900 || year > new Date().getFullYear()) {
            errors.push(
              `Tahun berdiri harus antara 1900 dan ${new Date().getFullYear()}`,
            );
          } else {
            rowData[field] = year;
          }
        } else if (field === 'proker') {
          // Split proker by semicolon
          rowData[field] = trimmedValue
            .split(';')
            .map((item) => item.trim())
            .filter((item) => item);
        } else {
          rowData[field] = trimmedValue;
        }
      }
    });

    // Validate required fields
    const requiredFields: (keyof CreateOrganizationDto)[] = [
      'namaInstansi',
      'daerahInstansi',
      'namaOrganisasi',
      'kontak',
      'jenisOrganisasi',
      'bidangOrganisasi',
      'tahunBerdiri',
    ];

    for (const field of requiredFields) {
      if (!rowData[field]) {
        errors.push(`Field "${field}" wajib diisi`);
      }
    }

    if (errors.length > 0) {
      invalidRows.push({
        row: rowNumber,
        reason: errors.join('; '),
        data: rowData as Record<string, unknown>,
      });
    } else {
      validRows.push({
        rowNumber,
        data: rowData,
        isValid: true,
        errors: [],
      });
    }
  }

  return {
    validRows,
    invalidRows,
    totalRows: lines.length - 1, // Exclude header
  };
}

/**
 * Parse a single CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Convert organization data to CSV format
 */
export function organizationToCsvRow(org: {
  namaInstansi: string;
  daerahInstansi: string;
  namaOrganisasi: string;
  kontak: string;
  jenisOrganisasi: string;
  bidangOrganisasi: string;
  tahunBerdiri: number;
  penjelasanSingkat?: string | null;
  proker?: string[] | null;
}): string {
  const values = [
    escapeCSVValue(org.namaInstansi),
    escapeCSVValue(org.daerahInstansi),
    escapeCSVValue(org.namaOrganisasi),
    escapeCSVValue(org.kontak),
    escapeCSVValue(org.jenisOrganisasi),
    escapeCSVValue(org.bidangOrganisasi),
    org.tahunBerdiri.toString(),
    escapeCSVValue(org.penjelasanSingkat || ''),
    escapeCSVValue(Array.isArray(org.proker) ? org.proker.join('; ') : ''),
  ];

  return values.join(',');
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (!value) return '';

  // Check if value needs quoting
  const needsQuoting =
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');

  if (needsQuoting) {
    // Escape double quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}

interface OrganizationData {
  namaInstansi: string;
  daerahInstansi: string;
  namaOrganisasi: string;
  kontak: string;
  jenisOrganisasi: string;
  bidangOrganisasi: string;
  tahunBerdiri: number;
  penjelasanSingkat?: string | null;
  proker?: unknown;
}

/**
 * Generate CSV content from organizations array
 */
export function generateCsvContent(organizations: OrganizationData[]): string {
  const header = CSV_EXPORT_HEADERS.join(',');
  const rows = organizations.map((org) => {
    // Handle proker parsing from JSON
    let prokerArray: string[] | null = null;
    if (org.proker) {
      if (Array.isArray(org.proker)) {
        prokerArray = org.proker as string[];
      } else if (typeof org.proker === 'string') {
        try {
          prokerArray = JSON.parse(org.proker) as string[];
        } catch {
          prokerArray = [org.proker];
        }
      }
    }

    return organizationToCsvRow({
      ...org,
      proker: prokerArray,
    });
  });

  return [header, ...rows].join('\n');
}

/**
 * Get CSV template content
 */
export function getCsvTemplate(): string {
  return CSV_TEMPLATE;
}
