"""Run in Blender on the original editable campus. Never overwrites the input.

blender -b ORIGINAL.blend --python add_cedhu_logos.py -- OUTPUT_DIRECTORY
The output directory must contain textures/cedhu-logo.png.
"""
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
scene = bpy.context.scene
original_path = Path(bpy.data.filepath).resolve()
blend_path = out / 'cedhu-institucional.blend'
assert blend_path != original_path
out.mkdir(parents=True, exist_ok=True)
(out / 'qa').mkdir(exist_ok=True)
original_hash = hashlib.sha256(original_path.read_bytes()).hexdigest()
replacement_names = {'CEDHU | rotulo', 'Descriptor rotulo', 'Acento rotulo',
                     'Identidad pabellon', 'Nombre sobre ingreso'}

def fingerprint(obj):
    data = {'matrix': [list(row) for row in obj.matrix_world],
            'parent': obj.parent.name if obj.parent else None,
            'collections': sorted(c.name for c in obj.users_collection)}
    if obj.type == 'MESH':
        data['vertices'] = [list(v.co) for v in obj.data.vertices]
        data['faces'] = [list(p.vertices) for p in obj.data.polygons]
        data['materials'] = [m.name for m in obj.data.materials]
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()

before = {o.name: fingerprint(o) for o in bpy.data.objects if o.name not in replacement_names}
studio_before = {o.name: list(o.location) for o in bpy.data.objects if o.type in {'CAMERA', 'LIGHT'}}
for name in replacement_names:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)

collection = bpy.data.collections.new('08 | Logos institucionales')
bpy.data.collections['CEDHU | Maqueta editable'].children.link(collection)
image = bpy.data.images.load(str(out / 'textures/cedhu-logo.png'), check_existing=True)
image.name = 'CEDHU | Logo oficial compartido'
image.pack()
aspect = image.size[0] / image.size[1]
material = bpy.data.materials.new('CEDHU | Logo oficial')
material.use_nodes = True
material.diffuse_color = (1, 1, 1, 1)
material.surface_render_method = 'DITHERED'
material.use_backface_culling = True
nodes = material.node_tree.nodes
shader = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
shader.inputs['Roughness'].default_value = .8
texture = nodes.new('ShaderNodeTexImage')
texture.image = image
texture.extension = 'CLIP'
material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
material.node_tree.links.new(texture.outputs['Alpha'], shader.inputs['Alpha'])
placements = []

