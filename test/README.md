# Uji regresi (khusus maintainer)

`smoke.mjs` menjalankan mesin balasan (`js/ai/engine.js`) lewat browser sungguhan
dan memastikan sejumlah skenario yang pernah rusak (lihat riwayat git seputar
"template audit") tidak kembali rusak saat isi `data/*.json` atau logika
klasifikasi diedit. Bukan bagian dari produk yang dikirim ke pembeli.

## Menjalankan

```
npm i -D playwright   # sekali saja, bukan dependency proyek
python3 -m http.server 8080   # di folder root proyek, terminal terpisah
node test/smoke.mjs
```

Keluar dengan kode bukan-nol dan mencetak kasus mana yang gagal kalau ada
regresi. Jalankan ini sebelum mengirim revisi baru ke pembeli mana pun yang
menyentuh `data/` atau `js/ai/engine.js`.
