import React, {Component} from "react";
import "./App.css";
import Map from "./components/Map";
import neo4j from "neo4j-driver/lib/browser/neo4j-web";

class App extends Component {
  constructor(props) {
    super(props);
    let focusedInput = null;

    this.state = {
      focusedInput,
      businesses: [],
      starsData: [],
      reviews: [{ day: "2018-01-01", value: 10 }],
      categoryData: [],
      selectedBusiness: false,
      mapCenter: {
        latitude: 55.599575,
        longitude: 13.0059854,
        radius: 2.5,
        zoom: 8
      },
      startAddress: "",
      endAddress: "",
      pois: [],
      helpText: [
        "Drag me to search for places of interest to visit!",
        "Select two places to route between them!"
      ],
      debugMode: {debugRouting: false, debugPolygons: true, debugAreas: false, debugDistances: false, convexHull: false, allPolygons: false},
      regionPolygons: [],
      regionDistances: [],
      regionAreas: [],
      filterRegion: {},
      regionIds: [],
      amenityIds: [],
      filterAmenities: {},
      routeMode: "shortestpath"
    };
    this.regionsNY = {
      "manhattan": {"name": "Manhattan", id: 8398124},
      "brooklyn": {"name": "Brooklyn", id: 369518},
      "queens": {"name": "Queens", id: 369519},
      "bronx": {"name": "The Bronx", id: 2552450},
      "staten": {"name": "Staten Island", id: 962876}
    };
    this.regionsSF = {
      "corte_madera": {"name": "Corte Madera", id: 1260313},
      "mill_valley": {"name": "Mill Valley", id: 112703},
      "tiburon": {"name": "Tiburon", id: 2829690},
      "belvedere": {"name": "Belvedere", id: 2829688},
      "sausalito": {"name": "Sausalito", id: 2829689},
      "san_francisco": {"name": "San Francisco", id: 111968},
      "daly_city": {"name": "Daly City", id: 112271},
      "brisbane": {"name": "Brisbane", id: 2834528},
      "south_san_francisco": {"name": "South San Francisco", id: 2834558},
      "hillsborough": {"name": "Hillsborough", id: 112285},
      "san_mateo": {"name": "San Mateo", id: 2835017}
    };
    this.regions = {
      "Sweden": {"name": "Sweden", id: 4116216},
      "Blekinge": {"name": "Blekinge län", id: 54413},
      "Dalarnas": {"name": "Dalarnas län", id: 52834},
      "Gotlands": {"name": "Gotlands län", id: 941530},
      "Gävleborgs": {"name": "Gävleborgs län", id: 52832},
      "Hallands": {"name": "Hallands län", id: 54403},
      "Jämtlands": {"name": "Jämtlands län", id: 52826},
      "Jönköpings": {"name": "Jönköpings län", id: 54374},
      "Kalmar": {"name": "Kalmar län", id: 54417},
      "Kronobergs": {"name": "Kronobergs län", id: 54412},
      "Norrbottens": {"name": "Norrbottens län", id: 52824},
      "Skanör": {"name": "Skanör med Falsterbo", id: 43332835, isWay: true},
      "Skåne": {"name": "Skåne län", id: 54409},
      "Skåne (land)": {"name": "Skåne län (land)", id: 4473774},
      "Småland": {"name": "Småland län", id: 9691220},
      "Stockholms": {"name": "Stockholms län", id: 54391},
      "Södermanlands": {"name": "Södermanlands län", id: 54386},
      "Uppsala": {"name": "Uppsala län", id: 54220},
      "Ven": {"name": "Ven (island)", id: 3172367},
      "Värmlands": {"name": "Värmlands län", id: 54223},
      "Västerbottens": {"name": "Västerbottens län", id: 52825},
      "Västernorrlands": {"name": "Västernorrlands län", id: 52827},
      "Västmanlands": {"name": "Västmanlands län", id: 54221},
      "Västra Götalands": {"name": "Västra Götalands län", id: 54367},
      "Örebro": {"name": "Örebro län", id: 54222},
      "Östergötlands": {"name": "Östergötlands län", id: 940675}
    };
    this.regionsById = this.makeRegionsById();
    this.amenities = {
      "restaurant": {"name": "Restaurant"},
      "fast_food": {"name": "Fast Food"},
      "cafe": {"name": "Cafe"},
      "pub": {"name": "Pub"},
      "bar": {"name": "Bar"},
      "cinema": {"name": "Cinema"},
      "ice_cream": {"name": "Ice Cream"},
      "nightclub": {"name": "Nightclub"},
      "food_court": {"name": "Food Court"}
    };
    this.driver = neo4j.driver(
      process.env.REACT_APP_NEO4J_URI,
      neo4j.auth.basic(
        process.env.REACT_APP_NEO4J_USER,
        process.env.REACT_APP_NEO4J_PASSWORD
      ),
      { encrypted: false }
    );
    this.regionDistancesSession = null;
    this.fetchBusinesses();
  }

