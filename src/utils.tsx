import { useEffect, useMemo, useRef } from "react";
import { Mesh, Object3D, Sprite, Texture, Vector3 } from "three";
import { CityName, CityRealCoords, truePositions } from "./coordinates";
import { Distances, useUIContext } from "./state";
import { wgsl } from "three/examples/jsm/nodes/Nodes.js";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

type Color = { r: number, g: number, b: number, a: number };

type Parameters = {
  fontface?: string,
  fontsize?: number,
  borderThickness?: number,
  borderColor?: Color,
  backgroundColor?: Color,
}

export function TextSprite(
  { message, parameters, position }:
    { message: string, parameters: Parameters | undefined, position?: [x: number, y: number, z: number] }
) {

  if (parameters === undefined) parameters = {};

  const texture = useMemo(() => {
    const fontface = parameters.fontface ?? "Arial";

    const fontsize = parameters.fontsize ?? 25;

    const borderThickness = parameters.borderThickness ?? 4;

    const borderColor = parameters.borderColor ?? { r: 0, g: 0, b: 0, a: 1.0 };

    const backgroundColor = parameters.backgroundColor ?? { r: 255, g: 255, b: 255, a: 1.0 };
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (context === null) return null;

    context.font = "Bold " + fontsize + "px " + fontface;

    // get size data (height depends only on font size)

    const metrics = context.measureText(message);
    const textWidth = metrics.width;

    // background color
    context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
      + backgroundColor.b + "," + backgroundColor.a + ")";
    // border color
    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
      + borderColor.b + "," + borderColor.a + ")";

    context.lineWidth = borderThickness;
    // roundRect(context, borderThickness/2+50, borderThickness/2, textWidth + borderThickness, fontsize * 1.2 + borderThickness, 19);
    roundRect(context, borderThickness / 2 + 65, borderThickness / 2, textWidth + borderThickness, fontsize * 1.2 + borderThickness, 19);

    // 1.4 is extra height factor for text below baseline: g,j,p,q.

    // text color
    context.fillStyle = "rgba(0, 0, 0, 1.0)";

    context.fillText(message, borderThickness + 65, fontsize + borderThickness);
    return new Texture(canvas);
  }, [message, parameters]);

  if (texture === null) return null;
  texture.needsUpdate = true;

  return (
    <sprite scale={[10, 4, 600.0]} onPointerDown={ev => ev.stopPropagation()} position={position}>
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  );
}


export function SphericalDistance(x: CityRealCoords, y: CityRealCoords, r: number) {
  const φ1 = x.lat * Math.PI / 180;
  const φ2 = y.lat * Math.PI / 180;
  const Δφ = (y.lat - x.lat) * Math.PI / 180;
  const Δλ = (y.lon - x.lon) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = r * c; // in metres
  return Math.round(d / 10) / 100;
}

export function PlanarDistance(p1: Object3D, p2: Object3D) {
  return Math.round(
    Math.sqrt((p1.position.x - p2.position.x) ** 2 + (p1.position.z - p2.position.z) ** 2)
  );
}

export function totalDistance(distances: Distances) {
  const SHRINKFACTOR = 1000; // NOTE: make distances larger so computations are less vulnerable to floating point error
  let totalSum = 0;
  for (const city1 of Object.keys(distances) as CityName[]) {
    for (const city2 of Object.keys(distances[city1]) as CityName[]) {
      totalSum += distances[city1][city2]
    }
  }
  return totalSum / SHRINKFACTOR;
}

export function useDistanceInfo() {
  const realDistances = getRealDistances();
  const { currDistances } = useUIContext();
  const totalCurr = totalDistance(currDistances);
  const totalReal = totalDistance(realDistances);
  return { realDistances, currDistances, totalCurr, totalReal };
}

const realDistances: Distances = {};

export function getRealDistances(): Distances {
  if (Object.keys(realDistances).length === 0) {
    for (const [cityName1, cityMesh1] of Object.entries(truePositions) as [CityName, CityRealCoords][]) {
      for (const [cityName2, cityMesh2] of Object.entries(truePositions) as [CityName, CityRealCoords][]) {
        const distance = SphericalDistance(cityMesh1, cityMesh2);
        if (realDistances[cityName1] === undefined) realDistances[cityName1] = {};
        if (realDistances[cityName2] === undefined) realDistances[cityName2] = {};
        realDistances[cityName1][cityName2] = distance;
        realDistances[cityName2][cityName1] = distance;
      }
    }
  }
  return realDistances;
}

export function convertAngToPolar(lat: number, lon: number, r: number) {
  const latRad = lat * (Math.PI / 180);
  const lonRad = -lon * (Math.PI / 180);
  const x = Math.cos(latRad) * Math.cos(lonRad) * r;
  const y = Math.sin(latRad) * r;
  const z = Math.cos(latRad) * Math.sin(lonRad) * r;
  return { x, y, z }
}


export function convertPolarToAng(x: number, y: number, z: number, r: number) {
  const lat = Math.asin(y / r) * (180 / Math.PI);
  const lon = -1 * Math.atan2(z, x) * (180 / Math.PI);

  return { lat, lon }
}

export function sca() {
  return Math.random() * 26 - 18;
}

export function slerp(base: Vector3, dest: Vector3, t: number) {
  base = new Vector3().copy(base);
  dest = new Vector3().copy(dest);
  const theta = Math.acos(base.dot(dest));
  return base.multiplyScalar(Math.sin((1 - t) * theta) / Math.sin(theta)).add(
    dest.multiplyScalar(Math.sin(t * theta) / Math.sin(theta))
  );
}
