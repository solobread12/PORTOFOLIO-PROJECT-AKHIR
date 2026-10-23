# Portfolio guild petualang (Acho)

React + TypeScript + React Three Fiber + GSAP ScrollTrigger.

## Jalankan
```
npm install
npm run dev
```

## Alur scroll
Meja (hero) -> kartu About dan Skill meluncur dari samping -> kamera zoom out dan naik ke papan quest -> kamera turun ke meja -> surat Contact muncul.
Semua gerakan ada di satu timeline di `src/App.tsx`. Ubah angka posisi (0, 1, 3, 6, 7.4, ...) untuk mengatur tempo.

## Isi
Semua teks ada di `src/data.ts` (profil, skill, 6 quest, kontak). Yang wajib diisi:
- `contact.whatsapp` (format 62812..., tanpa +)
- `contact.instagram`
- `contact.formEndpoint` (Formspree) supaya email terkirim otomatis

## Model 3D
Saat ini meja, dinding, lilin, tinta, dan bulu dibuat dari bentuk dasar di `src/scene/World.tsx`, jadi tidak butuh file model.
Untuk memakai model .glb: taruh di `public/models/`, lalu pakai komponen `Model` (`src/scene/Model.tsx`).
Cek lisensi tiap model dan cantumkan kredit kalau lisensinya CC BY.
