import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PartUserData {
  targetPos: Vec3;
  explodePos: Vec3;
}

export type AssemblyPart = THREE.Object3D & { userData: PartUserData };

function part(geometry: THREE.BufferGeometry, material: THREE.Material, target: Vec3, explode: Vec3): AssemblyPart {
  const mesh = new THREE.Mesh(geometry, material) as unknown as AssemblyPart;
  mesh.position.set(target.x, target.y, target.z);
  mesh.userData = { targetPos: target, explodePos: explode };
  return mesh;
}

function taggedLight(light: THREE.Light, target: Vec3, explode: Vec3): AssemblyPart {
  const tagged = light as unknown as AssemblyPart;
  tagged.position.set(target.x, target.y, target.z);
  tagged.userData = { targetPos: target, explodePos: explode };
  return tagged;
}

export interface WmaMaterials {
  body: THREE.MeshPhysicalMaterial;
  recess: THREE.MeshStandardMaterial;
  led: THREE.MeshStandardMaterial;
  acrylic: THREE.MeshPhysicalMaterial;
  pin: THREE.MeshStandardMaterial;
  wheelTire: THREE.MeshStandardMaterial;
  wheelHub: THREE.MeshStandardMaterial;
}

export function createWmaMaterials(): WmaMaterials {
  return {
    body: new THREE.MeshPhysicalMaterial({
      color: 0xfbfbfc,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.15,
    }),
    recess: new THREE.MeshStandardMaterial({
      color: 0x121212,
      roughness: 0.65,
      metalness: 0.08,
    }),
    led: new THREE.MeshStandardMaterial({
      color: 0xffe3bd,
      emissive: 0xffab5e,
      emissiveIntensity: 2.4,
      roughness: 0.4,
      toneMapped: false,
    }),
    acrylic: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.06,
      transmission: 0.82,
      thickness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.2,
    }),
    pin: new THREE.MeshStandardMaterial({
      color: 0xcdd1d5,
      roughness: 0.22,
      metalness: 1,
    }),
    wheelTire: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.85 }),
    wheelHub: new THREE.MeshStandardMaterial({ color: 0xb7bbc0, roughness: 0.3, metalness: 0.9 }),
  };
}

export function disposeWmaMaterials(materials: WmaMaterials): void {
  Object.values(materials).forEach((mat) => mat.dispose());
}

let wmaLogoTexture: THREE.CanvasTexture | null = null;

export function getWmaLogoTexture(): THREE.CanvasTexture {
  if (wmaLogoTexture) return wmaLogoTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable for WMA logo texture");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#161616";
  ctx.font = "700 132px 'Inter', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("WMA", canvas.width / 2, canvas.height / 2 - 4);

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 96, canvas.height / 2 + 56);
  ctx.lineTo(canvas.width / 2 + 96, canvas.height / 2 + 56);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  wmaLogoTexture = texture;
  return texture;
}

export function disposeWmaLogoTexture(): void {
  wmaLogoTexture?.dispose();
  wmaLogoTexture = null;
}

interface SignatureRecessConfig {
  origin: Vec3;
  explodeOrigin: Vec3;
  width: number;
  height: number;
  depth: number;
  materials: WmaMaterials;
  explodeScale?: number;
}

