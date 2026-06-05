/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ModelDimensions, ViewAlignment,  } from '../types';


// Helper to calculate statistics and load the GLTF scene
export interface ParsingResult {
  scene: THREE.Group;
  dimensions: ModelDimensions;
  verticesCount: number;
  trianglesCount: number;
  materialCount: number;
  textures: { name: string; canvas: HTMLCanvasElement; format: string }[];
  modelCenter?: { x: number; y: number; z: number };
}

/**
 * Loads a GLTF file from a File, ArrayBuffer or URL and parses its structure for stats and textures
 */
export function loadAndParseGLTF(
  fileOrUrl: File | ArrayBuffer | string,
  onProgress?: (percent: number) => void
 ): Promise<ParsingResult> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    const handleGltf = (gltf: any) => {
      try {
        const scene = gltf.scene;
        if (!scene) {
          throw new Error('GLTF main scene not found in the parsed structures');
        }

        // Preprocess scene to turn off wireframes/wiremesh and grid lines so clean 3D models and clear extracted images are generated
        scene.traverse((child: any) => {
          // 1. Hide line segments, line loops, lines, and points which act as wireframes or overlay grids
          if (child.isLine || child.isLineSegments || child.isLineLoop || child.isPoints) {
            child.visible = false;
          }

          // 2. Hide helper objects, wireframes, and meshes with 'wire', 'grid', 'bbox', 'bounding' in their names
          if (child.isMesh && child.name) {
            const lowerName = child.name.toLowerCase();
            if (
              lowerName.includes('wireframe') ||
              lowerName.includes('wiremesh') ||
              lowerName.includes('grid_helper') ||
              lowerName.includes('gridhelper') ||
              lowerName.includes('boundingbox') ||
              lowerName.includes('bbox')
            ) {
              child.visible = false;
            }
          }

          // 3. Deactivate any material-level wireframe rendering
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat: any) => {
              if (mat && mat.wireframe !== undefined) {
                mat.wireframe = false;
              }
            });
          }
        });
        
        // 1. Calculate bounding box dimensions
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        const dimensions: ModelDimensions = {
          width: size.x || 1.0,
          height: size.y || 1.0,
          depth: size.z || 1.0,
        };

        // 2. Count vertices, triangles, and materials
        let verticesCount = 0;
        let trianglesCount = 0;
        const materialsSet = new Set<THREE.Material>();
        let textureCount = 0;
        const uniqueTextures = new Map<string, { name: string; canvas: HTMLCanvasElement; format: string }>();

        scene.traverse((child: any) => {
          if (child.visible === false) return;
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            const geometry = mesh.geometry;
            
            // Stats
            if (geometry) {
              if (geometry.index) {
                trianglesCount += geometry.index.count / 3;
              } else if (geometry.attributes && geometry.attributes.position) {
                trianglesCount += geometry.attributes.position.count / 3;
              }
              
              if (geometry.attributes && geometry.attributes.position) {
                verticesCount += geometry.attributes.position.count;
              }
            }

            // Materials
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if (mat) {
                  materialsSet.add(mat);
                  
                  // Textures extraction from properties of MeshStandardMaterial etc.
                  const standardMat = mat as any;
                  const textureKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'displacementMap'];
                  
                  textureKeys.forEach((key) => {
                    try {
                      const texture = standardMat[key];
                      if (texture && texture.isTexture && texture.image) {
                        const img = texture.image;
                        // Use texture UUID as a strictly unique key to ensure all tile textures are processed separately
                        const textureId = texture.uuid || `tex_${Math.random().toString(36).substring(2, 9)}`;
                        if (!uniqueTextures.has(textureId)) {
                          // Attempt to render the image to canvas to extract it with 100% native representation
                          try {
                            const width = img.naturalWidth || img.width || img.videoWidth || (img.data && img.data.width) || 512;
                            const height = img.naturalHeight || img.height || img.videoHeight || (img.data && img.data.height) || 512;
                            
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              // Ensure pixel perfect 1:1 copy without downsampling or interpolation artifacts
                              ctx.imageSmoothingEnabled = false;
                              ctx.drawImage(img, 0, 0);
                              
                              textureCount++;
                              const meshName = child.name || 'mesh';
                              const rawName = texture.name || `${meshName}_${key}`;
                              const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
                              const uniqueName = `${cleanName}_tx${textureCount}`;
                              
                              uniqueTextures.set(textureId, {
                                name: uniqueName,
                                canvas,
                                format: 'image/png'
                              });
                            }
                          } catch (e) {
                            console.warn('Failed to extract texture image data: ', e);
                          }
                        }
                      }
                    } catch (texErr) {
                      console.warn('Failed checking material texture: ', texErr);
                    }
                  });
                }
              });
            }
          }
        });

        // Resolve results
        resolve({
          scene,
          dimensions,
          verticesCount: Math.round(verticesCount),
          trianglesCount: Math.round(trianglesCount),
          materialCount: materialsSet.size,
          textures: Array.from(uniqueTextures.values()),
          modelCenter: { x: center.x, y: center.y, z: center.z }
        });
      } catch (err) {
        reject(err);
      }
    };

    if (fileOrUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('Failed to read file into memory'));
          return;
        }
        try {
          loader.parse(
            arrayBuffer,
            '',
            (gltf) => {
              try {
                handleGltf(gltf);
              } catch (err) {
                reject(err);
              }
            },
            (err) => {
              reject(err);
            }
          );
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
      reader.readAsArrayBuffer(fileOrUrl);
    } else if (fileOrUrl instanceof ArrayBuffer) {
      try {
        loader.parse(
          fileOrUrl,
          '',
          (gltf) => {
            try {
              handleGltf(gltf);
            } catch (err) {
              reject(err);
            }
          },
          (err) => {
            reject(err);
          }
        );
      } catch (err) {
        reject(err);
      }
    } else if (typeof fileOrUrl === 'string') {
      loader.load(
        fileOrUrl,
        (gltf) => {
          try {
            handleGltf(gltf);
          } catch (err) {
            reject(err);
          }
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgress) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            onProgress(percent);
          }
        },
        (error) => {
          reject(error);
        }
      );
    } else {
      reject(new Error('Invalid loadAndParseGLTF input parameter type'));
    }
  });
}

