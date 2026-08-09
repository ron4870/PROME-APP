/**
 * CesiumCommandBridge — Maps AI tool commands to CesiumWorkspace operations.
 * 
 * This bridge is instantiated inside CesiumWorkspace with closures over the
 * component's viewer ref, state setters, and handler functions. The AI panel
 * calls executeCommand() with structured commands returned by Gemini.
 */

// ── Types ──

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface AICommand {
  tool: string;
  args: Record<string, any>;
}

export interface BridgeConfig {
  // Viewer ref
  getViewer: () => any;

  // Camera
  flyToUganda: () => void;

  // Base map
  changeBaseLayer: (type: 'satellite' | 'google' | 'street') => void;

  // Layers
  toggleLayer: (layerName: string) => void;
  toggleCategoryLayers: (category: string, show: boolean) => void;
  setLayerOpacity: (layerName: string, opacity: number) => void;
  getActiveLayers: () => string[];
  getFiles: () => Array<{ name: string; type: string }>;

  // Measurements
  setMeasurementMode: (mode: 'distance' | 'area' | 'profile' | null) => void;
  clearMeasurements: () => void;
  getMeasurementResult: () => string;

  // Scene
  setSceneFog: (enabled: boolean) => void;
  setAtmosphere: (enabled: boolean) => void;
  setLighting: (enabled: boolean) => void;
  setShadows: (enabled: boolean) => void;
  setDepthTest: (enabled: boolean) => void;
  setContrast: (value: number) => void;
  setBrightness: (value: number) => void;
  getSceneSettings: () => Record<string, any>;

  // Terrain
  setTerrainSelectMode: (mode: 'box' | 'polygon' | null) => void;
  clearTerrainSelection: () => void;
  setTerrainExportFormat: (format: string) => void;
  setTerrainCrs: (crs: string) => void;
  downloadTerrainSurface: () => void;

  // Split Compare
  toggleSplitCompare: () => void;
  setSplitPosition: (percent: number) => void;
  getIsSplitActive: () => boolean;

  // Timeline
  toggleTimeline: () => void;
  setTimelinePosition: (percent: number) => void;
  togglePlayback: () => void;
  getIsTimelineActive: () => boolean;

  // Pedestrian
  togglePedestrianMode: () => void;
  setPedestrianSpeed: (speed: number) => void;
  getIsPedestrianActive: () => boolean;

  // Projects
  selectProject: (projectId: number) => void;
  getProjects: () => Array<{ id: number; name: string }>;
  getSelectedProject: () => any;

  // Panels
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  selectSubModule: (name: string | null) => void;
  getSelectedSubModule: () => string | null;
}


// ── Bridge Class ──

export class CesiumCommandBridge {
  private config: BridgeConfig;

  constructor(config: BridgeConfig) {
    this.config = config;
  }