function buildSignatureRecess(config: SignatureRecessConfig): AssemblyPart[] {
  const { origin, explodeOrigin, width, height, depth, materials } = config;
  const explodeScale = config.explodeScale ?? 1;
  const parts: AssemblyPart[] = [];

  const frontZ = origin.z + 0.06;
  const backZ = frontZ - depth;
  const backExplodeZ = explodeOrigin.z - depth * explodeScale;

  const backWall = part(
    new THREE.BoxGeometry(width, height, 0.03),
    materials.recess,
    { x: origin.x, y: origin.y, z: backZ },
    { x: explodeOrigin.x, y: explodeOrigin.y, z: backExplodeZ }
  );
  backWall.renderOrder = 20;
  parts.push(backWall);

  const stripThickness = 0.035;
  const inset = 0.05;
  const strips = [
    { w: width - inset * 2, h: stripThickness, x: 0, y: height / 2 - inset },
    { w: width - inset * 2, h: stripThickness, x: 0, y: -(height / 2 - inset) },
    { w: stripThickness, h: height - inset * 2, x: -(width / 2 - inset), y: 0 },
    { w: stripThickness, h: height - inset * 2, x: width / 2 - inset, y: 0 },
  ];
  strips.forEach((s, i) => {
    const strip = part(
      new THREE.BoxGeometry(s.w, s.h, 0.02),
      materials.led,
      { x: origin.x + s.x, y: origin.y + s.y, z: backZ + 0.025 },
      { x: explodeOrigin.x + s.x * 1.6, y: explodeOrigin.y + s.y * 1.6, z: backExplodeZ + 0.4 + i * 0.05 }
    );
    strip.renderOrder = 21;
    parts.push(strip);
  });

  const led = new THREE.RectAreaLight(0xffb15e, 12, width * 0.85, height * 0.85);
  led.position.set(origin.x, origin.y, backZ + 0.08);
  led.lookAt(origin.x, origin.y, frontZ + 1);
  parts.push(
    taggedLight(
      led,
      { x: origin.x, y: origin.y, z: backZ + 0.08 },
      { x: explodeOrigin.x, y: explodeOrigin.y, z: backExplodeZ + 0.3 }
    )
  );

  const acrylicW = width * 0.6;
  const acrylicH = height * 0.6;
  const acrylicZ = frontZ - depth * 0.32;
  const acrylic = part(
    new THREE.BoxGeometry(acrylicW, acrylicH, 0.025),
    materials.acrylic,
    { x: origin.x, y: origin.y, z: acrylicZ },
    { x: explodeOrigin.x, y: explodeOrigin.y, z: explodeOrigin.z + 1.7 * explodeScale }
  );
  acrylic.renderOrder = 22;
  parts.push(acrylic);

  const pinRadius = 0.018;
  const pinLength = Math.max(depth * 0.6, 0.08);
  const pinInsetX = acrylicW / 2 - 0.07;
  const pinInsetY = acrylicH / 2 - 0.07;
  const pinCorners = [
    { x: -pinInsetX, y: pinInsetY },
    { x: pinInsetX, y: pinInsetY },
    { x: -pinInsetX, y: -pinInsetY },
    { x: pinInsetX, y: -pinInsetY },
  ];
  pinCorners.forEach((p, i) => {
    const pinGeo = new THREE.CylinderGeometry(pinRadius, pinRadius, pinLength, 10);
    pinGeo.rotateX(Math.PI / 2);
    const pin = part(
      pinGeo,
      materials.pin,
      { x: origin.x + p.x, y: origin.y + p.y, z: acrylicZ - pinLength / 2 },
      { x: explodeOrigin.x + p.x * 1.3, y: explodeOrigin.y + p.y * 1.3, z: explodeOrigin.z + 1.2 * explodeScale + i * 0.05 }
    );
    pin.renderOrder = 22;
    parts.push(pin);
  });

  const logoW = acrylicW * 0.74;
  const logoH = logoW * 0.5;
  const logoPlane = part(
    new THREE.PlaneGeometry(logoW, logoH),
    new THREE.MeshBasicMaterial({ map: getWmaLogoTexture(), transparent: true, toneMapped: false }),
    { x: origin.x, y: origin.y, z: acrylicZ + 0.015 },
    { x: explodeOrigin.x, y: explodeOrigin.y, z: explodeOrigin.z + 2.0 * explodeScale }
  );
  logoPlane.renderOrder = 23;
  parts.push(logoPlane);

  return parts;
}

