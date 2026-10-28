"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./Scene3DTarget.module.css";

type ViewAngle = "perspective" | "front" | "isometric" | "top";

interface Scene3DTargetProps {
  className?: string;
  targetCoordinate?: { x: number; y: number } | null;
  onTargetSelect?: (pos: [number, number, number]) => void;
  enabled?: boolean;
  hasExtraMesh?: boolean;
  lightingTheme?: "default" | "cyberpunk" | "monochrome" | "sunset";
  centerShape?: "torus" | "knot" | "cube" | "sphere" | "crystal";
}

interface ChangeEntry {
  id: string;
  position: [number, number, number];
  timestamp: string;
}

/**
 * Animated central 3D core object
 */
function FloatingCoreObject({
  shape = "crystal",
  accentColor = "#3b82f6",
}: {
  shape?: "torus" | "knot" | "cube" | "sphere" | "crystal";
  accentColor?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ballRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.35;
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
    if (ballRef.current) {
      const elapsed = state.clock.elapsedTime;
      ballRef.current.position.x = Math.cos(elapsed * 0.8) * 1.35;
      ballRef.current.position.z = Math.sin(elapsed * 0.8) * 1.35;
      ballRef.current.position.y = 0.8 + Math.sin(elapsed * 1.5) * 0.15;
      ballRef.current.rotation.x += delta * 0.5;
      ballRef.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <group>
      {/* Central Geometry - Faceted Crystal Octahedron */}
      <mesh ref={meshRef} position={[0, 0.8, 0]} castShadow receiveShadow>
        {shape === "torus" && <torusGeometry args={[0.7, 0.22, 32, 64]} />}
        {shape === "knot" && <torusKnotGeometry args={[0.55, 0.18, 128, 32]} />}
        {shape === "cube" && <boxGeometry args={[0.9, 0.9, 0.9]} />}
        {shape === "sphere" && <sphereGeometry args={[0.7, 32, 32]} />}
        {shape === "crystal" && <octahedronGeometry args={[0.85, 0]} />}

        {shape === "crystal" ? (
          <meshPhysicalMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={0.12}
            roughness={0.05}
            metalness={0}
            transmission={1}
            thickness={1.4}
            ior={1.5}
            clearcoat={1}
            clearcoatRoughness={0.05}
            reflectivity={1}
            attenuationColor={accentColor}
            attenuationDistance={1.8}
            specularIntensity={1}
            envMapIntensity={1.5}
            flatShading
            transparent
          />
        ) : (
          <meshPhysicalMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={0.25}
            roughness={0.15}
            metalness={0.85}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
            reflectivity={0.9}
          />
        )}
      </mesh>

      {/* Orbiting Ball */}
      <mesh ref={ballRef} position={[1.35, 0.8, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshPhysicalMaterial
          color="#60a5fa"
          emissive="#60a5fa"
          emissiveIntensity={0.25}
          roughness={0.15}
          metalness={0.85}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </mesh>
    </group>
  );
}

/**
 * Orbiting satellite data nodes
 */
function SatelliteNodes({ count = 4 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  const nodes = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = 2.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0.8 + (i % 2 === 0 ? 0.3 : -0.3);

    return (
      <mesh key={i} position={[x, y, z]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    );
  });

  return <group ref={groupRef}>{nodes}</group>;
}

/**
 * Floating 3D Starfield / Spatial Dust Particles
 */
function SpatialParticleField({ count = 180 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 8 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  });

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#93c5fd"
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * 3D Target Marker indicating active spatial reticle
 */
function SpatialTargetMarker({
  position,
  hovered,
  onSelect,
}: {
  position: [number, number, number];
  hovered: boolean;
  onSelect?: (pos: [number, number, number]) => void;
}) {
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      setPulse(1 + Math.sin(Date.now() / 180) * 0.18);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <group position={position} onClick={() => onSelect?.(position)}>
      {/* 3D Glowing Sphere */}
      <mesh scale={pulse} castShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial
          color={hovered ? "#38bdf8" : "#ef4444"}
          emissive={hovered ? "#38bdf8" : "#ef4444"}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Target Floor Projection Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -position[1] + 0.01, 0]}>
        <ringGeometry args={[0.3, 0.38, 32]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical Indicator Beam */}
      <mesh position={[0, -position[1] / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, position[1], 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.4} />
      </mesh>

      <pointLight color="#ef4444" intensity={1.2} distance={2} />
    </group>
  );
}

/**
 * Camera controller for switching perspective presets
 */
function CameraRig({
  viewAngle,
  controlsRef,
}: {
  viewAngle: ViewAngle;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (viewAngle === "front") {
      camera.position.set(0, 1.2, 5.2);
    } else if (viewAngle === "perspective") {
      camera.position.set(2.8, 2.5, 4.5);
    } else if (viewAngle === "isometric") {
      camera.position.set(4.2, 4.2, 4.2);
    } else if (viewAngle === "top") {
      camera.position.set(0, 6.5, 0.1);
    }
    camera.lookAt(0, 0.8, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.8, 0);
      controlsRef.current.update();
    }
  }, [viewAngle, camera, controlsRef]);

  return null;
}

