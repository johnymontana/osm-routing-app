
export const typeDefs = /* GraphQL */ `

scalar Point

type LineSegment {
  startLat: Float
  endLat: Float
  startLon: Float
  endLon: Float
}

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

  unwalkedPaths: [LineSegment] @cypher(statement: """
  MATCH (p:Intersection)
  WHERE NOT 'Walked' IN labels(p)
  WITH p LIMIT 100
  MATCH (p)-[r]->(p2:Intersection)
  WHERE NOT 'Walked' IN labels(p2)
  RETURN {startLat: p.location.latitude, 
    startLon: p.location.longitude, 
    endLat: p2.location.latitude, 
    endLon: p2.location.longitude} AS segments
  """)

  walkedPaths: [LineSegment] @cypher(statement: """
  MATCH (p:Walked)
  WITH p LIMIT 100
  MATCH (p)-[r]->(p2:Walked)
  RETURN {startLat: p.location.latitude, 
    startLon: p.location.longitude, 
    endLat: p2.location.latitude, 
    endLon: p2.location.longitude} AS segments
  """)
}
`;
