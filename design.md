# Design System: "Berani"

Panduan UI yang dipakai di SiSekre. Tujuannya bisa langsung dipakai ulang di proyek berikutnya: semua token, kelas, dan pola di sini sudah teruji di aplikasi Next.js 15 + Tailwind CSS v4.

Mockup HTML aslinya ada di `mockup/c-berani/` (dashboard, buat surat, kalender).

---

## 1. Karakter

Muda, energik, dan **mobile-first**. Dirancang untuk pengguna yang lebih sering membuka aplikasi dari HP.

- **Bento grid**: konten disusun dalam kartu besar yang membulat, ukurannya berbeda-beda.
- **Warna tegas tapi terkontrol**: latar krem hangat, satu permukaan gelap per halaman sebagai titik fokus, kartu pastel untuk mengelompokkan, ungu sebagai warna aksi, hijau stabilo (lime) sebagai aksen.
- **Tipografi tebal**: judul dan angka besar memakai `font-extrabold` dengan tracking rapat.
- **Semua berbentuk pill**: tombol, chip, filter, input membulat penuh atau hampir penuh.
- **Bahasa santai tapi jelas**: "kamu", "Nggak ada agenda di tanggal ini", "Beresin dulu, yuk".

Aturan utama: **satu permukaan gelap (`bg-ink`) per halaman**. Itu yang paling penting di layar (antrean persetujuan, pratinjau surat, strip tanggal). Kalau semua hal menonjol, tidak ada yang menonjol.

---

## 2. Setup

### Font

Plus Jakarta Sans, berat 400–800, dimuat lewat `next/font`:

```tsx
// src/app/layout.tsx
import type { Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = { themeColor: "#f3f1ec", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${jakarta.variable} min-h-dvh`}>{children}</body>
    </html>
  );
}
```

Tanpa Next.js: pakai Google Fonts `family=Plus+Jakarta+Sans:wght@400;500;600;700;800` dan ganti `var(--font-jakarta)` dengan `"Plus Jakarta Sans"`.

### Token (salin utuh ke `globals.css`)

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;

  --color-ink: #111318;        /* teks utama & permukaan gelap */
  --color-ink-soft: #1e212b;   /* baris/kartu di atas permukaan gelap */
  --color-ink-line: #2e323e;   /* hover di atas permukaan gelap */
  --color-cream: #f3f1ec;      /* latar aplikasi */
  --color-sand: #e8e4da;       /* garis pemisah, chip netral */
  --color-muted: #5a5d69;      /* teks sekunder (AA di cream & putih) */

  --color-violet: #5b3df5;     /* primer: tombol aksi, item terpilih */
  --color-violet-dark: #4526d9;
  --color-lime: #c6f432;       /* aksen: hari ini, sukses, angka di atas gelap */
  --color-lilac: #e6e0ff;
  --color-mint: #d9f5e5;
  --color-peach: #ffe3d3;
  --color-sky: #dbeeff;
  --color-butter: #fff0b8;
  --color-rose: #ffd9dc;

  /* teks status di atas isian pastelnya (kontras ≥ 4.5:1) */
  --color-st-wait: #6b4a00;    /* di atas butter */
  --color-st-rev: #8f3300;     /* di atas peach */
  --color-st-no: #a3122a;      /* di atas rose */
  --color-st-draft: #3d404b;   /* di atas sand */

  /* teks di atas pastel */
  --color-on-mint: #17603b;
  --color-on-peach: #9a3b0b;
  --color-on-sky: #135a8c;

  /* titik warna kategori (contoh: jenis agenda) */
  --color-ev-rapat: #5b3df5;
  --color-ev-acara: #e8590c;
  --color-ev-lain: #0b7fbf;

  --radius-tile: 20px;
  --radius-card: 24px;
  --radius-hero: 28px;

  --shadow-card: 0 1px 2px rgb(17 19 24 / 0.04), 0 14px 32px -18px rgb(17 19 24 / 0.22);
  --shadow-float: 0 18px 40px -14px rgb(17 19 24 / 0.38);

  --animate-wave: wave 2.2s ease-in-out 1;
  @keyframes wave {
    0%, 100% { transform: rotate(0); }
    15% { transform: rotate(16deg); }
    30% { transform: rotate(-8deg); }
    45% { transform: rotate(14deg); }
    60% { transform: rotate(-4deg); }
    75% { transform: rotate(10deg); }
  }
}

@layer base {
  html { -webkit-tap-highlight-color: transparent; }
  body { @apply bg-cream font-sans text-ink antialiased; }
  :focus-visible { outline: 3px solid var(--color-violet); outline-offset: 2px; }
  button:not(:disabled), [role="button"] { cursor: pointer; }
}

@utility no-scrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

@utility tabular { font-variant-numeric: tabular-nums; }

/* Panah dropdown untuk <select> bergaya input. */
@utility select-chevron {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235a5d69' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-position: right 14px center;
  background-repeat: no-repeat;
  background-size: 20px;
}
```