  toggleRegionSelected = point => {
    console.log("Event to find regions at: " + point);
    const session = this.driver.session();

    let query = `
      WITH point($location) AS location
      MATCH (r:OSMRelation)-[:POLYGON_STRUCTURE*]->(p)
        WHERE exists(p.polygon)
        AND spatial.algo.withinPolygon(location,p.polygon)
      RETURN r.relation_osm_id AS id`;
    session
        .run(query, {
          location: point
        })
        .then(result => {
          console.log(result);
          const region_ids = result.records.map(r => r.get("id").toNumber());
          // this.setState({pois});
          session.close();
          let elements = this.findRegions(region_ids);
          elements.forEach(element => this.updateRegionSelection(element));
        })
        .catch(e => {
          // TODO: handle errors.
          console.log(e);
          session.close();
        });
  };

  setStartAddress = startAddress => {
    this.setState({
      startAddress
    });
  };

  setEndAddress = endAddress => {
    this.setState({
      endAddress
    });
  };

  handleRouteChange = event => {
    const target = event.target;
    const value = target.value;
    this.setState(
      {
        routeMode: value
      },
      () => console.log(this.state.routeMode)
    );
  };

  handleDebugChange = event => {
    console.log(event);
    const target = event.target;
    var value = this.state.debugMode;
    value[target.name] = target.type === "checkbox" ? target.checked : target.value;

    this.setState({
      debugMode: value
    }, () => {
      this.fetchSelectedRegions();
      this.fetchRegionAreas();
      this.fetchRegionDistances();
    });
  };

  handleRegionFilterChange = event => {
    const target = event.target;
    this.updateRegionSelection(target);
  };

  updateRegionSelection = target => {
    console.log("Updating regions input element");
    console.log(target);
    let filterRegion = this.state.filterRegion;
    let regionIds = this.state.regionIds;
    if (this.regions[target.name]) {
      let regionId = this.regions[target.name]["id"];
      if (target.type === "checkbox" && target.checked) {
        if (!regionIds.includes(regionId)) {
          regionIds.push(regionId);
        }
        filterRegion[target.name] = true;
      } else {
        regionIds = regionIds.filter(e => e !== regionId);
        filterRegion[target.name] = false;
      }
    } else {
      console.log(`No such region: ${target.name}`);
    }
    console.log("Setting selected regions to " + regionIds);

    this.setState({
      filterRegion: filterRegion,
      regionIds: regionIds
    }, () => {
      this.fetchBusinesses();
      this.fetchSelectedRegions();
      this.fetchRegionAreas();
      this.fetchRegionDistances();
    });
  };

  handleAmenitiesFilterChange = event => {
    const target = event.target;
    this.updateAmenitiesSelection(target);
  };

  updateAmenitiesSelection = target => {
    console.log("Updating amenities input element");
    console.log(target);
    let filterAmenities = this.state.filterAmenities;
    let amenity = target.name;
    if (this.amenities[amenity]) {
      filterAmenities[amenity] = !!(target.type === "checkbox" && target.checked);
    } else {
      console.log(`No such amenity: ${amenity}`);
    }
    const amenityIds = Object.keys(filterAmenities).filter(key => !!filterAmenities[key]);
    console.log("Setting selected amenities to " + amenityIds);
    console.log(filterAmenities);

    this.setState({
      amenityIds: amenityIds,
      filterAmenities: filterAmenities
    }, () => {
      this.fetchBusinesses();
      this.fetchSelectedRegions();
      this.fetchRegionAreas();
      this.fetchRegionDistances();
    });
  };

  onFocusChange = focusedInput => this.setState({ focusedInput });

  businessSelected = b => {
    this.setState({
      selectedBusiness: b
    });
  };

  mapSearchPointChange = viewport => {
    this.setState({
      mapCenter: {
        ...this.state.mapCenter,
        latitude: viewport.latitude,
        longitude: viewport.longitude,
        zoom: viewport.zoom
      }
    });
  };