  /**
   * Execute a single AI command and return a result.
   */
  executeCommand(command: AICommand): CommandResult {
    const { tool, args } = command;

    try {
      switch (tool) {

        // ── Camera ──

        case 'flyToLocation': {
          const viewer = this.config.getViewer();
          if (!viewer) return { success: false, message: 'Cesium viewer not initialized' };
          const lat = args.lat ?? 0.3476;
          const lon = args.lon ?? 32.5825;
          const alt = args.altitude ?? 5000;
          const Cesium = (window as any).Cesium;
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
            duration: 2.5,
          });
          return { success: true, message: `Camera flying to lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}, altitude: ${alt}m` };
        }

        case 'flyToUganda': {
          this.config.flyToUganda();
          return { success: true, message: 'Camera flying to Uganda overview' };
        }

        case 'resetCameraView': {
          this.config.flyToUganda();
          return { success: true, message: 'Camera reset to default view' };
        }

        case 'setCameraView': {
          const viewer = this.config.getViewer();
          if (!viewer) return { success: false, message: 'Cesium viewer not initialized' };
          const Cesium = (window as any).Cesium;
          const heading = Cesium.Math.toRadians(args.heading ?? 0);
          const pitch = Cesium.Math.toRadians(args.pitch ?? -45);
          const roll = Cesium.Math.toRadians(args.roll ?? 0);
          viewer.camera.setView({
            orientation: { heading, pitch, roll }
          });
          return { success: true, message: `Camera orientation set: heading=${args.heading ?? 0}°, pitch=${args.pitch ?? -45}°, roll=${args.roll ?? 0}°` };
        }

        // ── Base Map ──

        case 'changeBaseLayer': {
          const type = args.type as 'satellite' | 'google' | 'street';
          this.config.changeBaseLayer(type);
          const labels: Record<string, string> = { satellite: 'ArcGIS Satellite', google: 'Google Satellite', street: 'OpenStreetMap Street' };
          return { success: true, message: `Base map changed to ${labels[type] || type}` };
        }

        // ── Layers ──

        case 'toggleLayer': {
          const name = args.layerName as string;
          this.config.toggleLayer(name);
          const active = this.config.getActiveLayers();
          const isNowActive = active.includes(name);
          return { success: true, message: `Layer "${name}" ${isNowActive ? 'enabled' : 'disabled'}` };
        }

        case 'toggleAllLayers': {
          const category = args.category as string;
          const show = args.show as boolean;
          this.config.toggleCategoryLayers(category, show);
          return { success: true, message: `All ${category} layers ${show ? 'shown' : 'hidden'}` };
        }

        case 'setLayerOpacity': {
          const layerName = args.layerName as string;
          const opacity = Math.max(0, Math.min(100, args.opacity as number));
          this.config.setLayerOpacity(layerName, opacity);
          return { success: true, message: `Layer "${layerName}" opacity set to ${opacity}%` };
        }

        case 'getActiveLayers': {
          const layers = this.config.getActiveLayers();
          const files = this.config.getFiles();
          return {
            success: true,
            message: layers.length > 0
              ? `${layers.length} active layer(s): ${layers.join(', ')}`
              : 'No layers currently active',
            data: { activeLayers: layers, availableFiles: files.map(f => f.name) }
          };
        }

        // ── Measurements ──

        case 'startMeasurement': {
          const mode = args.mode as 'distance' | 'area' | 'profile';
          this.config.setMeasurementMode(mode);
          const instructions: Record<string, string> = {
            distance: 'Click points on the globe to measure distance. Right-click to finish.',
            area: 'Click points to define an area polygon. Right-click to close and calculate.',
            profile: 'Click two points to generate a terrain elevation profile.',
          };
          return { success: true, message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} measurement mode activated. ${instructions[mode]}` };
        }

        case 'clearMeasurements': {
          this.config.clearMeasurements();
          return { success: true, message: 'All measurements cleared' };
        }

        // ── Scene Settings ──

        case 'setSceneFog': {
          this.config.setSceneFog(args.enabled as boolean);
          return { success: true, message: `Atmospheric fog ${args.enabled ? 'enabled' : 'disabled'}` };
        }

        case 'setAtmosphere': {
          this.config.setAtmosphere(args.enabled as boolean);
          return { success: true, message: `Sky atmosphere ${args.enabled ? 'enabled' : 'disabled'}` };
        }

        case 'setLighting': {
          this.config.setLighting(args.enabled as boolean);
          return { success: true, message: `Globe lighting ${args.enabled ? 'enabled' : 'disabled'}` };
        }

        case 'setShadows': {
          this.config.setShadows(args.enabled as boolean);
          return { success: true, message: `Terrain shadows ${args.enabled ? 'enabled' : 'disabled'}` };
        }

        case 'setDepthTest': {
          this.config.setDepthTest(args.enabled as boolean);
          return { success: true, message: `Depth test against terrain ${args.enabled ? 'enabled' : 'disabled'}` };
        }

        case 'setContrast': {
          const value = Math.max(50, Math.min(200, args.value as number));
          this.config.setContrast(value);
          return { success: true, message: `Scene contrast set to ${value}%` };
        }

        case 'setBrightness': {
          const value = Math.max(50, Math.min(150, args.value as number));
          this.config.setBrightness(value);
          return { success: true, message: `Scene brightness set to ${value}%` };
        }

        // ── Terrain Export ──

        case 'startTerrainSelection': {
          const mode = args.mode as 'box' | 'polygon';
          this.config.setTerrainSelectMode(mode);
          return { success: true, message: `Terrain ${mode} selection tool activated. Click on the globe to define the area.` };
        }

        case 'clearTerrainSelection': {
          this.config.clearTerrainSelection();
          return { success: true, message: 'Terrain selection cleared' };
        }

        case 'setTerrainExportFormat': {
          this.config.setTerrainExportFormat(args.format as string);
          const labels: Record<string, string> = {
            dem_asc: 'DEM ESRI ASCII Grid',
            dxf_tin: 'DXF 3D TIN Mesh',
            dxf_contour: 'DXF Contour Lines',
            geotif_image: 'Georeferenced Map Image (GeoTIFF)',
          };
          return { success: true, message: `Export format set to ${labels[args.format] || args.format}` };
        }

        case 'setTerrainCrs': {
          this.config.setTerrainCrs(args.crs as string);
          return { success: true, message: `Terrain CRS set to ${args.crs}` };
        }

        case 'downloadTerrainSurface': {
          this.config.downloadTerrainSurface();
          return { success: true, message: 'Terrain surface download initiated' };
        }

        // ── Split Compare ──

        case 'toggleSplitCompare': {
          this.config.toggleSplitCompare();
          const active = this.config.getIsSplitActive();
          return { success: true, message: `Split-screen comparison ${active ? 'enabled' : 'disabled'}` };
        }

        case 'setSplitPosition': {
          const percent = Math.max(0, Math.min(100, args.percent as number));
          this.config.setSplitPosition(percent);
          return { success: true, message: `Split position set to ${percent}%` };
        }

        // ── Timeline ──

        case 'toggleTimeline': {
          this.config.toggleTimeline();
          const active = this.config.getIsTimelineActive();
          return { success: true, message: `Construction timeline ${active ? 'opened' : 'closed'}` };
        }

        case 'setTimelinePosition': {
          const percent = Math.max(0, Math.min(100, args.percent as number));
          this.config.setTimelinePosition(percent);
          return { success: true, message: `Timeline position set to ${percent}%` };
        }

        case 'togglePlayback': {
          this.config.togglePlayback();
          return { success: true, message: 'Timeline playback toggled' };
        }

        // ── Pedestrian Mode ──

        case 'togglePedestrianMode': {
          this.config.togglePedestrianMode();
          const active = this.config.getIsPedestrianActive();
          return { success: true, message: `First-person pedestrian walk mode ${active ? 'activated — use WASD/Arrow keys to move' : 'deactivated'}` };
        }

        case 'setPedestrianSpeed': {
          const speed = Math.max(1, Math.min(100, args.speed as number));
          this.config.setPedestrianSpeed(speed);
          return { success: true, message: `Walking speed set to ${speed}` };
        }

        // ── Projects ──

        case 'selectProject': {
          this.config.selectProject(args.projectId as number);
          return { success: true, message: `Switched to project ID ${args.projectId}` };
        }

        case 'getProjects': {
          const projects = this.config.getProjects();
          return {
            success: true,
            message: projects.length > 0
              ? `${projects.length} project(s) available: ${projects.map(p => p.name).join(', ')}`
              : 'No projects found',
            data: { projects }
          };
        }

        case 'getProjectFiles': {
          const files = this.config.getFiles();
          const project = this.config.getSelectedProject();
          return {
            success: true,
            message: files.length > 0
              ? `${files.length} file(s) in ${project?.name || 'current project'}: ${files.map(f => f.name).join(', ')}`
              : 'No files in current project',
            data: { files, project: project?.name }
          };
        }

        // ── Panels ──

        case 'openLeftPanel': {
          this.config.setLeftPanelOpen(true);
          return { success: true, message: 'Left panel opened' };
        }

        case 'openRightPanel': {
          this.config.setRightPanelOpen(true);
          return { success: true, message: 'Right panel opened' };
        }

        case 'selectSubModule': {
          this.config.selectSubModule(args.name as string);
          return { success: true, message: `Sub-module switched to ${args.name}` };
        }

        // ── Query ──

        case 'getViewerState': {
          const viewer = this.config.getViewer();
          const activeLayers = this.config.getActiveLayers();
          const sceneSettings = this.config.getSceneSettings();
          const project = this.config.getSelectedProject();
          const subModule = this.config.getSelectedSubModule();
          const measurement = this.config.getMeasurementResult();

          let cameraInfo = 'Viewer not ready';
          if (viewer) {
            const Cesium = (window as any).Cesium;
            const pos = viewer.camera.positionCartographic;
            if (pos) {
              cameraInfo = `lat: ${Cesium.Math.toDegrees(pos.latitude).toFixed(4)}, lon: ${Cesium.Math.toDegrees(pos.longitude).toFixed(4)}, alt: ${pos.height.toFixed(0)}m`;
            }
          }

          return {
            success: true,
            message: `Camera: ${cameraInfo} | Active layers: ${activeLayers.length} | Project: ${project?.name || 'None'} | Module: ${subModule || 'None'}`,
            data: { camera: cameraInfo, activeLayers, sceneSettings, project: project?.name, subModule, measurement }
          };
        }

        default:
          return { success: false, message: `Unknown command: ${tool}` };
      }
    } catch (err: any) {
      return { success: false, message: `Error executing ${tool}: ${err.message}` };
    }
  }

  /**
   * Execute multiple commands sequentially and return all results.
   */
  executeCommands(commands: AICommand[]): CommandResult[] {
    return commands.map(cmd => this.executeCommand(cmd));
  }
}
