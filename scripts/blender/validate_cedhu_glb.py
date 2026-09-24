"""Compare the new GLB with the production asset without modifying either."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[2]

def read(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', raw)
    assert magic == b'glTF' and version == 2 and length == len(raw)
    size, kind = struct.unpack_from('<I4s', raw, 12)
    assert kind == b'JSON'
    return json.loads(raw[20:20+size]), len(raw)

old, old_size = read(root / 'assets/3d/cedhu/original/cedhu.glb')
new, new_size = read(root / 'assets/3d/cedhu/cedhu-institucional.glb')
old_nodes = {n['name']: n for n in old['nodes']}
new_nodes = {n['name']: n for n in new['nodes']}
assert set(old_nodes) <= set(new_nodes), 'Original web object names changed'
for name, node in old_nodes.items():
    for key in ('translation', 'rotation', 'scale', 'matrix', 'children'):
        assert node.get(key) == new_nodes[name].get(key), (name, key)
assert {m['name']: m for m in old['materials']} == {
    m['name']: m for m in new['materials'] if m['name'] != 'CEDHU | Logo oficial'}
assert len(new['textures']) == len(new['images']) == 1
assert new['images'][0]['mimeType'] == 'image/png'
assert 'uri' not in new['images'][0]
assert 'cameras' not in new and 'animations' not in new

def bounds(gltf):
    positions = [gltf['accessors'][p['attributes']['POSITION']]
                 for m in gltf['meshes'] for p in m['primitives']]
    return [[min(a['min'][i] for a in positions) for i in range(3)],
            [max(a['max'][i] for a in positions) for i in range(3)]]

assert bounds(old) == bounds(new), 'Model dimensions changed'
report = {'original_bytes': old_size, 'new_bytes': new_size,
          'difference_bytes': new_size - old_size,
          'original_web_nodes_preserved': sorted(old_nodes),
          'same_node_transforms': True, 'same_original_materials': True,
          'same_bounds': bounds(new), 'embedded_textures': 1,
          'triangles': sum(new['accessors'][p['indices']]['count'] // 3
                           for m in new['meshes'] for p in m['primitives']),
          'meshes': len(new['meshes'])}
(root / 'assets/3d/cedhu/qa/glb-validation.json').write_text(
    json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(report, indent=2, ensure_ascii=False))
