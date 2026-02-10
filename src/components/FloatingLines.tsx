import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

uniform bool isDarkMode;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.2;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;
  
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);

    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];
    
    gradientColor = mix(c1, c2, f);
  }
  
  return gradientColor * 0.5;
}

  float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius); // radial falloff around cursor
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  
  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);
  if (!isDarkMode) {
    col = background_color(baseUv);
  }

  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }
  
  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi,
        baseUv,
        mouseUv,
        interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.1;
    }
  }

  if (!isDarkMode) {
    float intensity = max(col.r, max(col.g, col.b));
    intensity = min(intensity, 1.0);
    col = vec3(1.0) - intensity + col;
    col = mix(col, vec3(1.0), 0.3); // Make slightly brighter
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;

type WavePosition = {
  x: number;
  y: number;
  rotate: number;
};

type FloatingLinesProps = {
  linesGradient?: string[];
  enabledWaves?: Array<"top" | "middle" | "bottom">;
  lineCount?: number | number[];
  lineDistance?: number | number[];
  topWavePosition?: WavePosition;
  middleWavePosition?: WavePosition;
  bottomWavePosition?: WavePosition;
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
  mixBlendMode?: React.CSSProperties["mixBlendMode"];
};

function hexToVec3(hex: string): Vector3 {
  let value = hex.trim();

  if (value.startsWith("#")) {
    value = value.slice(1);
  }

  let r = 255;
  let g = 255;
  let b = 255;

  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }

  return new Vector3(r / 255, g / 255, b / 255);
}

