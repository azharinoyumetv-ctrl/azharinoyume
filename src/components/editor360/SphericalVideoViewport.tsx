"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CameraKeyframe, Editor360Config } from "@/lib/video360/contracts";

type Props = {
  video: HTMLVideoElement | null;
  camera: CameraKeyframe;
  projection: Editor360Config["sourceProjection"];
  onCameraChange: (camera: CameraKeyframe) => void;
};

const vertexShader = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D videoMap;
  uniform float projectionMode;
  varying vec3 vDirection;
  const float PI = 3.141592653589793;

  void main() {
    vec3 direction = normalize(vDirection);
    vec2 uv;
    if (projectionMode < 0.5) {
      uv = vec2(atan(direction.z, direction.x) / (2.0 * PI) + 0.5, asin(clamp(direction.y, -1.0, 1.0)) / PI + 0.5);
    } else {
      bool front = direction.z >= 0.0;
      vec3 lensDirection = front ? direction : vec3(-direction.x, direction.y, -direction.z);
      float angle = acos(clamp(lensDirection.z, -1.0, 1.0));
      float radius = angle / (PI * 0.5) * 0.245;
      float phi = atan(lensDirection.y, lensDirection.x);
      vec2 center = vec2(front ? 0.25 : 0.75, 0.5);
      uv = center + vec2(cos(phi), sin(phi)) * radius;
    }
    gl_FragColor = texture2D(videoMap, vec2(uv.x, 1.0 - uv.y));
  }
`;

export default function SphericalVideoViewport({
  video,
  camera,
  projection,
  onCameraChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onCameraChangeRef = useRef(onCameraChange);
  const cameraStateRef = useRef(camera);

  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);
  useEffect(() => {
    cameraStateRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !video) return;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x06070a);
    renderer.domElement.className = "h-full w-full touch-none";
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const sceneCamera = new THREE.PerspectiveCamera(
      cameraStateRef.current.fov,
      16 / 9,
      0.1,
      1100,
    );
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        videoMap: { value: texture },
        projectionMode: { value: projection === "dual_fisheye" ? 1 : 0 },
      },
      vertexShader,
      fragmentShader,
    });
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    scene.add(new THREE.Mesh(geometry, material));

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let pinchDistance = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    const distanceBetweenPointers = () => {
      const [first, second] = [...pointers.values()];
      return first && second
        ? Math.hypot(second.x - first.x, second.y - first.y)
        : 0;
    };
    const pointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      if (pointers.size === 2) pinchDistance = distanceBetweenPointers();
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging || !pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const current = cameraStateRef.current;
      if (pointers.size >= 2) {
        const nextDistance = distanceBetweenPointers();
        const next = {
          ...current,
          fov: Math.max(
            35,
            Math.min(140, current.fov - (nextDistance - pinchDistance) * 0.12),
          ),
        };
        pinchDistance = nextDistance;
        cameraStateRef.current = next;
        onCameraChangeRef.current(next);
        return;
      }
      const next = {
        ...current,
        yaw: Math.max(
          -180,
          Math.min(180, current.yaw - (event.clientX - previousX) * 0.18),
        ),
        pitch: Math.max(
          -85,
          Math.min(85, current.pitch + (event.clientY - previousY) * 0.18),
        ),
      };
      previousX = event.clientX;
      previousY = event.clientY;
      cameraStateRef.current = next;
      onCameraChangeRef.current(next);
    };
    const pointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      dragging = pointers.size > 0;
      const remaining = [...pointers.values()][0];
      if (remaining) {
        previousX = remaining.x;
        previousY = remaining.y;
      }
      pinchDistance = pointers.size === 2 ? distanceBetweenPointers() : 0;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = cameraStateRef.current;
      const next = {
        ...current,
        fov: Math.max(35, Math.min(140, current.fov + event.deltaY * 0.035)),
      };
      cameraStateRef.current = next;
      onCameraChangeRef.current(next);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerUp);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      sceneCamera.aspect = width / height;
      sceneCamera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    const draw = () => {
      const current = cameraStateRef.current;
      sceneCamera.fov = current.fov;
      sceneCamera.rotation.set(
        THREE.MathUtils.degToRad(current.pitch),
        THREE.MathUtils.degToRad(-current.yaw),
        THREE.MathUtils.degToRad(current.roll),
        "YXZ",
      );
      sceneCamera.updateProjectionMatrix();
      material.uniforms.projectionMode.value =
        projection === "dual_fisheye" ? 1 : 0;
      renderer.render(scene, sceneCamera);
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointercancel", pointerUp);
      renderer.domElement.removeEventListener("wheel", wheel);
      texture.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      host.replaceChildren();
    };
  }, [video, projection]);

  return (
    <div
      ref={hostRef}
      className="h-full min-h-64 w-full overflow-hidden bg-[#06070a]"
      aria-label="Interactive 360 degree video preview"
    />
  );
}