/**
 * Headless orthographic rendering of a parsed scene from a specific perspective
 */
export function renderOrthoView(
  scene: THREE.Group,
  alignment: ViewAlignment,
  _dimensions: any,
  width: number,
  height: number,
  transparent: boolean,
  padding: number = 0.05,
  rotationAngleRad: number = 0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // 1. Create a fresh scene for isolated rendering
      const renderScene = new THREE.Scene();
      
      // Save original parent and position so we can restore them immediately and synchronously
      const originalParent = scene.parent;
      const originalPosition = scene.position.clone();

      // Temporarily transfer the scene to our headless renderScene
      renderScene.add(scene);

      // CRITICAL: Compute world matrices of the scene in its new parent context BEFORE box calculation!
      scene.updateMatrixWorld(true);

      // Compute bounding box from original scene
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      const sizeVec = new THREE.Vector3();
      box.getSize(sizeVec);

      // Create Orthographic Camera
      const aspect = width / height;
      
      // Determine bounding sphere radius to frame correctly
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      const radius = sphere.radius;

      // Adjust camera frustum based on alignment perspective
      let camW = sizeVec.x;
      let camH = sizeVec.z; // default to flat Z horizontal coordinates

      if (alignment === 'TOP_DOWN' || alignment === 'BOTTOM_UP') {
        if (rotationAngleRad && alignment === 'TOP_DOWN') {
          // Precise projection of bounding box corners onto the rotated camera axes to find exact width and height
          const corners = [
            new THREE.Vector3(box.min.x, 0, box.min.z),
            new THREE.Vector3(box.min.x, 0, box.max.z),
            new THREE.Vector3(box.max.x, 0, box.min.z),
            new THREE.Vector3(box.max.x, 0, box.max.z),
          ];
          
          let minLocX = Infinity, maxLocX = -Infinity;
          let minLocY = Infinity, maxLocY = -Infinity;
          
          const cos = Math.cos(rotationAngleRad);
          const sin = Math.sin(rotationAngleRad);
          
          for (const pt of corners) {
            // Relativize corner to model center
            const rx = pt.x - center.x;
            const rz = pt.z - center.z;
            
            // Project onto rotated camera right vector (cos, sin) and up vector (sin, -cos)
            const lx = rx * cos + rz * sin;
            const ly = rx * sin - rz * cos;
            
            if (lx < minLocX) minLocX = lx;
            if (lx > maxLocX) maxLocX = lx;
            if (ly < minLocY) minLocY = ly;
            if (ly > maxLocY) maxLocY = ly;
          }
          
          camW = maxLocX - minLocX;
          camH = maxLocY - minLocY;
        } else {
          camW = sizeVec.x;
          camH = sizeVec.z;
        }
      } else if (alignment === 'NORTH_ELEVATION' || alignment === 'SOUTH_ELEVATION') {
        camW = sizeVec.x;
        camH = sizeVec.y;
      } else if (alignment === 'EAST_ELEVATION' || alignment === 'WEST_ELEVATION') {
        camW = sizeVec.z;
        camH = sizeVec.y;
      }

      // Buffer size to prevent clipping at edges
      const boundingScalar = 1 + padding;
      let left = -camW / 2 * boundingScalar;
      let right = camW / 2 * boundingScalar;
      let bottom = -camH / 2 * boundingScalar;
      let top = camH / 2 * boundingScalar;

      // Correct for aspect ratio so model isn't stretched
      const frustumAspect = camW / camH;
      if (aspect > frustumAspect) {
        const targetW = camH * aspect;
        left = -targetW / 2 * boundingScalar;
        right = targetW / 2 * boundingScalar;
      } else if (aspect < frustumAspect) {
        const targetH = camW / aspect;
        bottom = -targetH / 2 * boundingScalar;
        top = targetH / 2 * boundingScalar;
      }

      // Set extremely robust near and far bounds to guarantee standard orthographic models are never sliced
      const distance = radius * 3;
      const camera = new THREE.OrthographicCamera(
        left, right, top, bottom,
        -distance * 4,
        distance * 4
      );

      // Position orthographic camera based on alignment relative to bounding center
      const camPos = new THREE.Vector3().copy(center);
      switch (alignment) {
        case 'TOP_DOWN':
          camPos.y += distance;
          if (rotationAngleRad) {
            // Rotate the up vector around Y by rotationAngleRad to rotate the rendered orthophoto
            camera.up.set(Math.sin(rotationAngleRad), 0, -Math.cos(rotationAngleRad));
          } else {
            camera.up.set(0, 0, -1); // +Y up in the map is usually North (-Z in GLTF space)
          }
          break;
        case 'BOTTOM_UP':
          camPos.y -= distance;
          camera.up.set(0, 0, 1);
          break;
        case 'NORTH_ELEVATION': // Looking South (+Z towards -Z)
          camPos.z += distance;
          camera.up.set(0, 1, 0);
          break;
        case 'SOUTH_ELEVATION': // Looking North (-Z towards +Z)
          camPos.z -= distance;
          camera.up.set(0, 1, 0);
          break;
        case 'EAST_ELEVATION': // Looking West (+X towards -X)
          camPos.x += distance;
          camera.up.set(0, 1, 0);
          break;
        case 'WEST_ELEVATION': // Looking East (-X towards +X)
          camPos.x -= distance;
          camera.up.set(0, 1, 0);
          break;
      }
      camera.position.copy(camPos);
      camera.lookAt(center);
      camera.updateProjectionMatrix();

      // Configure balanced GIS lights - matches interactive 3D viewer lighting perfectly
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
      renderScene.add(ambientLight);
      
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight1.position.set(center.x + 10, center.y + 20, center.z + 15);
      renderScene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.45);
      dirLight2.position.set(center.x - 10, center.y - 5, center.z - 10);
      renderScene.add(dirLight2);

      // Configure WebGLRenderer with high-precision options and dynamic hardware dimension constraints
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: transparent,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(1);

      // Color correction settings matching live workspace and viewer exactly
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35; // Standard viewer exposure for true brightness, color and contrast

      // Store original material settings so we can restore them immediately and synchronously
      const materialBackups = new Map<THREE.Material, {
        metalness?: number;
        roughness?: number;
        roughnessMap?: THREE.Texture | null;
        metalnessMap?: THREE.Texture | null;
        emissive?: THREE.Color;
        emissiveMap?: THREE.Texture | null;
      }>();

      scene.traverse((child: any) => {
        if ((child as any).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat: any) => {
              if (mat && (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) {
                // Back up original state
                if (!materialBackups.has(mat)) {
                  materialBackups.set(mat, {
                    metalness: mat.metalness,
                    roughness: mat.roughness,
                    roughnessMap: mat.roughnessMap,
                    metalnessMap: mat.metalnessMap,
                    emissive: mat.emissive ? mat.emissive.clone() : undefined,
                    emissiveMap: mat.emissiveMap,
                  });
                }

                // Strip metallic reflections and maximize roughness for optimal GIS mapping (remove reflections)
                mat.metalness = 0.0;
                mat.roughness = 1.0;
                mat.roughnessMap = null;
                mat.metalnessMap = null;
              }
            });
          }
        }
      });

      // Prepare 2D stitch canvas to assemble the high-resolution tiles
      const stitchCanvas = document.createElement('canvas');
      stitchCanvas.width = width;
      stitchCanvas.height = height;
      const stitchCtx = stitchCanvas.getContext('2d');
      if (!stitchCtx) {
        throw new Error('Could not create 2D context for stitched image canvas');
      }
      stitchCtx.imageSmoothingEnabled = false;

      // Render scene in multiple, safe tiles to avoid exhausting GPU memory and guarantee no "blank image" issues
      // A tile size of 2048 is universally supported without causing WebGL context loss or running out of memory.
      const tileSize = Math.min(2048, getMaxWebGLResolution());
      const cols = Math.ceil(width / tileSize);
      const rows = Math.ceil(height / tileSize);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tileW = Math.min(tileSize, width - c * tileSize);
          const tileH = Math.min(tileSize, height - r * tileSize);

          const colPixelStart = c * tileSize;
          const colPixelEnd = colPixelStart + tileW;
          const rowPixelStart = r * tileSize;
          const rowPixelEnd = rowPixelStart + tileH;

          // Normalized coordinates along the overall image viewport
          const uStart = colPixelStart / width;
          const uEnd = colPixelEnd / width;
          const vStart = rowPixelStart / height;
          const vEnd = rowPixelEnd / height;

          // Calculate precise tile orthographic camera boundaries
          const tileLeft = left + uStart * (right - left);
          const tileRight = left + uEnd * (right - left);
          const tileTop = top - vStart * (top - bottom);
          const tileBottom = top - vEnd * (top - bottom);

          // Update camera projection bounds
          camera.left = tileLeft;
          camera.right = tileRight;
          camera.top = tileTop;
          camera.bottom = tileBottom;
          camera.updateProjectionMatrix();

          // Set renderer viewport size to match tile and clear rendering buffer
          renderer.setSize(tileW, tileH);
          if (transparent) {
            renderer.setClearColor(0x000000, 0);
          } else {
            renderer.setClearColor(0xffffff, 1);
          }

          // Ensure transformation matrices are updated prior to rendering!
          scene.updateMatrixWorld(true);

          // Render the tile
          renderer.render(renderScene, camera);

          // Draw the rendered tile onto our target stitched 2D canvas at the correct destination coordinates
          stitchCtx.drawImage(
            renderer.domElement,
            0, 0, tileW, tileH, // source coordinates
            colPixelStart, rowPixelStart, tileW, tileH // destination coordinates
          );
        }
      }

      // Restore all material properties to their exact original states
      materialBackups.forEach((backup, mat: any) => {
        if (backup.metalness !== undefined) mat.metalness = backup.metalness;
        if (backup.roughness !== undefined) mat.roughness = backup.roughness;
        if (backup.roughnessMap !== undefined) mat.roughnessMap = backup.roughnessMap;
        if (backup.metalnessMap !== undefined) mat.metalnessMap = backup.metalnessMap;
        if (backup.emissive !== undefined && mat.emissive) mat.emissive.copy(backup.emissive);
        if (backup.emissiveMap !== undefined) mat.emissiveMap = backup.emissiveMap;
      });

      // RESTORE parent and position immediately so viewport is completely unaffected
      scene.position.copy(originalPosition);
      if (originalParent) {
        originalParent.add(scene);
        originalParent.updateMatrixWorld(true);
      } else {
        scene.updateMatrixWorld(true);
      }

      // Export the finalized stitched canvas directly as a PNG blob
      stitchCanvas.toBlob((blob) => {
        renderer.dispose();
        renderScene.remove(scene);
        
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Stitched Canvas rendering failed to generate a Blob'));
        }
      }, 'image/png');

    } catch (error) {
      reject(error);
    }
  });
}

