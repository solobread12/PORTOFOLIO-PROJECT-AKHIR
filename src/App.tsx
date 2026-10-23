import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import World, { type PaperRect } from "./scene/World";
import { rig } from "./scene/rig";
import {
  contact,
  footer,
  profile,
  skills,
  type Quest,
  type Skill,
} from "./data";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);

// Menu navigasi: titik waktu di timeline scroll tempat tiap bagian tampil penuh.
// Kalau urutan atau posisi animasi di useGSAP berubah, sesuaikan angka di sini.
type NavItem = {
  key: string;
  label: string;
  time: { wide: number; narrow: number };
  narrowOnly?: boolean;
};
const NAV: NavItem[] = [
  { key: "home", label: "Beranda", time: { wide: 0, narrow: 0 } },
  { key: "about", label: "Tentang", time: { wide: 2.3, narrow: 1.6 } },
  {
    key: "skill",
    label: "Skill",
    time: { wide: 2.3, narrow: 2.8 },
    narrowOnly: true,
  },
  { key: "quest", label: "Quest", time: { wide: 5.6, narrow: 5.6 } },
  { key: "contact", label: "Surat", time: { wide: 8.7, narrow: 8.7 } },
];

function sectionAt(t: number, narrow: boolean) {
  if (t < 0.9) return "home";
  if (t < 3) return narrow && t >= 2 ? "skill" : "about";
  if (t < 6.8) return "quest";
  return "contact";
}