  // fetchStartMarker = () => {
  //   const { startAddress } = this.state;
  //   const session = this.driver.session();

  //   session
  //   .run(
  //     //`MATCH (a:Address) WHERE a.address CONTAINS toUpper($startAddress)
  //     // RETURN a.location.latitude AS latitude, a.location.longitude AS longitude, a.address AS address LIMIT 1;
  //     //`,
  //     `MATCH (p:PointOfInterest)

  //     `
  //     {
  //       startAddress
  //     }
  //   )
  //   .then(result => {
  //     console.log(result);
  //     const record = result.records[0];

  //     this.setState({
  //       startMarker: {
  //         latitude: record.get("latitude"),
  //         longitude: record.get("longitude"),
  //         address: record.get("address")
  //       }
  //     })
  //   })
  //   .catch(e => {
  //     console.log(e);
  //   })
  //   .finally(
  //     session.close()
  //   );
  // }

  // fetchRoute = () => {

  // }

  fetchBusinesses = () => {
    const { mapCenter } = this.state;
    const session = this.driver.session();

    let query;

    const amenityPredicate = (this.state.amenityIds && this.state.amenityIds.length > 0) ? "AND t.amenity IN $amenities" : "";
    if (this.state.regionIds && this.state.regionIds.length > 0) {
      console.log("Fetching points of interest within regions: " + this.state.regionIds);
      query = `MATCH (r:OSMRelation) USING INDEX r:OSMRelation(relation_osm_id)
        WHERE r.relation_osm_id IN $regionIds AND exists(r.polygon)
      WITH r.polygon as polygon
      MATCH (p:PointOfInterest)-[:TAGS]->(t:OSMTags)
        WHERE distance(p.location, point({latitude: $lat, longitude:$lon})) < ($radius * 1000)
        AND spatial.algo.withinPolygon(p.location,polygon)
        ${amenityPredicate}
      RETURN p AS poi, t.amenity AS amenity
      `;
    } else {
      console.log("Fetching all points of interest");
      query = `MATCH (p:PointOfInterest)-[:TAGS]->(t:OSMTags)
        WHERE distance(p.location, point({latitude: $lat, longitude:$lon})) < ($radius * 1000)
        ${amenityPredicate}
      RETURN p AS poi, t.amenity AS amenity`;
    }
    console.log(query);
    session
      .run(query, {
        lat: mapCenter.latitude,
        lon: mapCenter.longitude,
        radius: mapCenter.radius,
        regionIds: this.state.regionIds,
        amenities: this.state.amenityIds
      })
      .then(result => {
        console.log(result);
        const pois = result.records.map(r => {
          return {"poi": r.get("poi"), "amenity": r.get("amenity")};
        });
        this.setState({ pois });
        session.close();
      })
      .catch(e => {
        // TODO: handle errors.
        console.log(e);
        session.close();
      });
  };

  fetchSelectedRegions = () => {
    if (this.state.regionIds && this.state.debugMode.debugPolygons) {

      const session = this.driver.session();

      let queryResult = this.state.debugMode.convexHull ? "spatial.algo.convexHull(p.polygon)" : "p.polygon";
      let query = `MATCH (r:OSMRelation)-[:POLYGON_STRUCTURE*]->(p) USING INDEX r:OSMRelation(relation_osm_id)
        WHERE r.relation_osm_id IN $regionIds AND exists(p.polygon)
      RETURN r.relation_osm_id AS region_id, ${queryResult} as region
      `;
      console.log(query);

      session
          .run(query, {regionIds: this.state.regionIds})
          .then(result => {
            const regionPolygons = result.records.map(r => {
              let region_id = r.get("region_id");
              let polygon = r.get("region");
              let regionMap = this.regionsById[region_id];
              if (regionMap && !regionMap.location) {
                regionMap.location = this.averageLocation(polygon);
              }
              return polygon;
            });
            this.setState({regionPolygons});
            session.close();
          })
          .catch(e => {
            // TODO: handle errors.
            console.log(e);
            session.close();
          });
    } else {
      this.setState({regionPolygons: []});
    }
  };

  averageLocation = (points) => {
    var size = points.length;
    if (size < 1) size = 1;
    var x = 0.0;
    var y = 0.0;
    points.forEach(p => {
      x = x + p.x;
      y = y + p.y;
    });
    return {x: x / size, y: y / size};
  };

