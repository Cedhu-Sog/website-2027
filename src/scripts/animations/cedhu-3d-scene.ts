import {
  AgXToneMapping, Box3, DirectionalLight, Group, HemisphereLight, Vector3,
  OrthographicCamera, PCFShadowMap, Scene, SRGBColorSpace, Texture, WebGLRenderer,
  type BufferGeometry, type Material, type Mesh, type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCampusEnvironment } from './campus-environment';

// The current GLB shares the logo texture across its surfaces.
function disposeModel(root: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture) textures.add(value);
      }
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  const bitmaps = new Set<ImageBitmap>();
  textures.forEach(texture => {
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) bitmaps.add(texture.image);
    texture.dispose();
  });
  bitmaps.forEach(bitmap => bitmap.close());
}

/** Camera and lighting adapted from the package; lifecycle belongs to this site. */
export async function mountCampus(host: HTMLElement, signal: AbortSignal, isActive: () => boolean) {
  const canvas = host.querySelector('canvas');
  if (!canvas || !host.dataset.model) throw new Error('Falta el canvas o la ruta del modelo.');
  const renderBox = host.querySelector('.cedhu-3d__trigger') ?? canvas;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobile = window.matchMedia('(pointer: coarse)');
  const compact = window.matchMedia('(width < 48rem)');
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
  Object.assign(key.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 200 });
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
  const maxTouchAngle = 4 * Math.PI / 180;
  const mobileFitZoom = 1.14;

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
  let touchTarget = 0;
  let entryZoom = 1.32;
  let frameHalfWidth = 38;
  let frameHalfHeight = 30.4;
  const frameCenter = new Vector3();

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  const canRender = () => ready && !disposed && !contextLost && !pageHidden && isActive() && !document.hidden;
  const scrollProgress = () => {
    const bounds = host.getBoundingClientRect();
    const viewportHeight = document.documentElement.clientHeight;
    // Entry at the viewport bottom → centered → exit at the viewport top.
    return Math.min(1, Math.max(0, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
  };
  const tick = (time: number) => {
    frame = 0;
    if (!canRender()) return;
    // One render loop owns rotation. Mobile sums independent scroll and touch targets.
    const mouseEnabled = mouseMotionEnabled();
    const scrollEnabled = scrollMotionEnabled();
    const enabled = mouseEnabled || scrollEnabled;
    // Read scroll geometry once per animation frame, shared by yaw and zoom.
    const progress = scrollEnabled ? scrollProgress() : 0;
    const targetX = mouseEnabled ? mouseX : 0;
    const targetY = mouseEnabled ? mouseY : scrollEnabled ? (progress * 2 - 1) * maxScrollAngle + touchTarget : 0;
    const zoomEnabled = scrollEnabled && compact.matches;
    // Hold the close view on entry, then fit before the model leaves the screen.
    const fitProgress = Math.min(1, Math.max(0, (progress - .2) / .45));
    const fit = fitProgress * fitProgress * (3 - 2 * fitProgress);
    const targetZoom = zoomEnabled ? mobileFitZoom + (entryZoom - mobileFitZoom) * (1 - fit) : 1;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 1 / 60;
    previousTime = time;
    // Restore the original mouse damping; retain the existing scroll smoothing.
    if (!orientationInitialized || !enabled) interactionPivot.rotation.set(targetX, targetY, 0);
    else {
      const alpha = 1 - Math.exp(-(mouseEnabled ? 6 : 12) * dt);
      interactionPivot.rotation.x += (targetX - interactionPivot.rotation.x) * alpha;
      interactionPivot.rotation.y += (targetY - interactionPivot.rotation.y) * alpha;
    }
    const rotationSettling = Math.abs(targetX - interactionPivot.rotation.x) + Math.abs(targetY - interactionPivot.rotation.y) > .00001;
    if (!rotationSettling) interactionPivot.rotation.set(targetX, targetY, 0);
    // Camera zoom composes with the pivot rotation without resampling the canvas.
    let zoom = !orientationInitialized || !zoomEnabled
      ? targetZoom
      : camera.zoom + (targetZoom - camera.zoom) * (1 - Math.exp(-12 * dt));
    const zoomSettling = Math.abs(targetZoom - zoom) > .00001;
    if (!zoomSettling) zoom = targetZoom;
    if (camera.zoom !== zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    orientationInitialized = true;
    renderer.render(scene, camera);
    // Reveal only after a successful frame, including after context restoration.
    host.setAttribute('data-ready', '');
    if (rotationSettling || zoomSettling) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  };
  const wake = () => {
    if (!canRender()) { stop(); return; }
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const onScroll = () => { if (scrollMotionEnabled()) wake(); };
  const onTouchOffset = (event: Event) => {
    if (!scrollMotionEnabled() || !isActive()) { touchTarget = 0; return; }
    const offset = (event as CustomEvent<number>).detail;
    if (!Number.isFinite(offset)) return;
    touchTarget = Math.min(1, Math.max(-1, offset)) * maxTouchAngle;
    // The existing damped render loop also eases the return to zero on release.
    wake();
  };
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
    touchTarget = 0;
    // Drop the previous input mode, including when restoring reduced motion.
    orientationInitialized = false;
    wake();
  };
  const resize = () => {
    // Measure layout dimensions, excluding hover/tour transforms from the pixel budget.
    const style = getComputedStyle(renderBox);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    const visualWidth = parseFloat(getComputedStyle(canvas).width);
    if (width <= 0 || height <= 0) return;
    // Intentionally crop the lateral corners, with less zoom on small phones.
    entryZoom = 1.30 + .04 * Math.min(1, Math.max(0, (width - 280) / 110));
    const aspect = width / height;
    const halfHeight = Math.max(frameHalfHeight, frameHalfWidth / aspect);
    // Fit the complete environment and match the visible canvas aspect.
    camera.left = frameCenter.x - halfHeight * visualWidth / height;
    camera.right = frameCenter.x + halfHeight * visualWidth / height;
    camera.top = frameCenter.y + halfHeight;
    camera.bottom = frameCenter.y - halfHeight;
    camera.updateProjectionMatrix();
    // Retina touch screens need more than DPR 1. Cap at 2 to bound fill rate
    // and framebuffer memory; retain the existing desktop/shadow budget.
    const pixelRatio = Math.min(window.devicePixelRatio, fine.matches ? 1.5 : 2);
    if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
    // Mobile browser chrome can resize the viewport without resizing the model.
    // Avoid reallocating the drawing buffer for those repeated notifications.
    if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) {
      renderer.setSize(width, height, false);
    }
    wake();
  };
  const lost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    host.removeAttribute('data-ready');
    stop();
  };
  const restored = () => { contextLost = false; resize(); };
  const hide = () => { pageHidden = true; touchTarget = 0; stop(); };
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
    compact.removeEventListener('change', motionChange);
    reduce.removeEventListener('change', motionChange);
    fine.removeEventListener('change', motionChange);
    fine.removeEventListener('change', resize);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', resetMouse);
    host.removeEventListener('campus-touch-offset', onTouchOffset);
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
  ro.observe(canvas);
  preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  mobile.addEventListener('change', motionChange);
  compact.addEventListener('change', motionChange);
  reduce.addEventListener('change', motionChange);
  fine.addEventListener('change', motionChange);
  fine.addEventListener('change', resize);
  host.addEventListener('pointermove', onPointerMove, { passive: true });
  host.addEventListener('pointerleave', resetMouse);
  host.addEventListener('campus-touch-offset', onTouchOffset);
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
    gltf.scene.traverse(object => {
      const mesh = object as Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
    // Preserve the supplied asset; add the environment as a sibling under one pivot.
    model = new Group();
    model.name = 'Conjunto del CEDHU';
    model.add(gltf.scene);
    model.add(createCampusEnvironment());
    const center = new Box3().setFromObject(model).getCenter(new Vector3());
    model.position.set(-center.x, 0, -center.z);
    interactionPivot.add(model);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    // Fit the complete scene once after loading, without per-scroll geometry work.
    const viewBounds = new Box3();
    const point = new Vector3();
    model.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
        viewBounds.expandByPoint(point);
      }
    });
    viewBounds.getCenter(frameCenter);
    const viewSize = viewBounds.getSize(new Vector3());
    frameHalfWidth = viewSize.x * .6;
    frameHalfHeight = viewSize.y * .6;
    resize();
    ready = true;
    wake();
    return wake;
  } catch (error) {
    cleanup();
    throw error;
  }
}
