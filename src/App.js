import React, { Component } from "react";
import "./App.css";
import Map from "./components/Map";
import neo4j from "neo4j-driver/lib/browser/neo4j-web";
import moment from "moment";

class App extends Component {
  constructor(props) {
    super(props);
    let focusedInput = null;

    this.state = {
      focusedInput,
      startDate: moment("2014-01-01"),
      endDate: moment("2018-01-01"),
      businesses: [],
      starsData: [],
      reviews: [{ day: "2018-01-01", value: 10 }],
      categoryData: [],
      selectedBusiness: false,
      mapCenter: {
        latitude: 40.7585862,
        longitude: -73.9858202,
        radius: 0.5,
        zoom: 16
      },
      startAddress: "",
      endAddress: "",
      pois: [],
      debugMode: true,
      routeMode: "shortestpath"
    };

    this.driver = neo4j.driver(
      process.env.REACT_APP_NEO4J_URI,
      neo4j.auth.basic(
        process.env.REACT_APP_NEO4J_USER,
        process.env.REACT_APP_NEO4J_PASSWORD
      ),
      { encrypted: false }
    );
    this.fetchBusinesses();
  }

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

  onDatesChange = ({ startDate, endDate }) => {
    if (startDate && endDate) {
      this.setState(
        {
          startDate,
          endDate
        },
        () => {
          this.fetchBusinesses();
        }
      );
    } else {
      this.setState({
        startDate,
        endDate
      });
    }
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
    const value = target.type === "checkbox" ? target.checked : target.value;

    this.setState({
      debugMode: value
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
    const { mapCenter, startDate, endDate } = this.state;
    const session = this.driver.session();
    session
      .run(
        `MATCH (p:PointOfInterest) WHERE distance(p.location, point({latitude: $lat, longitude:$lon})) < ( $radius * 1000)
         RETURN COLLECT({address: "", name: p.name, lat: p.location.latitude, lon: p.location.longitude, id: p.name + toString(p.location.latitude) + toString(p.location.longitude)}) AS pois
        `,
        // `
        // MATCH (a:Address)
        // WHERE a.street CONTAINS "W  45 ST" AND distance(a.location, point({latitude: $lat, longitude: $lon})) < ( $radius * 1000)
        // OPTIONAL MATCH (b)-[:IN_CATEGORY]->(c:Category)
        // RETURN COLLECT({address: a.address, lat: a.location.latitude, lon: a.location.longitude}) AS pois
        // `,
        {
          lat: mapCenter.latitude,
          lon: mapCenter.longitude,
          radius: mapCenter.radius
        }
      )
      .then(result => {
        console.log(result);
        const record = result.records[0];
        const pois = record.get("pois");

        this.setState({
          pois
        });
        session.close();
      })
      .catch(e => {
        // TODO: handle errors.
        console.log(e);
        session.close();
      });
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
                    max="2.0"
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
                <div className="tool">
                  <fieldset>
                    <div>
                      <input
                        type="radio"
                        id="shortestpath"
                        name="shortestpath"
                        value="shortestpath"
                        checked={
                          this.state.routeMode == "shortestpath" ? true : false
                        }
                        onChange={this.handleRouteChange}
                      />
                      <label for="shortestpath">Shortest Path</label>
                    </div>

                    <div>
                      <input
                        type="radio"
                        id="dijkstra"
                        name="dijkstra"
                        value="dijkstra"
                        checked={
                          this.state.routeMode == "dijkstra" ? true : false
                        }
                        onChange={this.handleRouteChange}
                      />
                      <label for="dijkstra">Dijkstra</label>
                    </div>

                    <div>
                      <input
                        type="radio"
                        id="astar"
                        name="astar"
                        value="astar"
                        checked={this.state.routeMode == "astar" ? true : false}
                        onChange={this.handleRouteChange}
                      />
                      <label for="astar">A*</label>
                    </div>
                  </fieldset>
                  <input
                    type="checkbox"
                    name="debug"
                    checked={this.state.debugMode ? true : false}
                    onChange={this.handleDebugChange}
                  />
                  Debug
                  {/* <h5>OSM Routing w/ Neo4j</h5>
                  <button id="refresh" className="btn btn-primary btn-block">
                    Refresh
                  </button> */}
                </div>
              </div>
            </div>
          </form>
        </div>
        <div>
          <div id="app-maparea">
            <Map
              mapSearchPointChange={this.mapSearchPointChange}
              mapCenter={this.state.mapCenter}
              businesses={this.state.pois}
              businessSelected={this.businessSelected}
              selectedBusiness={this.state.selectedBusiness}
              startMarker={this.state.startMarker}
              setStartAddress={this.setStartAddress}
              setEndAddress={this.setEndAddress}
              driver={this.driver}
              debugMode={this.state.debugMode}
              routeMode={this.state.routeMode}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
