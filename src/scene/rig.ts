import * as THREE from 'three'

// Posisi kamera dan titik yang dilihat. Timeline GSAP di App.tsx mengubah nilai ini,
// lalu CameraRig menyalinnya ke kamera setiap frame.
export const rig = {
  pos: new THREE.Vector3(0, 2.5, 5.4),
  look: new THREE.Vector3(0, 0, 0.4),
}
