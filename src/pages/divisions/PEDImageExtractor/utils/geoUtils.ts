/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CoordinateSystemType, GeoSettings, OutputGeoSettings, ModelDimensions, ViewAlignment, CustomTMSettings } from '../types';

export interface Ellipsoid {
  a: number; // semi-major axis (meters)
  f: number; // flattening
}

// Coordinate constants
export const WGS84_ELLIPSOID: Ellipsoid = {
  a: 6378137.0,
  f: 1.0 / 298.257223563,
};

export const CLARKE_1880_ELLIPSOID: Ellipsoid = {
  a: 6378249.145,
  f: 1.0 / 293.466307656, // Accurate Clarke 1880 (Arc) / Uganda Modified ellipsoid used in Arc 1960
};

/**
 * Converts Geodetic coordinates (lat, lon, height) to geocentric Cartesian XYZ coordinates
 */
export function geodeticToCartesian(
  latDeg: number,
  lonDeg: number,
  h: number,
  a: number,
  eSq: number
): { X: number; Y: number; Z: number } {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  
  const N = a / Math.sqrt(1 - eSq * sinLat * sinLat);
  
  const X = (N + h) * cosLat * Math.cos(lon);
  const Y = (N + h) * cosLat * Math.sin(lon);
  const Z = (N * (1 - eSq) + h) * sinLat;
  
  return { X, Y, Z };
}

/**
 * Converts geocentric Cartesian XYZ coordinates to Geodetic coordinates (lat, lon, height)
 * using Bowring's method (sub-millimeter precision).
 */
export function cartesianToGeodetic(
  X: number,
  Y: number,
  Z: number,
  a: number,
  f: number
): { latDeg: number; lonDeg: number; h: number } {
  const b = a * (1.0 - f);
  const eSq = (a * a - b * b) / (a * a);
  const ePrimeSq = (a * a - b * b) / (b * b);
  
  const p = Math.sqrt(X * X + Y * Y);
  
  // Handle poles
  if (p < 1e-10) {
    const latVal = Z > 0 ? 90.0 : -90.0;
    return { latDeg: latVal, lonDeg: 0.0, h: Math.abs(Z) - b };
  }
  
  const theta = Math.atan2(Z * a, p * b);
  
  const lat = Math.atan2(
    Z + ePrimeSq * b * Math.pow(Math.sin(theta), 3),
    p - eSq * a * Math.pow(Math.cos(theta), 3)
  );
  
  const lon = Math.atan2(Y, X);
  const N = a / Math.sqrt(1.0 - eSq * Math.sin(lat) * Math.sin(lat));
  const h = p / Math.cos(lat) - N;
  
  return {
    latDeg: (lat * 180.0) / Math.PI,
    lonDeg: (lon * 180.0) / Math.PI,
    h,
  };
}

/**
 * Applies a 3-parameter geocentric shift (Molodensky/Translation translation)
 * between WGS 84 and Arc 1960.
 * Default translation is based on EPSG:1546 (for Uganda region):
 * Arc 1960 to WGS 84 is dX = -143.0, dY = -90.0, dZ = -294.0
 */
export function datumShift(
  latDeg: number,
  lonDeg: number,
  h: number,
  toArc1960: boolean
): { latDeg: number; lonDeg: number; h: number } {
  // Translate parameters (WGS84 -> Arc 1960: invert signs of Arc1960 -> WGS84)
  const dX = toArc1960 ? 143.0 : -143.0;
  const dY = toArc1960 ? 90.0 : -90.0;
  const dZ = toArc1960 ? 294.0 : -294.0;

  const srcEllipsoid = toArc1960 ? WGS84_ELLIPSOID : CLARKE_1880_ELLIPSOID;
  const dstEllipsoid = toArc1960 ? CLARKE_1880_ELLIPSOID : WGS84_ELLIPSOID;

  const srcESq = 2 * srcEllipsoid.f - srcEllipsoid.f * srcEllipsoid.f;

  const cart = geodeticToCartesian(latDeg, lonDeg, h, srcEllipsoid.a, srcESq);
  
  const X_new = cart.X + dX;
  const Y_new = cart.Y + dY;
  const Z_new = cart.Z + dZ;

  return cartesianToGeodetic(X_new, Y_new, Z_new, dstEllipsoid.a, dstEllipsoid.f);
}

/**
 * Transverse Mercator Forward Projection (Lat/Lon to Easting/Northing)
 */