  fetchRegionDistances = () => {
    if (this.state.regionIds.length > 1 && this.state.debugMode.debugDistances) {

      if (this.regionDistancesSession) {
        console.log("Previous query for regionDistances running, terminating to make space for a new query");
        this.setState({regionDistances: []});
        this.regionDistancesSession.close();
      }
      this.regionDistancesSession = this.driver.session();

      let pairs = [];
      for (let i = 0; i < this.state.regionIds.length; i++) {
        let a = this.state.regionIds[i];
        for (let j = i + 1; j < this.state.regionIds.length; j++) {
          let b = this.state.regionIds[j];
          pairs.push([a, b]);
        }
      }

      let distanceFunc = this.state.debugMode.convexHull ? "spatial.algo.convexHull.distance.ends(s1, s2)" : "spatial.algo.distance.ends(s1, s2)";

      let query = this.state.debugMode.allPolygons ? `
      UNWIND $pairs AS pair
      MATCH (r1:OSMRelation)-[:POLYGON_STRUCTURE*]->(p1) USING INDEX r1:OSMRelation(relation_osm_id)
        WHERE r1.relation_osm_id=pair[0] AND exists(p1.polygon)
      OPTIONAL MATCH (r2:OSMRelation)-[:POLYGON_STRUCTURE*]->(p2) USING INDEX r2:OSMRelation(relation_osm_id)
        WHERE r2.relation_osm_id=pair[1] AND exists(p2.polygon)
      WITH pair, p1.polygon AS s1, p2.polygon AS s2
      RETURN pair, ${distanceFunc} AS distance
      ` : `
      UNWIND $pairs AS pair
      MATCH (r1:OSMRelation) USING INDEX r1:OSMRelation(relation_osm_id)
        WHERE r1.relation_osm_id=pair[0]
      OPTIONAL MATCH (r2:OSMRelation) USING INDEX r2:OSMRelation(relation_osm_id)
        WHERE r2.relation_osm_id=pair[1]
      WITH pair, spatial.osm.property.polygonShell(r1) AS s1, spatial.osm.property.polygonShell(r2) AS s2
      RETURN pair, ${distanceFunc} AS distance
      `;
      console.log(query);

      this.regionDistancesSession
          .run(query, {pairs: pairs})
          .then(result => {
            console.log("Got distances:");
            console.log(result);
            const regionDistances = result.records.map(r => [r.get("pair"), r.get("distance")]).filter(data => {
              const pair = data[0];
              const d = data[1];
              if (d.message) console.log("Distance[" + pair + "] message: " + d.message);
              if (d.error) console.log("Distance[" + pair + "] error: " + d.error);
              return (d.start && d.end);
            }).map(data => data[1]);
            this.setState({regionDistances});
            if (!this.regionDistancesSession) {
              this.regionDistancesSession.close();
              this.regionDistancesSession = null;
            }
          })
          .catch(e => {
            // TODO: handle errors.
            if (!this.regionDistancesSession) {
              this.regionDistancesSession.close();
              this.regionDistancesSession = null;
              console.log(e);
            } else {
              // The error is likely due to cancelling the query (due to new one comming in), so we simply log that fact, not the entire error
              console.log("Query for regionDistances cancelled by new event asking for regionDistances, server gave error: " + e.toString());
            }
          });
    } else {
      this.setState({regionDistances: []});
    }
  };

