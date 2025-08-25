# TODO List - Domain Management Web App

## 1. Persiapan Lingkungan
- [ ] Setup proyek Next.js (Full-stack) di lokal.
- [ ] Konfigurasi TypeScript untuk konsistensi tipe data.
- [ ] Install dependency dasar (React Query / SWR, Axios, Prisma, PostgreSQL client).
- [ ] Buat repository GitHub untuk version control.

## 2. Desain Database (PostgreSQL + Prisma)
- [ ] Definisikan schema `domains` (domain, registrar, created_at, expired_at, status, days_to_expire, renewal_price, notes, last_checked, source_api, batch_id).
- [ ] Buat tabel `users` dengan role-based access control (Admin, Staff, Finance).
- [ ] Jalankan migrasi database menggunakan Prisma Migrate.

## 3. Integrasi API RDAP
- [ ] Implementasi service untuk memanggil API RDAP:
    - https://rdap.verisign.com/com/v1/domain/{domain}
    - https://rdap.verisign.com/cc/v1/domain/{domain}
    - https://rdap.idnic.id/rdap/domain/{domain}
    - https://rdap.neustar.biz/rdap/domain/{domain}
    - https://rdap.afilias.net/rdap/domain/{domain}
    - https://rdap.pir.org/rdap/domain/{domain}
- [ ] Buat mekanisme fallback API jika satu penyedia gagal.
- [ ] Implementasi batch request (100 domain per batch).
- [ ] Tambahkan retry logic untuk kegagalan API.
- [ ] Simpan hasil WHOIS ke database.

## 4. Sistem Caching
- [ ] Implement caching hasil RDAP di server (Redis atau memory cache di Vercel).
- [ ] Tentukan TTL cache (misal 24 jam).
- [ ] Gunakan cache sebelum memanggil API RDAP.

## 5. Backend API (Next.js API Routes)
- [ ] Endpoint POST `/api/domains` → tambah domain baru & ambil data WHOIS.
- [ ] Endpoint GET `/api/domains` → ambil semua domain dari database.
- [ ] Endpoint PUT `/api/domains/{id}` → update data domain.
- [ ] Endpoint DELETE `/api/domains/{id}` → hapus domain.
- [ ] Endpoint GET `/api/domains/expiring` → filter domain yang expired dalam 30, 7, 1 hari.

## 6. Frontend (Next.js Pages / App Router)
- [ ] Halaman Login + autentikasi JWT / NextAuth.
- [ ] Halaman Dashboard:
    - Ringkasan domain yang akan expired (30, 7, 1 hari).
    - Tabel domain (sortable, searchable, filter by status).
- [ ] Modal tambah domain (form: domain, harga perpanjangan, catatan).
- [ ] Modal edit domain.
- [ ] Tampilan detail domain.
- [ ] Error handling UI jika API gagal.

## 7. Autentikasi & Role Management
- [ ] Implementasi NextAuth atau JWT untuk login.
- [ ] Role-based access control:
    - Admin: CRUD domain + CRUD user
    - Staff: CRUD domain
    - Finance: View only + lihat harga perpanjangan

## 8. Error Handling Lengkap
- [ ] Global error boundary di frontend.
- [ ] Logging error API di backend.
- [ ] Notifikasi UI untuk error (toast / alert).

## 9. Deployment
- [ ] Deploy ke Vercel (frontend & backend dalam satu proyek).
- [ ] Setup database PostgreSQL (Supabase / Railway / Neon).
- [ ] Setup environment variables (API keys, DB URL).

## 10. Testing
- [ ] Unit test service RDAP API.
- [ ] Integration test API endpoint.
- [ ] E2E test flow tambah → cek WHOIS → tampil di dashboard.