export function latLonToTM(
  latDeg: number,
  lonDeg: number,
  latOriginDeg: number,
  lonCentralDeg: number,
  k0: number,
  falseEasting: number,
  falseNorthing: number,
  ellipsoid: Ellipsoid
): { easting: number; northing: number } {
  const { a, f } = ellipsoid;
  const eSq = 2 * f - f * f;
  
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const lat_org = (latOriginDeg * Math.PI) / 180;
  const lon_org = (lonCentralDeg * Math.PI) / 180;
  
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);
  
  const N = a / Math.sqrt(1 - eSq * sinLat * sinLat);
  const T = tanLat * tanLat;
  const ePrimeSq = eSq / (1 - eSq);
  const C = ePrimeSq * cosLat * cosLat;
  const A = (lon - lon_org) * cosLat;
  
  // Meridional distance function M (precise power-series)
  const calcM = (phi: number) => {
    return a * (
      (1 - eSq / 4 - 3 * eSq * eSq / 64 - 5 * Math.pow(eSq, 3) / 256) * phi -
      (3 * eSq / 8 + 3 * eSq * eSq / 32 + 45 * Math.pow(eSq, 3) / 1024) * Math.sin(2 * phi) +
      (15 * eSq * eSq / 256 + 45 * Math.pow(eSq, 3) / 1024) * Math.sin(4 * phi) -
      (35 * Math.pow(eSq, 3) / 3072) * Math.sin(6 * phi)
    );
  };
  
  const M = calcM(lat);
  const M0 = calcM(lat_org);
  
  const easting = k0 * N * (
    A +
    (1 - T + C) * Math.pow(A, 3) / 6 +
    (5 - 18 * T + T * T + 72 * C - 58 * ePrimeSq) * Math.pow(A, 5) / 120
  ) + falseEasting;
  
  const northing = k0 * (
    M - M0 +
    N * tanLat * (
      A * A / 2 +
      (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * ePrimeSq) * Math.pow(A, 6) / 720
    )
  ) + falseNorthing;
  
  return { easting, northing };
}

/**
 * Transverse Mercator Inverse Projection (Easting/Northing to Lat/Lon)
 */
export function tmToLatLon(
  easting: number,
  northing: number,
  latOriginDeg: number,
  lonCentralDeg: number,
  k0: number,
  falseEasting: number,
  falseNorthing: number,
  ellipsoid: Ellipsoid
): { latDeg: number; lonDeg: number } {
  const { a, f } = ellipsoid;
  const eSq = 2 * f - f * f;
  const ePrimeSq = eSq / (1 - eSq);
  
  const x = easting - falseEasting;
  const y = northing - falseNorthing;
  
  const lat_org = (latOriginDeg * Math.PI) / 180;
  
  // Calculate Meridional distance at latitude of origin
  const calcM = (phi: number) => {
    return a * (
      (1 - eSq / 4 - 3 * eSq * eSq / 64 - 5 * Math.pow(eSq, 3) / 256) * phi -
      (3 * eSq / 8 + 3 * eSq * eSq / 32 + 45 * Math.pow(eSq, 3) / 1024) * Math.sin(2 * phi) +
      (15 * eSq * eSq / 256 + 45 * Math.pow(eSq, 3) / 1024) * Math.sin(4 * phi) -
      (35 * Math.pow(eSq, 3) / 3072) * Math.sin(6 * phi)
    );
  };
  
  const M0 = calcM(lat_org);
  const M = M0 + y / k0;
  
  // Footprint latitude phi1 calculation
  const mu = M / (a * (1 - eSq / 4 - 3 * eSq * eSq / 64 - 5 * Math.pow(eSq, 3) / 256));
  const e1 = (1 - Math.sqrt(1 - eSq)) / (1 + Math.sqrt(1 - eSq));
  
  const phi1 = mu +
    (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
    (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
    (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) +
    (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);
  
  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);
  
  const N1 = a / Math.sqrt(1 - eSq * sinPhi1 * sinPhi1);
  const R1 = a * (1 - eSq) / Math.pow(1 - eSq * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);
  
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ePrimeSq * cosPhi1 * cosPhi1;
  
  const lat = phi1 - (N1 * tanPhi1 / R1) * (
    D * D / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrimeSq) * Math.pow(D, 4) / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrimeSq - 3 * C1 * C1) * Math.pow(D, 6) / 720
  );
  
  const lon = (lonCentralDeg * Math.PI) / 180 + (
    D -
    (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrimeSq + 24 * T1 * T1) * Math.pow(D, 5) / 120
  ) / cosPhi1;
  
  return {
    latDeg: (lat * 180.0) / Math.PI,
    lonDeg: (lon * 180.0) / Math.PI,
  };
}

export function isWGS84Datum(datumName: string | undefined): boolean {
  if (!datumName) return true; // Default
  const clean = datumName.toUpperCase().replace(/_/g, ' ');
  return clean.includes('WGS 84') || clean.includes('WGS84') || clean.includes('WGS 1984') || clean.includes('WGS1984') || clean.includes('WORLD GEODETIC SYSTEM 1984');
}

