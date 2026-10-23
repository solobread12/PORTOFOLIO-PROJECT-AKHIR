import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { quests, type Quest } from "../data";
import { rig } from "./rig";

// Posisi dan ukuran kertas di layar (piksel), dipakai untuk animasi kertas terbang ke tengah
export type PaperRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  tilt: number;
};
// Kertas hanya bisa disentuh saat kamera sudah naik menghadap dinding
// Layar kecil (HP) mendapat beban render lebih ringan
const small = typeof window !== "undefined" && window.innerWidth < 800;
const questsLive = () => rig.pos.y > 5.2;

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function woodTexture(hue: number, repeatX = 1, repeatY = 1, light = 17) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `hsl(${hue} 38% ${light + Math.random() * 8}%)`;
    g.fillRect(0, i * 64, 512, 64);
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `hsla(${hue} 40% ${Math.max(8, light - 30)}% / .28)`;
      g.beginPath();
      const y = i * 64 + Math.random() * 64;
      g.moveTo(0, y);
      g.bezierCurveTo(150, y + 4, 300, y - 4, 512, y + 2);
      g.stroke();
    }
    g.fillStyle = "rgba(0,0,0,.55)";
    g.fillRect(0, i * 64, 512, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  return t;
}

function wrap(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
) {
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = word;
      y += lh;
    } else line = test;
  }
  g.fillText(line, x, y);
  return y + lh;
}

