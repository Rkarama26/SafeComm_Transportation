# GTFS Realtime (GTFS-RT) System Guide

## Overview

This system handles **GTFS Realtime** feeds - live transit data including:

- **Vehicle Positions** - Where buses/trains currently are
-  **Trip Updates** - Delays, cancellations, predictions
-  **Service Alerts** - Disruptions, detours, warnings

## Key Concepts

### Static vs Realtime

| Aspect               | GTFS (Static)                        | GTFS-RT (Realtime)                     |
| -------------------- | ------------------------------------ | -------------------------------------- |
| **Data**             | Schedules, routes, stops, timetables | Live vehicle positions, delays, alerts |
| **Format**           | ZIP with CSV files                   | Protocol Buffer (.pb)                  |
| **Update Frequency** | Monthly/quarterly                    | Every 5-30 seconds                     |
| **Use Case**         | Trip planning, route maps            | Live tracking, ETA, disruptions        |

### Not Every Static Feed Has Realtime

- **LADOT (mdb-1210)**: Static only
- **BART (mdb-36)**: Has realtime (mdb-35)
- **LA Metro (mdb-1247)**: Has realtime (mdb-1248)
- **Chicago CTA (mdb-746)**: Has realtime (mdb-747)

## API Endpoints

### 1. Discover Available Realtime Feeds

```bash
# Get all realtime feeds (US)
curl http://localhost:3000/api/gtfs-rt/discover?country_code=US&limit=10

# Get realtime feeds for specific country/provider
curl "http://localhost:3000/api/gtfs-rt/discover?country_code=US&provider=BART"
```

**Response:**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "mdb-35",
      "provider": "BART (Bay Area Rapid Transit)",
      "feed_references": ["mdb-36"], // ← Links to static feed
      "entity_types": ["vp", "tu"], // vp=vehicle positions, tu=trip updates
      "source_info": {
        "producer_url": "https://api.bart.gov/gtfsrt/...",
        "authentication_type": 0
      }
    }
  ]
}
```

### 2. Find Realtime Feeds for a Static Feed

```bash
# Given a static feed ID, find its realtime counterpart
curl http://localhost:3000/api/gtfs-rt/static/mdb-36
```

**Response:**

```json
{
  "success": true,
  "staticFeedId": "mdb-36",
  "count": 1,
  "data": [
    {
      "id": "mdb-35",
      "provider": "BART",
      "feed_references": ["mdb-36"]
    }
  ]
}
```

### 3. Get Realtime Feed Details

```bash
# Get detailed info about a realtime feed
curl http://localhost:3000/api/gtfs-rt/feed/mdb-35
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "mdb-35",
    "provider": "BART",
    "entity_types": ["vp", "tu", "sa"],
    "feed_references": ["mdb-36"],
    "source_info": {
      "producer_url": "https://api.bart.gov/gtfsrt/tripupdate.aspx",
      "authentication_type": 0
    }
  }
}
```

### 4. Get Realtime Feed URLs

```bash
# Get the actual URL(s) to fetch realtime data from
curl http://localhost:3000/api/gtfs-rt/feed/mdb-35/urls
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "mdb-35",
    "provider": "BART",
    "staticFeedReferences": ["mdb-36"],
    "entityTypes": ["vp", "tu"],
    "realtimeUrls": [
      {
        "url": "https://api.bart.gov/gtfsrt/tripupdate.aspx",
        "type": "trip_update",
        "authentication": 0
      },
      {
        "url": "https://api.bart.gov/gtfsrt/vehicleposition.aspx",
        "type": "vehicle_position",
        "authentication": 0
      }
    ]
  }
}
```

### 5. Get Raw Realtime Data (Protobuf)

```bash
# Fetch the actual protobuf realtime feed
curl http://localhost:3000/api/gtfs-rt/feed/mdb-35/data \
  -H "Accept: application/x-protobuf" \
  --output realtime.pb