export function isArc1960Datum(datumName: string | undefined): boolean {
  if (!datumName) return false;
  const clean = datumName.toUpperCase().replace(/_/g, ' ');
  return clean.includes('ARC 1960') || clean.includes('ARC1960') || clean.includes('CLARKE 1880_MODIFIED');
}

/**
 * Unified Coordinate Conversion Engine
 */
export function convertCoordinates(

  inputX: number,
  inputY: number,
  fromSys: CoordinateSystemType,
  toSys: CoordinateSystemType,
  fromSettings: {
    utmZone?: number;
    utmHemisphere?: 'N' | 'S';
    customTM?: CustomTMSettings;
    originX?: number;
    originY?: number;
  },
  toSettings?: {
    utmZone?: number;
    utmHemisphere?: 'N' | 'S';
    customTM?: CustomTMSettings;
    originX?: number;
    originY?: number;
  }
): { x: number; y: number; message?: string } {
  const targetSettings = toSettings || fromSettings;

  // Cast input parameters to numbers to prevent string contamination from HTML inputs
  const numX = typeof inputX === 'number' ? inputX : parseFloat(inputX as any) || 0;
  const numY = typeof inputY === 'number' ? inputY : parseFloat(inputY as any) || 0;

  // Parse origin variables from settings as numbers
  const fromOriginX = fromSettings.originX !== undefined ? (typeof fromSettings.originX === 'number' ? fromSettings.originX : parseFloat(fromSettings.originX as any) || 0.0) : 0.0;
  const fromOriginY = fromSettings.originY !== undefined ? (typeof fromSettings.originY === 'number' ? fromSettings.originY : parseFloat(fromSettings.originY as any) || 0.0) : 0.0;

  const targetOriginX = targetSettings.originX !== undefined ? (typeof targetSettings.originX === 'number' ? targetSettings.originX : parseFloat(targetSettings.originX as any) || 0.0) : 0.0;
  const targetOriginY = targetSettings.originY !== undefined ? (typeof targetSettings.originY === 'number' ? targetSettings.originY : parseFloat(targetSettings.originY as any) || 0.0) : 0.0;

  let isExactlySame = fromSys === toSys;
  if (isExactlySame) {
    if (fromSys === 'WGS84_UTM' || fromSys === 'ARC1960_UTM') {
      const z1 = fromSettings.utmZone ?? 36;
      const h1 = fromSettings.utmHemisphere ?? 'N';
      const z2 = targetSettings.utmZone ?? 36;
      const h2 = targetSettings.utmHemisphere ?? 'N';
      if (z1 !== z2 || h1 !== h2) {
        isExactlySame = false;
      }
    } else if (fromSys === 'CUSTOM_TM') {
      const tm1 = fromSettings.customTM;
      const tm2 = targetSettings.customTM;
      if (!tm1 || !tm2) {
        isExactlySame = false;
      } else if (
        tm1.centralMeridian !== tm2.centralMeridian ||
        tm1.latitudeOfOrigin !== tm2.latitudeOfOrigin ||
        tm1.scaleFactor !== tm2.scaleFactor ||
        tm1.falseEasting !== tm2.falseEasting ||
        tm1.falseNorthing !== tm2.falseNorthing ||
        tm1.datumName !== tm2.datumName
      ) {
        isExactlySame = false;
      }
    } else if (fromSys === 'CUSTOM_METERS') {
      if (fromOriginX !== targetOriginX || fromOriginY !== targetOriginY) {
        isExactlySame = false;
      }
    }
  }

  if (isExactlySame) {
    return { x: numX, y: numY };
  }

  // Phase 1: Convert input coordinates to standard WGS84 Geodetic Decimal Degrees (Lon, Lat)
  let wgsLat = 0.0;
  let wgsLon = 0.0;

  if (fromSys === 'WGS84') {
    wgsLon = numX;
    wgsLat = numY;
  } else if (fromSys === 'WGS84_UTM') {
    const zone = fromSettings.utmZone || 36;
    const hem = fromSettings.utmHemisphere || 'N';
    const cm = zone * 6 - 183;
    const falseNorthing = hem === 'S' ? 10000000.0 : 0.0;
    const gp = tmToLatLon(numX, numY, 0, cm, 0.9996, 500000.0, falseNorthing, WGS84_ELLIPSOID);
    wgsLat = gp.latDeg;
    wgsLon = gp.lonDeg;
  } else if (fromSys === 'ARC1960_UTM') {
    const zone = fromSettings.utmZone || 36;
    const hem = fromSettings.utmHemisphere || 'N';
    const cm = zone * 6 - 183;
    const falseNorthing = hem === 'S' ? 10000000.0 : 0.0;
    
    // 1. Inverse TM to Arc 1960 Geodetic Coords
    const arcGp = tmToLatLon(numX, numY, 0, cm, 0.9996, 500000.0, falseNorthing, CLARKE_1880_ELLIPSOID);
    
    // 2. Datum shift Arc 1960 -> WGS84
    const shift = datumShift(arcGp.latDeg, arcGp.lonDeg, 0.0, false);
    wgsLat = shift.latDeg;
    wgsLon = shift.lonDeg;
  } else if (fromSys === 'CUSTOM_TM') {
    const tm = fromSettings.customTM || {
      centralMeridian: 33.0,
      latitudeOfOrigin: 0.0,
      scaleFactor: 0.9996,
      falseEasting: 500000.0,
      falseNorthing: 0.0,
      datumName: 'WGS 84'
    };
    const ellipsoid = isWGS84Datum(tm.datumName) ? WGS84_ELLIPSOID : CLARKE_1880_ELLIPSOID;
    
    const gp = tmToLatLon(numX, numY, tm.latitudeOfOrigin, tm.centralMeridian, tm.scaleFactor, tm.falseEasting, tm.falseNorthing, ellipsoid);
    if (!isWGS84Datum(tm.datumName)) {
      const shift = datumShift(gp.latDeg, gp.lonDeg, 0.0, false);
      wgsLat = shift.latDeg;
      wgsLon = shift.lonDeg;
    } else {
      wgsLat = gp.latDeg;
      wgsLon = gp.lonDeg;
    }
  } else if (fromSys === 'WEB_MERCATOR') {
    const x = numX;
    const y = numY;
    const rMajor = 6378137.0;
    const lon = (x / rMajor) * (180.0 / Math.PI);
    let lat = (y / rMajor) * (180.0 / Math.PI);
    lat = (180.0 / Math.PI) * (2.0 * Math.atan(Math.exp((lat * Math.PI) / 180.0)) - Math.PI / 2.0);
    wgsLon = lon;
    wgsLat = lat;
  } else if (fromSys === 'CUSTOM_METERS') {
    // CUSTOM_METERS (relativized coordinates)
    const degLatLen = 111319.9;
    const originYVal = fromOriginY;
    const originXVal = fromOriginX;
    const latRad = (originYVal * Math.PI) / 180;
    const degLngLen = 111319.9 * Math.cos(latRad);
    
    wgsLon = originXVal + numX / degLngLen;
    wgsLat = originYVal + numY / degLatLen;
  } else {
    // Fallback: input is already in decimal degrees (WGS84)
    wgsLon = numX;
    wgsLat = numY;
  }

  // Phase 2: Convert standard WGS84 Geodetic Coordinates (Lon, Lat) to target 'toSys'
  if (toSys === 'WGS84') {
    return { x: wgsLon, y: wgsLat };
  } else if (toSys === 'WGS84_UTM') {
    const zone = targetSettings.utmZone || 36;
    const hem = targetSettings.utmHemisphere || 'N';
    const cm = zone * 6 - 183;
    const falseNorthing = hem === 'S' ? 10000000.0 : 0.0;
    const tmResult = latLonToTM(wgsLat, wgsLon, 0, cm, 0.9996, 500000.0, falseNorthing, WGS84_ELLIPSOID);
    return { x: tmResult.easting, y: tmResult.northing };
  } else if (toSys === 'ARC1960_UTM') {
    const zone = targetSettings.utmZone || 36;
    const hem = targetSettings.utmHemisphere || 'N';
    const cm = zone * 6 - 183;
    const falseNorthing = hem === 'S' ? 10000000.0 : 0.0;
    
    // 1. Datum shift WGS84 -> Arc 1960
    const shift = datumShift(wgsLat, wgsLon, 0.0, true);
    
    // 2. TM Forward Projection
    const tmResult = latLonToTM(shift.latDeg, shift.lonDeg, 0, cm, 0.9996, 500000.0, falseNorthing, CLARKE_1880_ELLIPSOID);
    return { x: tmResult.easting, y: tmResult.northing };
  } else if (toSys === 'CUSTOM_TM') {
    const tm = targetSettings.customTM || {
      centralMeridian: 33.0,
      latitudeOfOrigin: 0.0,
      scaleFactor: 0.9996,
      falseEasting: 500000.0,
      falseNorthing: 0.0,
      datumName: 'WGS 84'
    };
    const ellipsoid = isWGS84Datum(tm.datumName) ? WGS84_ELLIPSOID : CLARKE_1880_ELLIPSOID;
    
    let latTarget = wgsLat;
    let lonTarget = wgsLon;
    
    if (!isWGS84Datum(tm.datumName)) {
      const shift = datumShift(wgsLat, wgsLon, 0.0, true);
      latTarget = shift.latDeg;
      lonTarget = shift.lonDeg;
    }
    
    const tmResult = latLonToTM(latTarget, lonTarget, tm.latitudeOfOrigin, tm.centralMeridian, tm.scaleFactor, tm.falseEasting, tm.falseNorthing, ellipsoid);
    return { x: tmResult.easting, y: tmResult.northing };
  } else if (toSys === 'WEB_MERCATOR') {
    const rMajor = 6378137.0;
    const x = rMajor * (wgsLon * Math.PI / 180.0);
    const y = rMajor * Math.log(Math.tan(Math.PI / 4.0 + (wgsLat * Math.PI / 180.0) / 2.0));
    return { x, y };
  } else if (toSys === 'CUSTOM_METERS') {
    // CUSTOM_METERS (planar delta in meters relative to originX, originY of targetSettings)
    const degLatLen = 111319.9;
    const originYVal = targetOriginY;
    const originXVal = targetOriginX;
    const latRad = (originYVal * Math.PI) / 180;
    const degLngLen = 111319.9 * Math.cos(latRad);
    
    const dx = (wgsLon - originXVal) * degLngLen;
    const dy = (wgsLat - originYVal) * degLatLen;
    return { x: dx, y: dy };
  } else {
    // Ultimate fallback back-up
    return { x: wgsLon, y: wgsLat };
  }
}

