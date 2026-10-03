# Status Upgrade Gawean — Commercial Template Edition

Revisi ini mengerjakan fondasi (konfigurasi bisnis terpusat) dan dua permintaan spesifik (kamera ke galeri, kontak Gmail) secara penuh dan teruji. Fase yang butuh pekerjaan desain visual besar (katalog bergambar, halaman dokumentasi terpisah) belum dikerjakan — lebih baik jujur daripada terlihat selesai padahal dangkal.

## Selesai, teruji

**Fase 1 — Audit kode existing**
Seluruh berkas (`main.js`, `store.js`, `auth.js`, `threads.js`, `ai/engine.js`, `ui/*.js`, `index.html`, CSS) dibaca penuh sebelum perubahan apa pun. Temuan kunci: `store.js` sudah punya sistem `{{placeholder}}` yang solid dan dipakai di 1.181 entri data — keputusan desain utama fase berikutnya adalah membangun DI ATAS sistem ini, bukan menggantinya.

**Fase 2 — Business configuration**
`js/business.js` baru: skema persis seperti yang diminta (`brand`, `contact`, `location`, `business`, `theme`, `chat`). Baca dari `data/toko.json` sebagai basis, gabung dengan override localStorage, tulis balik ke `store.toko()` lama supaya seluruh sistem placeholder tetap jalan tanpa perubahan. Diuji 12 skenario: default termuat, simpan sebagian tidak menghapus field lain, sinkron mundur ke sistem lama, waLink/mailLink, ekspor/impor JSON.

**Fase 3 — Brand customization**
`shell.brand()` memakai `businessConfig.brand` (nama, tagline, logo, inisial). Warna tema (`theme.primary`/`theme.accent`) diterapkan ke CSS custom properties saat aplikasi dibuka. Logo gambar didukung (fallback ke inisial teks kalau kosong).

**Kamera → Galeri** *(permintaan eksplisit)*
Alur tinjau-foto baru: Ambil → Ulangi / Simpan ke Galeri / Kirim. "Simpan ke Galeri" memicu Web Share API (`navigator.share`) sehingga sistem menawarkan simpan langsung ke galeri asli — bukan cuma jadi lampiran chat seperti sebelumnya. Fallback jujur ke unduhan biasa dengan pemberitahuan jelas kalau perangkat tidak mendukung Web Share.

**Gmail** *(permintaan eksplisit)*
Diimplementasikan sebagai kanal kontak (`contact.email`), bukan OAuth login — ditempatkan berdampingan dengan `waLink()` yang sebenarnya sudah ada di kode sejak awal tapi tidak pernah punya tombol di UI (celah nyata, sekarang diperbaiki juga). Tombol "Hubungi via Gmail" membuka jendela compose Gmail terisi otomatis. Tidak butuh Client ID/kredensial — cocok untuk template yang dijual ke banyak pembeli tanpa masing-masing perlu setup Google Cloud sendiri.

**Impor/Ekspor konfigurasi**
Tombol di Pengaturan: ekspor seluruh `business` + `katalog` jadi satu berkas `.json`, impor kembali menerapkannya langsung. Ini yang membuat "ganti identitas bisnis tanpa paham source code" benar-benar bisa dilakukan pembeli template, bukan cuma janji di deskripsi produk.

**README**
Ditulis ulang: cara jalan, dua cara ganti identitas bisnis, skema konfigurasi lengkap, penjelasan kamera/galeri, penjelasan kontak Gmail vs login Google (dua hal berbeda, sengaja dipisah biar tidak membingungkan pembeli).

## Diverifikasi tidak merusak yang sudah ada

- 1.181 entri corpus tetap termuat, mesin rule-based tetap merespons normal setelah semua perubahan
- Sistem `{{placeholder}}` di seluruh data JSON tidak tersentuh sama sekali
- Cross-check penuh: semua `$()` mengacu ID yang benar-benar ada di HTML, semua `import`/`export` antar-modul cocok
- Auth, dark/light mode, attachment, localStorage, PWA manifest — tidak diubah sama sekali (tidak ada risiko regresi karena tidak disentuh)

## Selesai, teruji (sesi upgrade berikutnya)

**Fase 5 — Chat UX lanjutan (typing indicator)**
`chat.showTypingIndicator` dari skema config kini benar-benar dibaca oleh `chat.js`: bubble "sedang mengetik" dibangun sebagai tiga titik beranimasi CSS (`@keyframes typing-blink`, dengan fallback `prefers-reduced-motion`) plus label `.sr-only` untuk pembaca layar. Kalau flag dimatikan di konfigurasi bisnis, tahap typing dilewati sepenuhnya.

