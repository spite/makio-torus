import {
  Scene,
  FogExp2,
  SphereBufferGeometry,
  MeshMatcapMaterial,
  Group,
  TangentSpaceNormalMap,
  TextureLoader,
  Vector3,
  Euler,
  Mesh,
  WebGLRenderer,
  PerspectiveCamera,
  MeshNormalMaterial,
  BoxBufferGeometry,
  RawShaderMaterial,
  BufferAttribute,
  TorusBufferGeometry,
  IcosahedronBufferGeometry,
  Matrix3,
  Matrix4,
  BufferGeometry,
} from "./three.module.js";
import { OrbitControls } from "./OrbitControls.js";

const scene = new Scene();
scene.fog = new FogExp2(0x1f1f1f, 0.01);
// scene.background = new Color(0x1f1f1f)

// const geom = new (RoundedBoxGeometry(THREE))(1, 1, 1, .1, 5)
const geom = new IcosahedronBufferGeometry(1, 3);
// const geom = new TorusGeometry(1, .1, 16, 100)

const material = new MeshMatcapMaterial({
  matcap: new TextureLoader().load("matcap.png"),
  normalMapType: TangentSpaceNormalMap,
});
const material2 = new MeshMatcapMaterial({
  matcap: new TextureLoader().load(
    "https://makio135.com/matcaps/512/736655_D9D8D5_2F281F_B1AEAB-512px.png"
  ),
  normalMapType: TangentSpaceNormalMap,
});
const material3 = new MeshMatcapMaterial({
  matcap: new TextureLoader().load(
    "https://makio135.com/matcaps/512/181F1F_475057_616566_525C62-512px.png"
  ),
  normalMapType: TangentSpaceNormalMap,
});

const mat = new MeshNormalMaterial({ wireframe: true });

const vertexShader = `#version 300 es
precision highp float;

in vec3 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

const float PI = 3.1415926535897932384626433832795;

vec4 quat(vec3 axis, float angle) {
  float halfAngle = angle / 2.;
  float s = sin( halfAngle );

  vec4 q = vec4(axis.x * s, axis.y * s, axis.z * s, cos( halfAngle ));
  return q;
}

vec3 applyQuat( vec4 q, vec3 v ){ 
	return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

/*
const v = new Vector3(6, 0, 0);
v.applyEuler(new Euler(0, 0, angle * 2 + (j / N2) * TAU)); // spring like torsion
v.add(new Vector3(17, 0, 0));
v.applyEuler(new Euler(0, angle, 0));
*/

vec3 getBasePoint(float alpha) {
  float r = 17.;
  vec3 p = vec3(r * cos(alpha), 0., r * sin(alpha));
  vec3 dir = vec3(cos(alpha+PI/2.), 0., sin(alpha+PI/2.));

  float a = 2.*alpha;
  p += applyQuat(quat(dir, a), vec3(0., 6., 0.));
  return p;
}

out vec3 pos;

void main() {
  float alpha = 2. * PI * position.x / 200.;
  vec3 base = getBasePoint(alpha);
  vec3 prevBase = getBasePoint(alpha - 2. * PI / 200.);
  vec3 dir = normalize(base - prevBase);

  float beta = 2. * PI * position.y / 40.;
  float r2 = 1.;

  vec3 d = r2 * vec3(0., 1., 0.);
  d = applyQuat(quat(dir, beta), d);
  vec3 p = base + d;
  
  vec4 mvp = modelViewMatrix * vec4(p, 1.);
  pos = mvp.xyz;
  gl_Position = projectionMatrix * mvp;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec3 pos;

out vec4 color;

void main() {
	vec3 fdx = vec3( dFdx( pos.x ), dFdx( pos.y ), dFdx( pos.z ) );
	vec3 fdy = vec3( dFdy( pos.x ), dFdy( pos.y ), dFdy( pos.z ) );
	vec3 normal = normalize( cross( fdx, fdy ) );

  color = vec4(1.,0.,1.,1.);
  color = vec4(normal, 1.);
}
`;
const geoMat = new RawShaderMaterial({
  uniforms: {},
  vertexShader,
  fragmentShader,
  // wireframe: true,
});
const SIDES = 40;
const SEGMENTS = 200;
const geometry = new BufferGeometry();

const indices = [];
const vertices = new Float32Array(SIDES * SEGMENTS * 3);

let ptr = 0;
for (let segment = 0; segment < SEGMENTS; segment++) {
  for (let side = 0; side < SIDES; side++) {
    const x = segment;
    const y = side;
    const z = 0;
    vertices[ptr] = x;
    vertices[ptr + 1] = y;
    vertices[ptr + 2] = z;
    ptr += 3;
  }
}
const MAX = SEGMENTS * SIDES;
for (let segment = 0; segment < SEGMENTS + 1; segment++) {
  for (let f = 0; f < SIDES; f++) {
    const a = (segment * SIDES + ((f + 1) % SIDES)) % MAX;
    const b = (segment * SIDES + f) % MAX;
    const c = (segment * SIDES + f + SIDES) % MAX;
    const d = (segment * SIDES + ((f + 1) % SIDES) + SIDES) % MAX;

    indices.push(a, b, d);
    indices.push(b, c, d);
  }
}
geometry.setIndex(indices);
geometry.setAttribute("position", new BufferAttribute(vertices, 3));

// geometry.applyMatrix(new Matrix4().makeRotationX(Math.PI / 2));

const g = new Group();
scene.add(g);

const TAU = 2 * Math.PI;

const cube = new Mesh(new BoxBufferGeometry(1, 1, 1), mat);
// scene.add(cube);

const meshes = [];
const N = 180;
const N2 = 9;
for (let i = 0; i < N2; i++) {
  const angle = (i * TAU) / N2;
  const t = new Mesh(geometry, geoMat);
  t.rotation.y = angle;
  g.add(t);
}
for (let i = 0; i < N; i++) {
  const p = i / N;
  const angle = p * TAU;
  for (let j = 0; j < N2; j++) {
    const v = new Vector3(6, 0, 0);
    v.applyEuler(new Euler(0, 0, angle * 2 + (j / N2) * TAU)); // spring like torsion
    v.add(new Vector3(17, 0, 0));
    v.applyEuler(new Euler(0, angle, 0));

    const mesh = new Mesh(
      geom,
      mat
      // j % 3 === 0 ? material : j % 3 === 1 ? material2 : material3
    );
    mesh.position.x = v.x;
    mesh.position.y = v.y + Math.sin(angle * 3) * 2; // ondulation on the main ring
    mesh.position.z = v.z;
    mesh.rotation.y = angle;
    // g.add(mesh);
    // meshes.push({ mesh, angle });
  }
}

const camera = new PerspectiveCamera(75, 1, 0.1, 150);
camera.position.set(0, 20, 30).multiplyScalar(1.05);
camera.lookAt(new Vector3(0, 0, 10));

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(1, 1);
document.body.append(renderer.domElement);

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

const controls = new OrbitControls(camera, renderer.domElement);
onResize();
window.addEventListener("resize", onResize);

function render() {
  renderer.setAnimationLoop(render);
  renderer.render(scene, camera);
}
render();

// // createScene must return a function to update the scene
// return (s, t) => {
//   meshes.forEach(({ mesh, angle }) => {
//     const s = (Math.max(0, Math.sin(angle * 3 + t * TAU) + 1.2) ** 2) * 0.3
//     mesh.scale.copy(new Vector3(s, s, s))
//   })

//   renderer.render(scene, camera)

//   // the update function must return the renderer
//   return renderer
// }