  fetchRegionAreas = () => {
    if (this.state.regionIds.length && this.state.debugMode.debugAreas) {

      const session = this.driver.session();

      let query = `
      MATCH (r:OSMRelation)-[:POLYGON_STRUCTURE*]->(p) USING INDEX r:OSMRelation(relation_osm_id)
        WHERE r.relation_osm_id IN $regionIds AND exists(p.polygon)
      RETURN r.relation_osm_id AS region_id, labels(p) AS labels, spatial.algo.area(p.polygon) AS area
      `;
      console.log(query);
      let x = 13.5;
      let y = 56.5;

      session
          .run(query, {regionIds: this.state.regionIds})
          .then(result => {
            console.log("Got areas:");
            console.log(result);
            const regionAreasObj = result.records.map(r => [r.get("region_id"), r.get("labels"), r.get("area")]).filter(data => {
              const area = data[2];
              return area > 0;
            }).reduce((acc, data) => {
              const region_id = data[0];
              const labels = data[1];
              const area = data[2];
              const regionMap = this.regionsById[region_id];
              if (!acc.hasOwnProperty(region_id)) {
                if (regionMap.location) {
                  acc[region_id] = {
                    x: regionMap.location.x,
                    y: regionMap.location.y,
                    area: 0.0,
                    name: regionMap.region.name
                  };
                } else {
                  console.log("Region missing average location: " + regionMap.region.name);
                  x = x + 0.5;
                  y = y + 1.0;
                  acc[region_id] = {x: x, y: y, area: 0.0, name: regionMap.region.name};
                }
              }
              var total = acc[region_id].area;
              if (labels.includes("Hole")) {
                console.log("Removing hole area " + area + " from total " + total + " for " + regionMap.region.name);
                total = total - area;
              } else {
                console.log("Adding shell area " + area + " to total " + total + " for " + regionMap.region.name);
                total = total + area;
              }
              acc[region_id].area = total;
              return acc;
            }, {});
            console.log("Updating areas data: " + regionAreasObj);
            console.log(regionAreasObj);
            const regionAreas = Object.values(regionAreasObj);
            console.log("Updating areas data: " + regionAreas);
            this.setState({regionAreas});
            session.close();
          })
          .catch(e => {
            // TODO: handle errors.
            console.log(e);
            session.close();
          });
    } else {
      this.setState({regionAreas: []});
    }
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (
      this.state.mapCenter.latitude !== prevState.mapCenter.latitude ||
      this.state.mapCenter.longitude !== prevState.mapCenter.longitude
    ) {
      this.fetchBusinesses();
    }
    if (
      this.state.selectedBusiness &&
      (!prevState.selectedBusiness ||
        this.state.selectedBusiness.id !== prevState.selectedBusiness.id ||
        false ||
        false)
    ) {
    }
  };

  handleSubmit = () => {};

  radiusChange = e => {
    this.setState(
      {
        mapCenter: {
          ...this.state.mapCenter,
          radius: Number(e.target.value)
        }
      },
      () => {
        this.fetchBusinesses();
      }
    );
  };

  dateChange = e => {
    if (e.target.id === "address-start") {
      this.setState(
        {
          startAddress: e.target.value
        },
        () => {
          this.fetchStartMarker();
          this.fetchRoute();
        }
      );
    } else if (e.target.id === "address-end") {
      this.setState(
        {
          endAddress: e.target.value
        },
        () => {
          this.fetchMarkers();
          this.fetchRoute();
        }
      );
    }
  };

