"use client";

/**
 * Registers gl/scene/camera capture API for ExportMenu (HTML side).
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  captureTopDownPng,
  captureTopDownPdf,
} from "@/lib/floor-planner/captureTopDown";
import { registerCaptureApi } from "@/components/floor-planner/ExportMenu";

export default function CaptureBridge() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    registerCaptureApi({
      capturePng: (opts) => captureTopDownPng(gl, scene, camera, opts),
      capturePdf: (opts) => captureTopDownPdf(gl, scene, camera, opts),
    });
    return () => registerCaptureApi(null);
  }, [gl, scene, camera]);

  return null;
}