/**
 * Calculates the bounding box in map units and generates the world file content (.pgw)
 * along with the georeference boundaries.
 */
export function generateGeoreference(
  dimensions: ModelDimensions,
  geoSettings: GeoSettings,
  outputGeoSettings: OutputGeoSettings,
  imageWidth: number,
  imageHeight: number,
  alignment: ViewAlignment,
  paddingRatio: number = 0.05,
  modelCenter?: { x: number; y: number; z: number },
  rotationAngleRad: number = 0
): {
  worldFileContent: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
} {
  // First, convert the input origin coordinates (originX, originY) 
  // from the input coordinateSystem to the output coordinateSystem.
  const convertedOrigin = convertCoordinates(
    geoSettings.originX,
    geoSettings.originY,
    geoSettings.coordinateSystem,
    outputGeoSettings.coordinateSystem,
    geoSettings,
    outputGeoSettings
  );

  const destOriginX = convertedOrigin.x;
  const destOriginY = convertedOrigin.y;
  const coordinateSystem = outputGeoSettings.coordinateSystem;

  // Determine geo-position of map-bounding center depending on alignment anchor setting
  let centerGeoX = destOriginX;
  let centerGeoY = destOriginY;

  if ((geoSettings.alignmentAnchor === 'ORIGIN' || geoSettings.alignmentAnchor === 'CUSTOM') && modelCenter) {
    const scale = geoSettings.scaleFactor || 1.0;
    
    let gltfOffsetX = modelCenter.x;
    let gltfOffsetZ = modelCenter.z;
    
    if (geoSettings.alignmentAnchor === 'CUSTOM') {
      gltfOffsetX = modelCenter.x - (geoSettings.internalOriginX || 0);
      // In a glTF model, Y is up, -Z is forward. The map top-down projection naturally maps glTF Z-axis to map Northing.
      gltfOffsetZ = modelCenter.z - (geoSettings.internalOriginZ || 0);
    }

    if (coordinateSystem === 'WGS84') {
      const offsetX_meters = gltfOffsetX * scale;
      const offsetY_meters = -gltfOffsetZ * scale;
      const degLatLen = 111319.9;
      const latRad = (destOriginY * Math.PI) / 180;
      const degLngLen = 111319.9 * Math.cos(latRad);
      
      centerGeoX = destOriginX + (offsetX_meters / degLngLen);
      centerGeoY = destOriginY + (offsetY_meters / degLatLen);
    } else {
      centerGeoX = destOriginX + gltfOffsetX * scale;
      centerGeoY = destOriginY - gltfOffsetZ * scale;
    }
  }

  // GLTF coordinates correspond to dimensions:
  let dimH = dimensions.width; 
  let dimV = dimensions.depth; 

  if (alignment === 'TOP_DOWN' || alignment === 'BOTTOM_UP') {
    if (rotationAngleRad && alignment === 'TOP_DOWN') {
      const cos = Math.cos(rotationAngleRad);
      const sin = Math.sin(rotationAngleRad);
      
      const rxHalf = dimensions.width / 2;
      const rzHalf = dimensions.depth / 2;
      
      const corners = [
        { x: -rxHalf, z: -rzHalf },
        { x: -rxHalf, z: rzHalf },
        { x: rxHalf, z: -rzHalf },
        { x: rxHalf, z: rzHalf },
      ];
      
      let minLocX = Infinity, maxLocX = -Infinity;
      let minLocY = Infinity, maxLocY = -Infinity;
      
      for (const pt of corners) {
        const lx = pt.x * cos + pt.z * sin;
        const ly = pt.x * sin - pt.z * cos;
        
        if (lx < minLocX) minLocX = lx;
        if (lx > maxLocX) maxLocX = lx;
        if (ly < minLocY) minLocY = ly;
        if (ly > maxLocY) maxLocY = ly;
      }
      
      dimH = maxLocX - minLocX;
      dimV = maxLocY - minLocY;
    } else {
      dimH = dimensions.width;
      dimV = dimensions.depth;
    }
  } else if (alignment === 'NORTH_ELEVATION' || alignment === 'SOUTH_ELEVATION') {
    dimH = dimensions.width;
    dimV = dimensions.height;
  } else if (alignment === 'EAST_ELEVATION' || alignment === 'WEST_ELEVATION') {
    dimH = dimensions.depth;
    dimV = dimensions.height;
  }

  const modelAspect = dimH / dimV;
  const imageAspect = imageWidth / imageHeight;
  const boundingScalar = 1 + paddingRatio;

  let scaledDimH = dimH * boundingScalar;
  let scaledDimV = dimV * boundingScalar;

  if (imageAspect > modelAspect) {
    scaledDimH = (dimV * imageAspect) * boundingScalar;
  } else if (imageAspect < modelAspect) {
    scaledDimV = (dimH / imageAspect) * boundingScalar;
  }

  const physicalWidth = scaledDimH * geoSettings.scaleFactor;
  const physicalHeight = scaledDimV * geoSettings.scaleFactor;

  let minX_map = 0;
  let maxX_map = 0;
  let minY_map = 0;
  let maxY_map = 0;
  let pixelSizeX = 0;
  let pixelSizeY = 0;

  if (coordinateSystem === 'WGS84') {
    // originX/Y are in decimal degrees
    const degLatLen = 111319.9;
    const latRad = (centerGeoY * Math.PI) / 180;
    const degLngLen = 111319.9 * Math.cos(latRad);

    const widthInDegrees = physicalWidth / degLngLen;
    const heightInDegrees = physicalHeight / degLatLen;

    minX_map = centerGeoX - widthInDegrees / 2;
    maxX_map = centerGeoX + widthInDegrees / 2;
    minY_map = centerGeoY - heightInDegrees / 2;
    maxY_map = centerGeoY + heightInDegrees / 2;

    pixelSizeX = widthInDegrees / imageWidth;
    pixelSizeY = - (heightInDegrees / imageHeight);
  } else {
    // Projected / Metric Grid systems (WGS84_UTM, ARC1960_UTM, CUSTOM_TM, WEB_MERCATOR, CUSTOM_METERS)
    // Here, originX and originY are in meters
    minX_map = centerGeoX - physicalWidth / 2;
    maxX_map = centerGeoX + physicalWidth / 2;
    minY_map = centerGeoY - physicalHeight / 2;
    maxY_map = centerGeoY + physicalHeight / 2;

    pixelSizeX = physicalWidth / imageWidth;
    pixelSizeY = - (physicalHeight / imageHeight);
  }

  const ulPixelCenterX = minX_map + pixelSizeX / 2;
  const ulPixelCenterY = maxY_map + pixelSizeY / 2;

  const worldFileLines = [
    pixelSizeX.toFixed(12),
    '0.000000000000',
    '0.000000000000',
    pixelSizeY.toFixed(12),
    ulPixelCenterX.toFixed(12),
    ulPixelCenterY.toFixed(12)
  ];

  return {
    worldFileContent: worldFileLines.join('\n') + '\n',
    bounds: {
      minX: minX_map,
      maxX: maxX_map,
      minY: minY_map,
      maxY: maxY_map,
    }
  };
}