export function buildKiosk(materials: WmaMaterials): THREE.Group {
  const group = new THREE.Group();
  const parts: AssemblyPart[] = [];

  const bodyW = 2.4;
  const bodyH = 1.2;
  const bodyD = 1.1;
  const bodyCenterY = 0;

  const bodyMesh = part(new THREE.BoxGeometry(bodyW, bodyH, bodyD), materials.body, { x: 0, y: bodyCenterY, z: 0 }, { x: 0, y: -4, z: 0 });
  bodyMesh.renderOrder = 1;
  parts.push(bodyMesh);

  const topSlab = part(
    new THREE.BoxGeometry(bodyW + 0.18, 0.14, bodyD + 0.14),
    materials.body,
    { x: 0, y: bodyCenterY + bodyH / 2 + 0.07, z: 0 },
    { x: 0, y: 4.2, z: 0 }
  );
  topSlab.renderOrder = 1;
  parts.push(topSlab);

  parts.push(
    ...buildSignatureRecess({
      origin: { x: 0, y: bodyCenterY + 0.05, z: bodyD / 2 },
      explodeOrigin: { x: 0, y: bodyCenterY + 0.05, z: 5 },
      width: 1.4,
      height: 0.75,
      depth: 0.12,
      materials,
    })
  );

  const wheelRadius = 0.1;
  const wheelY = bodyCenterY - bodyH / 2 - wheelRadius;
  const wheelCorners = [
    { x: -bodyW / 2 + 0.3, z: -bodyD / 2 + 0.2 },
    { x: bodyW / 2 - 0.3, z: -bodyD / 2 + 0.2 },
    { x: -bodyW / 2 + 0.3, z: bodyD / 2 - 0.2 },
    { x: bodyW / 2 - 0.3, z: bodyD / 2 - 0.2 },
  ];
  wheelCorners.forEach((c, i) => {
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.06, 20);
    tireGeo.rotateZ(Math.PI / 2);
    parts.push(part(tireGeo, materials.wheelTire, { x: c.x, y: wheelY, z: c.z }, { x: c.x * 2.4, y: -4.5 - i * 0.1, z: c.z * 2.4 }));

    const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.35, wheelRadius * 0.35, 0.07, 14);
    hubGeo.rotateZ(Math.PI / 2);
    parts.push(part(hubGeo, materials.wheelHub, { x: c.x, y: wheelY, z: c.z }, { x: c.x * 2.4, y: -4.7 - i * 0.1, z: c.z * 2.4 }));
  });

  group.add(...parts);
  return group;
}

export function buildTable(materials: WmaMaterials): THREE.Group {
  const group = new THREE.Group();
  const parts: AssemblyPart[] = [];

  const topW = 2.6;
  const topD = 1.5;
  const totalHeight = 1.25; 
  const tableCenterY = -0.05; 
  const topY = tableCenterY + totalHeight / 2 - 0.07;

  parts.push(part(new THREE.BoxGeometry(topW, 0.14, topD), materials.body, { x: 0, y: topY, z: 0 }, { x: 0, y: 3.4, z: 0 }));

  const skirtH = 0.38;
  const skirtD = 0.12;
  const skirtY = topY - 0.07 - skirtH / 2;

  parts.push(part(new THREE.BoxGeometry(topW - 0.3, skirtH, skirtD), materials.body, { x: 0, y: skirtY, z: topD / 2 - skirtD / 2 }, { x: 0, y: skirtY, z: 3.6 }));
  parts.push(part(new THREE.BoxGeometry(topW - 0.3, skirtH, skirtD), materials.body, { x: 0, y: skirtY, z: -(topD / 2 - skirtD / 2) }, { x: 0, y: skirtY, z: -3.6 }));
  parts.push(part(new THREE.BoxGeometry(skirtD, skirtH, topD - 0.3), materials.body, { x: -(topW / 2 - skirtD / 2), y: skirtY, z: 0 }, { x: -3.6, y: skirtY, z: 0 }));
  parts.push(part(new THREE.BoxGeometry(skirtD, skirtH, topD - 0.3), materials.body, { x: topW / 2 - skirtD / 2, y: skirtY, z: 0 }, { x: 3.6, y: skirtY, z: 0 }));

  const legH = 0.73;
  const legY = skirtY - skirtH / 2 - legH / 2;
  const legCorners = [
    { x: -1.1, z: -0.6, ex: -3.0, ez: -2.0 },
    { x: 1.1, z: -0.6, ex: 3.0, ez: -2.0 },
    { x: -1.1, z: 0.6, ex: -3.0, ez: 2.0 },
    { x: 1.1, z: 0.6, ex: 3.0, ez: 2.0 },
  ];
  legCorners.forEach((c) => {
    const legGeo = new THREE.CylinderGeometry(0.04, 0.06, legH, 12);
    parts.push(part(legGeo, materials.body, { x: c.x, y: legY, z: c.z }, { x: c.ex, y: -2.6, z: c.ez }));
  });

  parts.push(
    ...buildSignatureRecess({
      origin: { x: 0, y: skirtY, z: topD / 2 },
      explodeOrigin: { x: 0, y: skirtY, z: 5.4 },
      width: topW - 0.8,
      height: skirtH - 0.08,
      depth: 0.08,
      materials,
      explodeScale: 0.6,
    })
  );

  group.add(...parts);
  return group;
}

