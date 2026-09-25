import {
  BoxGeometry, CylinderGeometry, Group, IcosahedronGeometry, Matrix4,
  Mesh, MeshStandardMaterial, Quaternion, RingGeometry, Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// An illustrative extension of the supplied campus, in the GLB's metre-like units.
// Its front facade faces +Z. The street separates it from the parking/recreation lot.
// These are scene materials, independent of the site's CSS presentation tokens.
const palette = {
  grass: 0x82976d, turf: 0x376b4a, turfLight: 0x427956,
  paving: 0xa38d7c, sidewalk: 0xd5cdbb, asphalt: 0x797d78,
  foliage: 0x527c49, foliageLight: 0x789558, wood: 0x846448,
  white: 0xf2eddb, yellow: 0xdcc15b, blue: 0x407f93,
  red: 0xa95b48, dark: 0x35494b,
};
type Surface = keyof typeof palette;

/** Static, texture-free scenery, batched by material to keep mobile draw calls low. */
export function createCampusEnvironment() {
  const root = new Group();
  root.name = 'Entorno del CEDHU';
  const batches = new Map<Surface, BufferGeometry[]>();
  const box = new BoxGeometry(1, 1, 1);
  const cylinder = new CylinderGeometry(1, 1, 1, 8);
  const crown = new IcosahedronGeometry(1, 1);
  const roof = new CylinderGeometry(0, 1, 1, 4);
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const position = new Vector3();
  const scale = new Vector3();
  const bake = (shape: BufferGeometry) => {
    const geometry = shape.clone().applyMatrix4(matrix);
    if (!geometry.index) return geometry;
    const flat = geometry.toNonIndexed();
    geometry.dispose();
    return flat;
  };
  function add(shape: BufferGeometry, surface: Surface, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, yaw = 0) {
    matrix.compose(position.set(x, y, z), rotation.setFromAxisAngle(up, yaw), scale.set(sx, sy, sz));
    const geometry = bake(shape);
    const batch = batches.get(surface) ?? [];
    batch.push(geometry);
    batches.set(surface, batch);
  }
  const slab = (surface: Surface, x: number, z: number, w: number, d: number, y = -.08, h = .12) =>
    add(box, surface, x, y, z, w, h, d);
  const post = (surface: Surface, x: number, z: number, h: number, radius = .09) =>
    add(cylinder, surface, x, h / 2, z, radius, h, radius);
  function beam(surface: Surface, a: [number, number, number], b: [number, number, number], radius: number) {
    const start = new Vector3(...a), end = new Vector3(...b);
    const direction = end.clone().sub(start);
    matrix.compose(start.add(end).multiplyScalar(.5), rotation.setFromUnitVectors(up, direction.clone().normalize()),
      scale.set(radius, direction.length(), radius));
    const geometry = bake(cylinder);
    const batch = batches.get(surface) ?? [];
    batch.push(geometry);
    batches.set(surface, batch);
  }
  function tree(x: number, z: number, size: number, light = false) {
    post('wood', x, z, size * .7, .16);
    add(crown, light ? 'foliageLight' : 'foliage', x, size, z, size * .58, size * .72, size * .58);
  }

  // Low stepped landscape edges preserve the original plinth and its architecture.
  slab('grass', 0, 22, 73, 94, -.92, .32);
  slab('grass', 0, 69, 65, 9, -.92, .32);
  slab('sidewalk', 0, 23.6, 71, 2, -.16, .28);
  slab('asphalt', 0, 27.8, 73, 6.4, -.17, .18);
  slab('sidewalk', 0, 32, 71, 2, -.16, .28);
  // A crossing directly opposite the existing main entrance; no hedge across it.
  for (let z = 25; z < 31; z += .85) slab('white', -17, z, 5.6, .43, -.065, .025);
  slab('yellow', -29, 27.8, 11, .1, -.065, .025);
  slab('yellow', 10, 27.8, 47, .1, -.065, .025);
  for (const [x, w] of [[-28, 13], [9, 46]]) {
    slab('foliage', x, 32.65, w, .75, .48, 1.15);
  }

  // Long brick-toned parking apron, low yellow stops and clearly open circulation.
  slab('paving', 0, 38, 67, 9.5, -.18, .22);
  for (let x = -30; x <= 30; x += 5) {
    slab('yellow', x, 36.7, .09, 5.7, -.05, .025);
    slab('yellow', x + 2.5, 34.2, 1.7, .24, .06, .18);
  }
  slab('sidewalk', 0, 43.6, 67, 1.2, -.1, .22);
  function car(x: number, surface: Surface) {
    add(box, 'dark', x, .26, 37, 2.05, .5, 3.65);
    add(box, surface, x, .72, 37, 2.15, .7, 3.9);
    add(box, 'dark', x, 1.27, 37.25, 1.85, .65, 2.25);
    add(box, surface, x, 1.62, 37.3, 1.88, .12, 1.6);
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      add(box, 'dark', x + side * 1.03, .28, 37 + end * 1.22, .22, .5, .7);
    }
  }
  car(-27.5, 'white'); car(-7.5, 'blue'); car(12.5, 'dark'); car(27.5, 'red');

  // Side-by-side recreation areas BEHIND parking, following the black annotations.
  slab('sidewalk', -18, 56.3, 27, 23.5, -.2, .24);
  slab('grass', -18, 56.3, 24.5, 21, -.055, .12);
  slab('paving', -20.5, 52, 12, 9, .015, .035);
  slab('sidewalk', -1.7, 56.5, 2.2, 24, -.13, .22);

  // Open play tower with a warm red roof, a slide and a two-seat swing.
  for (const x of [-25, -22]) for (const z of [49, 52]) post('wood', x, z, 3.7, .14);
  slab('yellow', -23.5, 50.5, 3.5, 3.5, 2, .2);
  add(roof, 'red', -23.5, 4.15, 50.5, 3.1, 1.3, 3.1, Math.PI / 4);
  matrix.compose(position.set(-22, 1.15, 55),
    rotation.setFromAxisAngle(new Vector3(1, 0, 0), Math.atan2(1.9, 6)),
    scale.set(1.25, .12, Math.hypot(1.9, 6)));
  batches.get('yellow')!.push(bake(box));
  for (const x of [-22.6, -21.4]) beam('yellow', [x, 2.2, 52], [x, .3, 58], .075);
  for (const z of [49.4, 51.4]) beam('wood', [-27, 0, z], [-25.1, 2, z], .09);
  for (let y = .3; y < 2; y += .4) {
    const x = -27 + y * .95;
    beam('wood', [x, y, 49.4], [x, y, 51.4], .08);
  }
  for (const x of [-15, -8]) {
    beam('wood', [x, 0, 58], [x, 3.9, 60], .13);
    beam('wood', [x, 3.9, 60], [x, 0, 62], .13);
  }
  beam('wood', [-15.3, 3.9, 60], [-7.7, 3.9, 60], .16);
  for (const x of [-13, -10]) {
    for (const side of [-.5, .5]) beam('dark', [x + side, 3.8, 60], [x + side, .8, 60.3], .035);
    slab('yellow', x, 60.3, 1.3, .65, .8, .14);
  }
  slab('wood', -25, 62, 5, .9, .65, .2);
  for (const x of [-26.7, -23.3]) add(box, 'dark', x, .3, 62, .2, .7, .6);

  // The real blue enclosure is interpreted as an open-top fence: the pitch stays visible.
  slab('sidewalk', 16, 56.5, 31, 25, -.18, .26);
  slab('turf', 16, 56.5, 28, 22, -.02, .12);
  for (let i = 0; i < 7; i++) slab(i % 2 ? 'turf' : 'turfLight', 4 + i * 4, 56.5, 4, 22, .047, .016);
  for (const z of [46.5, 66.5]) slab('white', 16, z, 26, .12, .064, .018);
  for (const x of [3, 29, 16]) slab('white', x, 56.5, .12, 20, .064, .018);
  const circle = new RingGeometry(2.8, 2.92, 48).rotateX(-Math.PI / 2);
  add(circle, 'white', 16, .077, 56.5, 1, 1, 1);
  circle.dispose();
  for (const end of [3, 29]) {
    const inner = end === 3 ? 7 : 25;
    slab('white', inner, 56.5, .12, 10, .064, .018);
    for (const z of [51.5, 61.5]) slab('white', (inner + end) / 2, z, 4, .12, .064, .018);
    for (const z of [53.8, 59.2]) {
      post('white', end, z, 2.25, .095);
      beam('white', [end, 2.25, z], [end + (end === 3 ? -1 : 1), .1, z], .045);
    }
    beam('white', [end, 2.25, 53.8], [end, 2.25, 59.2], .095);
  }
  // Fine open rails avoid opaque screens hiding the field, especially on phones.
  for (const z of [45, 68]) {
    for (let x = 1; x <= 31; x += 5) post('blue', x, z, 3.2, .07);
    for (const y of [.55, 1.6, 3.2]) beam('blue', [1, y, z], [31, y, z], .025);
  }
  for (const x of [1, 31]) {
    for (const z of [50, 56.5, 63]) post('blue', x, z, 3.2, .07);
    beam('blue', [x, 3.2, 45], [x, 3.2, 68], .025);
  }

  // Plant only at the perimeter, never on the street, bays, play pad or pitch.
  for (const [x, z, size] of [[-33, -19, 3.8], [33, -18, 4], [-33, 2, 3.3],
    [33, 7, 3.5], [-34, 47, 3], [-34, 64, 3.5], [34, 48, 3], [34, 66, 3.4],
    [-25, 71, 2.5], [-9, 71, 2.2], [12, 71, 2.5], [28, 71, 2.4]]) {
    tree(x, z, size, x > 0);
  }
  for (let x = -26; x <= 26; x += 5.2) {
    add(crown, 'foliageLight', x, .12, -24, 1.4, .65, .8);
  }
  for (const x of [-34, 34]) for (const z of [16, 20, 54, 59]) {
    add(crown, 'foliage', x, .12, z, .9, .55, 1.1);
  }

  for (const [surface, parts] of batches) {
    const geometry = mergeGeometries(parts);
    parts.forEach(part => part.dispose());
    if (!geometry) throw new Error(`No se pudo construir el entorno: ${surface}`);
    const material = new MeshStandardMaterial({ color: palette[surface], roughness: .95 });
    const mesh = new Mesh(geometry, material);
    mesh.name = `Entorno | ${surface}`;
    mesh.castShadow = surface === 'foliage' || surface === 'foliageLight' || surface === 'wood';
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  [box, cylinder, crown, roof].forEach(geometry => geometry.dispose());
  return root;
}
