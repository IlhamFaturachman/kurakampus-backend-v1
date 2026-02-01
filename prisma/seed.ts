import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

// Initialize PrismaClient with PostgreSQL adapter
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const organizationsData = [
  {
    namaInstansi: 'Universitas Brawijaya',
    daerahInstansi: 'Malang',
    namaOrganisasi: 'BEM Fakultas Teknik',
    kontak: '081234567890',
    jenisOrganisasi: 'BEM',
    bidangOrganisasi: 'Kemahasiswaan',
    tahunBerdiri: 2005,
    penjelasanSingkat: 'Badan Eksekutif Mahasiswa Fakultas Teknik Universitas Brawijaya yang bergerak dalam bidang advokasi dan pengembangan mahasiswa.',
    proker: ['Ospek Fakultas', 'Bakti Sosial', 'Seminar Nasional', 'Pengabdian Masyarakat'],
  },
  {
    namaInstansi: 'Universitas Brawijaya',
    daerahInstansi: 'Malang',
    namaOrganisasi: 'UKM Sepakbola',
    kontak: '082345678901',
    jenisOrganisasi: 'UKM',
    bidangOrganisasi: 'Olahraga',
    tahunBerdiri: 2000,
    penjelasanSingkat: 'Unit Kegiatan Mahasiswa yang fokus pada pengembangan bakat sepakbola mahasiswa UB.',
    proker: ['Liga Internal', 'Turnamen Antar Fakultas', 'Coaching Clinic'],
  },
  {
    namaInstansi: 'Universitas Brawijaya',
    daerahInstansi: 'Malang',
    namaOrganisasi: 'Paduan Suara Mahasiswa',
    kontak: '083456789012',
    jenisOrganisasi: 'UKM',
    bidangOrganisasi: 'Seni',
    tahunBerdiri: 1998,
    penjelasanSingkat: 'UKM seni vokal yang aktif dalam berbagai kompetisi paduan suara tingkat nasional.',
    proker: ['Konser Tahunan', 'Kompetisi Paduan Suara', 'Workshop Vokal'],
  },
  {
    namaInstansi: 'Institut Teknologi Sepuluh Nopember',
    daerahInstansi: 'Surabaya',
    namaOrganisasi: 'BEM ITS',
    kontak: '084567890123',
    jenisOrganisasi: 'BEM',
    bidangOrganisasi: 'Kemahasiswaan',
    tahunBerdiri: 1960,
    penjelasanSingkat: 'Badan Eksekutif Mahasiswa Institut Teknologi Sepuluh Nopember sebagai wadah aspirasi mahasiswa.',
    proker: ['ITS Expo', 'Dies Natalis', 'Gerakan Sosial', 'Musyawarah Mahasiswa'],
  },
  {
    namaInstansi: 'Institut Teknologi Sepuluh Nopember',
    daerahInstansi: 'Surabaya',
    namaOrganisasi: 'Himpunan Mahasiswa Informatika',
    kontak: '085678901234',
    jenisOrganisasi: 'Himpunan',
    bidangOrganisasi: 'Akademik',
    tahunBerdiri: 1985,
    penjelasanSingkat: 'Himpunan mahasiswa jurusan Informatika ITS yang aktif dalam pengembangan keilmuan dan soft skill.',
    proker: ['Schematics', 'Pelatihan Pemrograman', 'Company Visit', 'Seminar Teknologi'],
  },
  {
    namaInstansi: 'Universitas Airlangga',
    daerahInstansi: 'Surabaya',
    namaOrganisasi: 'BEM FKM',
    kontak: '086789012345',
    jenisOrganisasi: 'BEM',
    bidangOrganisasi: 'Kemahasiswaan',
    tahunBerdiri: 1990,
    penjelasanSingkat: 'Badan Eksekutif Mahasiswa Fakultas Kesehatan Masyarakat Unair.',
    proker: ['Health Campaign', 'Pengabdian Masyarakat', 'Seminar Kesehatan'],
  },
  {
    namaInstansi: 'Universitas Airlangga',
    daerahInstansi: 'Surabaya',
    namaOrganisasi: 'UKM Bulu Tangkis',
    kontak: '087890123456',
    jenisOrganisasi: 'UKM',
    bidangOrganisasi: 'Olahraga',
    tahunBerdiri: 1995,
    penjelasanSingkat: 'Unit Kegiatan Mahasiswa bidang bulu tangkis Universitas Airlangga.',
    proker: ['Turnamen Internal', 'Latihan Rutin', 'Pertandingan Antar Universitas'],
  },
  {
    namaInstansi: 'Universitas Gadjah Mada',
    daerahInstansi: 'Yogyakarta',
    namaOrganisasi: 'BEM KM UGM',
    kontak: '088901234567',
    jenisOrganisasi: 'BEM',
    bidangOrganisasi: 'Kemahasiswaan',
    tahunBerdiri: 1949,
    penjelasanSingkat: 'Badan Eksekutif Mahasiswa Keluarga Mahasiswa UGM sebagai organisasi kemahasiswaan tertinggi.',
    proker: ['Gama Week', 'Dies Natalis', 'Forum Mahasiswa', 'Kajian Strategis'],
  },
  {
    namaInstansi: 'Universitas Gadjah Mada',
    daerahInstansi: 'Yogyakarta',
    namaOrganisasi: 'Komunitas Pecinta Alam',
    kontak: '089012345678',
    jenisOrganisasi: 'Komunitas',
    bidangOrganisasi: 'Sosial',
    tahunBerdiri: 1978,
    penjelasanSingkat: 'Komunitas mahasiswa pecinta alam yang aktif dalam kegiatan pendakian dan konservasi lingkungan.',
    proker: ['Ekspedisi Gunung', 'Penanaman Pohon', 'Pembersihan Sungai', 'Edukasi Lingkungan'],
  },
  {
    namaInstansi: 'Universitas Indonesia',
    daerahInstansi: 'Depok',
    namaOrganisasi: 'BEM UI',
    kontak: '081123456789',
    jenisOrganisasi: 'BEM',
    bidangOrganisasi: 'Kemahasiswaan',
    tahunBerdiri: 1950,
    penjelasanSingkat: 'Badan Eksekutif Mahasiswa Universitas Indonesia yang merupakan representasi mahasiswa UI.',
    proker: ['UI Art War', 'Social Movement', 'Leadership Training', 'Career Fair'],
  },
  {
    namaInstansi: 'Universitas Indonesia',
    daerahInstansi: 'Depok',
    namaOrganisasi: 'UKM Basket UI',
    kontak: '082234567890',
    jenisOrganisasi: 'UKM',
    bidangOrganisasi: 'Olahraga',
    tahunBerdiri: 1970,
    penjelasanSingkat: 'Unit Kegiatan Mahasiswa basket yang aktif dalam kompetisi tingkat nasional.',
    proker: ['Liga Basket Mahasiswa', 'Training Camp', 'Turnamen Friendly'],
  },
  {
    namaInstansi: 'Institut Teknologi Bandung',
    daerahInstansi: 'Bandung',
    namaOrganisasi: 'KM ITB',
    kontak: '083345678901',
    jenisOrganisasi: 'BEM',
    bidangOrganisasi: 'Kemahasiswaan',
    tahunBerdiri: 1920,
    penjelasanSingkat: 'Keluarga Mahasiswa ITB sebagai wadah organisasi kemahasiswaan di ITB.',
    proker: ['Wisuda Juli', 'ITB Fair', 'Festival Kampus', 'Pengabdian Masyarakat'],
  },
  {
    namaInstansi: 'Institut Teknologi Bandung',
    daerahInstansi: 'Bandung',
    namaOrganisasi: 'Unit Robotika ITB',
    kontak: '084456789012',
    jenisOrganisasi: 'UKM',
    bidangOrganisasi: 'Akademik',
    tahunBerdiri: 2001,
    penjelasanSingkat: 'Unit kegiatan yang fokus pada pengembangan robotika dan otomasi.',
    proker: ['Kontes Robot Indonesia', 'Workshop Robotika', 'Riset Robotika'],
  },
  {
    namaInstansi: 'Universitas Padjadjaran',
    daerahInstansi: 'Bandung',
    namaOrganisasi: 'BEM FIKOM',
    kontak: '085567890123',
    jenisOrganisasi: 'BEM',
    bidangOrganisasi: 'Kemahasiswaan',
    tahunBerdiri: 1980,
    penjelasanSingkat: 'Badan Eksekutif Mahasiswa Fakultas Ilmu Komunikasi Unpad.',
    proker: ['Fikom Festival', 'Jurnalistik Workshop', 'Media Campaign'],
  },
  {
    namaInstansi: 'Universitas Diponegoro',
    daerahInstansi: 'Semarang',
    namaOrganisasi: 'UKM Tari Tradisional',
    kontak: '086678901234',
    jenisOrganisasi: 'UKM',
    bidangOrganisasi: 'Seni',
    tahunBerdiri: 1988,
    penjelasanSingkat: 'UKM yang melestarikan tari tradisional Jawa dan Nusantara.',
    proker: ['Pentas Seni', 'Festival Tari', 'Workshop Tari Tradisional'],
  },
];

async function main() {
  console.log('🌱 Starting seeding...');

  for (const org of organizationsData) {
    const existing = await prisma.organization.findFirst({
      where: {
        namaInstansi: org.namaInstansi,
        namaOrganisasi: org.namaOrganisasi,
      },
    });

    if (!existing) {
      const created = await prisma.organization.create({
        data: org,
      });
      console.log(`✅ Created: ${created.namaOrganisasi} (${created.namaInstansi})`);
    } else {
      console.log(`⏭️  Skipped (already exists): ${org.namaOrganisasi} (${org.namaInstansi})`);
    }
  }

  console.log('🌱 Seeding finished!');
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