/**
 * Scene3DTarget - Organism component
 * True Three.js / React Three Fiber interactive 3D spatial studio
 */
export const Scene3DTarget: React.FC<Scene3DTargetProps> = ({
  className = "",
  targetCoordinate = null,
  onTargetSelect,
  enabled = true,
  hasExtraMesh = true,
  lightingTheme = "cyberpunk",
  centerShape = "crystal",
}) => {
  const [viewAngle, setViewAngle] = useState<ViewAngle>("perspective");
  const [targetPos, setTargetPos] = useState<[number, number, number]>([0, 1.2, 0]);
  const [hoveredPos, setHoveredPos] = useState<[number, number, number] | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeEntry[]>([]);
  const [reportedCount, setReportedCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const controlsRef = useRef<any>(null);
  const isInitialTargetRef = useRef(true);
  const changeIdRef = useRef(0);

  const unreportedCount = Math.max(0, changeLog.length - reportedCount);

  // Sync incoming normalized 2D coordinate to 3D space if provided
  useEffect(() => {
    if (targetCoordinate) {
      const x = (targetCoordinate.x - 0.5) * 8;
      const z = (targetCoordinate.y - 0.5) * 8;
      setTargetPos([x, 1.0, z]);
    }
  }, [targetCoordinate]);

  // Record every target move as a change to report (skipping the initial position)
  useEffect(() => {
    if (isInitialTargetRef.current) {
      isInitialTargetRef.current = false;
      return;
    }
    changeIdRef.current += 1;
    const entry: ChangeEntry = {
      id: `${Date.now()}-${changeIdRef.current}`,
      position: targetPos,
      timestamp: new Date().toLocaleTimeString(),
    };
    setChangeLog((prev) => [...prev.slice(-19), entry]);
  }, [targetPos]);

  const handleMarkAsReported = useCallback(() => {
    setReportedCount(changeLog.length);
  }, [changeLog.length]);

  const handleClearReport = useCallback(() => {
    setChangeLog([]);
    setReportedCount(0);
  }, []);

  const handlePointerDown = useCallback(
    (e: any) => {
      // Raycast click onto the ground or objects to select 3D coordinates
      if (e.point) {
        const newPos: [number, number, number] = [
          parseFloat(e.point.x.toFixed(2)),
          Math.max(0.5, parseFloat(e.point.y.toFixed(2))),
          parseFloat(e.point.z.toFixed(2)),
        ];
        setTargetPos(newPos);
        onTargetSelect?.(newPos);
      }
    },
    [onTargetSelect],
  );

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Top HUD Controls Overlay */}
      <div className={styles.topOverlay}>
        <div className={styles.badgeGroup}>
          <div className={styles.spatialBadge}>
            <span className={styles.pulseDot} />
            3D Spatial Studio • WebGL & Three.js
          </div>
        </div>

        <div className={styles.viewControls}>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewAngle === "perspective" ? styles.activeView : ""}`}
            onClick={() => setViewAngle("perspective")}
          >
            Perspective
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewAngle === "front" ? styles.activeView : ""}`}
            onClick={() => setViewAngle("front")}
          >
            Front (0°)
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewAngle === "isometric" ? styles.activeView : ""}`}
            onClick={() => setViewAngle("isometric")}
          >
            Isometric
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewAngle === "top" ? styles.activeView : ""}`}
            onClick={() => setViewAngle("top")}
          >
            Top-down
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${unreportedCount > 0 ? styles.activeView : ""}`}
            onClick={() => setShowReport((prev) => !prev)}
            aria-expanded={showReport}
            aria-label="Changes to report"
          >
            Changes to Report{unreportedCount > 0 ? ` (${unreportedCount})` : ""}
          </button>
        </div>
      </div>

      {/* Changes to Report Panel */}
      {showReport && (
        <div
          role="dialog"
          aria-label="Changes to report"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            width: "320px",
            maxWidth: "90%",
            background: "#FFFFFF",
            color: "#111827",
            border: "1px solid #E5E7EB",
            borderRadius: "1rem",
            padding: "1rem",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <div>
              <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                Changes to Report
              </div>
              <div style={{ color: "#6B7280", fontSize: "1rem" }} aria-live="polite">
                {unreportedCount > 0
                  ? `${unreportedCount} unreported change${unreportedCount === 1 ? "" : "s"}`
                  : "No unreported changes"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReport(false)}
              style={{
                background: "#F9FAFB",
                color: "#111827",
                border: "1px solid #E5E7EB",
                borderRadius: "0.5rem",
                padding: "0.25rem 0.5rem",
                cursor: "pointer",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Close
            </button>
          </div>

          {changeLog.length === 0 ? (
            <p style={{ color: "#6B7280", margin: "0.5rem 0", fontSize: "1rem" }}>
              No changes to report. Click in the 3D scene to set a target and
              changes will be recorded here.
            </p>
          ) : (
            <ol
              style={{
                margin: "0.5rem 0",
                paddingLeft: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                maxHeight: "12rem",
                overflowY: "auto",
                fontSize: "1rem",
              }}
            >
              {changeLog
                .slice()
                .reverse()
                .map((entry, index) => (
                  <li
                    key={entry.id}
                    style={{
                      color: index < unreportedCount ? "#111827" : "#6B7280",
                    }}
                  >
                    <span>
                      X: {entry.position[0].toFixed(2)} Y:{" "}
                      {entry.position[1].toFixed(2)} Z:{" "}
                      {entry.position[2].toFixed(2)}
                    </span>
                    <span style={{ color: "#6B7280" }}>
                      {" "}
                      • {entry.timestamp}
                    </span>
                  </li>
                ))}
            </ol>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              disabled={unreportedCount === 0}
              onClick={handleMarkAsReported}
              style={{
                background: "#0066CC",
                color: "#FFFFFF",
                border: "1px solid #0066CC",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem",
                cursor: unreportedCount === 0 ? "not-allowed" : "pointer",
                opacity: unreportedCount === 0 ? 0.6 : 1,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Mark as Reported
            </button>
            <button
              type="button"
              disabled={changeLog.length === 0}
              onClick={handleClearReport}
              style={{
                background: "#F9FAFB",
                color: "#111827",
                border: "1px solid #E5E7EB",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem",
                cursor: changeLog.length === 0 ? "not-allowed" : "pointer",
                opacity: changeLog.length === 0 ? 0.6 : 1,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Real Three.js 3D Canvas */}
      <Canvas
        camera={{ position: [2.8, 2.5, 4.5], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x07090e, 1);
        }}
      >
        <CameraRig viewAngle={viewAngle} controlsRef={controlsRef} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[6, 10, 8]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Cyberpunk Accent Lights */}
        {lightingTheme === "cyberpunk" && (
          <>
            <pointLight position={[-4, 3, -3]} intensity={2.5} color="#06b6d4" />
            <pointLight position={[4, 2, 3]} intensity={2.2} color="#d946ef" />
          </>
        )}

        {/* Ground Floor Plane with Raycast Target Selection */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
          receiveShadow
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => {
            if (e.point) {
              setHoveredPos([e.point.x, 0.5, e.point.z]);
            }
          }}
          onPointerOut={() => setHoveredPos(null)}
        >
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial
            color="#0b1120"
            roughness={0.4}
            metalness={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* 3D Spatial Grid Floor */}
        <gridHelper
          args={[24, 24, "#3b82f6", "#1e293b"]}
          position={[0, 0, 0]}
        />

        {/* Central 3D Spatial Geometries */}
        <FloatingCoreObject shape={centerShape} accentColor="#2563eb" />

        {/* Satellite Data Nodes */}
        {hasExtraMesh && <SatelliteNodes count={4} />}

        {/* Spatial Dust / Particle Stars */}
        <SpatialParticleField count={160} />

        {/* Interactive 3D Target Marker */}
        <SpatialTargetMarker
          position={targetPos}
          hovered={!!hoveredPos}
          onSelect={onTargetSelect}
        />

        {/* Ground Contact Shadow */}
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.5}
          scale={14}
          blur={2.5}
          far={6}
        />

        {/* Orbit Controls */}
        {enabled && (
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxPolarAngle={Math.PI / 2}
            minDistance={1.8}
            maxDistance={14}
            dampingFactor={0.06}
          />
        )}
      </Canvas>

      {/* Bottom HUD Coordinates & Interaction Tips */}
      <div className={styles.bottomOverlay}>
        <div className={styles.navTips}>
          <span>Orbit: Left-drag • Pan: Right-drag • Zoom: Scroll • Click in 3D to set target</span>
        </div>

        <div className={styles.coords}>
          <span>X: {targetPos[0].toFixed(2)}</span>
          <span>Y: {targetPos[1].toFixed(2)}</span>
          <span>Z: {targetPos[2].toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

Scene3DTarget.displayName = "Scene3DTarget";