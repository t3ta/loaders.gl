# WMS Overview

[WMS](https://en.wikipedia.org/wiki/Web_Map_Service) (Web Map Service) is a standardized protocol for serving geo-referenced **map images** over the internet. 

WMS was standardized in 1999 as a way to serve map images over the web.

## Characteristics

WMS is not a file format but rather a protocol, specifying a set of requests that the server should implement. Some WMS protocol requests return binary images, and some return metadata formatted as XML text responses. 

The XML responses have a fairly detailed structure and some variations exists, so when working with WMS it is typically useful to have access to well-tested parsers for each XML response type.

## Concepts

### Map images

A WMS server usually serves the map in a bitmap format, e.g. PNG, GIF, JPEG. In addition, vector graphics can be included, such as points, lines, curves and text, expressed in SVG or WebCGM format. The MIME types of the `GetMap` request can be inspected in the response to the `GetCapabilities` request.

### Map Layers

A WMS service defines a number of **layers** representing data that can be rendered. A list of layers must be specified in the `GetMap` request. If no layers are requested, no map image will be produced and an error will be generated.

The `GetCapabilities` request returns a list of valid layers and metadata about them such as their name and description, which `crs` or coordinate reference systems they support, their bounding box, any sub layers etc.

Also note that layers are organized in a hierarchy. Sublayers inherit properties from the parent layers. This is sometimes used to reduce the size of the `GetCapabilities` XML response payload, for servers that offer many sublayers.

> Note that the GetCapabilities request can be used to discover valid layer names, however on public servers the `GetCapabilities` request is sometimesslow, so it can take some time to auto-discover a valid layer name and then request a map with that layer. The `GetMap` request is usually faster once you have a list of valid layer names. 

## WMS Request Types

The WMS standard specifies a number of "request types" that a standards-compliant WMS server should support. loaders.gl provides loaders for all WMS request responses: 

| **WMS Request**    | **Response Loader**         | **Description**                                                                                                                                                                                                        |
| ------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GetCapabilities`  | `WMSCapabilitiesLoader`     | Returns WMS metadata (such as map image format and WMS version compatibility) and the available layers (map bounding box, coordinate reference systems, URI of the data and whether the layer is mostly opaque or not) |
| `GetMap`           | `ImageLoader`               | returns a map image. Parameters include: width and height of the map, coordinate reference system, rendering style, image format                                                                                       |
| `GetFeatureInfo`   | `WMSFeatureInfoLoader`      | if a layer is marked as 'queryable' then you can request data about a coordinate of the map image.                                                                                                                     |
| `DescribeLayer`    | `WMSLayerDescriptionLoader` | gets feature types of the specified layer or layers, which can be further described using WFS or WCS requests. This request is dependent on the Styled Layer Descriptor (SLD) Profile of WMS.                          |
| `GetLegendGraphic` | `ImageLoader`               | An image of the map's legend, giving a visual guide to map elements.                                                                                                                                                   |
| Exceptions         | `WMSErrorLoader`            | Parses an XML encoded WMS error response from any malformed request.                                                                                                                                                   |

> Note that only the `GetCapabilities` and `GetMap` request types are are required to be supported by a WMS server. Information about which request types are supported is available in the response to `GetCapabilities` request.

## WMS Protocol Versions

Several revisions of the WMS standard have been published by the OGC. It is notable that there are some breaking, non-backwards compatible changes. Taking care of these differences on behalf of the application is normally goal of libraries that provide WMS support. 

#### v1.3.0

Released in January 2004

- Use `CRS` instead of `SRS` parameter for 1.3.0
- The order of parameters for BBOX (in v1.3.0 only) depends on whether the CRS definition has flipped axes. You will see this in the `GetCapabilities` request at 1.3.0 - the response should show the flipped axes.
  + `BBOX=xmin,ymin,xmax,ymax NON-FLIPPED`
  + `BBOX=ymin,xmin,ymax,xmax FLIPPED`
  + `EPSG:4326` needs to have flipped axes. `4326 1 WGS 84 Latitude North Longitude East`

- `EPSG:4326` is wrongly defined in v1.1.1 as having long/lat coordinate axes. In WMS 1.3.0 the correct axes lat/long are used. 
- `CRS:84` was introduced with the publication of the WMS 1.3.0 specification, to overcome the issue that in WMS 1.1.1 
- `CRS:84` is defined by OGC as having the same datum as `EPSG:4326` (that is the World Geodetic System 1984 datum ~ `EPSG::6326`) but axis order of long/lat.

The above information is mainly based on the following [stackexchange](https://gis.stackexchange.com/questions/23347/getmap-wms-1-1-1-vs-1-3-0) notes.

#### v1.1.1

Released in January 2002

- Use SRS instead of CRS parameter for 1.1.1
- In WMS 1.1.1 EPSG:4326 is wrongly defined as having long/lat coordinate axes. See v1.3.0 documentation for details.

#### v1.1.0

Released in June 2001

> Not tested / not officially supported.

#### v1.0.0

Released in April 2000. 

> Not tested / not officially supported.


## Servers

A number of commercial and open services implement WMS support

GeoServer is a major open source server with support for serving WMS images.

### Vendor parameters

A specific server implementation often supports additional vendor specific parameters, e.g [GeoServer](https://docs.geoserver.org/2.22.x/en/user/services/wms/vendor.html#wms-vendor-parameters)


## Example Services

There are a number of public services

 | Name                                                                                                                                       | Service URL                                                      | Description                                                                                                                                                                                                   |
 | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
 | [OpenStreetMap WMS](https://www.terrestris.de/en/openstreetmap-wms/)                                                                       | https://ows.terrestris.de/osm/service                            | OpenStreetMap rendered, updated weekly, covering the entire globe. [Copyright OpenStreetMap](https://www.openstreetmap.org/copyright).                                                                        |
 | [NOAA Composite Reflectivity WMS](https://opengeo.ncep.noaa.gov/geoserver/www/index.html)                                                  | https://opengeo.ncep.noaa.gov/geoserver/conus/conus_cref_qcd/ows | Radar precipitation data covering the contiguous US. Quality Controlled 1km x 1km CONUS Radar Composite Reflectivity. This data is provided Multi-Radar-Multi-Sensor (MRMS) algorithm.                        |
 | [NASA Global Imagery Browse Services for EOSDIS](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs/) | https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi        | Over 1,000 NASA satellite imagery products, covering every part of the world. Most imagery is updated daily—available within a few hours after satellite observation, and some products span almost 30 years. |