function QuestPaper({
  q,
  position,
  tilt,
  phase,
  hidden,
  onOpen,
}: {
  q: Quest;
  position: [number, number, number];
  tilt: number;
  phase: number;
  hidden: boolean;
  onOpen: (q: Quest, r: PaperRect) => void;
}) {
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.MeshBasicMaterial>(null);
  const hovered = useRef(false);
  const lift = useRef(0);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    if (hovered.current && !questsLive()) {
      hovered.current = false;
      document.body.style.cursor = "";
    }
    // lift bergerak halus menuju 1 saat disentuh, kembali ke 0 saat tidak
    lift.current +=
      ((hovered.current ? 1 : 0) - lift.current) * Math.min(1, dt * 9);
    const l = lift.current;
    const sway = reduce
      ? 0
      : Math.sin(clock.elapsedTime * 0.9 + phase) * 0.014 * (1 - l);
    g.position.set(position[0], position[1] + l * 0.08, position[2] + l * 0.65);
    g.rotation.set(
      -l * 0.14,
      l * 0.05 * Math.sign(position[0] || 1),
      tilt + sway,
    );
    g.scale.setScalar(1 + l * 0.07);
    if (shadow.current) shadow.current.opacity = l * 0.4;
  });

  const rectOnScreen = (): PaperRect => {
    const c = new THREE.Vector3();
    group.current!.getWorldPosition(c);
    const proj = (v: THREE.Vector3) => {
      const p = v.clone().project(camera);
      return {
        x: (p.x * 0.5 + 0.5) * size.width,
        y: (-p.y * 0.5 + 0.5) * size.height,
      };
    };
    const mid = proj(c);
    const right = proj(c.clone().add(new THREE.Vector3(1.2, 0, 0)));
    const top = proj(c.clone().add(new THREE.Vector3(0, 1.1, 0)));
    return {
      x: mid.x,
      y: mid.y,
      w: Math.abs(right.x - mid.x) * 2,
      h: Math.abs(mid.y - top.y) * 2,
      tilt,
    };
  };

  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 440;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { canvas, tex };
  }, []);

  useEffect(() => {
    const draw = () => {
      const g = canvas.getContext("2d")!;
      g.clearRect(0, 0, 480, 440);
      g.fillStyle = "#efdcb0";
      g.fillRect(0, 0, 480, 440);
      g.strokeStyle = "#8a6a3a";
      g.lineWidth = 3;
      g.strokeRect(14, 14, 452, 412);
      g.fillStyle = "#8a2a1f";
      g.font = "600 26px Lora, serif";
      g.fillText("★".repeat(q.level) + "☆".repeat(4 - q.level), 32, 64);
      g.fillStyle = "#2a1a0e";
      g.font = "700 32px Cinzel, serif";
      let y = wrap(g, q.title, 32, 118, 410, 38);
      g.font = "500 22px Lora, serif";
      y = wrap(g, q.desc, 32, y + 10, 410, 30);
      g.fillStyle = "#8a2a1f";
      g.font = "600 22px Lora, serif";
      g.fillText(`Hadiah: ${q.reward}`, 32, 392);
      // stempel jenis quest
      g.save();
      g.translate(392, 74);
      g.rotate(-0.25);
      g.strokeStyle = g.fillStyle = q.type === "video" ? "#8a2a1f" : "#1f4a8a";
      g.lineWidth = 3;
      g.strokeRect(-48, -20, 96, 40);
      g.font = "700 20px Cinzel, serif";
      g.textAlign = "center";
      g.fillText(q.type === "video" ? "Video" : "Foto", 0, 7);
      g.restore();
      tex.needsUpdate = true;
    };
    draw();
    Promise.all([
      document.fonts.load("700 32px Cinzel"),
      document.fonts.load("500 22px Lora"),
    ]).then(draw);
    return () => tex.dispose();
  }, [canvas, tex, q]);

  return (
    <group visible={!hidden}>
      {/* bayangan di dinding, makin gelap saat kertas terangkat */}
      <mesh
        position={[position[0] + 0.08, position[1] - 0.1, position[2] - 0.02]}
        rotation={[0, 0, tilt]}
      >
        <planeGeometry args={[2.5, 2.3]} />
        <meshBasicMaterial
          ref={shadow}
          color="#000"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <group ref={group} position={position} rotation={[0, 0, tilt]}>
        <mesh
          onPointerOver={(e) => {
            if (!questsLive()) return;
            e.stopPropagation();
            hovered.current = true;
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            hovered.current = false;
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            if (!questsLive()) return;
            e.stopPropagation();
            hovered.current = false;
            document.body.style.cursor = "";
            onOpen(q, rectOnScreen());
          }}
        >
          <planeGeometry args={[2.4, 2.2]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.98, 0.04]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#8a2a1f" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Wall({
  onOpen,
  activeTitle,
}: {
  onOpen: (q: Quest, r: PaperRect) => void;
  activeTitle: string | null;
}) {
  const wood = useMemo(() => woodTexture(22, 3, 3), []);
  const frame = useMemo(() => woodTexture(30, 2, 1), []);
  const cols = [-3, 0, 3];
  const rows = [6.3, 3.8];
  const tilts = [-0.03, 0.025, -0.02, 0.02, -0.03, 0.03];
  return (
    <group>
      <mesh position={[0, 5, -2.5]}>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial map={wood} roughness={0.95} />
      </mesh>
      <mesh position={[0, 5.05, -2.42]}>
        <boxGeometry args={[10, 6.2, 0.12]} />
        <meshStandardMaterial map={frame} roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.05, -2.34]}>
        <boxGeometry args={[9.6, 5.8, 0.06]} />
        <meshStandardMaterial color="#4a3320" roughness={1} />
      </mesh>
      {quests.map((q, i) => (
        <QuestPaper
          key={q.title}
          q={q}
          position={[cols[i % 3], rows[Math.floor(i / 3)], -2.28]}
          tilt={tilts[i]}
          phase={i * 1.3}
          hidden={q.title === activeTitle}
          onOpen={onOpen}
        />
      ))}
    </group>
  );
}

function Desk() {
  const top = useMemo(() => woodTexture(28, 2, 1), []);
  const legs: [number, number][] = [
    [-4.2, -2],
    [4.2, -2],
    [-4.2, 2],
    [4.2, 2],
  ];
  return (
    <group>
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[9, 0.3, 4.6]} />
        <meshStandardMaterial map={top} roughness={0.75} />
      </mesh>
      {legs.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -2.3, z]}>
          <boxGeometry args={[0.4, 4, 0.4]} />
          <meshStandardMaterial color="#2a1a0e" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function DeskProps() {
  const flame = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flame.current)
      flame.current.intensity =
        14 + Math.sin(t * 9) * 2 + Math.sin(t * 23) * 1.2;
    if (bulb.current)
      bulb.current.scale.set(1, 1.35 + Math.sin(t * 11) * 0.15, 1);
  });
  return (
    <group>
      {/* kertas surat */}
      <mesh position={[0, 0.006, 0.7]} rotation={[-Math.PI / 2, 0, 0.04]}>
        <planeGeometry args={[3.2, 2.3]} />
        <meshStandardMaterial color="#efdcb0" roughness={0.95} />
      </mesh>
      {/* botol tinta */}
      <group position={[3.3, 0, 0.1]}>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.3, 0.34, 0.54, 20]} />
          <meshStandardMaterial
            color="#10162b"
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.16, 16]} />
          <meshStandardMaterial color="#3a2819" roughness={0.8} />
        </mesh>
      </group>
      {/* bulu */}
      <group position={[2.2, 0.07, 1.3]} rotation={[0, 0.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 1.7, 8]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        </mesh>
        <mesh position={[0.55, 0.02, 0]} scale={[1.3, 0.04, 0.28]}>
          <sphereGeometry args={[0.5, 16, 12]} />
          <meshStandardMaterial color="#f4ecd8" roughness={0.7} />
        </mesh>
      </group>
      {/* lilin */}
      <group position={[-3.5, 0, -1.2]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.13, 0.15, 0.6, 16]} />
          <meshStandardMaterial color="#e9dcb8" roughness={0.9} />
        </mesh>
        <mesh ref={bulb} position={[0, 0.68, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial
            color="#ffb347"
            emissive="#ff8c1a"
            emissiveIntensity={2.5}
          />
        </mesh>
        <pointLight
          ref={flame}
          position={[0, 0.8, 0.2]}
          color="#ffa14a"
          distance={9}
          decay={2}
        />
      </group>
    </group>
  );
}