// Global cached max resolution to prevent context leaks
let cachedMaxWebGLSize: number | null = null;

/**
 * Helper to query native GPU limits for WebGL renderbuffer creation
 */
export function getMaxWebGLResolution(): number {
  if (cachedMaxWebGLSize !== null) {
    return cachedMaxWebGLSize;
  }
  try {
    const tempCanvas = document.createElement('canvas');
    const gl = tempCanvas.getContext('webgl2') || tempCanvas.getContext('webgl') || tempCanvas.getContext('experimental-webgl');
    if (gl) {
      const g = gl as any;
      const dims = g.getParameter(g.MAX_VIEWPORT_DIMS);
      if (dims && dims[0]) {
        cachedMaxWebGLSize = Math.min(dims[0], dims[1], 32768); // Smart safe native limit at 32K to protect browser memory limits
        return cachedMaxWebGLSize;
      }
      const maxTex = g.getParameter(g.MAX_TEXTURE_SIZE);
      if (maxTex) {
        cachedMaxWebGLSize = Math.min(maxTex, 32768);
        return cachedMaxWebGLSize;
      }
    }
  } catch (e) {
    console.warn("Could not probe native GPU WebGL max texture sizes:", e);
  }
  cachedMaxWebGLSize = 32768; // Solid 32K industry safe native fallback
  return cachedMaxWebGLSize;
}

/**
 * Converts a texture canvas into a File Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}
