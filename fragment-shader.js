const shader = `#version 300 es
precision highp float;

// texture uniforms.
uniform sampler2D matCapMap;

// varyings.
in vec3 pos;
in vec3 normal;

// output.
out vec4 color;

void main() {
  // calculate matcap coordinates.
  vec3 n = normalize(normal);
  vec3 eye = normalize(pos.xyz);
  vec3 r = reflect( eye, normal );
  float m = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );
  vec2 vN = r.xy / m + .5;

  // lookup matcap.
  vec3 mat = texture(matCapMap, vN).rgb;

  // return matcap.
  color = vec4(mat, 1.);

  // return normal.
  // color = vec4(.5 + .5 * n, 1.);
}
`;

export { shader };
