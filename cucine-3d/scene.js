import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Sistema di coordinate: origine al centro del pavimento, Y verso l'alto.
// Ogni parete ha un frame locale {origin, dir, normal, length, rotY}:
//  - origin  = angolo sinistro della parete guardandola dall'interno (a terra)
//  - dir     = versore lungo la parete (da sinistra a destra)
//  - normal  = versore verso l'interno della stanza
//  - rotY    = rotazione Y da applicare ai moduli (fronte modulo = +Z locale)
export function wallFrame(wall, room) {
  const { w, d } = room;
  switch (wall) {
    case 'nord':  return { origin: new THREE.Vector3(-w / 2, 0, -d / 2), dir: new THREE.Vector3(1, 0, 0),  normal: new THREE.Vector3(0, 0, 1),  length: w, rotY: 0 };
    case 'est':   return { origin: new THREE.Vector3(w / 2, 0, -d / 2),  dir: new THREE.Vector3(0, 0, 1),  normal: new THREE.Vector3(-1, 0, 0), length: d, rotY: -Math.PI / 2 };
    case 'sud':   return { origin: new THREE.Vector3(w / 2, 0, d / 2),   dir: new THREE.Vector3(-1, 0, 0), normal: new THREE.Vector3(0, 0, -1), length: w, rotY: Math.PI };
    case 'ovest': return { origin: new THREE.Vector3(-w / 2, 0, d / 2),  dir: new THREE.Vector3(0, 0, -1), normal: new THREE.Vector3(1, 0, 0),  length: d, rotY: Math.PI / 2 };
  }
}

export function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1a);
  scene.fog = new THREE.Fog(0x0a0f1a, 14, 30);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(4.5, 3.6, 5.5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.minDistance = 1.5;
  controls.maxDistance = 16;

  // Luci
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x3a3228, 0.75));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const sun = new THREE.DirectionalLight(0xfff2df, 1.6);
  sun.position.set(4, 7, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.far = 25;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // Gruppi: stanza (ricostruita al cambio dimensioni) e cucina (ricostruita a ogni modifica)
  const roomGroup = new THREE.Group();
  const kitchenGroup = new THREE.Group();
  scene.add(roomGroup, kitchenGroup);

  const wallMeshes = {}; // wall -> mesh (per nascondere le pareti tra camera e stanza)
  let activeWall = 'nord';
  let currentRoom = { w: 4, d: 3.5, h: 2.7 };

  const wallMat = () => new THREE.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.95 });
  const activeWallColor = new THREE.Color(0xb9c0ee);
  const normalWallColor = new THREE.Color(0xd8d3ca);

  function disposeGroup(group) {
    group.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    group.clear();
  }

  function setRoom(room) {
    currentRoom = room;
    disposeGroup(roomGroup);
    Object.keys(wallMeshes).forEach((k) => delete wallMeshes[k]);
    const { w, d, h } = room;

    // Pavimento
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0x8f7d64, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // Griglia leggera per la scala (1 quadrato = 1 m)
    const grid = new THREE.GridHelper(Math.max(w, d), Math.max(w, d), 0x6b5d49, 0x77694f);
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    grid.position.y = 0.002;
    roomGroup.add(grid);

    // Pareti
    for (const wall of ['nord', 'est', 'sud', 'ovest']) {
      const f = wallFrame(wall, room);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(f.length, h, 0.1), wallMat());
      const center = f.origin.clone()
        .addScaledVector(f.dir, f.length / 2)
        .addScaledVector(f.normal, -0.05);
      center.y = h / 2;
      mesh.position.copy(center);
      mesh.rotation.y = f.rotY;
      mesh.receiveShadow = true;
      mesh.userData.wall = wall;
      mesh.userData.inwardNormal = f.normal.clone();
      roomGroup.add(mesh);
      wallMeshes[wall] = mesh;

      // Battiscopa
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(f.length, 0.08, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.8 })
      );
      const sc = f.origin.clone().addScaledVector(f.dir, f.length / 2).addScaledVector(f.normal, 0.01);
      sc.y = 0.04;
      skirt.position.copy(sc);
      skirt.rotation.y = f.rotY;
      skirt.userData.skirtOf = wall;
      roomGroup.add(skirt);
    }
    setActiveWall(activeWall);
    controls.target.set(0, 0.9, 0);
  }

  function setActiveWall(wall) {
    activeWall = wall;
    for (const [k, mesh] of Object.entries(wallMeshes)) {
      mesh.material.color.copy(k === wall ? activeWallColor : normalWallColor);
    }
  }

  // Tween morbido della camera verso il punto di vista di una parete
  let camTween = null;
  function focusWall(wall) {
    const f = wallFrame(wall, currentRoom);
    const center = f.origin.clone().addScaledVector(f.dir, f.length / 2);
    center.y = 1.1;
    const dist = Math.max(currentRoom.w, currentRoom.d) * 1.15 + 1.2;
    const pos = center.clone().addScaledVector(f.normal, dist);
    pos.y = Math.max(2.6, currentRoom.h * 1.05);
    camTween = { pos, target: center, t: 0 };
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const wpx = Math.max(1, Math.floor(rect.width));
    const hpx = Math.max(1, Math.floor(rect.height));
    renderer.setSize(wpx, hpx, false);
    camera.aspect = wpx / hpx;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  const camDelta = new THREE.Vector3();
  function animate() {
    requestAnimationFrame(animate);

    if (camTween) {
      camTween.t += 0.035;
      const k = 1 - Math.pow(1 - Math.min(camTween.t, 1), 3);
      camera.position.lerp(camTween.pos, 0.08 + 0.02 * k);
      controls.target.lerp(camTween.target, 0.1);
      if (camTween.t >= 1 || camera.position.distanceTo(camTween.pos) < 0.05) camTween = null;
    }
    controls.update();

    // Nasconde la parete (e il battiscopa) quando la camera è al di là del suo piano
    for (const [wall, mesh] of Object.entries(wallMeshes)) {
      camDelta.copy(camera.position).sub(mesh.position);
      mesh.visible = camDelta.dot(mesh.userData.inwardNormal) > 0;
    }
    roomGroup.children.forEach((obj) => {
      if (obj.userData.skirtOf) obj.visible = wallMeshes[obj.userData.skirtOf]?.visible ?? true;
    });

    renderer.render(scene, camera);
  }
  animate();

  // Interrompe il tween appena l'utente riprende il controllo
  controls.addEventListener('start', () => { camTween = null; });

  return { scene, camera, renderer, controls, kitchenGroup, setRoom, setActiveWall, focusWall, disposeGroup };
}