/**
 * Validates coordinate inputs
 */
export function validateCoordinate(val: string, type: CoordinateSystemType, axis: 'X' | 'Y'): {
  isValid: boolean;
  message?: string;
  parsedValue?: number;
} {
  const num = parseFloat(val);
  if (isNaN(num)) {
    return { isValid: false, message: 'Must be a valid number' };
  }

  if (type === 'WGS84') {
    if (axis === 'X') {
      if (num < -180 || num > 180) {
        return { isValid: false, message: 'Longitude must be between -180 and 180', parsedValue: num };
      }
    } else {
      if (num < -90 || num > 90) {
        return { isValid: false, message: 'Latitude must be between -90 and 90', parsedValue: num };
      }
    }
  } else {
    if (axis === 'X') {
      if (num < -20000000 || num > 20000000) {
        return { isValid: false, message: 'Coordinate out of logical metric bounds (-20M to 20M m)', parsedValue: num };
      }
    } else {
      if (num < -20000000 || num > 20000000) {
        return { isValid: false, message: 'Coordinate out of logical metric bounds (-20M to 20M m)', parsedValue: num };
      }
    }
  }

  return { isValid: true, parsedValue: num };
}

export interface ParsedPRJ {
  filename: string;
  prjName: string;
  coordinateSystem: CoordinateSystemType;
  utmZone?: number;
  utmHemisphere?: 'N' | 'S';
  customTM?: CustomTMSettings;
}