export function buildCabinet(materials: WmaMaterials): THREE.Group {
  const group = new THREE.Group();
  const parts: AssemblyPart[] = [];

  const bodyW = 2.4;
  const bodyH = 1.4;
  const bodyD = 1.1;
  const bodyCenterY = 0;

  parts.push(part(new THREE.BoxGeometry(bodyW, bodyH, bodyD), materials.body, { x: 0, y: bodyCenterY, z: 0 }, { x: 0, y: 0, z: -4.2 }));

  parts.push(
    part(
      new THREE.BoxGeometry(bodyW + 0.16, 0.12, bodyD + 0.12),
      materials.body,
      { x: 0, y: bodyCenterY + bodyH / 2 + 0.06, z: 0 },
      { x: 0, y: 4.4, z: 0 }
    )
  );

  parts.push(
    part(
      new THREE.BoxGeometry(bodyW - 0.2, 0.14, bodyD - 0.1),
      materials.recess,
      { x: 0, y: bodyCenterY - bodyH / 2 - 0.07, z: 0 },
      { x: 0, y: -4.6, z: 0 }
    )
  );

  const doorW = bodyW / 2 - 0.06;
  const doorH = 0.85;
  const doorD = 0.05;
  const doorY = bodyCenterY - 0.1;

  parts.push(
    part(
      new THREE.BoxGeometry(doorW, doorH, doorD),
      materials.body,
      { x: -doorW / 2 - 0.02, y: doorY, z: bodyD / 2 + doorD / 2 },
      { x: -3.6, y: doorY, z: 1.4 }
    )
  );
  parts.push(
    part(
      new THREE.BoxGeometry(doorW, doorH, doorD),
      materials.body,
      { x: doorW / 2 + 0.02, y: doorY, z: bodyD / 2 + doorD / 2 },
      { x: 3.6, y: doorY, z: 1.4 }
    )
  );

  parts.push(
    part(
      new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8),
      materials.pin,
      { x: -0.06, y: doorY, z: bodyD / 2 + doorD + 0.05 },
      { x: -3.9, y: doorY, z: 1.8 }
    )
  );
  parts.push(
    part(
      new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8),
      materials.pin,
      { x: 0.06, y: doorY, z: bodyD / 2 + doorD + 0.05 },
      { x: 3.9, y: doorY, z: 1.8 }
    )
  );

  const headerY = bodyCenterY + bodyH / 2 - 0.3;
  parts.push(
    ...buildSignatureRecess({
      origin: { x: 0, y: headerY, z: bodyD / 2 },
      explodeOrigin: { x: 0, y: headerY, z: 5 },
      width: bodyW - 0.5,
      height: 0.42,
      depth: 0.1,
      materials,
      explodeScale: 0.8,
    })
  );

  group.add(...parts);
  return group;
}

export function disposeWmaGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
    }
  });
}