export default function FloatingLines({
  linesGradient,
  enabledWaves = ["top", "middle", "bottom"],
  lineCount = [6],
  lineDistance = [5],
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = "screen",
}: FloatingLinesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const checkDarkMode = () => {
      // Check if .dark class is present on html element
      // Check system preference
      const isSystemDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      // Assume dark mode if .dark class is there, OR if system is dark AND .light is NOT there.
      // This logic depends on how the app handles themes.
      // Safe bet: if specific class .dark -> dark. if .light -> light. else system.
      if (document.documentElement.classList.contains("dark")) {
        setIsDarkMode(true);
      } else if (document.documentElement.classList.contains("light")) {
        setIsDarkMode(false);
      } else {
        setIsDarkMode(isSystemDark);
      }
    };

    checkDarkMode();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => checkDarkMode();
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const targetMouseRef = useRef<Vector2>(new Vector2(-1000, -1000));
  const currentMouseRef = useRef<Vector2>(new Vector2(-1000, -1000));
  const targetInfluenceRef = useRef<number>(0);
  const currentInfluenceRef = useRef<number>(0);
  const targetParallaxRef = useRef<Vector2>(new Vector2(0, 0));
  const currentParallaxRef = useRef<Vector2>(new Vector2(0, 0));

  // Refs for props that are accessed in event handlers or loop
  const interactiveRef = useRef(interactive);
  const mouseDampingRef = useRef(mouseDamping);
  const parallaxRef = useRef(parallax);
  const parallaxStrengthRef = useRef(parallaxStrength);

  // Update refs when props change
  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);
  useEffect(() => {
    mouseDampingRef.current = mouseDamping;
  }, [mouseDamping]);
  useEffect(() => {
    parallaxRef.current = parallax;
  }, [parallax]);
  useEffect(() => {
    parallaxStrengthRef.current = parallaxStrength;
  }, [parallaxStrength]);

  const getLineCount = (waveType: "top" | "middle" | "bottom"): number => {
    if (typeof lineCount === "number") return lineCount;
    if (!enabledWaves.includes(waveType)) return 0;
    const index = enabledWaves.indexOf(waveType);
    return lineCount[index] ?? 6;
  };

  const getLineDistance = (waveType: "top" | "middle" | "bottom"): number => {
    if (typeof lineDistance === "number") return lineDistance;
    if (!enabledWaves.includes(waveType)) return 0.1;
    const index = enabledWaves.indexOf(waveType);
    return lineDistance[index] ?? 0.1;
  };

  const topLineCount = enabledWaves.includes("top") ? getLineCount("top") : 0;
  const middleLineCount = enabledWaves.includes("middle")
    ? getLineCount("middle")
    : 0;
  const bottomLineCount = enabledWaves.includes("bottom")
    ? getLineCount("bottom")
    : 0;

  const topLineDistance = enabledWaves.includes("top")
    ? getLineDistance("top") * 0.01
    : 0.01;
  const middleLineDistance = enabledWaves.includes("middle")
    ? getLineDistance("middle") * 0.01
    : 0.01;
  const bottomLineDistance = enabledWaves.includes("bottom")
    ? getLineDistance("bottom") * 0.01
    : 0.01;

  // Initialization Effect
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene();
    sceneRef.current = scene;

    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: animationSpeed },

      enableTop: { value: enabledWaves.includes("top") },
      enableMiddle: { value: enabledWaves.includes("middle") },
      enableBottom: { value: enabledWaves.includes("bottom") },

      topLineCount: { value: topLineCount },
      middleLineCount: { value: middleLineCount },
      bottomLineCount: { value: bottomLineCount },

      topLineDistance: { value: topLineDistance },
      middleLineDistance: { value: middleLineDistance },
      bottomLineDistance: { value: bottomLineDistance },

      topWavePosition: {
        value: new Vector3(
          topWavePosition?.x ?? 10.0,
          topWavePosition?.y ?? 0.5,
          topWavePosition?.rotate ?? -0.4
        ),
      },
      middleWavePosition: {
        value: new Vector3(
          middleWavePosition?.x ?? 5.0,
          middleWavePosition?.y ?? 0.0,
          middleWavePosition?.rotate ?? 0.2
        ),
      },
      bottomWavePosition: {
        value: new Vector3(
          bottomWavePosition?.x ?? 2.0,
          bottomWavePosition?.y ?? -0.7,
          bottomWavePosition?.rotate ?? 0.4
        ),
      },

      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },

      parallax: { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },

      lineGradient: {
        value: Array.from(
          { length: MAX_GRADIENT_STOPS },
          () => new Vector3(1, 1, 1)
        ),
      },
      lineGradientCount: { value: 0 },

      isDarkMode: { value: isDarkMode },
    };

    if (linesGradient && linesGradient.length > 0) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;

      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        uniforms.lineGradient.value[i].set(color.x, color.y, color.z);
      });
    }

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
    materialRef.current = material;

    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const clock = new Clock();

    const setSize = () => {
      const el = containerRef.current;
      if (!el || !rendererRef.current) return;
      const width = el.clientWidth || 1;
      const height = el.clientHeight || 1;

      rendererRef.current.setSize(width, height, false);

      const canvasWidth = rendererRef.current.domElement.width;
      const canvasHeight = rendererRef.current.domElement.height;

      if (materialRef.current) {
        materialRef.current.uniforms.iResolution.value.set(
          canvasWidth,
          canvasHeight,
          1
        );
      }
    };

    setSize();

    // Force resize after a small delay
    const timeoutId = setTimeout(() => {
      setSize();
    }, 100);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(setSize)
        : null;

    if (ro && containerRef.current) {
      ro.observe(containerRef.current);
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!rendererRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dpr = rendererRef.current.getPixelRatio();

      targetMouseRef.current.set(x * dpr, (rect.height - y) * dpr);
      targetInfluenceRef.current = 1.0;

      if (parallaxRef.current) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = (x - centerX) / rect.width;
        const offsetY = -(y - centerY) / rect.height;
        targetParallaxRef.current.set(
          offsetX * parallaxStrengthRef.current,
          offsetY * parallaxStrengthRef.current
        );
      }
    };

    const handlePointerLeave = () => {
      targetInfluenceRef.current = 0.0;
    };

    // Add listeners to domElement.
    // We attach them once. Logic inside handles interactive state.
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

    let raf = 0;
    const renderLoop = () => {
      if (!materialRef.current) return;

      materialRef.current.uniforms.iTime.value = clock.getElapsedTime();

      if (interactiveRef.current) {
        currentMouseRef.current.lerp(
          targetMouseRef.current,
          mouseDampingRef.current
        );
        materialRef.current.uniforms.iMouse.value.copy(currentMouseRef.current);

        currentInfluenceRef.current +=
          (targetInfluenceRef.current - currentInfluenceRef.current) *
          mouseDampingRef.current;
        materialRef.current.uniforms.bendInfluence.value =
          currentInfluenceRef.current;
      }

      if (parallaxRef.current) {
        currentParallaxRef.current.lerp(
          targetParallaxRef.current,
          mouseDampingRef.current
        );
        materialRef.current.uniforms.parallaxOffset.value.copy(
          currentParallaxRef.current
        );
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeoutId);
      if (ro) {
        ro.disconnect();
      }

      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener(
        "pointerleave",
        handlePointerLeave
      );

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialization run only once

  // Update isDarkMode uniform
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.isDarkMode.value = isDarkMode;
    }
  }, [isDarkMode]);

  // Separate useEffects for property updates

  // Animation Speed
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.animationSpeed.value = animationSpeed;
    }
  }, [animationSpeed]);

  // Interactive
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.interactive.value = interactive;
    }
  }, [interactive]);

  // Bend Properties
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.bendRadius.value = bendRadius;
      materialRef.current.uniforms.bendStrength.value = bendStrength;
    }
  }, [bendRadius, bendStrength]);

  // Parallax
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.parallax.value = parallax;
      materialRef.current.uniforms.parallaxStrength.value = parallaxStrength;
    }
  }, [parallax, parallaxStrength]);

  // Wave Positions
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.topWavePosition.value.set(
        topWavePosition?.x ?? 10.0,
        topWavePosition?.y ?? 0.5,
        topWavePosition?.rotate ?? -0.4
      );
      materialRef.current.uniforms.middleWavePosition.value.set(
        middleWavePosition?.x ?? 5.0,
        middleWavePosition?.y ?? 0.0,
        middleWavePosition?.rotate ?? 0.2
      );
      materialRef.current.uniforms.bottomWavePosition.value.set(
        bottomWavePosition?.x ?? 2.0,
        bottomWavePosition?.y ?? -0.7,
        bottomWavePosition?.rotate ?? 0.4
      );
    }
  }, [topWavePosition, middleWavePosition, bottomWavePosition]);

  // Gradient
  useEffect(() => {
    if (materialRef.current && linesGradient) {
      const u = materialRef.current.uniforms;
      if (linesGradient.length > 0) {
        const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
        u.lineGradientCount.value = stops.length;
        stops.forEach((hex, i) => {
          const color = hexToVec3(hex);
          u.lineGradient.value[i].set(color.x, color.y, color.z);
        });
      } else {
        u.lineGradientCount.value = 0;
      }
    }
  }, [linesGradient]);

  // Line Config (Counts, Distances, Enabled)
  useEffect(() => {
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      u.enableTop.value = enabledWaves.includes("top");
      u.enableMiddle.value = enabledWaves.includes("middle");
      u.enableBottom.value = enabledWaves.includes("bottom");

      u.topLineCount.value = topLineCount;
      u.middleLineCount.value = middleLineCount;
      u.bottomLineCount.value = bottomLineCount;

      u.topLineDistance.value = topLineDistance;
      u.middleLineDistance.value = middleLineDistance;
      u.bottomLineDistance.value = bottomLineDistance;
    }
  }, [
    enabledWaves,
    topLineCount,
    middleLineCount,
    bottomLineCount,
    topLineDistance,
    middleLineDistance,
    bottomLineDistance,
  ]);

  // Decide mixBlendMode effectively
  const effectiveMixBlendMode =
    mixBlendMode === "screen" && !isDarkMode ? "multiply" : mixBlendMode;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden floating-lines-container"
      style={{
        mixBlendMode: effectiveMixBlendMode,
      }}
    />
  );
}
