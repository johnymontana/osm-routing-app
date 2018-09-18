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

    this.debugIntersection = {
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

  createDebugIntersection = (lon, lat, radius) => {
    const session = this.props.driver.session();
    const query = `
    MATCH (p:Intersection)
    WHERE distance(p.location, point({latitude: $lat, longitude: $lon})) < $radius * 1000
    MATCH (p)-[r]->(p2:Intersection)
    RETURN COLLECT({startLat: p.location.latitude, startLon: p.location.longitude, endLat: p2.location.latitude, endLon: p2.location.longitude}) AS debug
    `;
    console.log(this);
    session
      .run(query, { lat, lon, radius })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("debug");

        this.debugIntersection.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[e.startLon, e.startLat], [e.endLon, e.endLat]]
            }
          };
        });

        this.map.getSource("debugIntersection").setData(this.debugIntersection);
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
    return pois.map(b => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [b.lon, b.lat]
        },
        properties: {
          title: "",
          id: b.id,
          name: b.name,
          icon: "monument",
          "marker-color": "#fc4353"
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
    const { businesses } = this.props;
    this.geojson.features = this.geoJSONForPOIs(businesses);
    this.map.getSource("geojson").setData(this.geojson);
  }

  fetchRoute() {
    const session = this.props.driver.session();

    let query;

    if (this.props.routeMode === "shortestpath") {
      query = `
    MATCH (a:PointOfInterest) WHERE a.poi_id = $startPOI
    MATCH (b:PointOfInterest) WHERE b.poi_id = $endPOI
    MATCH p=shortestPath((a)-[:ROUTE*..20]-(b))
    UNWIND nodes(p) AS n
    RETURN COLLECT({lat: n.location.latitude, lon: n.location.longitude}) AS route
    `;
    } else if (this.props.routeMode === "dijkstra") {
      query = `
      MATCH (a:PointOfInterest) WHERE a.poi_id = $startPOI
      MATCH (b:PointOfInterest) WHERE b.poi_id = $endPOI
      CALL algo.shortestPath.stream(a, b, 'distance',
      {
        relationshipQuery: "MATCH (a1:Routable)-[r:ROUTE]-(a2:Routable) WHERE distance(a1.location,$center) < $radius AND distance(a2.location, $center) < $radius RETURN id(a1) as source, id(a2) as target,r.distance as weight", 
        nodeQuery:"MATCH (a1:Routable) WHERE distance(a1.location, $center) < $radius RETURN id(a1) AS id", 

        direction:'both', defaultValue:1.0, graph:'cypher', 
        params: {center: point({latitude: $routeCenterLat, longitude: $routeCenterLon}), radius: $routeRadius}
      })
        YIELD nodeId, cost
        MATCH (n) WHERE id(n) = nodeId
        RETURN COLLECT({lat: n.location.latitude, lon: n.location.longitude}) AS route
      `;
    } else if (this.props.routeMode === "astar") {
      query = `
      MATCH (a:PointOfInterest) WHERE a.poi_id = $startPOI
      MATCH (b:PointOfInterest) WHERE b.poi_id = $endPOI
      CALL algo.shortestPath.astar.stream(a, b, 'weight', 'lat', 'lon',
        {
          relationshipQuery: "MATCH (a1:Routable)-[r:ROUTE]-(a2:Routable) WHERE distance(a1.location,$center) < $radius AND distance(a2.location, $center) < $radius RETURN id(a1) as source, id(a2) as target,r.distance as weight", 
          nodeQuery:"MATCH (a1:Routable) WHERE distance(a1.location, $center) < $radius RETURN id(a1) AS id", 

          direction:'both', defaultValue:1.0, graph:'cypher', 
          params: {center: point({latitude: $routeCenterLat, longitude: $routeCenterLon}), radius: $routeRadius}
        })
      YIELD nodeId, cost
      MATCH (route) WHERE id(route) = nodeId
      RETURN COLLECT({lat: route.location.latitude, lon: route.location.longitude}) AS route
      `;
    } else {
      // default query, use if
      query = `
    MATCH (a:PointOfInterest) WHERE a.poi_id = $startPOI
    MATCH (b:PointOfInterest) WHERE b.poi_id = $endPOI
    MATCH p=shortestPath((a)-[:ROUTE*..20]-(b))
    UNWIND nodes(p) AS n
    RETURN COLLECT({lat: n.location.latitude, lon: n.location.longitude}) AS route
    `;
    }
    // `
    // MATCH p1=(a:Address)-[:CLOSEST]->(:OSMNode)<-[:NODE]-(w1:OSMWayNode)
    // MATCH p2=(b:Address)-[:CLOSEST]->(:OSMNode)<-[:NODE]-(w2:OSMWayNode)
    // WHERE a.address = $startAddr AND
    //       b.address = $endAddr
    // MATCH route=shortestPath((w1)-[:NEXT*]-(w2) )
    // UNWIND nodes(route) AS n
    // MATCH (n)-[:NODE]->(osmn:OSMNode)
    // RETURN COLLECT({lat: osmn.location.latitude, lon: osmn.location.longitude}) AS route
    // `
    console.log(this);
    session
      .run(query, {
        startPOI: this.startPOI,
        endPOI: this.endPOI,
        routeRadius: this.routeRadius,
        routeCenterLat: this.routeViewport.latitude,
        routeCenterLon: this.routeViewport.longitude
      })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("route");

        this.routeGeojson.features[0].geometry.coordinates = route.map(e => {
          return [e.lon, e.lat];
        });

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
      this.setBusinessMarkers();
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
          "fill-color": "blue",
          "fill-opacity": 0.6
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

      this.map.addSource("debugIntersection", {
        type: "geojson",
        data: this.debugIntersection
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
        id: "points",
        type: "circle",
        source: "geojson",
        paint: {
          "circle-radius": 5,
          "circle-color": "#000"
        },
        filter: ["in", "$type", "Point"]
      });

      this.map.addLayer({
        id: "start",
        type: "circle",
        source: "startGeojson",
        paint: {
          "circle-radius": 25,
          "circle-color": "green"
        }
      });

      this.map.addLayer({
        id: "end",
        type: "circle",
        source: "endGeojson",
        paint: {
          "circle-radius": 7,
          "circle-color": "red"
        }
      });

      this.map.addLayer({
        id: "debug",
        type: "line",
        source: "debugIntersection",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "black",
          "line-width": 5
        },
        filter: ["in", "$type", "LineString"]
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

      this.map.on("click", "points", e => {
        console.log(e);
        console.log(e.features[0].properties.id);
        const address = e.features[0].properties.name;
        const name = e.features[0].properties.name;
        const poi_id = e.features[0].properties.id;
        console.log("NAME AND ADDRESS:");
        console.log(name);
        console.log(address);

        if (this.selectingStart) {
          this.startAddress = name;
          this.startPOI = poi_id;
          this.selectingStart = false;
          this.routeGeojson.features[0].geometry.coordinates = [];
          this.startGeojson.features = [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: e.lngLat
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
          this.endPOI = poi_id;
          this.endGeojson.features = [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: e.lngLat
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
          this.props.setEndAddress(name);
          this.fetchRoute();
        }
      });
    });

    const onDragEnd = e => {
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

      if (this.props.debugMode) {
        this.createDebugIntersection(
          lngLat.lng,
          lngLat.lat,
          this.props.mapCenter.radius
        );
      } else {
        this.debugIntersection.features = [];
        this.map.getSource("debugIntersection").setData(this.debugIntersection);
      }
    };

    new mapboxgl.Marker({ color: "red", zIndexOffset: 9999 })
      .setLngLat([lng, lat])
      .addTo(this.map)
      .setPopup(
        new mapboxgl.Popup().setText(
          "Drag me to search for businessees with reviews! Also, try changing the query radius and date range."
        )
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
