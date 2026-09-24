import {
  AgXToneMapping, DirectionalLight, Group, HemisphereLight, MathUtils,
  OrthographicCamera, PCFShadowMap, Scene, SRGBColorSpace, WebGLRenderer,
  type BufferGeometry, type Material, type Mesh, type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// The supplied campus uses uniform materials and has no textures to release.
function disposeModel(root: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

/** Camera and lighting adapted from the package; lifecycle belongs to this site. */
export async function mountCampus(host: HTMLElement, signal: AbortSignal, isActive: () => boolean) {
  const canvas = host.querySelector('canvas');
  if (!canvas || !host.dataset.model) throw new Error('Falta el canvas o la ruta del modelo.');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = () => reduce.matches || document.documentElement.dataset.motion === 'reduced';
  // Avoid the additional shadow pass on touch devices.
  renderer.shadowMap.enabled = fine.matches;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.add(new HemisphereLight(0xf4f7f3, 0x747b62, 2.5));
  const key = new DirectionalLight(0xfff3dd, 4);
  key.position.set(-30, 65, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 });
  key.shadow.normalBias = .12;
  key.shadow.bias = -.0001;
  scene.add(key);
  const fill = new DirectionalLight(0xdde9ff, 1.7);
  fill.position.set(40, 35, -20);
  scene.add(fill);

  const camera = new OrthographicCamera(-38, 38, 30.4, -30.4, .1, 300);
  camera.position.set(62, 76, 85);
  camera.lookAt(0, 3, 0);
  const pivot = new Group();
  scene.add(pivot);

  let model: Group | undefined;
  let ready = false;
  let disposed = false;
  let contextLost = false;
  let pageHidden = false;
  let frame = 0;
  let previous = 0;
  let targetX = 0;
  let targetY = 0;
  let rotationX = 0;
  let rotationY = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  };
  const canRender = () => ready && !disposed && !contextLost && !pageHidden && isActive() && !document.hidden;
  const tick = (time: number) => {
    frame = 0;
    if (!canRender()) { previous = 0; return; }
    const dt = previous ? Math.min((time - previous) / 1000, .05) : 1 / 60;
    previous = time;
    const alpha = 1 - Math.exp(-6 * dt);
    pivot.rotation.x += (targetX - pivot.rotation.x) * alpha;
    pivot.rotation.y += (targetY - pivot.rotation.y) * alpha;
    renderer.render(scene, camera);
    // Reveal only after a successful frame, including after context restoration.
    host.setAttribute('data-ready', '');
    if (Math.abs(targetX - pivot.rotation.x) + Math.abs(targetY - pivot.rotation.y) > .0001) {
      frame = requestAnimationFrame(tick);
    } else {
      previous = 0;
    }
  };
  const wake = () => {
    if (!canRender()) { stop(); return; }
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;
    const halfHeight = Math.max(30.4, 38 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, fine.matches ? 1.5 : 1));
    renderer.setSize(width, height, false);
    wake();
  };
  const move = (event: PointerEvent) => {
    if (!isActive() || event.buttons || reducedMotion() || !fine.matches || event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    const x = MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    const y = MathUtils.clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    targetY = rotationY + x * .1;
    targetX = rotationX + y * .035;
    wake();
  };
  const rotate = (event: Event) => {
    if (!isActive()) return;
    const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
    rotationY += x * Math.PI * 2;
    rotationX = MathUtils.clamp(rotationX + y, -.3, .3);
    targetX = rotationX;
    targetY = rotationY;
    // Direct manipulation remains available without eased motion.
    if (reducedMotion()) pivot.rotation.set(targetX, targetY, 0);
    wake();
  };
  const reset = () => { targetX = rotationX; targetY = rotationY; wake(); };
  const motionChange = () => {
    targetX = rotationX;
    targetY = rotationY;
    if (reducedMotion() || !fine.matches) pivot.rotation.set(targetX, targetY, 0);
    wake();
  };
  const pointerChange = () => { motionChange(); resize(); };
  const lost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    host.removeAttribute('data-ready');
    stop();
  };
  const restored = () => { contextLost = false; resize(); };
  const hide = () => { pageHidden = true; stop(); };
  const show = () => { pageHidden = false; resize(); };
  const ro = new ResizeObserver(resize);
  const preferences = new MutationObserver(motionChange);

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    stop();
    ro.disconnect();
    preferences.disconnect();
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerleave', reset);
    host.removeEventListener('campus-rotate', rotate);
    reduce.removeEventListener('change', motionChange);
    fine.removeEventListener('change', pointerChange);
    document.removeEventListener('visibilitychange', wake);
    window.removeEventListener('pagehide', hide);
    window.removeEventListener('pageshow', show);
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    signal.removeEventListener('abort', cleanup);
    if (model) disposeModel(model);
    key.shadow.map?.dispose();
    renderer.dispose();
    host.removeAttribute('data-ready');
  };

  signal.addEventListener('abort', cleanup, { once: true });
  ro.observe(host);
  preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerleave', reset);
  host.addEventListener('campus-rotate', rotate);
  reduce.addEventListener('change', motionChange);
  fine.addEventListener('change', pointerChange);
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', show);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);

  try {
    resize();
    // Abort the download when an instance is removed during loading.
    const url = new URL(host.dataset.model, document.baseURI);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`No se pudo cargar la maqueta (${response.status}).`);
    const data = await response.arrayBuffer();
    signal.throwIfAborted();
    const gltf = await new GLTFLoader().parseAsync(data, new URL('.', url).href);
    if (signal.aborted) { disposeModel(gltf.scene); signal.throwIfAborted(); }
    model = gltf.scene;
    model.traverse(object => {
      const mesh = object as Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
    pivot.add(model);
    ready = true;
    wake();
    return wake;
  } catch (error) {
    cleanup();
    throw error;
  }
}