  findRegions = (region_ids) => {
    console.log("Looking for regions: " + region_ids);
    console.log(region_ids);
    let elements = [];
    let keys = Object.keys(this.regions);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let region = this.regions[key];
      if (region_ids.includes(region.id)) {
        console.log("Matches: " + region.name);
        let input = document.getElementById("region-" + region.id);
        if (input) {
          console.log("Found input element");
          console.log(input);
          input.click();
          elements.push(input);
        } else {
          console.log("No such input element: " + key);
        }
      }
    }
    return elements
  };

  makeRegionsById = () => {
    console.log("Creating reverse lookup for regions by ID");
    let result = {};
    let keys = Object.keys(this.regions);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let region = this.regions[key];
      result[region.id] = {key: key, region: region};
    }
    return result;
  };

  createRegionCheckboxes = () => {
    let rows = [];
    let keys = Object.keys(this.regions);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let region = this.regions[key];
      let elementId = "region-" + region.id;
      rows.push(
        <div key={key} className="row">
          <input
            id={elementId}
            type="checkbox"
            name={key}
            checked={this.state.filterRegion[key]}
            onChange={this.handleRegionFilterChange}
          />
          {region.name}
        </div>
      )
    }
    return rows
  };

  createAmenitiesCheckboxes = () => {
    let rows = [];
    let keys = Object.keys(this.amenities);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let amenity = this.amenities[key];
      let elementId = "amenity-" + key;
      rows.push(
        <div key={key} className="row">
          <input
            id={elementId}
            type="checkbox"
            name={key}
            checked={this.state.filterAmenities[key]}
            onChange={this.handleAmenitiesFilterChange}
          />
          {amenity.name}
        </div>
      )
    }
    return rows
  };

  render() {
    return (
      <div id="app-wrapper">
        <div id="app-toolbar">
          <form action="" onSubmit={this.handleSubmit}>
            <div className="row tools">
              <div className="col-sm-2">
                <div className="tool radius">
                  <h5>Query Radius</h5>
                  <input
                    type="number"
                    id="radius-value"
                    className="form-control"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={this.state.mapCenter.radius}
                    onChange={this.radiusChange}
                  />
                  <select className="form-control" id="radius-suffix">
                    <option value="km">km</option>
                  </select>
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool coordinates">
                  <h5>Latitude</h5>
                  <input
                    type="number"
                    step="any"
                    id="coordinates-lat"
                    className="form-control"
                    placeholder="Latitude"
                    value={this.state.mapCenter.latitude}
                    onChange={() => true}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool coordinates">
                  <h5>Longitude</h5>
                  <input
                    type="number"
                    step="any"
                    id="coordinates-lng"
                    className="form-control"
                    placeholder="Longitude"
                    value={this.state.mapCenter.longitude}
                    onChange={() => true}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool timeframe">
                  <h5>Start POI</h5>
                  <input
                    type="text"
                    id="address-start"
                    className="form-control"
                    placeholder="Start address"
                    value={this.state.startAddress}
                    onChange={this.dateChange}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool timeframe">
                  <h5>End POI</h5>
                  <input
                    type="text"
                    id="address-end"
                    className="form-control"
                    placeholder="End address"
                    value={this.state.endAddress}
                    onChange={this.dateChange}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool" />
              </div>
            </div>
            <div className="row">
              <div className="col-sm-4" />
              <div className="col-sm-4" />
            </div>
          </form>
        </div>
        <div id="app-left-side-panel">
          <h2>Filter Region</h2>
          {this.createRegionCheckboxes()}
          <h2>Filter Amenities</h2>
          {this.createAmenitiesCheckboxes()}
          <h2>Route Algorithm</h2>
          <div className="row">
            <fieldset>
              <div>
                <input
                  type="radio"
                  id="shortestpath"
                  name="shortestpath"
                  value="shortestpath"
                  checked={this.state.routeMode === "shortestpath"}
                  onChange={this.handleRouteChange}
                />
                <label>Shortest Path</label>
              </div>

              <div>
                <input
                  type="radio"
                  id="dijkstra"
                  name="dijkstra"
                  value="dijkstra"
                  checked={this.state.routeMode === "dijkstra"}
                  onChange={this.handleRouteChange}
                />
                <label>Dijkstra</label>
              </div>

              <div>
                <input
                  type="radio"
                  id="astar"
                  name="astar"
                  value="astar"
                  checked={this.state.routeMode === "astar"}
                  onChange={this.handleRouteChange}
                />
                <label>A*</label>
              </div>
            </fieldset>
          </div>
          <h2>Options</h2>
          <div className="row">
            <input
              type="checkbox"
              name="debugRouting"
              checked={this.state.debugMode.debugRouting}
              onChange={this.handleDebugChange}
            />
            Debug Routing Graph
          </div>
          <div className="row">
            <input
              type="checkbox"
              name="debugPolygons"
              checked={this.state.debugMode.debugPolygons}
              onChange={this.handleDebugChange}
            />
            Show Selected Polygons
          </div>
          <div className="row">
            <input
              type="checkbox"
              name="debugAreas"
              checked={this.state.debugMode.debugAreas}
              onChange={this.handleDebugChange}
            />
            Show Polygon Areas
          </div>
          <div className="row">
            <input
              type="checkbox"
              name="debugDistances"
              checked={this.state.debugMode.debugDistances}
              onChange={this.handleDebugChange}
            />
            Show Distances between Polygons
          </div>
          <div className="row">
            <input
              type="checkbox"
              name="allPolygons"
              checked={this.state.debugMode.allPolygons}
              onChange={this.handleDebugChange}
            />
            Include sub-polygons in distances
          </div>
          <div className="row">
            <input
              type="checkbox"
              name="convexHull"
              checked={this.state.debugMode.convexHull}
              onChange={this.handleDebugChange}
            />
            Show Convex Hull
          </div>
        </div>

        <div>
          <div id="app-maparea">
            <Map
              mapSearchPointChange={this.mapSearchPointChange}
              mapCenter={this.state.mapCenter}
              businesses={this.state.pois}
              regionPolygons={this.state.regionPolygons}
              regionDistances={this.state.regionDistances}
              regionAreas={this.state.regionAreas}
              businessSelected={this.businessSelected}
              selectedBusiness={this.state.selectedBusiness}
              startMarker={this.state.startMarker}
              setStartAddress={this.setStartAddress}
              setEndAddress={this.setEndAddress}
              toggleRegionSelected={this.toggleRegionSelected}
              driver={this.driver}
              debugMode={this.state.debugMode}
              routeMode={this.state.routeMode}
              helpText={this.state.helpText}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