def decal(name, center, right, up, width, support, distance):
    center, right, up = Vector(center), Vector(right), Vector(up)
    height = width / aspect
    vertices = [center + right * width * x / 2 + up * height * y / 2
                for x, y in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    uv = mesh.uv_layers.new(name='UVMap')
    for loop, coordinate in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop.uv = coordinate
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    mesh.materials.append(material)
    # Decals should not cast a second shadow on the supporting architecture.
    obj.visible_shadow = False
    normal = right.cross(up)
    # All four corners must hit the named supporting surface, within millimetres.
    target = bpy.data.objects[support]
    inv = target.matrix_world.inverted()
    for vertex in vertices:
        hit, point, _, _ = target.ray_cast(inv @ (vertex + normal * .01),
                                         inv.to_3x3() @ -normal, distance=.1)
        assert hit, (name, 'missing support', list(vertex))
        gap = (vertex - target.matrix_world @ point).length
        assert abs(gap - distance) < .0002, (name, gap, distance)
    placements.append({'name': name, 'center': list(center), 'width': width,
                       'height': height, 'normal': list(normal), 'support': support,
                       'surface_gap': distance, 'verified_corners': 4})
    return obj

decal('Logo | Fachada derecha', (21, -18.623, 5.5), (1, 0, 0), (0, 0, 1),
      3.0, 'Fachada blanca pabellon', .003)
assert 5.5 + 3.0 / aspect / 2 < 6.295, 'Right logo intersects the existing roof edge'
decal('Logo | Fachada principal', (-17, -18.003, 10.2), (1, 0, 0), (0, 0, 1),
      2.1, 'Piso superior marfil', .003)

# Flat painted disc inside the original blue circle; no court mesh is changed.
mesh = bpy.data.meshes.new('Pintura circular central')
mesh.from_pydata([(5.35, -1, .285)] +
                [(5.35 + 1.04 * math.cos(i * math.tau / 48),
                  -1 + 1.04 * math.sin(i * math.tau / 48), .285) for i in range(48)], [],
                [(0, i + 1, (i + 1) % 48 + 1) for i in range(48)])
mesh.update()
disc = bpy.data.objects.new('Pintura | Circulo blanco central', mesh)
collection.objects.link(disc)
mesh.materials.append(bpy.data.materials['Marfil | muros'])
disc.visible_shadow = False
# Lettering runs along the court length; its top faces the left teaching block.
decal('Logo | Centro cancha', (5.35, -1, .287), (0, 1, 0), (-1, 0, 0),
      1.72, disc.name, .002)
for board in [o for o in bpy.data.objects if o.name == 'Tablero' or o.name.startswith('Tablero.')]:
    x, y, z = board.location
    toward_court = 1 if y < -1 else -1
    decal('Logo | ' + board.name, (x, y + toward_court * .062, 4.115),
          (-toward_court, 0, 0), (0, 0, 1), .53, board.name, .002)

assert all(name in bpy.data.objects and fingerprint(bpy.data.objects[name]) == value
           for name, value in before.items()), 'Original architecture changed'
assert studio_before == {o.name: list(o.location) for o in bpy.data.objects if o.type in {'CAMERA', 'LIGHT'}}
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

# Match the original material batching, names, pivot and Y-up export.
sources = [o for c in bpy.data.collections if c.name[:2] in ('01','02','03','04','05','06','07','08')
           for o in c.objects if o.type == 'MESH']
temp = bpy.data.collections.new('TEMP | Exportacion logos')
scene.collection.children.link(temp)
copies = []
for source in sources:
    copy = source.copy()
    copy.data = source.data.copy()
    temp.objects.link(copy)
    copies.append(copy)
material_batches = {mat: [o for o in copies if len(o.data.materials) and o.data.materials[0] == mat]
                    for mat in list(bpy.data.materials)}
for mat, batch in material_batches.items():
    if not batch:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in batch:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = batch[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = 'CEDHU | ' + mat.name
    cursor = scene.cursor.location.copy()
    scene.cursor.location = (1, 2, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    scene.cursor.location = cursor
    obj.location -= Vector((1, 2, 0))
bpy.ops.object.select_all(action='DESELECT')
for obj in temp.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out / 'cedhu-institucional.glb'), export_format='GLB',
    use_selection=True, export_yup=True, export_materials='EXPORT', export_cameras=False,
    export_lights=False, export_extras=False, export_texcoords=True, export_normals=True)
for obj in list(temp.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.data.collections.remove(temp)
assert hashlib.sha256(original_path.read_bytes()).hexdigest() == original_hash
report = {'original_blend_sha256': original_hash, 'preserved_objects': len(before),
          'architecture_unchanged': True, 'studio_unchanged': True,
          'replaced_placeholder_signs': sorted(replacement_names), 'placements': placements,
          'texture_size': list(image.size), 'texture_count': 1,
          'glb_bytes': (out / 'cedhu-institucional.glb').stat().st_size}
(out / 'qa/validation.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')

# QA camera changes happen only after saving; the deliverable keeps its camera/lights.
camera = scene.camera.copy()
camera.data = scene.camera.data.copy()
scene.collection.objects.link(camera)
scene.camera = camera
scene.render.resolution_x = 1600
scene.render.resolution_y = 1280
scene.render.resolution_percentage = 100
scene.cycles.samples = 16
views = [('frontal-aerea', None, None, None),
         ('frontal-izquierda', (-57, -78, 81), (1, 1, 3), 76),
         ('superior', (1, 2, 95), (1, 2, 0), 65),
         ('detalle-fachadas', (1, -85, 38), (1, -17, 5), 58),
         ('detalle-cancha', (26, -16, 34), (5.35, -1, .28), 12)]
for name, position, target, scale in views:
    if position:
        camera.location = position
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = scale
    scene.render.filepath = str(out / 'qa' / (name + '.png'))
    bpy.ops.render.render(write_still=True)
print('CEDHU_LOGOS_COMPLETE', json.dumps(report, ensure_ascii=False))
