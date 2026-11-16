// Semua isi di sini masih placeholder. Ganti dengan data aslimu.

export const profile = {
  name: "Nayaka",
  classes: ["Penenun Waktu", "Pemburu Cahaya"],
  rank: "B",
  tagline: "Editor video dan fotografer",
  // Peran yang berganti pelan di bawah nama pada hero
  roles: ["Editor video", "Fotografer lanskap"],
  bio: "Aku merangkai momen jadi cerita. Sebagai Penenun Waktu, aku mengedit video konten sosmed yang membuat orang berhenti scroll. Sebagai Pemburu Cahaya, aku memburu pemandangan terbaik lewat lensa, dari fajar sampai senja.",
  focus: "cinematic content dan photography",
  from: "Tangerang, Indonesia",
  since: "2020",
  questsDone: 6,
};

export type Skill = { name: string; level: number }; // level 1-10

export const skills: { video: Skill[]; photo: Skill[] } = {
  video: [
    { name: "Premiere Pro", level: 5 },
    { name: "CapCut", level: 8 },
    { name: "DaVinci Resolve", level: 4 },
    { name: "After Effects", level: 4 },
  ],
  photo: [
    { name: "Lightroom", level: 7},
    { name: "Photoshop", level: 6 },
    { name: "Fotografi lanskap", level: 7 },
    { name: "Drone", level: 5 },
  ],
};

export type Quest = {
  type: "video" | "foto";
  title: string;
  desc: string; // singkat, tampil di kertas di dinding
  story: string; // lebih panjang, tampil saat quest dibuka
  reward: string;
  level: 1 | 2 | 3 | 4;
  tools: string[];
  // Video: link embed YouTube/Vimeo (https://www.youtube.com/embed/ID) atau file di public/videos (/videos/nama.mp4)
  video?: string;
  // Foto: file di folder public/photos, contoh '/photos/fajar-1.jpg'
  photos?: string[];
};

export const quests: Quest[] = [
  {
    type: "video",
    title: "Misi Reels Viral",
    desc: "Video pendek vertikal untuk Instagram dan TikTok.",
    story:
      "Menyunting klip mentah menjadi video 30 detik yang menahan penonton sampai akhir. Fokus pada ritme potongan, teks, dan musik.",
    reward: "100 ribu views",
    level: 2,
    tools: ["CapCut", "Premiere Pro"],
    video: "https://www.instagram.com/reel/DRraDuzE2Nz/",
  },
  {
    type: "video",
    title: "Ekspedisi Cinematic",
    desc: "Video perjalanan dengan color grading sinematik.",
    story:
      "Merangkai rekaman perjalanan menjadi film pendek dengan grading warna yang konsisten dari awal sampai akhir.",
    reward: "Film 3 menit",
    level: 3,
    tools: ["DaVinci Resolve", "Premiere Pro"],
    video: "",
  },
  {
    type: "video",
    title: "Legenda Brand",
    desc: "Konten promosi untuk sebuah brand lokal.",
    story:
      "Membuat rangkaian konten promosi yang menceritakan brand dengan gaya visual yang seragam.",
    reward: "Klien puas",
    level: 3,
    tools: ["After Effects", "Premiere Pro"],
    video: "",
  },
  {
    type: "foto",
    title: "Fajar di Atas Awan",
    desc: "Pegunungan saat matahari terbit.",
    story:
      "Mendaki sebelum subuh untuk menangkap cahaya pertama yang menyentuh lautan awan.",
    reward: "Seri 12 foto",
    level: 4,
    tools: ["Kamera mirrorless", "Lightroom"],
    photos: [],
  },
  {
    type: "foto",
    title: "Senja di Tepi Laut",
    desc: "Pantai saat golden hour.",
    story:
      "Berburu jam emas di pantai, bermain dengan siluet, ombak, dan langit yang berubah warna.",
    reward: "Seri 8 foto",
    level: 2,
    tools: ["Kamera mirrorless", "Lightroom"],
    photos: [],
  },
  {
    type: "foto",
    title: "Hutan Berkabut",
    desc: "Lanskap hutan dengan kabut pagi.",
    story:
      "Menunggu kabut pagi turun di antara pepohonan untuk mendapatkan kedalaman dan suasana tenang.",
    reward: "Seri 10 foto",
    level: 3,
    tools: ["Kamera mirrorless", "Photoshop"],
    photos: [],
  },
];

export const contact = {
  whatsapp: "6281213833143", // nomor WA tanpa + dan tanpa 0 di depan
  instagram: "https://www.instagram.com/nayyk.12/",
  email: "nayakabackup2@gmail.com",
  // Daftar gratis di formspree.io lalu isi endpoint-nya, contoh: https://formspree.io/f/xxxxxxxx
  formEndpoint: "",
};

// Isi footer di akhir halaman (di bawah surat Contact)
export const footer = {
  line: "Setiap momen layak jadi cerita. Sampai jumpa di quest berikutnya.",
  links: [
    { label: "Instagram", href: contact.instagram },
    { label: "WhatsApp", href: `https://wa.me/${contact.whatsapp}` },
    { label: "Email", href: `mailto:${contact.email}` },
  ],
  credit: "Dibuat dengan React, three.js, dan GSAP",
};
