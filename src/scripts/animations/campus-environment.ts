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

  // Preserve the corrected dimensions and internal layout; position this lot as
  // one unit after construction, independently of the street and vegetation.
  const recreationStarts = new Map<Surface, number>();
  for (const [surface, parts] of batches) recreationStarts.set(surface, parts.length);
  // Dimensions are illustrative scene units, not surveyed metres.
  const playground = { x: 1, z: 57.5, width: 12, depth: 22 };
  const pitch = { x: 20, z: 58.5, width: 16, depth: 24 };
  slab('sidewalk', playground.x, playground.z, playground.width + 2, playground.depth + 2, -.2, .24);
  slab('grass', playground.x, playground.z, playground.width, playground.depth, -.055, .12);
  slab('paving', -1.8, 52.5, 5.6, 9, .015, .035);
  // The translated path overlaps the rear parking sidewalk to keep access continuous.
  slab('sidewalk', 9.5, 57.85, 1.6, 27.3, -.13, .22);
  slab('sidewalk', 9.5, 54, 4, 1.6, -.13, .22);

  // Open play tower with a warm red roof, a slide and a two-seat swing.
  // Child-sized equipment retains the original tower/slide/swing design.
  for (const x of [-2.8, -.7]) for (const z of [49.5, 51.6]) post('wood', x, z, 2.6, .1);
  slab('yellow', -1.75, 50.55, 2.45, 2.45, 1.4, .14);
  add(roof, 'red', -1.75, 2.9, 50.55, 2.17, .91, 2.17, Math.PI / 4);
  matrix.compose(position.set(-.7, .805, 53.7),
    rotation.setFromAxisAngle(new Vector3(1, 0, 0), Math.atan2(1.33, 4.2)),
    scale.set(.875, .084, Math.hypot(1.33, 4.2)));
  batches.get('yellow')!.push(bake(box));
  for (const x of [-1.12, -.28]) beam('yellow', [x, 1.54, 51.6], [x, .21, 55.8], .0525);
  for (const z of [49.78, 51.18]) beam('wood', [-4.2, 0, z], [-2.87, 1.4, z], .063);
  for (let y = .21; y < 1.4; y += .28) {
    const x = -4.2 + y * .95;
    beam('wood', [x, y, 49.78], [x, y, 51.18], .056);
  }
  for (const x of [-.2, 4.7]) {
    beam('wood', [x, 0, 60.6], [x, 2.73, 62], .091);
    beam('wood', [x, 2.73, 62], [x, 0, 63.4], .091);
  }
  beam('wood', [-.41, 2.73, 62], [4.91, 2.73, 62], .112);
  for (const x of [1.2, 3.3]) {
    for (const side of [-.35, .35]) beam('dark', [x + side, 2.66, 62], [x + side, .56, 62.21], .0245);
    slab('yellow', x, 62.21, .91, .455, .56, .098);
  }
  slab('wood', -2, 66, 3.5, .63, .455, .14);
  for (const x of [-3.19, -.81]) add(box, 'dark', x, .21, 66, .14, .49, .42);

  // A padded ball pit occupies the free corner beside the tower and slide,
  // leaving the existing swing, bench and circulation space untouched.
  const ballPit = { x: 3.6, z: 52, width: 4.4, depth: 4.4, wall: .34 };
  slab('blue', ballPit.x, ballPit.z, ballPit.width, ballPit.depth, .14, .2);
  for (const side of [-1, 1]) {
    const x = ballPit.x + side * (ballPit.width - ballPit.wall) / 2;
    add(box, side < 0 ? 'yellow' : 'blue', x, .49, ballPit.z, ballPit.wall, .7, ballPit.depth);
    beam('yellow', [x, .84, ballPit.z - 2.03], [x, .84, ballPit.z + 2.03], .17);
  }
  slab('red', ballPit.x, ballPit.z + 2.03, ballPit.width - ballPit.wall, ballPit.wall, .49, .7);
  beam('red', [1.57, .84, 54.03], [5.63, .84, 54.03], .17);
  // A low central entry in the front padded wall faces the open play space.
  for (const x of [2.25, 4.95]) {
    slab('blue', x, 49.97, 1.7, ballPit.wall, .49, .7);
    beam('yellow', [x - .85, .84, 49.97], [x + .85, .84, 49.97], .17);
  }
  slab('yellow', ballPit.x, 49.8, 1, .8, .22, .3);
  const ballColors: Surface[] = ['yellow', 'blue', 'red', 'white'];
  for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
    const x = ballPit.x + (column - 3.5) * .44 + (row % 2 ? .04 : -.04);
    const z = ballPit.z + (row - 3.5) * .44;
    const y = .64 + ((row * 3 + column) % 3) * .045;
    add(crown, ballColors[(row * 3 + column * 5) % ballColors.length], x, y, z, .21, .21, .21);
  }

  // The longer pitch axis runs away from the street, beside the playground.
  // Derive markings, goals and open fencing from one footprint to keep them aligned.
  slab('sidewalk', pitch.x, pitch.z, pitch.width + 2, pitch.depth + 2, -.18, .26);
  slab('turf', pitch.x, pitch.z, pitch.width, pitch.depth, -.02, .12);
  const stripeDepth = pitch.depth / 6;
  for (let i = 0; i < 6; i++) {
    slab(i % 2 ? 'turf' : 'turfLight', pitch.x, pitch.z - pitch.depth / 2 + (i + .5) * stripeDepth,
      pitch.width, stripeDepth, .047, .016);
  }
  const left = pitch.x - pitch.width / 2 + 1, right = pitch.x + pitch.width / 2 - 1;
  const front = pitch.z - pitch.depth / 2 + 1, back = pitch.z + pitch.depth / 2 - 1;
  for (const z of [front, pitch.z, back]) slab('white', pitch.x, z, right - left, .1, .064, .018);
  for (const x of [left, right]) slab('white', x, pitch.z, .1, back - front, .064, .018);
  const circle = new RingGeometry(2.1, 2.2, 48).rotateX(-Math.PI / 2);
  add(circle, 'white', pitch.x, .077, pitch.z, 1, 1, 1);
  circle.dispose();
  for (const end of [front, back]) {
    const direction = end === front ? 1 : -1;
    const inner = end + direction * 3.2;
    slab('white', pitch.x, inner, 8, .1, .064, .018);
    for (const x of [pitch.x - 4, pitch.x + 4]) slab('white', x, (inner + end) / 2, .1, 3.2, .064, .018);
    for (const x of [pitch.x - 2.1, pitch.x + 2.1]) {
      post('white', x, end, 1.9, .075);
      beam('white', [x, 1.9, end], [x, .1, end - direction * .9], .04);
    }
    beam('white', [pitch.x - 2.1, 1.9, end], [pitch.x + 2.1, 1.9, end], .075);
  }
  // One outer enclosure includes both unchanged areas and the central walkway.
  // Only the pitch has an internal division, with fine ball-retaining netting.
  // All fence/net geometry shares the existing blue batch; no extra draw calls.
  const fence = { height: 2.8, postRadius: .06, railRadius: .025,
    infillRadius: .018, maxBay: 3.4, infillSpacing: .45, bottom: .2,
    borderOffset: .5, gateWidth: 1.4, gateZ: 54, entranceX: 9.5,
    netHeight: 4.6, netSpacing: .18, netThickness: .004, netBottom: .06 };
  function recreationEnclosure() {
    const x0 = playground.x - playground.width / 2 - fence.borderOffset;
    const x1 = pitch.x + pitch.width / 2 + fence.borderOffset;
    const z0 = Math.min(playground.z - playground.depth / 2, pitch.z - pitch.depth / 2) - fence.borderOffset;
    const z1 = Math.max(playground.z + playground.depth / 2, pitch.z + pitch.depth / 2) + fence.borderOffset;
    const dividerX = pitch.x - pitch.width / 2 - fence.borderOffset;
    const posts = new Set<string>();
    function upright(x: number, z: number) {
      const key = `${x.toFixed(5)},${z.toFixed(5)}`;
      if (posts.has(key)) return;
      posts.add(key);
      const height = x >= dividerX ? fence.netHeight : fence.height;
      post('blue', x, z, height, fence.postRadius);
    }
    function panel(ax: number, az: number, bx: number, bz: number) {
      for (const y of [fence.bottom, fence.height]) {
        beam('blue', [ax, y, az], [bx, y, bz], fence.railRadius);
      }
      const divisions = Math.ceil(Math.hypot(bx - ax, bz - az) / fence.infillSpacing);
      for (let i = 1; i < divisions; i++) {
        const x = ax + (bx - ax) * i / divisions;
        const z = az + (bz - az) * i / divisions;
        beam('blue', [x, fence.bottom, z], [x, fence.height, z], fence.infillRadius);
      }
    }
    function run(ax: number, az: number, bx: number, bz: number) {
      const bays = Math.ceil(Math.hypot(bx - ax, bz - az) / fence.maxBay);
      for (let i = 0; i <= bays; i++) {
        const x = ax + (bx - ax) * i / bays;
        const z = az + (bz - az) * i / bays;
        upright(x, z);
        if (i < bays) panel(x, z, ax + (bx - ax) * (i + 1) / bays, az + (bz - az) * (i + 1) / bays);
      }
    }
    function gate(ax: number, az: number, bx: number, bz: number) {
      const length = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / length, dz = (bz - az) / length;
      const startX = ax + dx * .08, startZ = az + dz * .08;
      const endX = bx - dx * .08, endZ = bz - dz * .08;
      panel(startX, startZ, endX, endZ);
      for (const [x, z] of [[startX, startZ], [endX, endZ]]) {
        beam('blue', [x, fence.bottom, z], [x, fence.height, z], fence.railRadius);
      }
      for (const y of [.65, 2.15]) add(box, 'blue', ax + dx * .04, y, az + dz * .04, .16, .16, .16);
      add(box, 'blue', endX - dx * .13, 1.15, endZ - dz * .13, .16, .08, .16);
    }
    // Single shared entrance, aligned with the existing central walkway.
    const entranceStart = fence.entranceX - fence.gateWidth / 2;
    const entranceEnd = fence.entranceX + fence.gateWidth / 2;
    run(x0, z0, entranceStart, z0);
    gate(entranceStart, z0, entranceEnd, z0);
    run(entranceEnd, z0, x1, z0);
    run(x0, z1, x1, z1);
    run(x0, z0, x0, z1);
    run(x1, z0, x1, z1);
    // One internal gate connects the walkway to the court; no second fence
    // separates the playground from the shared circulation area.
    const gateStart = fence.gateZ - fence.gateWidth / 2;
    const gateEnd = fence.gateZ + fence.gateWidth / 2;
    run(dividerX, z0, dividerX, gateStart);
    gate(dividerX, gateStart, dividerX, gateEnd);
    run(dividerX, gateEnd, dividerX, z1);

    // Thin box strands keep the fine net inexpensive and texture-free. The
    // closed court gate also carries netting, and the roof contains high balls.
    function netWall(ax: number, az: number, bx: number, bz: number) {
      const columns = Math.ceil(Math.hypot(bx - ax, bz - az) / fence.netSpacing);
      const height = fence.netHeight - fence.netBottom;
      for (let i = 0; i <= columns; i++) {
        add(box, 'blue', ax + (bx - ax) * i / columns, fence.netBottom + height / 2,
          az + (bz - az) * i / columns, fence.netThickness, height, fence.netThickness);
      }
      const rows = Math.ceil(height / fence.netSpacing);
      for (let i = 0; i <= rows; i++) {
        add(box, 'blue', (ax + bx) / 2, fence.netBottom + height * i / rows, (az + bz) / 2,
          Math.max(Math.abs(bx - ax), fence.netThickness), fence.netThickness,
          Math.max(Math.abs(bz - az), fence.netThickness));
      }
    }
    netWall(dividerX, z0, dividerX, z1);
    netWall(x1, z0, x1, z1);
    netWall(dividerX, z0, x1, z0);
    netWall(dividerX, z1, x1, z1);
    for (const x of [dividerX, x1]) beam('blue', [x, fence.netHeight, z0], [x, fence.netHeight, z1], fence.railRadius);
    for (const z of [z0, z1]) beam('blue', [dividerX, fence.netHeight, z], [x1, fence.netHeight, z], fence.railRadius);
    const roofColumns = Math.ceil((x1 - dividerX) / fence.netSpacing);
    const roofRows = Math.ceil((z1 - z0) / fence.netSpacing);
    for (let i = 0; i <= roofColumns; i++) {
      add(box, 'blue', dividerX + (x1 - dividerX) * i / roofColumns, fence.netHeight, (z0 + z1) / 2,
        fence.netThickness, fence.netThickness, z1 - z0);
    }
    for (let i = 0; i <= roofRows; i++) {
      add(box, 'blue', (dividerX + x1) / 2, fence.netHeight, z0 + (z1 - z0) * i / roofRows,
        x1 - dividerX, fence.netThickness, fence.netThickness);
    }
  }
  recreationEnclosure();

  // In the aerial reference, -X follows Calle 28 toward Carrera 9 and +Z crosses
  // the street away from the school. Shift toward that geographic front-left,
  // not toward the camera's left. The small -Z offset clears the existing trees
  // at the back while keeping both platforms beyond the parking sidewalk.
  for (const [surface, parts] of batches) {
    for (let i = recreationStarts.get(surface) ?? 0; i < parts.length; i++) {
      parts[i].translate(-23, 0, -1);
    }
  }

  // Plant only at the perimeter, never on the street, bays, play pad or pitch.
  for (const [x, z, size] of [[-33, -19, 3.8], [33, -18, 4], [-33, 2, 3.3],
    [33, 7, 3.5], [-34, 47, 3], [-34, 64, 3.5], [34, 48, 3], [34, 66, 3.4],
    [-25, 71, 2.5], [-9, 71, 2.2], [2, 71.8, 2.5], [32, 71, 2.4]]) {
    tree(x, z, size, x > 0);
  }
  for (let x = -26; x <= 26; x += 5.2) {
    add(crown, 'foliageLight', x, .12, -24, 1.4, .65, .8);
  }
  for (const x of [-34, 34]) for (const z of [16, 20, 54, 59]) {
    add(crown, 'foliage', x, .12, z, .9, .55, 1.1);
  }

  // Sparse planting in the open lawn east of the translated recreation lot.
  // Keep crowns clear of its enclosure (x = 5.5) and the parking sidewalk.
  for (const [x, z, size] of [[12, 49, 2.3], [24, 53, 2.8], [16, 63, 2.5], [27, 67, 2.2]]) {
    tree(x, z, size, x > 20);
  }
  for (const [x, z, width, depth] of [[13.8, 50.2, .9, .7], [22.3, 54, 1.1, .8],
    [23.7, 54.8, .75, .65], [14.2, 64, 1, .75], [28.4, 65.7, .85, .7]]) {
    add(crown, 'foliageLight', x, .12, z, width, .6, depth);
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
