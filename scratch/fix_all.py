import os

# 1. Fix types.ts
types_file = "/Users/ronaldkibuuka/antigravity/PROME-GLFT/GLB-IMAGE-EXTRACTOR/src/types.ts"
with open(types_file, "r") as f:
    types_content = f.read()

types_content = types_content.replace(
"""  customTM?: {
    centralMeridian: number;
    scaleFactor: number;""",
"""  customTM?: {
    centralMeridian: number;
    latitudeOfOrigin: number;
    scaleFactor: number;"""
)

with open(types_file, "w") as f:
    f.write(types_content)

# 2. Fix SettingsPanel.tsx
settings_file = "/Users/ronaldkibuuka/antigravity/PROME-GLFT/GLB-IMAGE-EXTRACTOR/src/components/SettingsPanel.tsx"
with open(settings_file, "r") as f:
    settings_content = f.read()

# Add state declarations at the top of the component
state_str = """
  const [rrLatInput, setRrLatInput] = useState<string>('0.314209260523411');
  const [rrLonInput, setRrLonInput] = useState<string>('32.5784197109788');

  const handleDownloadCustomPrj = () => {
    const latVal = parseFloat(rrLatInput) || 0.314209260523411;
    const lonVal = parseFloat(rrLonInput) || 32.5784197109788;
    const wkt = `COMPD_CS["CompoundCS",PROJCS["unnamed",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",${latVal}],PARAMETER["central_meridian",${lonVal}],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AXIS["Easting",EAST],AXIS["Northing",NORTH]],VERT_CS["EGM96 height",VERT_DATUM["EGM96 geoid",2005,AUTHORITY["EPSG","5171"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Gravity-related height",UP],AUTHORITY["EPSG","5773"]]]`;
    const blob = new Blob([wkt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadrunner_compound_anchor_${latVal.toFixed(4)}_${lonVal.toFixed(4)}.prj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
"""
settings_content = settings_content.replace(
    "const [latLonErrors, setLatLonErrors] = useState<{ originX?: string; originY?: string }>({});",
    "const [latLonErrors, setLatLonErrors] = useState<{ originX?: string; originY?: string }>({});" + state_str
)

# Add isMatchingInput, handleMatchInputCRS, useEffect
matching_str = """
  const isMatchingInput = 
    outputGeoSettings.coordinateSystem === geoSettings.coordinateSystem &&
    outputGeoSettings.loadedPrjWkt === geoSettings.loadedPrjWkt && (
      geoSettings.coordinateSystem !== 'WGS84_UTM' || (
        outputGeoSettings.utmZone === geoSettings.utmZone &&
        outputGeoSettings.utmHemisphere === geoSettings.utmHemisphere
      )
    ) && (
      geoSettings.coordinateSystem !== 'CUSTOM_TM' || (
        outputGeoSettings.customTM?.centralMeridian === geoSettings.customTM?.centralMeridian &&
        outputGeoSettings.customTM?.latitudeOfOrigin === geoSettings.customTM?.latitudeOfOrigin &&
        outputGeoSettings.customTM?.scaleFactor === geoSettings.customTM?.scaleFactor &&
        outputGeoSettings.customTM?.falseEasting === geoSettings.customTM?.falseEasting &&
        outputGeoSettings.customTM?.falseNorthing === geoSettings.customTM?.falseNorthing &&
        outputGeoSettings.customTM?.datumName === geoSettings.customTM?.datumName
      )
    );

  const handleMatchInputCRS = () => {
    setOutputGeoSettings((prev) => ({
      ...prev,
      coordinateSystem: geoSettings.coordinateSystem,
      utmZone: geoSettings.utmZone,
      utmHemisphere: geoSettings.utmHemisphere,
      customTM: geoSettings.customTM ? { ...geoSettings.customTM } : undefined,
      loadedPrjWkt: geoSettings.loadedPrjWkt,
      loadedPrjName: geoSettings.loadedPrjName,
    }));
  };

  React.useEffect(() => {
    if (outputGeoSettings.loadedPrjWkt === geoSettings.loadedPrjWkt && 
        outputGeoSettings.coordinateSystem === geoSettings.coordinateSystem) {
      setOutputGeoSettings((prev) => {
        if (
          prev.coordinateSystem !== geoSettings.coordinateSystem ||
          prev.utmZone !== geoSettings.utmZone ||
          prev.utmHemisphere !== geoSettings.utmHemisphere ||
          prev.loadedPrjWkt !== geoSettings.loadedPrjWkt ||
          prev.loadedPrjName !== geoSettings.loadedPrjName ||
          JSON.stringify(prev.customTM) !== JSON.stringify(geoSettings.customTM)
        ) {
          return {
            ...prev,
            coordinateSystem: geoSettings.coordinateSystem,
            utmZone: geoSettings.utmZone,
            utmHemisphere: geoSettings.utmHemisphere,
            loadedPrjWkt: geoSettings.loadedPrjWkt,
            loadedPrjName: geoSettings.loadedPrjName,
            customTM: geoSettings.customTM ? { ...geoSettings.customTM } : undefined,
          };
        }
        return prev;
      });
    }
  }, [geoSettings, setOutputGeoSettings, outputGeoSettings.coordinateSystem, outputGeoSettings.loadedPrjWkt]);
"""

# Insert matching_str before handleOutputGeoChange
settings_content = settings_content.replace(
    "  const handleOutputGeoChange = (key: keyof OutputGeoSettings, value: any) => {",
    matching_str + "\n  const handleOutputGeoChange = (key: keyof OutputGeoSettings, value: any) => {"
)

with open(settings_file, "w") as f:
    f.write(settings_content)

print("Patch applied.")
