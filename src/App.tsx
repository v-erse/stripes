import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { button, buttonGroup, Leva, useControls } from "leva";
import * as THREE from "three";
import { patchShaders } from "gl-noise";
import { useRef } from "react";

const fragmentShader = `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform vec3 backgroundColor;
  uniform float colorSmoothing;
  uniform float time;

  varying vec4 v_modelPosition;
  varying float v_elevation;
  varying float v_foldElevation;

  void main() {
    float color_perlin = gln_perlin(v_modelPosition.xz * colorSmoothing + 5.0 + time/2.0)+0.5;
    vec3 blend1 = step(-0.5, -color_perlin) * mix(color1, color2, smoothstep(0.0, 0.5, color_perlin));
    vec3 blend2 = step(0.5, color_perlin) * mix(color2, color3, smoothstep(0.5, 1.0, color_perlin));
    vec3 color = mix(blend1 + blend2, backgroundColor, -v_modelPosition.z + 0.5);

    gl_FragColor = vec4(mix(backgroundColor, color, v_elevation + 0.5), 1.0);
  }
`;

const vertexShader = `
  uniform float time;
  uniform float foldFrequency;
  uniform float foldHeight;

  varying vec4 v_modelPosition;
  varying float v_elevation;
  varying float v_foldElevation;

  void main() {
    v_modelPosition = modelMatrix * vec4(position, 1.0);

    v_elevation = gln_perlin(v_modelPosition.xz * 2.0 + vec2(0, time)) + 0.5; 
    v_foldElevation = mod(v_modelPosition.z, foldFrequency) * foldHeight;

    v_modelPosition.y += -v_modelPosition.z;
    v_modelPosition.y += v_foldElevation;
    v_modelPosition.y += v_elevation - 0.5;

    vec4 viewPosition = viewMatrix * v_modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
  }
`;

const defaults = {
  cameraPosition: [0.47, 4.93, 0.78] as [number, number, number],
  cameraZoom: 2205,
  color1: "#635bff",
  color2: "#ff39a9",
  color3: "#ffbc13",
  backgroundColor: "#fff",
  colorSmoothing: 0.5,
  foldsSpace: 0.05,
  foldsHeight: 3.8,
};

function Plane() {
  const ref = useRef<any>();
  const gl = useThree((state) => state.gl);

  const [colorValues, setColor] = useControls("Colors", () => ({
    color1: {
      value: defaults.color1,
      onChange: (v) =>
        (ref.current!.uniforms.color1.value = new THREE.Color(v)),
    },
    color2: {
      value: defaults.color2,
      onChange: (v) =>
        (ref.current!.uniforms.color2.value = new THREE.Color(v)),
    },
    color3: {
      value: defaults.color3,
      onChange: (v) =>
        (ref.current!.uniforms.color3.value = new THREE.Color(v)),
    },
    backgroundColor: {
      value: "#fff",
      onChange: (v) => {
        ref.current!.uniforms.backgroundColor.value = new THREE.Color(v);
        gl.setClearColor(v);
      },
    },
    " ": buttonGroup({
      "light mode": () => setColor({ backgroundColor: "#fff" }),
      "dark mode": () => setColor({ backgroundColor: "#000" }),
    }),
    colorSmoothing: {
      value: defaults.colorSmoothing,
      onChange: (v) => (ref.current!.uniforms.colorSmoothing.value = v),
    },
  }));

  useControls("Folds", () => ({
    space: {
      value: defaults.foldsSpace,
      min: 0,
      max: 0.5,
      onChange: (v) => (ref.current!.uniforms.foldFrequency.value = v),
    },
    height: {
      value: defaults.foldsHeight,
      min: -10,
      max: 10,
      onChange: (v) => (ref.current!.uniforms.foldHeight.value = v),
    },
  }));

  const paused = useRef(false);
  const speed = useRef(1);
  useControls("Time", () => ({
    pause: {
      value: false,
      onChange: (v) => (paused.current = v),
    },
    speed: {
      value: 1,
      min: -3,
      max: 3,
      onChange: (v) => (speed.current = v),
    },
  }));

  useFrame(() => {
    if (ref.current && !paused.current) {
      ref.current.uniforms.time.value += 0.001 * speed.current;
    }
  });

  useControls(() => ({
    "Save PNG": button(() => {
      const link = document.createElement("a");
      link.setAttribute("download", "waves.png");
      link.setAttribute(
        "href",
        gl.domElement
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream")
      );
      link.click();
    }),
  }));

  return (
    <mesh rotation={[-1.75, 0, 0]}>
      <planeGeometry args={[1, 1, 100, 100]} />
      <shaderMaterial
        side={THREE.DoubleSide}
        ref={ref}
        attach="material"
        args={[
          {
            uniforms: {
              color1: {
                value: new THREE.Color(defaults.color1),
              },
              color2: {
                value: new THREE.Color(defaults.color2),
              },
              color3: {
                value: new THREE.Color(defaults.color3),
              },
              backgroundColor: {
                value: new THREE.Color("#ffffff"),
              },
              colorSmoothing: {
                value: defaults.colorSmoothing,
              },
              foldFrequency: {
                value: defaults.foldsSpace,
              },
              foldHeight: {
                value: defaults.foldsHeight,
              },
              time: {
                value: 0,
              },
            },
            vertexShader: patchShaders(vertexShader) as string,
            fragmentShader: patchShaders(fragmentShader) as string,
          },
        ]}
      />
    </mesh>
  );
}

function App() {
  const cameraRef = useRef<any>(null);

  const [values, setCamera] = useControls("Camera", () => ({
    position: {
      value: defaults.cameraPosition,
      onChange: (v) => {
        if (cameraRef.current) cameraRef.current.position.set(...v);
      },
    },
    zoom: {
      value: defaults.cameraZoom,
      min: 400,
      max: 3000,
      onChange: (v) => {
        if (cameraRef.current) {
          cameraRef.current.zoom = v;
          cameraRef.current.updateProjectionMatrix();
        }
      },
    },
    "view gradient": button(() => {
      if (cameraRef.current) {
        setCamera({ position: [0, 5, 0], zoom: 750 });
      }
    }),
    "reset camera": button(() => {
      if (cameraRef.current) {
        setCamera({
          position: defaults.cameraPosition,
          zoom: defaults.cameraZoom,
        });
      }
    }),
  }));

  return (
    <>
      <Leva collapsed />
      <Canvas gl={{ preserveDrawingBuffer: true }}>
        <OrthographicCamera
          ref={cameraRef}
          makeDefault
          zoom={defaults.cameraZoom}
          position={defaults.cameraPosition}
        />
        <OrbitControls
          onChange={() => {
            const { position, zoom } = cameraRef.current;
            const { x, y, z } = position;
            setCamera({ position: [x, y, z], zoom });
          }}
        />
        <Plane />
      </Canvas>
    </>
  );
}

export default App;
