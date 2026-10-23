import { useGLTF } from '@react-three/drei'

// Pakai kalau nanti mau mengganti objek buatan kode dengan model .glb.
// Taruh file di folder public/models, lalu: <Model url="/models/desk.glb" position={[0, -1, 0]} />
export function Model({ url, ...props }: { url: string } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} {...props} />
}