> **Jebakan Tailwind:** nilai arbitrer tidak boleh berisi spasi. `bg-[url("data:image/svg+xml,<svg viewBox='0 0 24 24'…")]` diam-diam tidak menghasilkan CSS apa pun. Taruh nilai seperti itu di `@utility`, seperti `select-chevron` di atas.

---

## 3. Warna

### Peran warna

| Token | Hex | Dipakai untuk |
|---|---|---|
| `cream` | #f3f1ec | Latar seluruh aplikasi; cincin pemisah tombol "+" mengambang |
| `white` | #ffffff | Kartu biasa, bar navigasi, chip filter tidak aktif |
| `ink` | #111318 | Teks utama; **satu** permukaan gelap per halaman; item navigasi aktif |
| `ink-soft` | #1e212b | Baris/kartu di dalam permukaan gelap |
| `muted` | #5a5d69 | Teks sekunder, label, meta |
| `sand` | #e8e4da | Garis pemisah (`divide-sand`), garis putus-putus, chip netral |
| `violet` | #5b3df5 | Tombol primer, pilihan aktif, langkah aktif, nomor bagian |
| `lime` | #c6f432 | Aksen: "hari ini", status disetujui, angka besar di atas gelap, ikon aktif di rel |
| `lilac` · `mint` · `peach` · `sky` · `butter` · `rose` | pastel | Isian kartu, ikon tile, chip status |

### Pasangan pastel + teks (selalu pakai pasangannya)

| Isian | Teks | Contoh makna |
|---|---|---|
| `bg-lilac` | `text-violet` / `text-violet-dark` | Undangan, Rapat, info utama |
| `bg-mint` | `text-on-mint` | Hadir, izin kuliah, kehadiran |
| `bg-peach` | `text-on-peach` / `text-st-rev` | Acara, peminjaman, perlu revisi |
| `bg-sky` | `text-on-sky` | Lainnya, permohonan, izin |
| `bg-butter` | `text-st-wait` | Menunggu |
| `bg-rose` | `text-st-no` | Ditolak, alpa, error, tombol hapus |
| `bg-sand` | `text-st-draft` | Draf, netral |
| `bg-lime` | `text-ink` | Disetujui, sukses, hari ini |

Di atas `bg-ink`, teks pakai `text-white`, `text-white/60` (sekunder), dan `text-lime` (penekanan).

### Status: warna + ikon + teks

Status **tidak boleh** dibedakan oleh warna saja. Selalu ada ikon dan label.

| Status | Kelas | Ikon |
|---|---|---|
| Draf | `bg-sand text-st-draft` | `pencil` |
| Menunggu (tahap 1) | `bg-butter text-st-wait` | `hourglass` |
| Menunggu (tahap 2) | `bg-butter text-st-wait` | `clock` |
| Perlu revisi | `bg-peach text-st-rev` | `undo` |
| Ditolak | `bg-rose text-st-no` | `x` |
| Disetujui | `bg-lime text-ink` | `check` (stroke 3) |

Simpan pemetaan seperti ini di satu tempat (di SiSekre: `LETTER_STATUS`, `EVENT_TYPE`, `ATTENDANCE_STATUS`, `templateStyle()` di `src/lib/format.ts`), lalu tampilkan lewat satu komponen `StatusBadge`.

---

## 4. Tipografi

Satu keluarga huruf. Hierarki dibuat lewat ukuran, berat, dan warna, bukan lewat font kedua.

