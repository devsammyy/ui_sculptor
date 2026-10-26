"use client";

import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./Scene3DTarget.module.css";

interface Scene3DTargetProps {
  className?: string;
  targetPosition?: [number, number, number];
  onTargetSelect?: (position: [number, number, number]) => void;
  enabled?: boolean;
}

/**
 * Scene3DTarget - Organism component
 * Three.js / React Three Fiber interactive playground
 */
export const Scene3DTarget: React.FC<Scene3DTargetProps> = ({
  className = "",
  targetPosition = [0, 0, 0],
  onTargetSelect,
  enabled = true,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<
    [number, number, number] | null
  >(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div
      className={`${styles["container"]} ${className}`}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
    >
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 2, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <color attach="background" args={["#0d0f17"]} />
        <fog attach="fog" args={["#0d0f17", 1, 20]} />

        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[5, 10, 7]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-radius={4}
        />

        {/* Ground plane */}
        <mesh
          receiveShadow
          onPointerOver={() => setHoveredPoint(null)}
          onPointerOut={() => setHoveredPoint(null)}
        >
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.9}
            metalness={0.1}
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Grid helper */}
        <gridHelper
          args={[20, 20, "#3b82f6", "#1e293b"]}
          position={[0, -0.01, 0]}
        />

        {/* Target indicator */}
        <TargetMarker
          position={targetPosition}
          hovered={!!hoveredPoint}
          onSelect={onTargetSelect}
          enabled={enabled}
        />

        {/* Hovered point preview */}
        {hoveredPoint && <HoverPreview position={hoveredPoint} />}

        <ContactShadows
          position={[0, -0.02, 0]}
          opacity={0.3}
          scale={20}
          blur={2}
        />

        {enabled && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        )}
      </Canvas>

      {/* Coordinate display */}
      <div className={styles["coords"]}>
        <span>X: {targetPosition[0].toFixed(2)}</span>
        <span>Y: {targetPosition[1].toFixed(2)}</span>
        <span>Z: {targetPosition[2].toFixed(2)}</span>
      </div>
    </div>
  );
};

Scene3DTarget.displayName = "Scene3DTarget";

// Target marker component
interface TargetMarkerProps {
  position: [number, number, number];
  hovered: boolean;
  onSelect?: (position: [number, number, number]) => void;
  enabled: boolean;
}

function TargetMarker({
  position,
  hovered,
  onSelect,
  enabled,
}: TargetMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (hovered) {
      const animationId = requestAnimationFrame(function animate() {
        setScale((prev) => 1 + Math.sin(Date.now() / 200) * 0.1);
        requestAnimationFrame(animate);
      });
      return () => cancelAnimationFrame(animationId);
    } else {
      setScale(1);
    }
  }, [hovered]);

  return (
    <group position={position} onClick={() => onSelect?.(position)}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        scale={scale}
        onPointerOver={() => setScale(1.2)}
        onPointerOut={() => setScale(1)}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={hovered ? "#0066CC" : "#EF4444"}
          emissive={hovered ? "#0066CC" : "#EF4444"}
          emissiveIntensity={hovered ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Pulsing ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 1.5, 1.5]}>
        <ringGeometry args={[0.35, 0.5, 32]} />
        <meshBasicMaterial color="#0066CC" transparent opacity={0.3} side={2} />
      </mesh>

      {/* Label */}
      <Html
        position={[0, 0.8, 0]}
        transform
        sprite
        distanceFactor={5}
        zIndexRange={[100, 101]}
      >
        <div className={styles.targetLabel}>Target</div>
      </Html>
    </group>
  );
}

// Hover preview component
interface HoverPreviewProps {
  position: [number, number, number];
}

function HoverPreview({ position }: HoverPreviewProps) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial
          color="#0066CC"
          transparent
          opacity={0.5}
          wireframe
        />
      </mesh>
      <Html position={[0, 0.5, 0]} transform sprite>
        <div className={styles.hoverLabel}>Click to select</div>
      </Html>
    </group>
  );
}