```

This returns the raw Protocol Buffer data containing live vehicle positions, trip updates, and service alerts.

## Data Models

### VehiclePosition

Stores current vehicle locations with geospatial indexing for "nearby vehicles" queries:

```javascript
{
  vehicleId: "1234",
  tripId: "trip-123",
  routeId: "route-1",
  latitude: 37.7749,
  longitude: -122.4194,
  bearing: 45,          // Direction in degrees
  speed: 8.5,           // m/s
  location: {
    type: "Point",
    coordinates: [-122.4194, 37.7749]  // [lon, lat]
  },
  timestamp: "2025-11-09T10:30:00Z"
}
```

**Expiration:** 1 hour (TTL index)

### TripUpdate

Stores predictions and delays for trips:

```javascript
{
  tripId: "trip-123",
  routeId: "route-1",
  status: "SCHEDULED",        // SCHEDULED, ADDED, CANCELED
  delay: 120,                 // seconds
  stopTimeUpdates: [
    {
      stopId: "stop-456",
      stopSequence: 1,
      arrival: {
        time: "2025-11-09T10:35:00Z",
        delay: 120
      },
      departure: {
        time: "2025-11-09T10:36:00Z",
        delay: 120
      }
    }
  ],
  timestamp: "2025-11-09T10:30:00Z"
}
```

**Expiration:** 1 hour (TTL index)

### ServiceAlert

Stores disruption information:

```javascript
{
  alertId: "alert-789",
  affectedRoutes: ["route-1", "route-2"],
  affectedStops: ["stop-100", "stop-101"],
  cause: "TECHNICAL_PROBLEM",
  effect: "REDUCED_SERVICE",
  headerText: "Bus delays expected",
  descriptionText: "Signal problems on line 1",
  severity: "WARNING",
  activePeriods: [
    {
      start: "2025-11-09T10:00:00Z",
      end: "2025-11-09T12:00:00Z"
    }
  ],
  timestamp: "2025-11-09T10:30:00Z"
}
```

## Workflow: Find & Track Live Buses

### Step 1: Find if Transit Agency Has Realtime Data

```bash
# Check if your static feed has realtime
curl http://localhost:3000/api/gtfs-rt/static/mdb-1247
# Returns empty [] if no realtime data available
# Returns [{id: "mdb-1248", ...}] if realtime is available
```

### Step 2: Get the Realtime Feed URLs

```bash
curl http://localhost:3000/api/gtfs-rt/feed/mdb-1248/urls
# Shows the actual URLs to fetch live data from
```

### Step 3: Query Vehicle Positions

```bash
# (Once protobuf parser is integrated)
# Query nearby vehicles
GET /api/gtfs-rt/vehicles/nearby?lat=34.05&lon=-118.25&radius=500&routeId=1

# Get vehicle position for specific trip
GET /api/gtfs-rt/vehicles/trip/:tripId

# Get live ETA for a trip at a stop
GET /api/gtfs-rt/trips/:tripId/eta?stopId=stop-123
```

## Next Steps: Protobuf Parsing

To actually process the realtime feeds, you need to:

1. **Install protobuf library:**

   ```bash
   npm install protobufjs
   ```

2. **Get GTFS-RT protobuf definitions:**

   ```bash
   # These are standardized GTFS-RT message formats
   # https://developers.google.com/transit/gtfs-realtime
   ```

3. **Create a parser service:**

   ```javascript
   // services/gtfsRealtimeParser.js
   // Parse protobuf → Extract vehicle positions, trip updates, alerts
   // Store in MongoDB models
   ```

4. **Create a scheduler:**
   ```javascript
   // cronJobs/realtimeUpdateCron.js
   // Fetch realtime data every 30 seconds
   // Parse and store in database
   // Broadcast via WebSocket to clients
   ```

## Example: Complete Workflow

```javascript
// 1. Find realtime feed for LA Metro
const rtFeeds = await gtfsRealtimeService.findRealtimeFeedsForStaticFeed(
  "mdb-1247"
);

// 2. Get URLs for realtime data
const urls = await gtfsRealtimeService.getRealtimeFeedUrls(rtFeeds[0].id);

// 3. Fetch realtime protobuf data
const protoData = await gtfsRealtimeService.fetchRealtimeData(
  urls.realtimeUrls[0].url
);

// 4. Parse protobuf (requires parser service)
const parsed = parseProtobuf(protoData);

// 5. Store in database
await VehiclePositionModel.insertMany(parsed.vehiclePositions);
await TripUpdateModel.insertMany(parsed.tripUpdates);

// 6. Query nearby buses
const nearbyBuses = await VehiclePositionModel.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-118.25, 34.05] },
      $maxDistance: 500,
    },
  },
});
```

## Error Handling

### Feed Not Found

```json
{
  "detail": "GTFS realtime Feed 'mdb-1210' not found"
}
```

**Solution:** This feed is static-only. Use the static GTFS import instead.

### No Realtime URLs

```json
{
  "success": false,
  "message": "No realtime URLs found for feed mdb-35"
}
```

**Solution:** Feed exists but URLs aren't configured. Check Mobility Database directly.

### Feed Timeout

```json
{
  "success": false,
  "message": "Realtime feed request timed out"
}
```

**Solution:** Feed URL is unreachable. May be temporarily down or authentication required.

## Summary

**What's Ready:**

- Discover realtime feeds
- Find feed pairs (static ↔ realtime)
- Get feed URLs and metadata
- Fetch raw protobuf data

 **What's Next:**

- Parse protobuf into vehicle positions/trip updates/alerts
- Store in database with TTL
- Create WebSocket for live updates
- Query APIs for specific vehicle/trip data
