// loaders.gl, MIT license

import {XMLLoader} from '@loaders.gl/xml';

/** All capabilities of a WMS service - response to a WMS `GetCapabilities` data structure extracted from XML */
export type WMSCapabilities = {
  name: string;
  title?: string;
  abstract?: string;
  keywords: string[];
  layers: WMSLayer[];
  requests: Record<string, WMSRequest>;
  exceptions?: {
    mimeTypes: string[];
  };
  raw?: Record<string, unknown>;
};

export type WMSLayer = {
  name: string;
  title?: string;
  boundingBox?: [number, number, number, number];
  /** Supported CRS */
  crs?: string[];
  /** Whether queries can be performed on the layer */
  queryable?: boolean;
  /** `false` if layer has significant no-data areas that the client can display as transparent. */
  opaque?: boolean;
  /** WMS cascading allows server to expose layers coming from other WMS servers as if they were local layers */
  cascaded?: boolean;

  /** Sublayers - (these inherit crs and boundingBox if not overriden) */
  layers: WMSLayer[];
};

export type WMSRequest = {
  mimeTypes: string[];
};

export type parseWMSCapabilitiesOptions = {
  /** Add inherited layer information to sub layers */
  inheritedLayerProps?: boolean;
  /** Include the parsed but unprocessed XML */
  raw?: boolean;
};

/**
 * Parses a typed data structure from raw XML for `GetCapabilities` response
 * @note Error handlings is fairly weak
 */
export function parseWMSCapabilities(
  text: string,
  options?: parseWMSCapabilitiesOptions
): WMSCapabilities {
  const parsedXML = XMLLoader.parseTextSync(text, options);
  const xmlCapabilities: any =
    parsedXML.WMT_MS_Capabilities || parsedXML.WMS_Capabilities || parsedXML;
  const capabilities = extractCapabilities(xmlCapabilities);
  // In case the processed, normalized capabilities do not contain everything,
  // the user can get the parsed XML structure.
  if (options?.raw) {
    capabilities.raw = xmlCapabilities;
  }
  if (options?.inheritedLayerProps) {
    // Traverse layers and inject missing props from parents
    for (const layer of capabilities.layers) {
      addInheritedLayerProps(layer, null);
    }
    // Not yet implemented
  }

  return capabilities;
}

/** Extract typed capability data from XML */
function extractCapabilities(xml: any): WMSCapabilities {
  const capabilities: WMSCapabilities = {
    name: String(xml.Service?.Name || 'unnamed'),
    title: String(xml.Service?.Title || ''),
    keywords: [],
    layers: [],
    requests: {}
  };

  for (const keyword of xml.Service?.KeywordList?.Keyword || []) {
    capabilities.keywords.push(keyword);
  }

  for (const [name, xmlRequest] of Object.entries(xml.Capability?.Request || {})) {
    capabilities.requests[name] = extractRequest(name, xmlRequest);
  }

  const xmlExceptionFormats = getXMLArray(xml.Exception?.Format);
  if (xmlExceptionFormats.length > 0 && xmlExceptionFormats.every((_) => typeof _ === 'string')) {
    capabilities.exceptions = {
      mimeTypes: xmlExceptionFormats as string[]
    };
  }

  // Single layer is not represented as array in XML
  const xmlLayers = getXMLArray(xml.Capability?.Layer);
  for (const xmlSubLayer of xmlLayers) {
    capabilities.layers.push(extractLayer(xmlSubLayer));
  }

  return capabilities;
}

/** Extract typed request data from XML */
function extractRequest(name: string, xmlRequest: any): WMSRequest {
  const format: string | string[] = xmlRequest?.Format;
  const mimeTypes: string[] = Array.isArray(format) ? format : [format];
  return {mimeTypes};
}

/** Extract request data */
function extractLayer(xmlLayer: any): WMSLayer {
  const layer: Omit<WMSLayer, 'layers'> = {
    name: String(xmlLayer?.Name || ''),
    title: String(xmlLayer?.Title || '')
  };

  // WMS 1.3.0 changes SRS to CRS
  const crs = xmlLayer?.CRS || xmlLayer?.SRS;
  if (crs && Array.isArray(crs) && crs.every((_) => typeof _ === 'string')) {
    layer.crs = crs;
  }

  if (xmlLayer?.opaque) {
    layer.opaque = getXMLBoolean(xmlLayer?.opaque);
  }
  if (xmlLayer?.cascaded) {
    layer.cascaded = getXMLBoolean(xmlLayer?.cascaded);
  }
  if (xmlLayer?.queryable) {
    layer.queryable = getXMLBoolean(xmlLayer?.queryable);
  }

  // Single layer is not represented as array in XML
  const xmlLayers = getXMLArray(xmlLayer?.Layer);
  const layers: WMSLayer[] = [];

  for (const xmlSubLayer of xmlLayers) {
    layers.push(extractLayer(xmlSubLayer));
  }

  return {...layer, layers};
}

function getXMLBoolean(xmlValue: any) {
  switch (xmlValue) {
    case 'true':
      return true;
    case 'false':
      return false;
    case '1':
      return true;
    case '0':
      return false;
    default:
      return false;
  }
}

function getXMLArray(xmlValue: any) {
  if (Array.isArray(xmlValue)) {
    return xmlValue;
  }
  if (xmlValue) {
    return [xmlValue];
  }
  return [];
}

/** Traverse layers and inject missing props from parents */
function addInheritedLayerProps(layer: WMSLayer, parent: WMSLayer | null): void {
  if (parent && parent.boundingBox && !layer.boundingBox) {
    layer.boundingBox = [...parent.boundingBox];
  }
  if (parent && parent.crs && !layer.crs) {
    layer.crs = [...parent.crs];
  }
  for (const subLayer of layer.layers) {
    addInheritedLayerProps(subLayer, layer);
  }
}