| Peran | Kelas |
|---|---|
| Sapaan besar (beranda) | `text-[42px] md:text-[60px] font-extrabold leading-[1.02] tracking-[-0.035em]` |
| Judul halaman | `text-[36px] md:text-[52px] font-extrabold leading-[1.04] tracking-[-0.035em]` |
| Angka raksasa (di atas gelap) | `text-[104px] font-extrabold leading-[0.78] tracking-[-0.06em] text-lime tabular` |
| Angka statistik | `text-[52px] font-extrabold leading-none tracking-[-0.05em] tabular` |
| Judul kartu | `text-xl font-extrabold tracking-[-0.02em]` |
| Judul bagian bernomor | `text-lg font-extrabold tracking-[-0.02em]` dengan angka `text-violet` ("**1** · Pilih jenis surat") |
| Eyebrow | `text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted` + titik `size-2 rounded-full` |
| Judul item daftar | `text-[15px] font-extrabold leading-snug` |
| Paragraf deskripsi | `text-[15px] font-medium leading-relaxed text-muted` |
| Meta (nomor, nama, tanggal) | `text-[13px] font-semibold text-muted` |
| Label isian | `text-[13px] font-extrabold` |
| Chip / badge | `text-xs font-extrabold` (atau `text-[11px]`) |

- Angka selalu `tabular` agar tidak "goyang".
- Tanda wajib isi: `<span className="text-violet">*</span>`; opsional: `<span className="font-semibold text-muted">(opsional)</span>`.
- Label kecil "stiker" miring untuk aksen judul: `inline-block -rotate-6 rounded-[14px] bg-lime px-2.5 align-middle text-[18px] md:text-[22px] tracking-normal`.

---

## 5. Bentuk, bayangan, jarak

| Elemen | Radius |
|---|---|
| Kartu utama / hero | `rounded-hero` (28px) |
| Kartu sedang, tile statistik, kartu agenda | `rounded-card` (24px) |
| Baris di dalam kartu gelap | `rounded-[22px]` |
| Panel di dalam kartu (switch, kotak link) | `rounded-[20px]` |
| Ikon tile, kotak tanggal | `rounded-[16px]` |
| Sel kalender | `rounded-[14px]` |
| Input | `rounded-2xl` |
| Tombol, chip, badge, avatar | `rounded-full` |

- `shadow-card` untuk kartu putih dan elemen di atas latar krem.
- `shadow-float` untuk elemen yang "melayang": tombol primer besar, tab bar bawah, tombol "+", pilihan terpilih.
- Kartu pastel dan kartu gelap **tidak** perlu bayangan.
- Padding kartu: `p-5 md:p-6`; kartu hero: `p-5 md:p-7`.
- Jarak antar kartu bento: `gap-4 lg:gap-5`. Jarak antar bagian: `mt-6 lg:mt-8`.

---

## 6. Layout

### Kerangka aplikasi

```
Desktop (≥768px)                         HP (<768px)
┌────┬──────────────────────────────┐    ┌─────────────────────┐
│ S. │ [org · periode]  [cari][🔔][👤]│    │ S. [org]       [🔔] │
│ ⌂  │                              │    │                     │
│ ✉  │  konten (max-w-1200)         │    │  konten             │
│ ☐  │                              │    │                     │
│ 📅 │                              │    │                     │
│ RK │                              │    │ ⌂  ✉  (+)  📅  👤  │
└────┴──────────────────────────────┘    └─────────────────────┘
 rel ikon mengambang                       tab bar mengambang
```

- **Rel ikon (desktop):** `fixed inset-y-4 left-4 z-40 hidden w-[84px] flex-col items-center rounded-hero bg-white py-5 shadow-card md:flex`.
  - Item: `flex w-[68px] flex-col items-center gap-1 rounded-[18px] py-2.5 text-[11px] font-bold`.
  - Aktif: `bg-ink text-white`, ikon `text-lime`. Tidak aktif: `text-muted hover:bg-cream hover:text-ink`.
  - Badge angka: `absolute right-2 top-1.5 h-5 min-w-5 rounded-full bg-violet text-[10px] font-extrabold text-white ring-2 ring-white`.
- **Pembungkus konten:** `md:pl-[116px]` → `main.mx-auto max-w-[1200px] px-4 pb-32 pt-4 md:px-6 md:pb-16 md:pt-6`. `pb-32` di HP memberi ruang untuk tab bar.
- **Bar atas:** semua elemennya pill putih `h-10 rounded-full bg-white shadow-card`. Kotak cari `w-72` hanya muncul di `lg`; di bawahnya jadi tombol ikon bulat.
- **Tab bar bawah (HP):** `fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 md:hidden`, isinya `grid h-[70px] grid-cols-5 items-center rounded-[26px] bg-white px-1 shadow-float ring-1 ring-ink/5`.
  - Tab aktif: teks `text-violet font-extrabold`, ikon dalam pill `h-8 w-12 rounded-full bg-lilac`.
  - Tombol tengah "+": `mx-auto -mt-10 grid size-[62px] place-items-center rounded-full bg-violet text-lime shadow-float ring-[6px] ring-cream active:scale-95`.
  - Maksimal 5 slot. Menu lain dikumpulkan di halaman **Profil** sebagai daftar kartu.