**Fase 6 — WhatsApp deep-link kontekstual**
Tombol "Lanjut via WhatsApp" kini muncul otomatis di dalam percakapan ketika pesan pengguna terdeteksi mengandung intent transaksi (order/pesan/beli/checkout/bayar/transfer/dp/cod/resi/ongkir/kirim). Link memakai `store.waLink()` dengan teks chat terisi nama toko + potongan jawaban AI sebagai konteks. Tetap diam (tanpa error) jika nomor WA belum diisi.

**Fase 8 — PWA / Service Worker**
`sw.js` baru: shell app di-cache saat install (cache-first), aset statis & JSON korpus di-cache saat miss, navigasi memakai network-first dengan fallback ke index.html tersimpan supaya aplikasi tetap terbuka offline. Registrasi hanya terjadi saat disajikan via http/https (diam di bawah `file://`). Naik versi cache cukup ganti konstanta `CACHE`. **Diperkuat:** seluruh CSS per-file ikut di-precache; kelima puluh enam file korpus (`data/manifest.json`) kini di-prefetch saat install sehingga chat AI tetap menjawab penuh saat offline total (cache v2).

**Fase 13 — Tampilan desktop (layout dua kolom)**
Layout lama hanya satu kolom mobile yang melebar penuh di monitor besar (bubble chat "lonjong ke samping"). Sekarang: `css/desktop.css` baru — pada layar ≥960px sidebar riwayat menjadi rail permanen di kiri, shell chat berpusat selebar maksimum 860px ala WhatsApp Web dengan latar luar berkontras (light/dark), panjang baris bubble dibatasi ±760px, composer dan sheet lampiran menjadi kartu mengambang, dan hamburger disembunyikan (diproteksi juga di JS agar `.open` tidak menimpa posisi rail). Di bawah 960px perilaku mobile persis seperti sebelumnya.

**Fase 9 — Accessibility (parsial)**
Area `#messages` kini memakai `aria-live="polite"` + `aria-label` sehingga balasan AI diumumkan ke pembaca layar; tombol WA adalah elemen `<a>` asli (fokus-able keyboard). Catatan: audit kontras warna untuk kombinasi tema custom masih terbuka (lihat Sebagian).

## Sebagian

**Fase 9 — Accessibility / Security audit (sisa)**
Sudah: `aria-live` di area chat, typing indicator dengan label sr-only, animasi menghormati `prefers-reduced-motion`, tombol WA sebagai link semantik. Belum: validasi otomatis kontras `theme.primary` × `--accent-ink` per kombinasi warna custom, dan uji navigasi keyboard penuh.

## Belum dikerjakan (jujur, bukan lupa)

**Fase 4 — Catalog manager (UI visual)**
`store.saveKatalog()` sudah ada sebagai fungsi, dan sekarang bisa diisi lewat impor JSON — tapi belum ada FORM VISUAL untuk tambah/edit produk satu-per-satu dari dalam aplikasi (tambah nama, harga, foto, stok lewat UI, bukan edit JSON mentah). Ini pekerjaan UI yang cukup besar (perlu halaman/sheet baru, validasi form, preview) — pantas jadi sesi kerja tersendiri, bukan ditempel terburu-buru.

(Fase 5 typing indicator dan sebagian Fase 9 accessibility sudah selesai — lihat bagian "Selesai, teruji (sesi upgrade berikutnya)" di atas.)

**Fase 10-11 — Dokumentasi terpisah & Testing formal**
README sudah diperbarui, tapi belum ada dokumentasi terpisah gaya "panduan pembeli" (screenshot, video, langkah setup untuk orang non-teknis). Testing yang dilakukan hari ini murni fungsional (Node.js, simulasi) untuk modul baru — belum ada testing lintas-browser sungguhan (Safari iOS, Firefox) untuk fitur Web Share/kamera yang perilakunya memang bervariasi antar-browser.

**Fase 12 — Commercial polish**
Belum ada: mode demo/preview untuk marketing, watermark/branding "dibuat dengan Gawean" yang bisa dimatikan, lisensi terprogram (activation key), atau halaman showcase multi-tema untuk materi jualan.

## Rekomendasi urutan lanjutan

1. Fase 4 (catalog manager visual) — nilai jual paling langsung terasa buat pembeli
2. Fase 9 (accessibility/kontras) — risiko diam-diam kalau warna custom dipakai luas
3. Fase 12 (commercial polish) — baru relevan kalau Fase 4 dan 9 sudah solid
