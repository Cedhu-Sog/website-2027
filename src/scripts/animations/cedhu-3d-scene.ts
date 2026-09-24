import {
  AgXToneMapping, DirectionalLight, Group, HemisphereLight,
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

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobile = window.matchMedia('(pointer: coarse)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => !reduce.matches && document.documentElement.dataset.motion !== 'reduced';
  const mouseMotionEnabled = () => fine.matches && motionAllowed();
  const scrollMotionEnabled = () => !fine.matches && mobile.matches && motionAllowed();
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
  // An identity parent preserves the asset's position, scale and own orientation.
  const interactionPivot = new Group();
  scene.add(interactionPivot);
  const maxScrollAngle = 4 * Math.PI / 180;

  let model: Group | undefined;
  let ready = false;
  let disposed = false;
  let contextLost = false;
  let pageHidden = false;
  let frame = 0;
  let previousTime = 0;
  let orientationInitialized = false;
  let mouseX = 0;
  let mouseY = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  const canRender = () => ready && !disposed && !contextLost && !pageHidden && isActive() && !document.hidden;
  const scrollAngle = () => {
    const bounds = host.getBoundingClientRect();
    const viewportHeight = document.documentElement.clientHeight;
    // Entry at the viewport bottom → centered → exit at the viewport top.
    const progress = Math.min(1, Math.max(0, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
    return (progress * 2 - 1) * maxScrollAngle;
  };
  const tick = (time: number) => {
    frame = 0;
    if (!canRender()) return;
    // A single target and render loop own rotation; the input modes never combine.
    const mouseEnabled = mouseMotionEnabled();
    const scrollEnabled = scrollMotionEnabled();
    const enabled = mouseEnabled || scrollEnabled;
    const targetX = mouseEnabled ? mouseX : 0;
    const targetY = mouseEnabled ? mouseY : scrollEnabled ? scrollAngle() : 0;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 1 / 60;
    previousTime = time;
    // Restore the original mouse damping; retain the existing scroll smoothing.
    if (!orientationInitialized || !enabled) interactionPivot.rotation.set(targetX, targetY, 0);
    else {
      const alpha = 1 - Math.exp(-(mouseEnabled ? 6 : 12) * dt);
      interactionPivot.rotation.x += (targetX - interactionPivot.rotation.x) * alpha;
      interactionPivot.rotation.y += (targetY - interactionPivot.rotation.y) * alpha;
    }
    orientationInitialized = true;
    const settling = Math.abs(targetX - interactionPivot.rotation.x) + Math.abs(targetY - interactionPivot.rotation.y) > .00001;
    if (!settling) interactionPivot.rotation.set(targetX, targetY, 0);
    renderer.render(scene, camera);
    // Reveal only after a successful frame, including after context restoration.
    host.setAttribute('data-ready', '');
    if (settling) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  };
  const wake = () => {
    if (!canRender()) { stop(); return; }
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const onScroll = () => { if (scrollMotionEnabled()) wake(); };
  const onPointerMove = (event: PointerEvent) => {
    if (!isActive() || !mouseMotionEnabled() || event.pointerType === 'touch' || event.buttons) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const x = Math.min(1, Math.max(-1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.min(1, Math.max(-1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    // Original limits in radians: yaw ±0.1, pitch ±0.035; no accumulated drag.
    mouseY = x * .1;
    mouseX = y * .035;
    wake();
  };
  const resetMouse = () => {
    mouseX = mouseY = 0;
    if (mouseMotionEnabled()) wake();
  };
  const motionChange = () => {
    mouseX = mouseY = 0;
    // Drop the previous input mode, including when restoring reduced motion.
    orientationInitialized = false;
    wake();
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
    mobile.removeEventListener('change', motionChange);
    reduce.removeEventListener('change', motionChange);
    fine.removeEventListener('change', motionChange);
    fine.removeEventListener('change', resize);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', resetMouse);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', resize);
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
  mobile.addEventListener('change', motionChange);
  reduce.addEventListener('change', motionChange);
  fine.addEventListener('change', motionChange);
  fine.addEventListener('change', resize);
  host.addEventListener('pointermove', onPointerMove, { passive: true });
  host.addEventListener('pointerleave', resetMouse);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize);
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
    interactionPivot.add(model);
    ready = true;
    wake();
    return wake;
  } catch (error) {
    cleanup();
    throw error;
  }
}
