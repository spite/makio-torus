import {
  Scene,
  FogExp2,
  Group,
  TextureLoader,
  Vector3,
  Mesh,
  WebGLRenderer,
  PerspectiveCamera,
  RawShaderMaterial,
  BufferAttribute,
  BufferGeometry,
} from "./three.module.js";
import { OrbitControls } from "./OrbitControls.js";

const scene = new Scene();
scene.fog = new FogExp2(0x1f1f1f, 0.01);
// scene.background = new Color(0x1f1f1f)

const vertexShader = `#version 300 es
precision highp float;

in vec3 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform float SEGMENTS;
uniform float SIDES;
uniform float time;
uniform float index;

const float PI = 3.1415926535897932384626433832795;
const float TAU = 2. * PI;

vec4 quat(vec3 axis, float angle) {
  float halfAngle = angle / 2.;
  float s = sin( halfAngle );

  vec4 q = vec4(axis.x * s, axis.y * s, axis.z * s, cos( halfAngle ));
  return q;
}

vec3 applyQuat( vec4 q, vec3 v ){ 
	return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

vec3 getBasePoint(float alpha) {
  float r = 17.;
  vec3 p = vec3(r * cos(alpha), 0., r * sin(alpha));
  vec3 dir = vec3(cos(alpha+PI/2.), 0., sin(alpha+PI/2.));

  float a = 2.*alpha;
  a += index/9. * TAU;
  p += applyQuat(quat(dir, a), vec3(0., 6., 0.));
  p.y += sin(alpha * 3.) * 4.;
  return p;
}

out vec3 pos;
out vec3 normal;

float parabola( float x, float k ) {
  return pow( 4. * x * ( 1. - x ), k );
}

void main() {
  float alpha = TAU * position.x / SEGMENTS;
  vec3 base = getBasePoint(alpha);
  vec3 prevBase = getBasePoint(alpha - TAU / SEGMENTS);
  vec3 dir = normalize(base - prevBase);

  float beta = TAU * position.y / SIDES;
  float animStep = mod(3.*position.x + time, SEGMENTS) / SEGMENTS;
  float tubeRadius = max(0., pow(sin(alpha * 3. + (1. - time) * TAU) + 1.2, 2.)) * 0.3;

  vec3 tubeDir = tubeRadius * vec3(0., 1., 0.);
  tubeDir = applyQuat(quat(dir, beta), tubeDir);
  vec3 newPosition = base + tubeDir;

  normal = normalMatrix * normalize(tubeDir);

  vec4 mvp = modelViewMatrix * vec4(newPosition, 1.);
  pos = mvp.xyz;
  gl_Position = projectionMatrix * mvp;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec3 pos;
in vec3 normal;

out vec4 color;

uniform sampler2D matCapMap;

void main() {
  vec3 n = normalize(normal);
  vec3 eye = normalize(pos.xyz);
  vec3 r = reflect( eye, normal );
  float m = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );
  vec2 vN = r.xy / m + .5;

  vec3 mat = texture(matCapMap, vN).rgb;

  color = vec4(mat, 1.);
  // color = vec4(1.,0.,1.,1.);
  // color = vec4(.5 + .5 * n, 1.);
}
`;

const SIDES = 20;
const SEGMENTS = 200;
const geometry = new BufferGeometry();

const indices = [];
const vertices = new Float32Array(SIDES * SEGMENTS * 3);

let ptr = 0;
for (let segment = 0; segment < SEGMENTS; segment++) {
  for (let side = 0; side < SIDES; side++) {
    vertices[ptr] = segment;
    vertices[ptr + 1] = side;
    vertices[ptr + 2] = 0;
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

const loader = new TextureLoader();
const matcap1 = loader.load("matcap1.jpg");
const matcap2 = loader.load("matcap2.png");
const matcap3 = loader.load("matcap3.png");

const g = new Group();
scene.add(g);

const TAU = 2 * Math.PI;

const meshes = [];
const N2 = 9;
for (let i = 0; i < N2; i++) {
  const geoMat = new RawShaderMaterial({
    uniforms: {
      SEGMENTS: { value: SEGMENTS },
      SIDES: { value: SIDES },
      matCapMap: {
        value: i % 3 === 0 ? matcap1 : i % 3 === 1 ? matcap2 : matcap3,
      },
      time: { value: 0 },
      index: { value: i },
    },
    vertexShader,
    fragmentShader,
    // wireframe: true,
  });
  const angle = (i * TAU) / N2;
  const t = new Mesh(geometry, geoMat);
  // t.rotation.y = angle / 2;
  g.add(t);
  meshes.push(t);
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
  meshes.forEach((m) => {
    m.material.uniforms.time.value = 0.0005 * performance.now();
  });
  renderer.setAnimationLoop(render);
  renderer.render(scene, camera);
}
render();