- **Logo:** kotak ungu dengan huruf lime dan titik putih: `bg-violet font-extrabold text-lime` + `S<span className="-ml-0.5 text-white">.</span>`. Ukuran 48px di rel, 40px di HP.

### Bento grid

```tsx
<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
  <section className="md:col-span-2 lg:col-span-7 lg:row-span-2">…kartu gelap…</section>
  <section className="md:col-span-1 lg:col-span-5">…tiket…</section>
  <div className="grid grid-cols-2 gap-4 md:col-span-1 lg:col-span-5 lg:gap-5">…2 tile statistik…</div>
  <section className="md:col-span-2 lg:col-span-7">…daftar…</section>
  <section className="md:col-span-2 lg:col-span-5">…kartu pastel…</section>
</div>
```

Pola dua kolom (form + pratinjau, kalender + daftar): `grid grid-cols-1 gap-5 lg:grid-cols-12` dengan `lg:col-span-5` / `lg:col-span-7`. Kolom pratinjau `lg:sticky lg:top-6`.

### Baris yang bisa digeser (HP)

Untuk aksi cepat dan chip filter, biarkan baris meluber ke tepi layar lalu bisa digeser:

```tsx
<div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">…</div>
```

---

## 7. Komponen

Semua contoh di bawah persis seperti yang dipakai di `src/components/ui.tsx` dan halaman-halaman SiSekre.

### Tombol

```ts
export const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-violet px-5 text-[15px] font-extrabold text-white shadow-card transition hover:bg-violet-dark disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-5 text-[15px] font-extrabold text-ink transition hover:bg-cream disabled:opacity-60";
export const btnSoft =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-cream px-4 text-[13px] font-extrabold text-ink transition hover:bg-lilac disabled:opacity-60";
export const btnDark =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-extrabold text-white transition hover:bg-violet disabled:opacity-60";
export const btnDanger =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-rose px-5 text-[15px] font-extrabold text-st-no transition hover:bg-[#ffc4c9] disabled:opacity-60";
```

**Tombol hero dengan ikon bulat** (aksi utama halaman):

```tsx
<a className="inline-flex h-14 shrink-0 items-center gap-2.5 rounded-full bg-violet pl-2 pr-5 text-[15px] font-extrabold text-white shadow-float transition hover:bg-violet-dark">
  <span className="grid size-10 place-items-center rounded-full bg-lime text-ink">
    <Icon name="plus" className="size-5" strokeWidth={2.6} />
  </span>
  Buat surat
</a>
```

Varian putih untuk aksi sekunder: ganti dengan `bg-white shadow-card hover:bg-mint`, lingkaran ikonnya pastel (`bg-mint text-on-mint`).

**Tombol kirim dengan ikon di kanan:** `h-14 rounded-full bg-violet pl-6 pr-2 …` + `<span className="grid size-10 place-items-center rounded-full bg-lime text-ink"><Icon name="send" /></span>`.

**Tombol panah kecil:** `inline-flex h-9 items-center gap-1 rounded-full bg-cream px-3.5 text-[13px] font-extrabold hover:bg-lilac` + "Label" + ikon `arrow-r`.

**Tombol nonaktif yang menjelaskan alasannya:** `bg-ink/10 text-ink/60 cursor-not-allowed` + ikon `lock` + atribut `title`.

### Isian

```ts
export const inputCls =
  "w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-3 text-[15px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-muted focus:border-violet focus:bg-white disabled:opacity-60";
export const selectCls = `${inputCls} select-chevron pr-11`;
```

- Input tinggi tetap `h-12`; textarea `resize-none py-3 leading-snug`.
- Bungkus label + isian + petunjuk:

```tsx
<label className="block">
  <span className="text-[13px] font-extrabold">Perihal <span className="text-violet">*</span></span>
  <span className="mt-1.5 block"><input className={inputCls} /></span>
  <span className="mt-1.5 block text-[12px] font-semibold leading-snug text-muted">Petunjuk singkat</span>
</label>
```

- Isian tanggal: tampilkan hasil formatnya di bawah sebagai chip `rounded-full bg-lilac px-2.5 py-0.5 text-[12px] font-extrabold text-violet-dark`.

**Switch:**