function SkillList({ title, items }: { title: string; items: Skill[] }) {
  return (
    <div className="skill-group">
      <h4>{title}</h4>
      {items.map((s) => (
        <div className="skill" key={s.name}>
          <span>{s.name}</span>
          <div className="bar" aria-label={`Level ${s.level} dari 10`}>
            <i style={{ width: `${s.level * 10}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestMedia({ q }: { q: Quest }) {
  if (q.type === "video") {
    if (!q.video)
      return (
        <div className="media-empty">
          Video belum ditambahkan. Isi <code>video</code> di src/data.ts.
        </div>
      );
    if (/\.(mp4|webm)$/i.test(q.video)) {
      return (
        <video
          className="media-video"
          src={q.video}
          controls
          playsInline
          preload="metadata"
        />
      );
    }
    return (
      <iframe
        className="media-video"
        src={q.video}
        title={q.title}
        loading="lazy"
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (!q.photos?.length)
    return (
      <div className="media-empty">
        Foto belum ditambahkan. Isi <code>photos</code> di src/data.ts.
      </div>
    );
  return (
    <div className="media-photos">
      {q.photos.map((src, i) => (
        <img
          key={src}
          src={src}
          loading="lazy"
          alt={`${q.title}, foto ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<{ q: Quest; rect: PaperRect } | null>(null);
  const sheet = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const closeRef = useRef<() => void>(() => {});
  // Layar loading: hero baru mulai bergerak setelah gerbang terbuka
  const heroStart = useRef<() => void>(() => {});
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState({ scene: false, fonts: false });
  const t0 = useRef(performance.now());
  // Menu navigasi
  const scrollTl = useRef<gsap.core.Timeline | null>(null);
  const narrowRef = useRef(false);
  const activeRef = useRef("home");
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  const { contextSafe } = useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Satu momen pembuka: huruf nama naik satu per satu (mulai setelah gerbang terbuka)
      let intro: gsap.core.Timeline | undefined;
      let roleLoop: gsap.core.Timeline | undefined;
      if (!reduce) {
        intro = gsap.timeline({
          paused: true,
          defaults: { ease: "power3.out" },
        });
        intro
          .from(".ch", {
            yPercent: 120,
            autoAlpha: 0,
            rotate: 8,
            stagger: 0.09,
            duration: 0.9,
          })
          .from(
            ".hero p, .hero small",
            { autoAlpha: 0, y: 14, stagger: 0.15, duration: 0.6 },
            "-=0.3",
          );
      }

      // Peran di bawah nama berganti pelan, huruf per huruf
      const roleEls = gsap.utils.toArray<HTMLElement>(".role");
      if (reduce) {
        if (roleEls[0])
          gsap.set(Array.from(roleEls[0].querySelectorAll(".rc")), {
            autoAlpha: 1,
          });
      } else if (roleEls.length) {
        const loop = gsap.timeline({ repeat: -1, paused: true });
        roleLoop = loop;
        roleEls.forEach((el) => {
          const chars = el.querySelectorAll(".rc");
          loop
            .fromTo(
              chars,
              { yPercent: 110, autoAlpha: 0 },
              {
                yPercent: 0,
                autoAlpha: 1,
                stagger: 0.035,
                duration: 0.5,
                ease: "power3.out",
              },
            )
            .to(
              chars,
              {
                yPercent: -110,
                autoAlpha: 0,
                stagger: 0.02,
                duration: 0.35,
                ease: "power2.in",
              },
              "+=1.6",
            );
        });
        // berhenti saat hero sudah tidak terlihat
        ScrollTrigger.create({
          start: 0,
          end: "+=500",
          onLeave: () => loop.pause(),
          onEnterBack: () => loop.resume(),
        });
      }

      heroStart.current = () => {
        intro?.play();
        if (roleLoop) gsap.delayedCall(1.4, () => roleLoop?.play());
      };

      // Alur scroll. Layar lebar menampilkan kartu About dan Skill bersamaan,
      // HP menampilkannya bergantian karena satu kartu sudah memenuhi layar.
      const mm = gsap.matchMedia();
      mm.add(
        { wide: "(min-width: 801px)", narrow: "(max-width: 800px)" },
        (ctx) => {
          const narrow = !!(ctx.conditions as { narrow?: boolean }).narrow;
          narrowRef.current = narrow;
          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: reduce ? true : 1.2,
              onUpdate: (self) => {
                const k = sectionAt(self.progress * tl.duration(), narrow);
                if (k !== activeRef.current) {
                  activeRef.current = k;
                  setActive(k);
                }
              },
            },
          });
          tl.to(".hero", { autoAlpha: 0, y: -30, duration: 0.6 }, 0.4);

          if (narrow) {
            tl.fromTo(
              ".card-about",
              { xPercent: -140, autoAlpha: 0, rotate: -8 },
              { xPercent: 0, autoAlpha: 1, rotate: -2, duration: 0.7 },
              0.9,
            )
              .to(
                ".card-about",
                { xPercent: -140, autoAlpha: 0, rotate: -8, duration: 0.5 },
                1.9,
              )
              .fromTo(
                ".card-skill",
                { xPercent: 140, autoAlpha: 0, rotate: 8 },
                { xPercent: 0, autoAlpha: 1, rotate: 2, duration: 0.7 },
                2.1,
              )
              .fromTo(
                ".bar i",
                { scaleX: 0, transformOrigin: "left center" },
                { scaleX: 1, stagger: 0.06, duration: 0.4, ease: "power2.out" },
                2.6,
              )
              .to(
                ".card-skill",
                { autoAlpha: 0, scale: 0.85, duration: 0.5 },
                2.9,
              );
          } else {
            // 1. kartu about dan skill meluncur dari samping ke atas meja
            tl.fromTo(
              ".card-about",
              { xPercent: -140, autoAlpha: 0, rotate: -8 },
              { xPercent: 0, autoAlpha: 1, rotate: -2, duration: 1 },
              1,
            )
              .fromTo(
                ".card-skill",
                { xPercent: 140, autoAlpha: 0, rotate: 8 },
                { xPercent: 0, autoAlpha: 1, rotate: 2, duration: 1 },
                1.25,
              )
              // bar skill terisi setelah kartu mendarat
              .fromTo(
                ".bar i",
                { scaleX: 0, transformOrigin: "left center" },
                { scaleX: 1, stagger: 0.08, duration: 0.5, ease: "power2.out" },
                1.9,
              )
              .to(".card", { autoAlpha: 0, scale: 0.85, duration: 0.6 }, 2.7);
          }

          // 2. zoom out dan naik ke papan quest
          tl.to(rig.pos, { x: 0, y: 7, z: 13, duration: 2.2 }, 3)
            .to(rig.look, { x: 0, y: 4.8, z: -2.5, duration: 2.2 }, 3)
            .to({}, { duration: 0.8 }, 5.2)
            // 3. kembali ke meja, surat muncul
            .to(rig.pos, { x: 0, y: 2.3, z: 4.8, duration: 1.8 }, 6)
            .to(rig.look, { x: 0, y: 0, z: 0.4, duration: 1.8 }, 6)
            .fromTo(
              ".contact",
              { autoAlpha: 0, y: 60 },
              { autoAlpha: 1, y: 0, duration: 0.8 },
              7.4,
            )
            // 4. footer muncul di bawah surat (surat sudah diberi ruang lewat CSS)
            .fromTo(
              ".footer",
              { autoAlpha: 0, y: 40 },
              { autoAlpha: 1, y: 0, duration: 0.6 },
              8.4,
            )
            .to({}, { duration: 0.6 }, 9.2);
          scrollTl.current = tl;
          return () => {
            scrollTl.current = null;
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  const letter = () =>
    `Halo ${profile.name}, aku ${name}.\n\n${message}\n\nBalas ke: ${email}`;

  // Surat dilipat, disegel lilin, lalu merpati membawanya terbang
  const send = contextSafe((e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    // WhatsApp dibuka sinkron supaya tidak diblokir browser
    window.open(
      `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(letter())}`,
      "_blank",
    );
    if (contact.formEndpoint) {
      fetch(contact.formEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      }).catch(() => {});
    }
    setBusy(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSent(true);
      return;
    }

    gsap
      .timeline({
        onComplete: () => {
          gsap.set(".letter", { clearProps: "all" });
          gsap.set(".seal, .dove", { autoAlpha: 0 });
          setSent(true);
        },
      })
      .to(".letter-body", { autoAlpha: 0, duration: 0.25 })
      .to(
        ".letter",
        { scaleY: 0.22, rotate: 0, duration: 0.6, ease: "power3.inOut" },
        0.1,
      )
      .fromTo(
        ".seal",
        { scale: 0, autoAlpha: 0, rotate: -40 },
        {
          scale: 1,
          autoAlpha: 1,
          rotate: 0,
          duration: 0.4,
          ease: "back.out(2.5)",
        },
      )
      .fromTo(
        ".dove",
        { x: 0, y: 0, scale: 0.8, rotate: 0, autoAlpha: 1 },
        {
          x: 560,
          y: -420,
          scale: 1.4,
          rotate: 14,
          duration: 1.4,
          ease: "power2.in",
        },
        "+=0.2",
      )
      .to(
        ".letter, .seal",
        {
          x: 560,
          y: -420,
          scale: 0.4,
          autoAlpha: 0,
          duration: 1.2,
          ease: "power2.in",
        },
        "<",
      );
  });

  // Layar loading: progres palsu sampai adegan 3D dan font siap, lalu gerbang terbuka
  useGSAP(
    () => {
      gsap.to(".loader-bar i", {
        scaleX: 0.7,
        duration: 3,
        ease: "power1.out",
      });
    },
    { scope: root },
  );

  useEffect(() => {
    document.fonts.ready.then(() => setReady((r) => ({ ...r, fonts: true })));
    // jaga-jaga kalau salah satu tidak pernah memberi sinyal
    const id = window.setTimeout(
      () => setReady({ scene: true, fonts: true }),
      8000,
    );
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (loaded) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [loaded]);

  useEffect(() => {
    if (loaded || !ready.scene || !ready.fonts) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // tampil minimal 1,3 detik supaya tidak berkedip
    const wait = Math.max(0, 1300 - (performance.now() - t0.current)) / 1000;
    const tl = gsap.timeline({
      delay: wait,
      onComplete: () => setLoaded(true),
    });
    tl.to(".loader-bar i", {
      scaleX: 1,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
    if (reduce) {
      tl.to(".loader", { autoAlpha: 0, duration: 0.3 }).add(
        () => heroStart.current(),
        0.5,
      );
    } else {
      tl.to(
        ".loader-center",
        { autoAlpha: 0, scale: 0.9, duration: 0.35 },
        "+=0.1",
      )
        .to(".gate-l", { xPercent: -100, duration: 1.1, ease: "power3.inOut" })
        .to(
          ".gate-r",
          { xPercent: 100, duration: 1.1, ease: "power3.inOut" },
          "<",
        )
        .add(() => heroStart.current(), "-=0.6");
    }
    return () => {
      tl.kill();
    };
  }, [ready, loaded]);

  // Loncat ke bagian tertentu dengan menggulir ke titik waktu yang tepat di timeline
  const goTo = (n: NavItem) => {
    const tl = scrollTl.current;
    const st = tl?.scrollTrigger;
    setMenuOpen(false);
    if (!tl || !st) return;
    const time = narrowRef.current ? n.time.narrow : n.time.wide;
    const y = st.start + (time / tl.duration()) * (st.end - st.start);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, y);
      return;
    }
    const dist = Math.abs(window.scrollY - y);
    gsap.to(window, {
      scrollTo: { y, autoKill: true },
      duration: Math.min(2.6, Math.max(1, dist / 1400)),
      ease: "power2.inOut",
      overwrite: true,
    });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Kertas terbang dari posisinya di dinding ke tengah layar
  const flyFrom = () => {
    const el = sheet.current;
    if (!el || !open) return null;
    const fr = el.getBoundingClientRect();
    return {
      x: open.rect.x - (fr.left + fr.width / 2),
      y: open.rect.y - (fr.top + fr.height / 2),
      scale: Math.max(0.15, open.rect.w / fr.width),
      rotate: (open.rect.tilt * 180) / Math.PI,
    };
  };

  useGSAP(
    () => {
      if (!open) return;
      closing.current = false;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) {
        gsap.fromTo(
          ".backdrop, .sheet",
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.2 },
        );
        return;
      }
      const f = flyFrom();
      if (!f) return;
      gsap
        .timeline()
        .fromTo(
          ".backdrop",
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.4 },
          0,
        )
        .fromTo(
          ".sheet",
          { x: f.x, y: f.y, scale: f.scale, rotate: f.rotate },
          {
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            duration: 0.75,
            ease: "power3.out",
          },
          0,
        )
        .fromTo(
          ".sheet-body, .close",
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.3 },
          0.45,
        );
    },
    { scope: root, dependencies: [open] },
  );

  const close = contextSafe(() => {
    if (!open || closing.current) return;
    closing.current = true;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const f = flyFrom();
    if (reduce || !f) {
      setOpen(null);
      return;
    }
    gsap
      .timeline({ onComplete: () => setOpen(null) })
      .to(".sheet-body, .close", { autoAlpha: 0, duration: 0.15 }, 0)
      .to(
        ".sheet",
        {
          x: f.x,
          y: f.y,
          scale: f.scale,
          rotate: f.rotate,
          duration: 0.5,
          ease: "power3.in",
        },
        0.05,
      )
      .to(".backdrop", { autoAlpha: 0, duration: 0.4 }, 0.15);
  });
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const viaInstagram = async () => {
    try {
      await navigator.clipboard.writeText(letter());
    } catch {
      /* clipboard bisa ditolak, abaikan */
    }
    window.open(contact.instagram, "_blank");
  };

  return (
    <div ref={root} className="root">
      <div className="stage">
        <World
          onOpen={(q, rect) => setOpen({ q, rect })}
          activeTitle={open ? open.q.title : null}
          onReady={() => setReady((r) => ({ ...r, scene: true }))}
        />
      </div>

      {loaded && (
        <nav className="menu" aria-label="Navigasi utama">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="menu-list"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="burger" aria-hidden="true" />
          </button>
          <ul id="menu-list" className={`menu-list${menuOpen ? " open" : ""}`}>
            {NAV.map((n) => (
              <li
                key={n.key}
                className={n.narrowOnly ? "narrow-only" : undefined}
              >
                <button
                  type="button"
                  aria-current={active === n.key ? "true" : undefined}
                  onClick={() => goTo(n)}
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="overlay">
        <header className="hero">
          <h1 aria-label={profile.name}>
            {profile.name.split("").map((c, i) => (
              <span className="ch" key={i} aria-hidden="true">
                {c}
              </span>
            ))}
          </h1>
          <p className="roles" aria-label={profile.roles.join(" dan ")}>
            {profile.roles.map((r) => (
              <span className="role" key={r} aria-hidden="true">
                {r.split("").map((c, i) => (
                  <span className="rc" key={i}>
                    {c === " " ? "\u00A0" : c}
                  </span>
                ))}
              </span>
            ))}
          </p>
          <small>Gulir ke bawah untuk masuk ke guild</small>
        </header>

        <article className="card card-about">
          <div className="badge">Kartu anggota guild</div>
          <div className="id-grid">
            <div className="photo" role="img" aria-label="Foto profil">
              Foto
            </div>
            <div>
              <h2>{profile.name}</h2>
              <span className="rank">Rank {profile.rank}</span>
              <p>{profile.bio}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Kelas</dt>
              <dd>{profile.classes.join(" dan ")}</dd>
            </div>
            <div>
              <dt>Spesialisasi</dt>
              <dd>{profile.focus}</dd>
            </div>
            <div>
              <dt>Asal</dt>
              <dd>{profile.from}</dd>
            </div>
            <div>
              <dt>Bergabung</dt>
              <dd>{profile.since}</dd>
            </div>
            <div>
              <dt>Quest selesai</dt>
              <dd>{profile.questsDone}</dd>
            </div>
          </dl>
        </article>

        <article className="card card-skill">
          <div className="badge">Lembar status</div>
          <SkillList title={profile.classes[0]} items={skills.video} />
          <SkillList title={profile.classes[1]} items={skills.photo} />
        </article>

        <section className="contact">
          <div className="letter-wrap">
            <form className="letter" onSubmit={send}>
              {sent ? (
                <p className="sent">
                  Suratmu sudah diterbangkan merpati. Tunggu balasan ya.
                </p>
              ) : (
                <div className="letter-body">
                  <h2>Kepada {profile.name},</h2>
                  <label>
                    Namaku
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Email untuk balasan
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Misi yang kuminta
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </label>
                  <div className="actions">
                    <button type="submit" disabled={busy}>
                      Segel dan kirim
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={viaInstagram}
                      disabled={busy}
                    >
                      Kirim lewat Instagram
                    </button>
                  </div>
                </div>
              )}
            </form>
            <div className="seal" aria-hidden="true">
              {profile.name.charAt(0)}
            </div>
            <div className="dove" aria-hidden="true">
              🕊️
            </div>
          </div>
        </section>

        <footer className="footer">
          <p>{footer.line}</p>
          <nav aria-label="Tautan sosial">
            {footer.links.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </nav>
          <small>
            © {new Date().getFullYear()} {profile.name}. {footer.credit}.
          </small>
        </footer>
      </div>

      {open && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quest-title"
        >
          <div className="backdrop" onClick={close} />
          <article className="sheet" ref={sheet}>
            <button
              className="close"
              ref={closeBtn}
              onClick={close}
              aria-label="Tutup quest"
            >
              ×
            </button>
            <div className="sheet-body">
              <div className="sheet-head">
                <span
                  className="stars"
                  aria-label={`Kesulitan ${open.q.level} dari 4`}
                >
                  {"★".repeat(open.q.level) + "☆".repeat(4 - open.q.level)}
                </span>
                <span className={`stamp ${open.q.type}`}>
                  {open.q.type === "video" ? "Video" : "Foto"}
                </span>
              </div>
              <h2 id="quest-title">{open.q.title}</h2>
              <p>{open.q.story}</p>
              <QuestMedia q={open.q} />
              <ul className="tags">
                {open.q.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="reward">Hadiah: {open.q.reward}</p>
            </div>
          </article>
        </div>
      )}

      {!loaded && (
        <div
          className="loader"
          role="status"
          aria-live="polite"
          aria-label="Memuat halaman"
        >
          <div className="gate gate-l" />
          <div className="gate gate-r" />
          <div className="loader-center">
            <div className="loader-flame" aria-hidden="true" />
            <p>Membuka gerbang guild</p>
            <div className="loader-bar">
              <i />
            </div>
          </div>
        </div>
      )}

      <div id="scroll" />
    </div>
  );
}
