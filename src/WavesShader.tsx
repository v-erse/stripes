import { Abstract } from "lamina/vanilla";

export default class WavesShader extends Abstract {
  constructor() {
    super(WavesShader, {
      name: "WavesShader",
    });
  }

  static u_foreground = "red"; // Can be accessed as CustomLayer.color
  static u_spread = 5.0;
  static u_edgeLength = 2.0;

  static fragmentShader = `
    uniform vec3 u_foreground;
    uniform float u_edgeLength;

    varying vec3 v_Position;
    // varying float v_SinElevation;

    vec4 main() {
      // vec4 color = mix(vec4(u_foreground, 1.0), vec4(0.0,0.0,1.0, 1.0), (v_Position.y+5.0)/10.0);
      // vec4 f_color = mix(vec4(1.0, 1.0, 1.0, 1.0), color, smoothstep(0.0, u_edgeLength, clamp(v_SinElevation, 0.0, 0.5)+1.0));

      // vec4 f_color = mix(vec4(1.0,1.0,1.0,1.0), vec4(1.0,0.0,0.0,1.0), v_Position.y);
      vec3 color = mix(vec3(0.85,0.27,0.93), vec3(0.97,0.46,0.09), (v_Position.y+5.0)/10.0);
      // vec4 f_color = vec4(color, smoothstep(0.0, 1.0, mod((v_Position.y - v_Position.x/5.0) * 2.0, 1.0)));
      vec4 f_color = vec4(mix(vec3(1.0,1.0,1.0), color, mod(v_Position.y * 2.0, 1.0)), 1.0);

      return f_color;
    }
  `;

  static vertexShader = `
    uniform float u_spread;

    varying vec3 v_Position;
    varying float v_SinElevation;

    void main() {
      v_SinElevation = sin(position.y * u_spread);
      // vec3 pos = vec3(position.x, position.y, v_SinElevation + position.y);
      vec3 pos = vec3(position.x, position.y, position.y);
      v_Position = pos;

      return pos;
    }
  `;
}