/**
 * Parses WKT projection (.prj) file contents used in Global Mapper & other GIS apps
 */
export function parsePRJ(filename: string, text: string): ParsedPRJ {
  const clean = text.replace(/\s+/g, ' ');
  const cleanUpper = clean.toUpperCase();

  // Extract Projected CS Name or GeoGCS Name
  let prjName = 'Custom Loaded Projection';
  const projcsMatch = clean.match(/PROJCS\s*\[\s*"([^"]+)"/i) || clean.match(/PROJCS\s*\[\s*'([^']+)'/i);
  if (projcsMatch) {
    prjName = projcsMatch[1];
  } else {
    const geogcsMatch = clean.match(/GEOGCS\s*\[\s*"([^"]+)"/i) || clean.match(/GEOGCS\s*\[\s*'([^']+)'/i);
    if (geogcsMatch) {
      prjName = geogcsMatch[1];
    }
  }

  let coordinateSystem: CoordinateSystemType = 'CUSTOM_TM';
  let utmZone: number | undefined;
  let utmHemisphere: 'N' | 'S' | undefined;

  // 1. Is it Web Mercator (EPSG 3857)?
  if (cleanUpper.includes('3857') || cleanUpper.includes('POPULAR VISUALISATION') || cleanUpper.includes('AUXILIARY_SPHERE') || cleanUpper.includes('PSEUDO-MERCATOR')) {
    coordinateSystem = 'WEB_MERCATOR';
  }
  // 2. Is it GCS WGS 84?
  else if (!cleanUpper.includes('PROJCS') && (cleanUpper.includes('WGS 84') || cleanUpper.includes('WGS_1984') || cleanUpper.includes('GCS_WGS_1984'))) {
    coordinateSystem = 'WGS84';
  }
  // 3. Is it UTM Zone?
  else if (cleanUpper.includes('UTM') && (cleanUpper.includes('ZONE') || cleanUpper.includes('_Z'))) {
    // Search for zone number and hemisphere
    const zoneMatch = cleanUpper.match(/ZONE\s*_?(\d+)\s*([NS])?/i) || cleanUpper.match(/_Z(\d+)\s*([NS])?/i) || cleanUpper.match(/ZONE\s*_?(\d+)\s*(NORTH|SOUTH)?/i);
    if (zoneMatch) {
      utmZone = parseInt(zoneMatch[1], 10);
      const hemIndicator = zoneMatch[2];
      if (hemIndicator) {
        if (hemIndicator.startsWith('S') || hemIndicator.startsWith('s')) {
          utmHemisphere = 'S';
        } else {
          utmHemisphere = 'N';
        }
      } else {
        // Fallback: guess hemisphere from standard parameters
        const falseNorthingMatch = cleanUpper.match(/PARAMETER\s*\[\s*["']FALSE_NORTHING["']\s*,\s*([\d.]+)/i);
        if (falseNorthingMatch && parseFloat(falseNorthingMatch[1]) >= 5000000) {
          utmHemisphere = 'S';
        } else {
          utmHemisphere = 'N';
        }
      }
    } else {
      // Direct regex on standard zone lists
      const rawZoneMatch = cleanUpper.match(/(\d+)\s*([NS])/);
      if (rawZoneMatch) {
        utmZone = parseInt(rawZoneMatch[1], 10);
        utmHemisphere = rawZoneMatch[2] === 'S' ? 'S' : 'N';
      }
    }

    if (utmZone === undefined || isNaN(utmZone)) {
      utmZone = 36; // Kampala default
    }
    if (!utmHemisphere) {
      utmHemisphere = 'S';
    }

    // Default to WGS 84 UTM for parsed projection
    coordinateSystem = 'WGS84_UTM';
  }
  // 4. Default to CUSTOM_TM if we have Transverse Mercator parameters
  else if (cleanUpper.includes('TRANSVERSE_MERCATOR') || cleanUpper.includes('TRANSVERSE MERCATOR') || cleanUpper.includes('TM')) {
    coordinateSystem = 'CUSTOM_TM';
  } else if (cleanUpper.includes('MERCATOR')) {
    coordinateSystem = 'WEB_MERCATOR';
  } else {
    // Fallback to custom TM
    coordinateSystem = 'CUSTOM_TM';
  }

  // Extract parameters with robust alias and spacing/underscore resolution
  const getParam = (words: string[], def: number): number => {
    for (const w of words) {
      // Create a pattern where underscores and spaces are interchangeable
      const paramNamePattern = w.replace(/[_\s]+/g, '[_\\s]+');
      const regex = new RegExp(`PARAMETER\\s*\\[\\s*["']${paramNamePattern}["']\\s*,\\s*([-\\d.eE+]+)`, 'i');
      const match = cleanUpper.match(regex);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return def;
  };

  const centralMeridian = getParam(
    ["CENTRAL_MERIDIAN", "CENTRAL MERIDIAN", "LONGITUDE_OF_CENTRAL_MERIDIAN", "LONGITUDE_OF_ORIGIN", "LONGITUDE OF CENTER", "CENTRAL_MERIDIAN_OF_PROJECTION_SPHERE"],
    33.0
  );
  const latitudeOfOrigin = getParam(
    ["LATITUDE_OF_ORIGIN", "LATITUDE OF ORIGIN", "LATITUDE_OF_CENTER", "LATITUDE OF CENTER"],
    0.0
  );
  const scaleFactor = getParam(
    ["SCALE_FACTOR", "SCALE FACTOR", "FACTOR_OF_SCALE", "FACTOR OF SCALE"],
    0.9996
  );
  const falseEasting = getParam(
    ["FALSE_EASTING", "FALSE EASTING"],
    500000.0
  );
  const falseNorthing = getParam(
    ["FALSE_NORTHING", "FALSE NORTHING"],
    0.0
  );

  let datumName = 'WGS 84';
  if (cleanUpper.includes('CLARKE_1880') || cleanUpper.includes('CLARKE 1880')) {
    datumName = 'WGS 84'; // Force WGS 84
  }

  const customTM = {
    centralMeridian,
    latitudeOfOrigin,
    scaleFactor,
    falseEasting,
    falseNorthing,
    datumName,
  };

  return {
    filename,
    prjName,
    coordinateSystem,
    utmZone,
    utmHemisphere,
    customTM,
  };
}

/**
 * Generates PRJ content for GIS georeferencing compatibility
 */
export function generatePRJContent(settings: {
  coordinateSystem: CoordinateSystemType;
  utmZone?: number;
  utmHemisphere?: 'N' | 'S';
  customTM?: CustomTMSettings;
  loadedPrjWkt?: string;
}): string {
  if (settings.loadedPrjWkt) {
    return settings.loadedPrjWkt;
  }

  const system = settings.coordinateSystem;
  
  if (system === 'WGS84') {
    return 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]\n';
  }
  
  if (system === 'WEB_MERCATOR') {
    return 'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]\n';
  }
  
  if (system === 'WGS84_UTM') {
    const zone = settings.utmZone || 36;
    const hem = settings.utmHemisphere || 'N';
    const cm = zone * 6 - 183;
    const falseNorthing = hem === 'S' ? 10000000.0 : 0.0;
    return `PROJCS["WGS_1984_UTM_Zone_${zone}${hem}",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",${falseNorthing.toFixed(1)}],PARAMETER["Central_Meridian",${cm.toFixed(1)}],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]\n`;
  }
  
  if (system === 'ARC1960_UTM') {
    const zone = settings.utmZone || 36;
    const hem = settings.utmHemisphere || 'N';
    const cm = zone * 6 - 183;
    const falseNorthing = hem === 'S' ? 10000000.0 : 0.0;
    return `PROJCS["Arc_1960_UTM_Zone_${zone}${hem}",GEOGCS["GCS_Arc_1960",DATUM["D_Arc_1960",SPHEROID["Clarke_1880_Modified",6378249.145,293.4663077]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",${falseNorthing.toFixed(1)}],PARAMETER["Central_Meridian",${cm.toFixed(1)}],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]\n`;
  }
  
  if (system === 'CUSTOM_TM' && settings.customTM) {
    const tm = settings.customTM;
    const isWgs84 = isWGS84Datum(tm.datumName);
    const isArc1960 = isArc1960Datum(tm.datumName);
    
    const datum = isArc1960 ? 'Arc_1960' : isWgs84 ? 'WGS_1984' : tm.datumName.replace(/\s+/g, '_');
    const spheroid = isArc1960 ? 'Clarke_1880_Modified' : isWgs84 ? 'WGS_1984' : 'Clarke_1880';
    const major = isArc1960 ? '6378249.145' : isWgs84 ? '6378137.0' : '6378249.145';
    const flattening = isArc1960 ? '293.4663077' : isWgs84 ? '298.257223563' : '293.4663077';
    
    return `PROJCS["Custom_Transverse_Mercator",GEOGCS["GCS_${datum}",DATUM["D_${datum}",SPHEROID["${spheroid}",${major},${flattening}]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",${tm.falseEasting.toFixed(1)}],PARAMETER["False_Northing",${tm.falseNorthing.toFixed(1)}],PARAMETER["Central_Meridian",${tm.centralMeridian.toFixed(3)}],PARAMETER["Scale_Factor",${tm.scaleFactor.toFixed(6)}],PARAMETER["Latitude_Of_Origin",${tm.latitudeOfOrigin.toFixed(3)}],UNIT["Meter",1.0]]\n`;
  }

  // CUSTOM_METERS
  return `PROJCS["Custom_Planar_Meters",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]\n`;
}
