const shader = `#version 300 es
precision highp float;

// attributes.
in vec3 position;

// uniforms for vertex transformation.
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;

// uniforms for the effect.
uniform float SEGMENTS;
uniform float SIDES;
uniform float time;
uniform float index;

// varyings.
out vec3 pos;
out vec3 normal;

const float PI = 3.1415926535897932384626433832795;
const float TAU = 2. * PI;

// creates a quaternion out of an axis vector and a rotation angle.
vec4 quat(vec3 axis, float angle) {
  float halfAngle = angle / 2.;
  float s = sin( halfAngle );

  vec4 q = vec4(axis.x * s, axis.y * s, axis.z * s, cos( halfAngle ));
  return q;
}

// applies a quaternion q to a vec3 v. 
vec3 applyQuat( vec4 q, vec3 v ){ 
	return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

// returns the base point to generate a ring around.
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

void main() {
  // get the base point, and calculate the orientation of the ring dir.
  float alpha = TAU * position.x / SEGMENTS;
  vec3 base = getBasePoint(alpha);
  vec3 prevBase = getBasePoint(alpha - TAU / SEGMENTS);
  vec3 dir = normalize(base - prevBase);

  // calculate the radius based on the effect.
  float beta = TAU * position.y / SIDES;
  float animStep = mod(3.*position.x + time, SEGMENTS) / SEGMENTS;
  float tubeRadius = max(0., pow(sin(alpha * 3. + (1. - time) * TAU) + 1.2, 2.)) * 0.3;

  // distribute each side of the ring around the base point.
  vec3 tubeDir = tubeRadius * vec3(0., 1., 0.);
  tubeDir = applyQuat(quat(dir, beta), tubeDir);
  vec3 newPosition = base + tubeDir;

  // the normal is the direction we pulled the vertex.
  normal = normalMatrix * normalize(tubeDir);

  // project the position.
  vec4 mvp = modelViewMatrix * vec4(newPosition, 1.);
  pos = mvp.xyz;
  gl_Position = projectionMatrix * mvp;
}
`;

export { shader };
