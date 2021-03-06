## osm-routing-app

Demonstrating routing with path finding algorithms using Neo4j graph database and data from OpenStreetMap.

* [create-react-app](https://github.com/facebook/create-react-app)
* [neo4j-javascript-driver](https://github.com/neo4j/neo4j-javascript-driver)
* [neo4j-graphql.js](https://grandstack.io/docs/neo4j-graphql-js.html)
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

This project is composed of a simple React web app and a GraphQL API created using neo4j-graphql.js. In addition, a Neo4j database with OpenStreetMap data is required.

## Database preparation

* Prepare the Neo4j database by importing OpenStreetMap data and extract the routing graph using [this library]().

TODO: example for POT / routing graph extract.

* Ensure each `PointOfInterest` node has a `poi_id` property set:

```
MATCH (a:PointOfInterest)
WITH a,a.name + toString(a.location.latitude) + toString(a.location.longitude) AS poi
SET a.poi_id = poi
```

* Install APOC and Graph Algorithms database plugins.