```tsx
<button type="button" role="switch" aria-checked={on}
  className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-violet" : "bg-ink/20"}`}>
  <span className={`absolute left-1 top-1 grid size-6 place-items-center rounded-full shadow transition ${on ? "translate-x-6 bg-lime" : "bg-white"}`}>
    {on && <Icon name="check" className="size-3.5 text-ink" strokeWidth={3.2} />}
  </span>
</button>
```

Letakkan di panel `flex items-start justify-between gap-4 rounded-[20px] bg-lilac p-4` dengan judul dan penjelasan di kirinya.

**Panel opsional bergaris putus-putus:** `rounded-[20px] border-2 border-dashed border-sand p-4`.

### Kartu

```tsx
// Kartu putih
<section className="rounded-hero bg-white p-5 shadow-card md:p-6">
  <div className="mb-4 flex items-center justify-between gap-3">
    <h2 className="text-xl font-extrabold tracking-[-0.02em]">Judul</h2>
    {/* tombol panah kecil */}
  </div>
  …
</section>
```

**Kartu gelap (fokus halaman)** dengan cincin dekoratif:

```tsx
<section className="relative overflow-hidden rounded-hero bg-ink p-5 text-white md:p-7">
  <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full border-[28px] border-violet/40 md:-right-16 md:-top-20" />
  <div className="relative flex items-center justify-between gap-3">
    <h2 className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold">
      <span className="size-2 rounded-full bg-lime motion-safe:animate-pulse" />
      Perlu persetujuan kamu
    </h2>
  </div>
  <div className="relative mt-5 flex items-end gap-4">
    <span className="text-[104px] font-extrabold leading-[0.78] tracking-[-0.06em] text-lime tabular">3</span>
    <p className="pb-1 text-lg font-extrabold leading-tight md:text-xl">surat lagi nunggu<br /><span className="text-white/60">giliran ditinjau</span></p>
  </div>
  <ul className="relative mt-6 space-y-2.5">
    <li className="rounded-[22px] bg-ink-soft p-3.5 sm:p-4">…</li>
  </ul>
</section>
```

Isi kartu gelap selalu diberi `relative` agar berada di atas cincin dekoratif. Di dalam kartu gelap, tombol pertama `bg-lime text-ink hover:bg-white`, tombol berikutnya `bg-white/10 text-white ring-1 ring-white/20 hover:bg-white hover:text-ink`.

**Tile statistik pastel:**

```tsx
<section className="flex flex-col justify-between rounded-card bg-lilac p-4 md:p-5">
  <div className="flex items-center justify-between">
    <span className="grid size-10 place-items-center rounded-full bg-white text-violet"><Icon name="mail" /></span>
    <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-violet-dark">Okt</span>
  </div>
  <div className="mt-4">
    <p className="text-[52px] font-extrabold leading-none tracking-[-0.05em] tabular">14</p>
    <p className="mt-1 text-sm font-extrabold">Surat bulan ini</p>
  </div>
</section>
```

**Kartu tiket** (agenda terdekat, sesi absensi), isian lime dengan sobekan:

```tsx
<section className="relative rounded-hero bg-lime">
  <div className="p-5 md:p-6">…isi atas…</div>
  <div className="relative h-0" aria-hidden="true">
    <span className="absolute -left-3 -top-3 size-6 rounded-full bg-cream" />
    <span className="absolute -right-3 -top-3 size-6 rounded-full bg-cream" />
    <div className="mx-6 border-t-2 border-dashed border-ink/25" />
  </div>
  <div className="flex flex-wrap items-center justify-between gap-3 p-5 md:p-6">…hitung mundur + tombol…</div>
</section>
```

Lingkaran sobekan harus berwarna sama dengan latar di belakang kartu (`bg-cream`).

### Badge, chip, ikon tile

```tsx
// Badge status
<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold bg-butter text-st-wait">
  <Icon name="hourglass" className="size-3.5" />Menunggu sekretaris
</span>

// Chip filter (aria-pressed)
const chip = (active: boolean) =>
  `inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-extrabold transition ${
    active ? "bg-ink text-white" : "bg-white text-ink shadow-card hover:bg-lilac"
  }`;

// Ikon tile (awal baris daftar)
<span className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-lilac text-violet">
  <Icon name="mail" className="size-5" />
</span>

// Avatar inisial
<span className="grid size-8 place-items-center rounded-full bg-lime text-xs font-extrabold">RK</span>

// Badge hitungan di judul
<span className="grid h-7 min-w-7 place-items-center rounded-full bg-violet px-2 text-[13px] text-white">4</span>
```

### Kotak tanggal

```tsx
<div className="flex w-[58px] shrink-0 flex-col items-center justify-center rounded-[16px] bg-cream py-2">
  <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted">Sen</span>
  <span className="text-[24px] font-extrabold leading-tight tabular">26</span>
  <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted">Okt</span>
