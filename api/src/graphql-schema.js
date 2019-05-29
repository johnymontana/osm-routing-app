
export const typeDefs = `

scalar Point

type PointOfInterest {
  node_osm_id: Int!
  name: String
  lat: Float
  lon: Float
  location: Point
  poi_id: String
  shortestPathRouteToPOI(poi_id: String!): [LatLng] @cypher(statement: """
    MATCH (b:PointOfInterest) WHERE b.poi_id = $poi_id
    MATCH p=shortestPath((this)-[:ROUTE*..200]-(b))
    UNWIND nodes(p) AS n
    RETURN {lon: n.location.longitude, lat: n.location.latitude} AS route
  """)
  dijkstraRouteToPOI(poi_id: String): [LatLng] @cypher(statement: """
    MATCH (b:PointOfInterest) WHERE b.poi_id = $poi_id
    CALL apoc.algo.dijkstra(this, b, 'ROUTE', 'distance') YIELD path, weight
    UNWIND nodes(path) AS n
    RETURN {lon: n.location.longitude, lat: n.location.latitude} AS route
  """)
  aStarRouteToPOI(poi_id: String): [LatLng] @cypher(statement: """
    MATCH (b:PointOfInterest) WHERE b.poi_id = $poi_id
    CALL apoc.algo.aStar(this, b, 'ROUTE', 'distance', 'lat', 'lon') YIELD path, weight
    UNWIND nodes(path) AS n
    RETURN {lon: n.location.longitude, lat: n.location.latitude} AS route
  """)
}

type LatLng {
  lat: Float
  lon: Float
}

type Query {
  POIsInRadius(lat: Float, lon: Float, radius: Float): [PointOfInterest] @cypher(statement: """
  MATCH (p:PointOfInterest) 
  WHERE distance(p.location, point({latitude: $lat, longitude:$lon})) < ( $radius * 1000)
  RETURN p
  """)
}
`;
