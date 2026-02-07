"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Using a type compatible with the one in input-inline.tsx
interface Paper {
  title: string;
  url: string;
  embedding?: number[];
}

interface EmbeddingGraphProps {
  papers: Paper[];
}

export function EmbeddingGraph({ papers }: EmbeddingGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // --- Setup Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background
    sceneRef.current = scene;

    // --- Setup Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Process Data & Calculate Bounds ---
    const positions: number[] = [];
    const colors: number[] = [];

    // Initialize bounds
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    papers.forEach((paper) => {
      if (paper.embedding && paper.embedding.length >= 2) {
        // Use 1st and 2nd dimensions directly (no arbitrary scaling yet)
        const x = paper.embedding[0];
        const y = paper.embedding[1];
        const z = 0;

        positions.push(x, y, z);
        colors.push(1, 1, 1);

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    });

    // Handle case with no data or single point
    if (minX === Infinity) {
      minX = -1;
      maxX = 1;
      minY = -1;
      maxY = 1;
    }
    if (minX === maxX) {
      minX -= 0.1;
      maxX += 0.1;
    }
    if (minY === maxY) {
      minY -= 0.1;
      maxY += 0.1;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;

    // Add some padding (20%)
    const padding = 1.2;
    const width = dataWidth * padding;
    const height = dataHeight * padding;

    // --- Setup Camera (Orthographic) ---
    const aspect = container.clientWidth / container.clientHeight;

    // Determine view size to fit the data
    // We need to fit 'width' horizontally and 'height' vertically
    // Ortho camera: left/right/top/bottom define the visible box

    let viewHeight = height;
    let viewWidth = height * aspect;

    if (viewWidth < width) {
      // If width is the constraining factor
      viewWidth = width;
      viewHeight = width / aspect;
    }

    const camera = new THREE.OrthographicCamera(
      viewWidth / -2,
      viewWidth / 2,
      viewHeight / 2,
      viewHeight / -2,
      0.1,
      1000
    );

    // Position camera at center of data
    camera.position.set(centerX, centerY, 10);
    camera.lookAt(centerX, centerY, 0);
    cameraRef.current = camera;

    // --- Create Points ---
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 6, // Increased pixel size
      vertexColors: true,
      sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // --- Setup Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(centerX, centerY, 0);
    controls.enableRotate = false; // 2D view, so disable rotation
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.update();
    controlsRef.current = controls;

    // --- Handle Resize ---
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;

      const newAspect = container.clientWidth / container.clientHeight;
      const cam = cameraRef.current;

      // Maintain the current vertical view size (zoom level essentially)
      // but adjust horizontal to match aspect
      const currentHeight = cam.top - cam.bottom;
      const newWidth = currentHeight * newAspect;

      // Standard way for resizing Ortho centered at target
      cam.left = -newWidth / 2;
      cam.right = newWidth / 2;
      cam.top = viewHeight / 2;
      cam.bottom = -viewHeight / 2;

      cam.updateProjectionMatrix();
      rendererRef.current.setSize(
        container.clientWidth,
        container.clientHeight
      );
    };

    window.addEventListener("resize", handleResize);

    // --- Animation Loop ---
    let animationId: number;
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        controls.update(); // Required for damping if enabled
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // --- Cleanup ---
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (container && rendererRef.current) {
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
      geometry.dispose();
      material.dispose();
    };
  }, [papers]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black rounded-lg overflow-hidden cursor-move"
    />
  );
}