</div>
```

Varian gelap (di tiket): `bg-ink text-white`, hari `text-lime`, bulan `text-white/70`, lebar `w-[76px]`, angka `text-[38px]`.

### Baris daftar

```tsx
<ul className="divide-y divide-sand">
  <li className="flex items-center gap-3 py-3">
    {/* ikon tile */}
    <div className="min-w-0 flex-1">
      <p className="text-[15px] font-extrabold leading-snug sm:truncate">Judul item</p>
      <p className="truncate text-[13px] font-semibold text-muted tabular">011/UND/HIMATIF/X/2026 · 21 Okt</p>
      <span className="mt-1.5 inline-flex sm:hidden">{/* badge di HP */}</span>
    </div>
    <span className="hidden shrink-0 sm:inline-flex">{/* badge di desktop */}</span>
    <a className="grid size-9 shrink-0 place-items-center rounded-full bg-cream hover:bg-lime"><Icon name="download" className="size-4" /></a>
  </li>
</ul>
```

Badge pindah ke bawah judul di HP supaya judul tidak terpotong.

### Indikator langkah & tab segmen

```tsx
// Langkah: done = bg-ink text-white (+ lingkaran lime berisi ✓), active = bg-violet text-white, idle = text-muted hover:bg-cream
<ol className="grid grid-cols-3 gap-1.5 rounded-full bg-white p-1.5 shadow-card">
  <li><button className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-violet px-2 text-[13px] font-extrabold text-white">
    <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-violet">2</span>Isi data
  </button></li>
</ol>

// Tab segmen di HP (lengket di atas): latar gelap, tab aktif lime
<div className="sticky top-3 z-30 lg:hidden">
  <div role="tablist" className="mx-auto grid max-w-sm grid-cols-2 gap-1 rounded-full bg-ink p-1.5 shadow-float">
    <button role="tab" aria-selected className="flex h-11 items-center justify-center gap-2 rounded-full bg-lime text-sm font-extrabold text-ink">…</button>
    <button role="tab" className="flex h-11 items-center justify-center gap-2 rounded-full text-sm font-extrabold text-white">…</button>
  </div>
</div>
```

### Kartu pilihan (radio besar)

```tsx
<button role="radio" aria-checked={sel}
  className={`relative flex min-h-[150px] flex-col justify-between rounded-card p-4 text-left transition md:min-h-[168px] md:p-5 ${
    sel ? "bg-violet text-white shadow-float" : "bg-mint hover:-translate-y-0.5 hover:shadow-card"
  }`}>
  <span className={`grid size-12 place-items-center rounded-[16px] ${sel ? "bg-lime text-ink" : "bg-white text-on-mint"}`}>…ikon…</span>
  {/* pojok kanan atas: ✓ lime saat terpilih, kode singkat saat tidak */}
  <span className="mt-4 block">
    <span className="block text-[17px] font-extrabold leading-tight md:text-lg">Surat Izin</span>
    <span className={`mt-1 block text-[12px] font-semibold leading-snug ${sel ? "text-white/80" : "text-ink/65"}`}>Deskripsi singkat</span>
  </span>
</button>
```

Grid: `grid grid-cols-2 gap-3 lg:grid-cols-4`, dengan `role="radiogroup"` dan navigasi tombol panah.

### Alur proses (timeline horizontal)

Empat lingkaran `size-11 rounded-full ring-4 ring-white`, disambung garis putus-putus di belakangnya:

```tsx
<ol className="relative grid grid-cols-4 gap-1">
  <li aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-[20px] h-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-sand)_0_10px,transparent_10px_16px)]" />
  <li className="relative flex flex-col items-center text-center">
    <span className="grid size-11 place-items-center rounded-full bg-violet text-white ring-4 ring-white">…</span>
    <span className="mt-2 text-[12px] font-extrabold leading-tight sm:text-[13px]">Sekretaris</span>
    <span className="text-[11px] font-semibold leading-tight text-muted">Nama</span>
  </li>
</ol>
```

Urutan warna tahap: `bg-violet` → `bg-lilac text-violet` → `bg-lime text-ink` → `bg-ink text-lime`.

### Visualisasi data

**Bar progres** (track putih atau krem, isian gelap, label lime di dalam):

```tsx
<div className="h-3.5 rounded-full bg-white">
  <div className="flex h-full min-w-8 items-center justify-end rounded-full bg-ink pr-1.5" style={{ width: "77%" }}>
    <span className="text-[9px] font-extrabold text-lime">77%</span>
  </div>
