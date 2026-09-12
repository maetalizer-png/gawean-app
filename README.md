# Gawean

Template chat bisnis berbasis browser. Jawaban rule-based dari berkas JSON di folder `data/`, berjalan penuh di sisi klien — tanpa server AI, tanpa backend wajib, tanpa biaya API.

Dibangun untuk dijual ulang sebagai template: satu basis kode, dipakai untuk banyak jenis bisnis (toko online, UMKM, fashion, kuliner, laundry, salon, bengkel, jasa, reseller, retail) — cukup ganti satu berkas konfigurasi, tanpa menyentuh kode program.

## Menjalankan

Di folder proyek:

```bash
python3 -m http.server 8080
```

Buka [http://localhost:8080/](http://localhost:8080/) di Chrome. Modul ES6 tidak jalan lewat `file://`.

Di HP: izinkan kamera saat diminta. Gunakan `localhost`, bukan IP LAN, agar kamera lebih mudah diizinkan.

## Mengubah identitas bisnis (tanpa menyentuh kode)

Ada dua cara, keduanya tanpa perlu paham JavaScript:

**Cara 1 — dari dalam aplikasi (disarankan):**
Buka *Pengaturan → Konfigurasi Bisnis → Ekspor konfigurasi*, edit berkas `.json` yang terunduh dengan editor teks apa pun, lalu *Impor konfigurasi* untuk menerapkannya kembali. Perubahan tersimpan di perangkat (localStorage).

**Cara 2 — edit langsung `data/toko.json`** sebelum deploy (cara lama, masih didukung penuh):

```json
{
  "nama": "Nama Bisnis",
  "tagline": "Selamat datang di bisnis kami",
  "jam": "Senin–Sabtu 08.00–17.00",
  "alamat": "Alamat lengkap",
  "area": "Cakupan pengiriman",
  "rekening": "Bank, nomor, atas nama",
  "wa": "62812xxxxxxxx",
  "garansi": "Ketentuan garansi"
}
```

Kedua cara ini saling kompatibel — `js/business.js` adalah lapisan konfigurasi terpusat yang membaca `data/toko.json` sebagai basis, lalu digabung dengan perubahan yang disimpan lewat Impor/Pengaturan. Skema lengkap (lihat `js/business.js`):

```js
{
  brand:    { name, tagline, logo, initials },
  contact:  { whatsapp, email, phone },
  location: { address, area, mapsUrl },
  business: { category, openingHours, warranty },
  theme:    { primary, accent, radius },
  chat:     { welcomeMessage, placeholder, showTypingIndicator }
}
```

`theme.primary`/`theme.accent` diterapkan langsung ke variabel CSS (`--accent`, `--accent-2`) saat aplikasi dibuka — ganti warna tanpa sentuh CSS.

**Satu langkah manual yang tidak ikut otomatis:** `manifest.webmanifest` (`name`/`short_name`) dan ikon (`assets/icon.svg`, `assets/icon-192.png`, `assets/icon-512.png`, `assets/apple-touch-icon.png`) adalah berkas statis yang dibaca langsung oleh browser sebelum JavaScript jalan, jadi tidak ikut ke-template lewat Cara 1/2 di atas. Sebelum deploy ke klien, edit `manifest.webmanifest` dan ganti keempat berkas ikon itu — kalau tidak, tampilan saat dipasang ke layar utama HP (nama & ikon) masih menampilkan "Gawean", bukan identitas bisnis klien.

## Isi folder

| Path | Fungsi |
| --- | --- |
| `index.html` | Kerangka halaman |
| `js/main.js` | Titik masuk |
| `js/business.js` | Konfigurasi bisnis terpusat (brand, kontak, tema, ekspor/impor) |
| `js/ai/engine.js` | Pencocokan intent dan jawaban |
| `js/ui/` | Chat, sidebar, lampiran, tema, login, pengaturan |
| `js/store.js` | Profil toko dan katalog dari JSON (dipakai `business.js` untuk kompatibilitas mundur) |
| `data/` | Sapaan, pelayanan, fallback |
| `data/toko.json` | Nama, jam, alamat, rekening — basis awal `business.js` |
| `css/` | Gaya, pecah per bagian |
| `assets/icon.svg` | Ikon |
| `manifest.webmanifest` | PWA |

## Data jawaban

Semua teks balasan ada di JSON. Placeholder yang dikenali mesin:

`{{nama}}` `{{jam}}` `{{alamat}}` `{{area}}` `{{rekening}}` `{{wa}}` `{{garansi}}` `{{item}}` `{{harga_item}}` `{{stok_item}}` `{{now}}`

Tambah berkas baru, daftarkan di `data/manifest.json`.

## Kontak pelanggan

Di *Pengaturan → Kontak*, tombol WhatsApp dan Gmail otomatis muncul begitu `contact.whatsapp`/`contact.email` diisi di konfigurasi bisnis. Tombol Gmail membuka jendela compose Gmail (`mail.google.com/mail/?view=cm`) dengan alamat, subjek, dan isi pesan awal terisi otomatis — tidak perlu OAuth atau kredensial apa pun.

## Akun

Login email + sandi tersimpan di perangkat (`localStorage`). Bukan akun Google sungguhan.

Untuk login Google asli (opsional, terpisah dari fitur kontak Gmail di atas):

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat OAuth Client ID (tipe Web)
3. Authorized JavaScript origins: `http://localhost:8080`
4. Isi `googleClientId` di `js/config.js`
5. Tambah Google Identity Services dan verifikasi token di server

Tanpa Client ID dan origin HTTPS/localhost, tombol Google tidak bisa resmi.

## Kamera

Pratinjau di dalam aplikasi memakai `getUserMedia`. Setelah memotret, muncul tiga pilihan:

- **Ulangi** — kembali ke pratinjau langsung
- **Simpan ke Galeri** — memicu Web Share API (`navigator.share`) sehingga sistem menampilkan pilihan "Simpan gambar" ke galeri asli perangkat. Di browser yang tidak mendukung Web Share, otomatis jatuh ke unduhan biasa (masuk folder Download) dengan pemberitahuan yang jelas ke pengguna.
- **Kirim** — melampirkan foto ke percakapan (perilaku lama, tidak berubah)

Kalau izin kamera ditolak, browser jatuh ke kamera sistem bawaan HP. Android sering menulis file dari kamera sistem ke Download/DCIM — itu perilaku OS di luar kendali web, bukan bug aplikasi.

## Status pengembangan

Lihat `docs/UPGRADE_STATUS.md` untuk rincian fase mana yang sudah selesai, sebagian, atau belum dikerjakan pada revisi template ini.

## Lisensi

Lihat `LICENSE.txt`. Satu proyek per pembelian template.
