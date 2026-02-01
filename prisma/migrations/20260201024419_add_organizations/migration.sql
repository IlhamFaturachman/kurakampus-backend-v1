-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "nama_instansi" TEXT NOT NULL,
    "daerah_instansi" TEXT NOT NULL,
    "nama_organisasi" TEXT NOT NULL,
    "kontak" TEXT NOT NULL,
    "jenis_organisasi" TEXT NOT NULL,
    "bidang_organisasi" TEXT NOT NULL,
    "tahun_berdiri" INTEGER NOT NULL,
    "penjelasan_singkat" TEXT,
    "proker" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_nama_instansi_idx" ON "organizations"("nama_instansi");

-- CreateIndex
CREATE INDEX "organizations_daerah_instansi_idx" ON "organizations"("daerah_instansi");

-- CreateIndex
CREATE INDEX "organizations_jenis_organisasi_idx" ON "organizations"("jenis_organisasi");

-- CreateIndex
CREATE INDEX "organizations_bidang_organisasi_idx" ON "organizations"("bidang_organisasi");

-- CreateIndex
CREATE INDEX "organizations_nama_organisasi_idx" ON "organizations"("nama_organisasi");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_nama_instansi_nama_organisasi_key" ON "organizations"("nama_instansi", "nama_organisasi");