</div>
```

**Cincin persentase** (SVG, r=48, stroke 16):

```tsx
const c = 2 * Math.PI * 48;
<svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label="Kehadiran 86 persen">
  <circle cx="60" cy="60" r="48" fill="none" stroke="#fff" strokeWidth="16" />
  <circle cx="60" cy="60" r="48" fill="none" stroke="#111318" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${0.86 * c} ${c}`} />
</svg>
```

**Bar komposisi** (beberapa kategori dalam satu baris): `flex h-2.5 gap-1 overflow-hidden rounded-full`, tiap segmen `rounded-full` dengan lebar persen.

**Titik kategori:** `size-1.5` (di sel/strip) atau `size-2.5` (legenda) `rounded-full bg-ev-*`.

### Kalender

- **Strip tanggal** di permukaan gelap: tombol `h-[88px] w-[60px] rounded-[20px]`. Terpilih: `bg-violet text-white ring-2 ring-white`. Hari ini: `bg-lime text-ink`. Lainnya: `bg-ink-soft text-white hover:bg-ink-line`. Nama bulan disisipkan sebagai teks tegak `-rotate-90 text-lime` setiap tanggal 1.
- **Grid bulan:** minggu dimulai Senin, `grid grid-cols-7 gap-1 md:gap-1.5`. Sel `aspect-square` di HP (hanya titik warna) dan `md:aspect-auto md:min-h-[92px]` di desktop (chip judul, maks 2 + "+n lagi"). Hari ini angkanya dilingkari lime. Sabtu–Minggu `text-on-peach`. Tanggal di luar bulan `text-ink/20`.

### Keadaan kosong & pesan

```tsx
// Kosong
<div className="flex items-center gap-4 rounded-card border-2 border-dashed border-ink/15 p-4">
  <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-cream text-2xl" aria-hidden="true">🌤️</span>
  <div className="min-w-0 flex-1">
    <p className="text-[15px] font-extrabold">Nggak ada agenda di tanggal ini</p>
    <p className="text-[13px] font-medium text-muted">Mau bikin? Tinggal tambah agenda baru.</p>
  </div>
  {/* opsional: tombol bulat violet + */}
</div>

// Error / sukses
<p className="flex items-start gap-2 rounded-2xl bg-rose px-4 py-3 text-sm font-bold text-st-no">…</p>
<p className="flex items-start gap-2 rounded-2xl bg-mint px-4 py-3 text-sm font-bold text-on-mint">…</p>
```

### Header halaman

```tsx
<section className="mb-6 mt-6 lg:mt-8">
  <a className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-muted hover:text-ink">← Kembali</a>
  <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      <h1 className="text-[36px] font-extrabold leading-[1.04] tracking-[-0.035em] break-words md:text-[52px]">Judul</h1>
      <p className="mt-2 max-w-xl text-[15px] font-medium leading-relaxed text-muted">Deskripsi singkat.</p>
    </div>
    <div className="flex flex-wrap items-center gap-2.5">{/* aksi */}</div>
  </div>
</section>
```

Beranda memakai pil tanggal di atas sapaan: `inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-muted shadow-card` + titik violet. Lambaian 👋 diberi `inline-block origin-[70%_70%] motion-safe:animate-wave`.

---

## 8. Ikon