// Bayangan bulat di meja, karena adegan ini tidak memakai shadow map
function Blob({
  r = 0.6,
  x = 0,
  z = 0,
  sx = 1,
}: {
  r?: number;
  x?: number;
  z?: number;
  sx?: number;
}) {
  return (
    <mesh
      position={[x, 0.004, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[sx, 1, 1]}
    >
      <circleGeometry args={[r, 28]} />
      <meshBasicMaterial
        color="#3a2410"
        transparent
        opacity={0.22}
        depthWrite={false}
      />
    </mesh>
  );
}

// Benda profesi di atas meja: kamera, gulungan film, dan klakbor
function FilmProps() {
  const reel = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!reduce && reel.current) reel.current.rotation.z += dt * 0.35;
  });
  const holes = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2;
    return [Math.cos(a) * 0.3, Math.sin(a) * 0.3] as const;
  });
  const stripes = [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5];
  return (
    <group>
      {/* kamera */}
      <group position={[-2.4, 0, 0.6]} rotation={[0, 0.5, 0]}>
        <Blob r={0.75} sx={1.15} />
        <mesh position={[0, 0.31, 0]}>
          <boxGeometry args={[1.1, 0.62, 0.55]} />
          <meshStandardMaterial color="#2a2b30" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.66, 0]}>
          <boxGeometry args={[1.1, 0.1, 0.55]} />
          <meshStandardMaterial
            color="#b9bcc4"
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        <mesh position={[0, 0.82, -0.02]}>
          <boxGeometry args={[0.4, 0.22, 0.38]} />
          <meshStandardMaterial color="#2a2b30" roughness={0.55} />
        </mesh>
        <mesh position={[0.5, 0.31, 0.3]}>
          <boxGeometry args={[0.26, 0.6, 0.2]} />
          <meshStandardMaterial color="#17171a" roughness={0.9} />
        </mesh>
        <mesh position={[0.38, 0.74, 0.1]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
          <meshStandardMaterial
            color="#c9a22a"
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
        <mesh position={[0, 0.34, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.27, 0.3, 0.5, 28]} />
          <meshStandardMaterial
            color="#1b1c20"
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.34, 0.76]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.025, 10, 28]} />
          <meshStandardMaterial
            color="#c4c7ce"
            roughness={0.25}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[0, 0.34, 0.755]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 28]} />
          <meshStandardMaterial
            color="#1c2d4d"
            roughness={0.08}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* gulungan film, berdiri dan berputar pelan */}
      <group position={[-3.2, 0.5, -0.4]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, -0.5 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55, 24]} />
          <meshBasicMaterial
            color="#3a2410"
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
        <group ref={reel}>
          {[-0.09, 0.09].map((z) => (
            <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 0.04, 36]} />
              <meshStandardMaterial
                color="#cfcab9"
                roughness={0.35}
                metalness={0.6}
              />
            </mesh>
          ))}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.14, 32]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.26, 20]} />
            <meshStandardMaterial
              color="#8c8f96"
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>
          {holes.map(([hx, hy], i) => (
            <mesh
              key={i}
              position={[hx, hy, 0.112]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.07, 0.07, 0.01, 16]} />
              <meshStandardMaterial color="#f3e6c8" roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>

      {/* klakbor, bersandar ke belakang */}
      <group position={[-1.2, 0, -1.5]} rotation={[-0.25, 0.2, 0]}>
        <Blob r={0.7} sx={1.2} z={0.15} />
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[1.3, 0.85, 0.06]} />
          <meshStandardMaterial color="#1f1f22" roughness={0.6} />
        </mesh>
        {[0.6, 0.45, 0.3].map((y) => (
          <mesh key={y} position={[0, y, 0.035]}>
            <boxGeometry args={[0.95, 0.03, 0.01]} />
            <meshStandardMaterial color="#e9e4d4" roughness={0.8} />
          </mesh>
        ))}
        <group position={[-0.65, 0.9, 0.04]} rotation={[0, 0, 0.16]}>
          <group position={[0.65, 0.1, 0]}>
            <mesh>
              <boxGeometry args={[1.3, 0.2, 0.07]} />
              <meshStandardMaterial color="#1f1f22" roughness={0.6} />
            </mesh>
            {stripes.map((x) => (
              <mesh key={x} position={[x, 0, 0.005]} rotation={[0, 0, 0.7]}>
                <boxGeometry args={[0.1, 0.26, 0.075]} />
                <meshStandardMaterial color="#f1ecdc" roughness={0.8} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

function Dust({ count = 140 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 10.5 - 1;
      positions[i * 3 + 2] = Math.random() * 10 - 4.5;
      speeds[i] = 0.05 + Math.random() * 0.12;
    }
    return { positions, speeds };
  }, [count]);

  useFrame(({ clock }, dt) => {
    const geo = ref.current?.geometry;
    if (!geo || reduce) return;
    const arr = geo.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      arr[i * 3] += Math.sin(t * 0.4 + i) * 0.08 * dt;
      if (arr[i * 3 + 1] > 9.5) arr[i * 3 + 1] = -1;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffd9a0"
        size={0.05}
        transparent
        opacity={0.55}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function CameraRig() {
  useFrame(({ camera, clock, size }) => {
    const t = reduce ? 0 : clock.elapsedTime;
    // Layar potret (HP) lebih sempit: kamera dimundurkan menjauhi titik yang dilihat
    // supaya meja dan papan quest tetap muat. Di layar lebar nilainya 1 (tidak berubah).
    const aspect = size.width / size.height;
    const k = Math.min(2.4, Math.max(1, 1.5 / aspect));
    camera.position.set(
      rig.look.x + (rig.pos.x - rig.look.x) * k + Math.sin(t * 0.35) * 0.07,
      rig.look.y + (rig.pos.y - rig.look.y) * k + Math.sin(t * 0.5) * 0.05,
      rig.look.z + (rig.pos.z - rig.look.z) * k,
    );
    camera.lookAt(
      rig.look.x + Math.sin(t * 0.27) * 0.05,
      rig.look.y,
      rig.look.z,
    );
  });
  return null;
}

export default function World({
  onOpen,
  activeTitle,
  onReady,
}: {
  onOpen: (q: Quest, r: PaperRect) => void;
  activeTitle: string | null;
  onReady?: () => void;
}) {
  // Resolusi render turun otomatis kalau frame rate jatuh, naik lagi kalau sudah lancar
  const top = small ? 1.25 : 1.75;
  const [dpr, setDpr] = useState(top);
  return (
    <Canvas
      camera={{ fov: 40, near: 0.1, far: 80, position: [0, 2.5, 5.4] }}
      dpr={dpr}
      gl={{ antialias: !small, powerPreference: "high-performance" }}
      onCreated={() => onReady?.()}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
        onIncline={() => setDpr(top)}
        onFallback={() => setDpr(0.75)}
      />
      <color attach="background" args={["#150d08"]} />
      <fog attach="fog" args={["#150d08", 22, 48]} />
      <ambientLight intensity={0.55} color="#ffe2b8" />
      <directionalLight position={[3, 9, 8]} intensity={1.1} color="#ffd9a0" />
      <pointLight
        position={[0, 6, 2]}
        intensity={25}
        color="#ffb766"
        distance={22}
        decay={2}
      />
      <Wall onOpen={onOpen} activeTitle={activeTitle} />
      <Desk />
      <DeskProps />
      <FilmProps />
      <Dust count={small ? 60 : 140} />
      <CameraRig />
    </Canvas>
  );
}
