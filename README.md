## spacetime-routing

A React app to demonstrate how to use OpenStreetMap data for routing with Neo4j

* [create-react-app](https://github.com/facebook/create-react-app)
* [neo4j-javascript-driver](https://github.com/neo4j/neo4j-javascript-driver)
* [Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js/api/)


![](img/routing.gif)

## Installation 

Set environment variables:

```
REACT_APP_NEO4J_URI=XXX
REACT_APP_NEO4J_USER=XXX
REACT_APP_NEO4J_PASSWORD=XXX
REACT_APP_MAPBOX_TOKEN=XXX
```

these can be added to `.env`

Clone this git repo, and then

```
npm install
npm start
```

## Database preparation

Ensure each `PointOfInterest` node has a `poi_id` property set:

```
MATCH (a:PointOfInterest)
WITH a,a.name + toString(a.location.latitude) + toString(a.location.longitude) AS poi
SET a.poi_id = poi
```