Garis 24×24 gaya [Lucide](https://lucide.dev): `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`. Satu komponen `<Icon name="…" className="size-5" strokeWidth={2} />` (lihat `src/components/icons.tsx`), tanpa library tambahan.

| Ukuran | Kelas |
|---|---|
| Di dalam badge | `size-3.5` |
| Tombol kecil, meta | `size-4` |
| Default, ikon tile | `size-5` |
| Rel navigasi | `size-[22px]` |
| Tab bar bawah | `size-[21px]` |
| Kartu pilihan | `size-6` |

Centang di atas lime/violet pakai `strokeWidth={3}`–`3.2`; ikon "+" besar `2.6`–`2.8`.

Ikon yang tersedia: `home mail file checksq cal archive users user bell plus search settings arrow-r arrow-l chev-l chev-r chev-d check x hourglass clock pin lock undo pencil send download hash sparkle link save shield box inbox qr bolt eye history video flame filter chart logout ban trash upload`.

Kalau ikonnya belum ada, ambil path dari Lucide dan tambahkan ke peta `PATHS`.

---

## 9. Gaya bahasa

- Sapa pengguna dengan "kamu", nama depan: "Hai, Rina 👋".
- Kalimat pendek dan aktif: "Ada **3 surat** yang nunggu kamu. Beresin dulu, yuk."
- Boleh kata santai yang umum ("nggak", "yuk", "beres"), tapi istilah resmi tetap baku: perihal, nomor surat, persetujuan, periode.
- Keadaan kosong memberi arah: "Belum ada surat yang berjalan. Mau bikin satu?"
- Hitung mundur yang manusiawi: "Hari ini", "Besok", "2 hari lagi".
- Emoji secukupnya, hanya di sapaan atau keadaan kosong (👋 🌤️ 🎉 💪), dengan `aria-hidden` bila dekoratif.
- Dokumen resmi (surat, PDF) **tetap formal**: Times New Roman, tanpa warna, tanpa bahasa santai.

---

## 10. Responsif & aksesibilitas

- Rancang di 375px dulu. Setiap halaman harus lolos di 375px **tanpa geser ke samping**.
- Titik henti: `sm` 640 (badge pindah ke kanan, chip profil muncul), `md` 768 (rel ikon menggantikan tab bar), `lg` 1024 (bento 12 kolom, form + pratinjau berdampingan).
- Tabel jadi baris bertumpuk di HP. Tidak ada tabel yang di-scroll horizontal.
- Kolom grid yang berisi teks `truncate` harus `grid-cols-1` (= `minmax(0,1fr)`) atau `min-w-0`. `grid` tanpa kolom eksplisit akan melebar mengikuti teks dan membuat halaman bergeser ke samping.
- Target sentuh minimal 40px (`h-10`/`size-10`); aksi utama 48–56px (`h-12`/`h-14`).
- Fokus: outline violet 3px dari `:focus-visible` global. Jangan dihapus.
- Animasi selalu `motion-safe:` (pulse, ping, wave).
- Pakai atribut ARIA yang sesuai: `aria-current="page"` di navigasi, `aria-pressed` di chip filter, `role="switch" aria-checked`, `role="radiogroup"/"radio"`, `role="tablist"/"tab" aria-selected`, `role="img" aria-label` di grafik.
- Status tidak boleh hanya mengandalkan warna (lihat bagian 3).
- Teks di atas pastel memakai pasangan `on-*`/`st-*`, bukan abu-abu biasa.

---

## 11. Lakukan & hindari

**Lakukan**
- Satu permukaan gelap per halaman untuk hal yang paling butuh perhatian.
- Variasikan isian kartu (putih, pastel, gelap, lime) supaya bento tidak monoton, tapi jaga maknanya tetap konsisten.
- Simpan pemetaan status → kelas → ikon di satu file, lalu pakai ulang lewat komponen.
- Angka penting dibuat besar; labelnya kecil di bawahnya.

**Hindari**
- Warna hex lepas di komponen. Tambahkan token di `@theme` lebih dulu.
- Sudut tajam atau `rounded-md`/`rounded-lg` (terlalu kecil untuk gaya ini).
- Lebih dari satu tombol violet besar di satu area.
- Bayangan di atas kartu pastel atau gelap.
- Teks abu-abu tipis di atas pastel (kontrasnya kurang).

---

## 12. File acuan di SiSekre

| File | Isi |
|---|---|
| `src/app/globals.css` | Semua token, base style, utilitas |
| `src/app/layout.tsx` | Pemuatan font |
| `src/app/(app)/layout.tsx` | Kerangka: rel ikon, bar atas, tab bar |
| `src/components/nav-links.tsx` | `RailNav`, `BottomTabs` |
| `src/components/ui.tsx` | Tombol, input, `PageHeader`, `Card`, `Eyebrow`, `Badge`, `StatusBadge`, `Field`, `FormMessage`, `EmptyState`, `IconTile`, `DateTile`, `ArrowLink` |
| `src/components/icons.tsx` | Komponen `Icon` dan set ikonnya |
| `src/lib/format.ts` | Pemetaan status, jenis agenda, dan jenis surat ke warna/ikon |
| `src/app/(app)/dashboard/page.tsx` | Contoh bento lengkap |
| `src/app/(app)/surat/letter-form.tsx` | Kartu pilihan, langkah, tab segmen, switch, alur proses |
| `src/app/(app)/kalender/calendar-view.tsx` | Strip tanggal, grid bulan, chip filter, kartu agenda |
| `mockup/c-berani/*.html` | Mockup statis (bisa dibuka langsung di browser) |
