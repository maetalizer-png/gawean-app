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

## Sebagian

**Fase 6 — WhatsApp integration**
`waLink()` sekarang punya tombol UI (sebelumnya tidak ada sama sekali). Yang belum: deep-link otomatis dari konteks percakapan tertentu (mis. tombol WA muncul otomatis saat AI mendeteksi niat "mau pesan" di tengah chat) — saat ini kontak WA/Gmail statis di halaman Pengaturan saja.

**Fase 8 — PWA / Service Worker**
Manifest sudah ada dari sebelumnya dan berfungsi. Belum diaudit ulang untuk cache versioning atau strategi offline yang lebih matang (lihat catatan proyek Pitutur di percakapan lain untuk pola cache-first vs network-first yang relevan kalau mau diterapkan di sini juga).

## Belum dikerjakan (jujur, bukan lupa)

**Fase 4 — Catalog manager (UI visual)**
`store.saveKatalog()` sudah ada sebagai fungsi, dan sekarang bisa diisi lewat impor JSON — tapi belum ada FORM VISUAL untuk tambah/edit produk satu-per-satu dari dalam aplikasi (tambah nama, harga, foto, stok lewat UI, bukan edit JSON mentah). Ini pekerjaan UI yang cukup besar (perlu halaman/sheet baru, validasi form, preview) — pantas jadi sesi kerja tersendiri, bukan ditempel terburu-buru.

**Fase 5 — Chat UX lanjutan**
`chat.welcomeMessage` sudah tersambung (pesan pembuka otomatis saat chat baru). Indikator "sedang mengetik" (`chat.showTypingIndicator`) ada di skema config tapi belum ada implementasi animasinya di `chat.js`.

**Fase 9 — Accessibility / Security audit**
Belum dilakukan audit terpisah (kontras warna per kombinasi tema custom, navigasi keyboard penuh, `aria-live` di area chat, dsb). Karena `theme.primary`/`theme.accent` sekarang bisa diganti bebas oleh pembeli template, ada risiko kombinasi warna buruk yang tidak divalidasi otomatis — kalau template dijual luas, ini layak jadi prioritas berikutnya.

**Fase 10-11 — Dokumentasi terpisah & Testing formal**
README sudah diperbarui, tapi belum ada dokumentasi terpisah gaya "panduan pembeli" (screenshot, video, langkah setup untuk orang non-teknis). Testing yang dilakukan hari ini murni fungsional (Node.js, simulasi) untuk modul baru — belum ada testing lintas-browser sungguhan (Safari iOS, Firefox) untuk fitur Web Share/kamera yang perilakunya memang bervariasi antar-browser.

**Fase 12 — Commercial polish**
Belum ada: mode demo/preview untuk marketing, watermark/branding "dibuat dengan Gawean" yang bisa dimatikan, lisensi terprogram (activation key), atau halaman showcase multi-tema untuk materi jualan.

## Rekomendasi urutan lanjutan

1. Fase 4 (catalog manager visual) — nilai jual paling langsung terasa buat pembeli
2. Fase 9 (accessibility/kontras) — risiko diam-diam kalau warna custom dipakai luas
3. Fase 12 (commercial polish) — baru relevan kalau Fase 4 dan 9 sudah solid
