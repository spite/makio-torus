import {
  Scene,
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
import { shader as vertexShader } from "./vertex-shader.js";
import { shader as fragmentShader } from "./fragment-shader.js";

// Create renderer, camera, attach events, controls, etc.
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(1, 1);
document.body.append(renderer.domElement);

const camera = new PerspectiveCamera(75, 1, 0.1, 150);
camera.position.set(0, 20, 30).multiplyScalar(1.05);
camera.lookAt(new Vector3(0, 0, 10));

const controls = new OrbitControls(camera, renderer.domElement);

const scene = new Scene();

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

onResize();

window.addEventListener("resize", onResize);

// We generate a geometry that will hold information for the vertex shader
// to generate the shape we want. It'll be a closed circle of SEGMENTS segments,
// and each segment a ring of SIDES sides.

const SIDES = 20;
const SEGMENTS = 200;
const geometry = new BufferGeometry();

const indices = [];
const vertices = new Float32Array(SIDES * SEGMENTS * 3);

// We assign the values we need, instead of (x, y, z) values:
// x is the segment number [0, SEGMENTS-1]
// y is the side number [0, SIDES-1]
// z is not used but we leave it empty.
// We could use only a vec2, but BufferGeometry.computeBoundingSphere doesn't like it.
let ptr = 0;
for (let segment = 0; segment < SEGMENTS; segment++) {
  for (let side = 0; side < SIDES; side++) {
    vertices[ptr] = segment;
    vertices[ptr + 1] = side;
    vertices[ptr + 2] = 0;
    ptr += 3;
  }
}

// We generate the indices for each triangle.
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

// Load textures.
const loader = new TextureLoader();
const matcap1 = loader.load("matcap1.jpg");
const matcap2 = loader.load("matcap2.png");
const matcap3 = loader.load("matcap3.png");

const TAU = 2 * Math.PI;

// Generate a few meshes, rotated around the y axis.
// We generate a new material for each because they have different matcaps,
// and they have different index values for the animation.
// It's still just a few draw calls, several orders of magnitude fewer than originally.
const meshes = [];
const PARTS = 9;
for (let i = 0; i < PARTS; i++) {
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
  const angle = (i * TAU) / PARTS;
  const t = new Mesh(geometry, geoMat);
  scene.add(t);
  meshes.push(t);
}

// Render. Assigns the time to each material every frame and draws.
function render() {
  meshes.forEach((m) => {
    m.material.uniforms.time.value = 0.0005 * performance.now();
  });
  renderer.setAnimationLoop(render);
  renderer.render(scene, camera);
}

// Start rendering.
render();
