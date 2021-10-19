import React, { Component } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lng: props.mapCenter.longitude,
      lat: props.mapCenter.latitude,
      zoom: props.mapCenter.zoom
    };

    this.businessMarkers = [];
    this.mapLoaded = false;

    this.geojson = {
      type: "FeatureCollection",
      features: []
    };

    this.debugIntersections = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };

    this.debugRoutable = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };

    this.debugIntersectionRoutes = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.debugPointsOfInterest = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.routeGeojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.regionPolygons = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[]]
          }
        }
      ]
    };

    this.regionPolylines = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.regionDistances = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.regionAreas = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };

    this.startGeojson = {
      type: "FeatureCollection",
      features: []
    };

    this.endGeojson = {
      type: "FeatureCollection",
      features: []
    };

    this.selectingStart = true;
    this.startAddress = this.props.startAddress;
    this.endAddress = this.props.endAddress;
  }

  createDebugIntersections = (lon, lat, radius) => {
    const session = this.props.session();
    const query = `
    MATCH (p:Intersection)
    WHERE distance(p.location, point({latitude: $lat, longitude: $lon})) < $radius * 1000
    MATCH (p)-[r]->(p2:Intersection)
    RETURN COLLECT({startLat: p.location.latitude, startLon: p.location.longitude, endLat: p2.location.latitude, endLon: p2.location.longitude}) AS segments
    `;
    console.log(this);
    session
      .run(query, { lat, lon, radius })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("segments");

        this.debugIntersections.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [e.startLon, e.startLat]
            }
          };
        });

        this.map.getSource("debugIntersections").setData(this.debugIntersections);

        this.debugIntersectionRoutes.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[e.startLon, e.startLat], [e.endLon, e.endLat]]
            }
          };
        });

        this.map.getSource("debugIntersectionRoutes").setData(this.debugIntersectionRoutes);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };
  };

  createDebugRoutable = (lon, lat, radius) => {
    const session = this.props.session();
    const query = `
    MATCH (p:Routable)
    WHERE distance(p.location, point({latitude: $lat, longitude: $lon})) < $radius * 1000
    RETURN COLLECT([p.location.longitude, p.location.latitude]) AS coordinate
    `;
    console.log(this);
    session
      .run(query, { lat, lon, radius })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("coordinate");

        this.debugRoutable.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: e
            }
          };
        });

        this.map.getSource("debugRoutable").setData(this.debugRoutable);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };
  };

  createDebugPointsOfInterest = (lon, lat, radius) => {
    const session = this.props.session();
    const query = `
    MATCH (p:PointOfInterest)
    WHERE distance(p.location, point({latitude: $lat, longitude: $lon})) < $radius * 1000
    MATCH (p)-[r:ROUTE]->(p2:Routable)
    RETURN COLLECT({startLat: p.location.latitude, startLon: p.location.longitude, endLat: p2.location.latitude, endLon: p2.location.longitude}) AS segments
    `;
    console.log(this);
    session
      .run(query, { lat, lon, radius })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("segments");

        this.debugPointsOfInterest.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[e.startLon, e.startLat], [e.endLon, e.endLat]]
            }
          };
        });

        this.map.getSource("debugPointsOfInterest").setData(this.debugPointsOfInterest);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };
  };

  // https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
  createGeoJSONCircle = (center, radiusInKm, points) => {
    if (!points) points = 64;

    var coords = {
      latitude: center[1],
      longitude: center[0]
    };

    var km = radiusInKm;

    var ret = [];
    var distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    var distanceY = km / 110.574;

    var theta, x, y;
    for (var i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);

      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [ret]
            }
          }
        ]
      }
    };
  };

  geoJSONForPOIs = pois => {
    return pois.map(record => {
      const poi = record['poi'];
      const amenity = record['amenity'];
      const p = poi.properties;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.location.x, p.location.y]
        },
        properties: {
          title: "",
          id: p.node_osm_id.toString(),
          name: p.name,
          icon: "monument",
          amenity: amenity
        }
      };
    });

    // layout: {
    //   "icon-image": "{icon}-15",
    //   "text-field": "{title}",
    //   "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    //   "text-offset": [0, 0.6],
    //   "text-anchor": "top"
    // }
  };

  geoJSONForRegionPolygons = regionPolygons => {
    if (regionPolygons.length > 0) console.log("Generating JSON for " + regionPolygons.length + " regionPolygons: ");
    return regionPolygons.map(polygon => {
      let coordinates = polygon.map(point => [point.x, point.y]);
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [coordinates]
        }
      };
    });
  };

  geoJSONForRegionPolylines = regionPolylines => {
    if (regionPolylines.length > 0) console.log("Generating JSON for " + regionPolylines.length + " regionPolylines: ");
    return regionPolylines.map(polyline => {
      let coordinates = polyline.map(point => [point.x, point.y]);
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coordinates
        }
      };
    });
  };

  geoJSONForRegionDistances = regionDistances => {
    if (regionDistances.length > 0) console.log("Generating JSON for " + regionDistances.length + " regionDistances: ");
    return regionDistances.map(distanceObject => {
      let startCoord = [distanceObject.start.x, distanceObject.start.y];
      let endCoord = [distanceObject.end.x, distanceObject.end.y];
      let distance = Math.round(distanceObject.distance / 1000.0);
      let units = "km";
      if (this.props.unitsMode === "imperial") {
        distance = Math.round(distanceObject.distance / 1600.0);
        units = "miles";
      }
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [startCoord, endCoord]
        },
        properties: {
          "title": `${distance}${units}`
        }
      };
    });
  };

  geoJSONForRegionAreas = regionAreas => {
    if (regionAreas.length > 0) console.log("Generating JSON for " + regionAreas.length + " regionAreas: ");
    return regionAreas.map(areaObject => {
      console.log(areaObject);
      let area = (areaObject.area / 1000000).toFixed(0).toString();
      let units = "km²";
      if (this.props.unitsMode === "imperial") {
        area = (areaObject.area / 2560000).toFixed(0).toString();
        units = "mi²";
      }
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [areaObject.x, areaObject.y]
        },
        properties: {
          title: "",
          name: areaObject.area,
          description: `${areaObject.name}:\n${area}${units}`,
          id: areaObject.regionId,
          "marker-color": "#fc4353"
        }
      };
    });
  };

  businessPopupHTML = business => {
    return `<ul>
    <li>
      <strong>Name: </strong> ${business.name}
    </li>
    <li>
      <strong>Address: </strong> ${business.address}
    </li>
    <li>
      <strong>City: </strong> ${business.city}
    </li>
  </ul>`;
  };

  setStartMarker() {
    const { startMarker } = this.props;

    if (startMarker) {
      new mapboxgl.Marker()
        .setLngLat([startMarker.longitude, startMarker.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(startMarker.address)
        )
        .addTo(this.map);
    }
  }

  setBusinessMarkers() {
    const {businesses} = this.props;
    this.geojson.features = this.geoJSONForPOIs(businesses);
    this.map.getSource("geojson").setData(this.geojson);
  }

  setRegionPolygons() {
    const {regionPolygons} = this.props;
    this.regionPolygons.features = this.geoJSONForRegionPolygons(regionPolygons);
    this.map.getSource("regionPolygons").setData(this.regionPolygons);
  }

  setRegionPolylines() {
    const {regionPolylines} = this.props;
    this.regionPolylines.features = this.geoJSONForRegionPolylines(regionPolylines);
    this.map.getSource("regionPolylines").setData(this.regionPolylines);
  }

  setRegionDistances() {
    const {regionDistances} = this.props;
    this.regionDistances.features = this.geoJSONForRegionDistances(regionDistances);
    this.map.getSource("regionDistances").setData(this.regionDistances);
  }

  setRegionAreas() {
    const {regionAreas} = this.props;
    if (regionAreas) {
      this.regionAreas.features = this.geoJSONForRegionAreas(regionAreas);
      this.map.getSource("regionAreas").setData(this.regionAreas);
    } else {
      console.log("Invalid regionAreas in props:");
      console.log(this.props);
    }
  }

  fetchRoute() {
    if(this.startPOI && this.endPOI) {
      this.fetchRouteFor(this.startPOI, this.endPOI);
    }
  }

  fetchRouteFor(startPOI, endPOI) {
    const session = this.props.session();

    let getNodes = `UNWIND nodes(p) AS n`;
    if (this.props.debugMode.detailedRoute) {
      // TODO: This Cypher does not always get the direction of the sub-routes correct
      // Consider re-writing this as a procedure that converts a route path into a list of points or OSMNodes
      getNodes = `
      UNWIND relationships(p) AS r
      WITH r
      MATCH ()-[fromRel]->(), ()-[toRel]->() WHERE id(fromRel)=r.fromRel AND id(toRel)=r.toRel
      WITH r, startNode(fromRel) AS fromWayNode, startNode(toRel) as toWayNode
      MATCH (fromWayNode)-[rx:NEXT*]-(toWayNode)
      UNWIND rx AS wayRel
      WITH startNode(wayRel) AS wayNode, r
      MATCH (wayNode)-[:NODE]->(locationNode)
      WITH collect(locationNode) AS locations, endNode(r) AS endLocation
      WITH reduce(s = [endLocation], x IN reverse(locations) | s + x) AS locations
      UNWIND locations AS n
      `;
    }
    let query;
    if (this.props.routeMode === "shortestpath") {
      query = `
      MATCH (a:PointOfInterest) WHERE a.node_osm_id = toInteger($startPOI)
      MATCH (b:PointOfInterest) WHERE b.node_osm_id = toInteger($endPOI)
      MATCH p=shortestPath((a)-[:ROUTE*..2000]-(b))
      ${getNodes}
      RETURN COLLECT([n.location.longitude,n.location.latitude]) AS route
    `;
    } else if (this.props.routeMode === "dijkstra") {
      query = `
      MATCH (a:PointOfInterest) WHERE a.node_osm_id = toInteger($startPOI)
      MATCH (b:PointOfInterest) WHERE b.node_osm_id = toInteger($endPOI)
      CALL apoc.algo.dijkstra(a,b,'ROUTE', 'distance') YIELD path, weight
      WITH path AS p
      ${getNodes}
      RETURN COLLECT([n.location.longitude, n.location.latitude]) AS route
      `

    } else if (this.props.routeMode === "astar") {
      query = `
      MATCH (a:PointOfInterest) WHERE a.node_osm_id = toInteger($startPOI)
      MATCH (b:PointOfInterest) WHERE b.node_osm_id = toInteger($endPOI)
      CALL apoc.algo.aStar(a, b, 'ROUTE', 'distance', 'lat', 'lon') YIELD path, weight
      WITH path AS p
      ${getNodes}
      RETURN COLLECT([n.location.longitude, n.location.latitude]) AS route
      `
    } else {
      // default query, use if
      query = `
      MATCH (a:PointOfInterest) WHERE a.node_osm_id = toInteger($startPOI)
      MATCH (b:PointOfInterest) WHERE b.node_osm_id = toInteger($endPOI)
      MATCH p=shortestPath((a)-[:ROUTE*..2000]-(b))
      ${getNodes}
      RETURN COLLECT([n.location.longitude,n.location.latitude]) AS route
    `;
    };
    
    console.log(this);
    console.log(query);
    session
      .run(query, {
        startPOI: startPOI,
        endPOI: endPOI,
        routeRadius: this.routeRadius,
        routeCenterLat: this.routeViewport.latitude,
        routeCenterLon: this.routeViewport.longitude
      })
      .then(result => {
        console.log(result);
        console.log(result.records[0].get("route"));
        this.routeGeojson.features[0].geometry.coordinates = result.records[0].get("route");
        this.map.getSource("routeGeojson").setData(this.routeGeojson);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });
  }

  componentDidUpdate() {
    this.setStartMarker();

    if (this.mapLoaded) {
      this.map
        .getSource("polygon")
        .setData(
          this.createGeoJSONCircle(
            [this.props.mapCenter.longitude, this.props.mapCenter.latitude],
            this.props.mapCenter.radius
          ).data
        );
      this.setRegionPolygons();
      this.setRegionPolylines();
      this.setRegionDistances();
      this.setRegionAreas();
      this.setBusinessMarkers();
      this.fetchRoute();
    }
  }

  componentDidMount() {
    const { lng, lat, zoom } = this.state;

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/streets-v9",
      center: [lng, lat],
      zoom
    });

    this.map.on("load", () => {
      this.mapLoaded = true;
      this.map.addSource(
        "polygon",
        this.createGeoJSONCircle([lng, lat], this.props.mapCenter.radius)
      );
      this.map.addLayer({
        id: "polygon",
        type: "fill",
        source: "polygon",
        layout: {},
        paint: {
          "fill-color": "green",
          "fill-opacity": 0.2
        }
      });

      this.map.addSource("geojson", {
        type: "geojson",
        data: this.geojson
      });

      this.map.addSource("routeGeojson", {
        type: "geojson",
        data: this.routeGeojson
      });

      this.map.addSource("debugIntersectionRoutes", {
        type: "geojson",
        data: this.debugIntersectionRoutes
      });

      this.map.addSource("debugIntersections", {
        type: "geojson",
        data: this.debugIntersections
      });

      this.map.addSource("debugRoutable", {
        type: "geojson",
        data: this.debugRoutable
      });

      this.map.addSource("debugPointsOfInterest", {
        type: "geojson",
        data: this.debugPointsOfInterest
      });

      this.map.addSource("regionPolygons", {
        type: "geojson",
        data: this.regionPolygons
      });

      this.map.addSource("regionPolylines", {
        type: "geojson",
        data: this.regionPolylines
      });

      this.map.addSource("regionDistances", {
        type: "geojson",
        data: this.regionDistances
      });

      this.map.addSource("regionAreas", {
        type: "geojson",
        data: this.regionAreas
      });

      this.map.addSource("startGeojson", {
        type: "geojson",
        data: this.startGeojson
      });

      this.map.addSource("endGeojson", {
        type: "geojson",
        data: this.endGeojson
      });

      this.map.addLayer({
        id: "debugPointsOfInterest",
        type: "line",
        source: "debugPointsOfInterest",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#0f8",
          "line-width": 5
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.addLayer({
        id: "debugIntersectionRoutes",
        type: "line",
        source: "debugIntersectionRoutes",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#08f",
          "line-width": 5
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.addLayer({
        id: "debugRoutable",
        type: "circle",
        source: "debugRoutable",
        paint: {
          "circle-radius": 8,
          "circle-color": "#199"
        }
      });

      this.map.addLayer({
        id: "debugIntersections",
        type: "circle",
        source: "debugIntersections",
        paint: {
          "circle-radius": 5,
          "circle-color": "#044"
        }
      });

      this.map.addLayer({
        id: "regionPolygons",
        type: "fill",
        source: "regionPolygons",
        layout: {
        },
        paint: {
          "fill-outline-color": "#038",
          "fill-color": "#03F",
          "fill-opacity": 0.3
        }
      });

      this.map.addLayer({
        id: "regionPolylines",
        type: "line",
        source: "regionPolylines",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#038",
          "line-width": 5
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.addLayer({
        id: "regionDistanceLines",
        type: "line",
        source: "regionDistances",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#99f",
          "line-opacity": 0.3,
          "line-width": 10
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.addLayer({
        id: "regionDistanceSymbols",
        type: "symbol",
        source: "regionDistances",
        layout: {
          "symbol-placement": "line",
          "text-font": ["Open Sans Regular"],
          "text-field": '{title}',
          "text-size": {
            'base': 14,
            'stops': [
              [8, 24],
              [22, 280]
            ]
          }
        },
        "paint": {}
      });

      this.map.addLayer({
        id: "regionAreas",
        type: "symbol",
        source: "regionAreas",
        layout: {
          "text-field": ["get", "description"],
          "text-size": {
            'base': 1.25,
            'stops': [
              [1, 8],
              [22, 780]
            ]
          },
          "icon-image": ["concat", ["get", "icon"], "-15"]
        },
        filter: ["in", "$type", "Point"]
      });

      this.map.addLayer({
        id: "start",
        type: "circle",
        source: "startGeojson",
        paint: {
          "circle-radius": 12,
          "circle-color": "green"
        }
      });

      this.map.addLayer({
        id: "end",
        type: "circle",
        source: "endGeojson",
        paint: {
          "circle-radius": 12,
          "circle-color": "red"
        }
      });

      this.map.addLayer({
        id: "points",
        type: "circle",
        source: "geojson",
        paint: {
          'circle-radius': {
            'base': 1.75,
            'stops': [
              [8, 6],
              [22, 180]
            ]
          },
          'circle-color': [
            'match',
            ['get', 'amenity'],
            'restaurant',
            '#fbb03b',
            'fast_food',
            '#223b53',
            'cafe',
            '#e55e5e',
            'pub',
            '#3bb2d0',
            'bar',
            '#b23bd0',
            /* other */ '#555'
          ]
        },
        filter: ["in", "$type", "Point"]
      });

      this.map.addLayer({
        id: "lines",
        type: "line",
        source: "routeGeojson",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "purple",
          "line-width": 10
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.on("mousemove", e => {
        var features = this.map.queryRenderedFeatures(e.point, {
          layers: ["points"]
        });
        // UI indicator for clicking/hovering a point on the map
        this.map.getCanvas().style.cursor = features.length
          ? "pointer"
          : "crosshair";
      });

      this.map.on("click", e => {
        console.log("Mouse clicked");
        console.log(e);
        if (e.lngLat) {
          const point = {
            latitude: e.lngLat.lat,
            longitude: e.lngLat.lng,
          };
          console.log(point);
          if (this.props.debugMode.debugPolygons) {
            this.props.toggleRegionSelected(point);
          } else {
            console.log("Not in polygon mode: ignoring polygon selection on mouse click");
          }
        } else {
          console.log("No lat/lng in mouse event");
        }
      });

      this.map.on("click", "points", e => {
        console.log(e);
        console.log("Have " + e.features.length + " features");
        console.log(e.features[0]);
        const feature = e.features[0];
        console.log(feature.properties.id);
        const address = feature.properties.name;
        const name = feature.properties.name;
        const coordinates = feature.geometry.coordinates;
        console.log("NAME AND ADDRESS:");
        console.log(name);
        console.log(address);
        console.log("Location:");
        console.log(coordinates);

        if (this.selectingStart) {
          this.startAddress = name;
          this.startPOI = feature.properties.id;
          this.selectingStart = false;
          this.routeGeojson.features[0].geometry.coordinates = [];
          this.startGeojson.features = [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coordinates
              },
              properties: {
                title: "",
                name: name,
                id: name,
                icon: "monument",
                "marker-color": "#fc4353"
              }
            }
          ];
          this.map.getSource("startGeojson").setData(this.startGeojson);
          this.map.getSource("routeGeojson").setData(this.routeGeojson);
          this.props.setStartAddress(name);
        } else {
          this.endAddress = name;
          this.endPOI = feature.properties.id;
          this.endGeojson.features = [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coordinates
              },
              properties: {
                title: "",
                name: name,
                id: name,
                icon: "monument",
                "marker-color": "#fc4353"
              }
            }
          ];

          this.selectingStart = true;
          this.map.getSource("endGeojson").setData(this.endGeojson);
          this.props.setEndAddress(name);
          this.fetchRoute();
        }
      });
    });

    const helpText = i => {
      if (i < this.props.helpText.length) {
        return "<div id='popup'>" + this.props.helpText[i] + "</div>";
      } else {
        return null;
      }
    };

    const onDragEnd = e => {
      if(e.target.getPopup().isOpen()) {
        if (!e.target['helpLevel']) {
          e.target['helpLevel'] = 1;
        }
        const text = helpText(e.target.helpLevel);
        if (text) {
          e.target.getPopup().setHTML(text);
          e.target.helpLevel++;
        } else {
          e.target.togglePopup();
        }
      }
      var lngLat = e.target.getLngLat();

      const viewport = {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
        zoom: this.map.getZoom()
      };

      this.routeViewport = viewport;
      this.routeRadius = this.props.mapCenter.radius * 1000;

      this.props.mapSearchPointChange(viewport);

      this.map
        .getSource("polygon")
        .setData(
          this.createGeoJSONCircle(
            [lngLat.lng, lngLat.lat],
            this.props.mapCenter.radius
          ).data
        );

      if (this.props.debugMode.debugRouting) {
        this.createDebugRoutable(
          lngLat.lng,
          lngLat.lat,
          this.props.mapCenter.radius
        );
        this.createDebugIntersections(
          lngLat.lng,
          lngLat.lat,
          this.props.mapCenter.radius
        );
        this.createDebugPointsOfInterest(
          lngLat.lng,
          lngLat.lat,
          this.props.mapCenter.radius
        );
      } else {
        this.debugRoutable.features = [];
        this.map.getSource("debugRoutable").setData(this.debugRoutable);
        this.debugIntersections.features = [];
        this.map.getSource("debugIntersections").setData(this.debugIntersections);
        this.debugIntersectionRoutes.features = [];
        this.map.getSource("debugIntersectionRoutes").setData(this.debugIntersectionRoutes);
        this.debugPointsOfInterest.features = [];
        this.map.getSource("debugPointsOfInterest").setData(this.debugPointsOfInterest);
      }
    };

    new mapboxgl.Marker({ color: "red", zIndexOffset: 9999 })
      .setLngLat([lng, lat])
      .addTo(this.map)
      .setPopup(
        new mapboxgl.Popup().setHTML(helpText(0))
      )
      .setDraggable(true)
      .on("dragend", onDragEnd)
      .addTo(this.map)
      .togglePopup();

    this.map.on("move", () => {
      const { lng, lat } = this.map.getCenter();

      this.setState({
        lng: lng,
        lat: lat,
        zoom: this.map.getZoom().toFixed(2)
      });
    });

    //this.setBusinessMarkers();
  }

  render() {
    return (
      <div>
        <div
          ref={el => (this.mapContainer = el)}
          className="absolute top right left bottom"
        />
        <div id="distance" className="distance-container" />
      </div>
    );
  }
}

export default Map;
