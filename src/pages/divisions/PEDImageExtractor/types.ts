/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CoordinateSystemType = 'WGS84' | 'WGS84_UTM' | 'ARC1960_UTM' | 'CUSTOM_TM' | 'WEB_MERCATOR' | 'CUSTOM_METERS';

export interface CoordinateSystem {
  type: CoordinateSystemType;
  name: string;
  unit: 'degrees' | 'meters';
  epsg?: string;
}

export interface CustomTMSettings {
  centralMeridian: number;
  latitudeOfOrigin: number;
  scaleFactor: number; // Scale Factor at Central Meridian (typically 0.9996)
  falseEasting: number; // E.g., 500000
  falseNorthing: number; // E.g., 0 or 10000000
  datumName: string; // E.g. WGS 84, Arc 1960, Clarke 1880
}

export interface GeoSettings {
  coordinateSystem: CoordinateSystemType;
  originX: number; // Longitude for WGS84/UTM input if selected, or Easting (m)
  originY: number; // Latitude for WGS84/UTM input if selected, or Northing (m)
  utmZone?: number; // E.g., 36 for East Africa
  utmHemisphere?: 'N' | 'S';
  customTM?: CustomTMSettings;
  scaleFactor: number; // Model unit in meters (default 1.0)
  autoCenterOrigin: boolean; // Set (0,0,0) of the model as origin
  loadedPrjWkt?: string; // Stored user projection file content (.prj)
  loadedPrjName?: string; // Stored user projection file name (e.g. Uganda_UTM36S.prj)
  alignmentAnchor?: 'CENTER' | 'ORIGIN' | 'CUSTOM';
  internalOriginX?: number; // Custom GLTF X coordinate mapped to the georeference origin
  internalOriginY?: number; // Custom GLTF Y coordinate mapped to the georeference origin
  internalOriginZ?: number; // Custom GLTF Z coordinate mapped to the georeference origin
}

export interface OutputGeoSettings {
  coordinateSystem: CoordinateSystemType;
  utmZone?: number; // E.g., 36 for East Africa
  utmHemisphere?: 'N' | 'S';
  customTM?: CustomTMSettings;
  loadedPrjWkt?: string;
  loadedPrjName?: string;
  alignmentAnchor?: 'CENTER' | 'ORIGIN' | 'CUSTOM';
  internalOriginX?: number;
  internalOriginY?: number;
  internalOriginZ?: number;
}

export type ViewAlignment = 'TOP_DOWN' | 'BOTTOM_UP' | 'NORTH_ELEVATION' | 'EAST_ELEVATION' | 'SOUTH_ELEVATION' | 'WEST_ELEVATION';

export interface ViewSettings {
  alignment: ViewAlignment;
  label: string;
  suffix: string;
  enabled: boolean;
}

export interface RenderingSettings {
  resolutionWidth: number; // e.g., 1024, 2048, 4096
  resolutionHeight: number; // e.g., 1024, 2048, 4096
  transparentBackground: boolean;
  paddingRatio: number; // Margin factor around the model (e.g., 0.05 for 5% margin)
  views: ViewSettings[];
  extractTextures: boolean; // Extract internal textures as raw images
}

export interface ModelDimensions {
  width: number;  // X-axis size in meters
  height: number; // Y-axis size in meters
  depth: number;  // Z-axis size in meters (usually depth or height depending on up-axis)
}

export interface ExtractedTexture {
  id: string;
  name: string;
  width: number;
  height: number;
  format: string;
  blobUrl: string;
  blob: Blob;
  sizeBytes: number;
}

export interface RenderedView {
  alignment: ViewAlignment;
  label: string;
  suffix: string;
  imageUrl: string;
  imageBlob: Blob;
  worldFileContent: string;
  worldFileName: string;
  imageName: string;
  geoBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface GLTFQueueItem {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  status: 'pending' | 'loading' | 'rendering' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  dimensions?: ModelDimensions;
  verticesCount?: number;
  trianglesCount?: number;
  materialCount?: number;
  textures?: ExtractedTexture[];
  renderedViews?: RenderedView[];
  modelCenter?: { x: number; y: number; z: number };
}
