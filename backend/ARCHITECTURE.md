# GTFS Realtime System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATION                            │
│        (Transit Safety Mobile App / Web Dashboard)               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS API                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          GTFS-RT Routes                                  │   │
│  │  GET /api/gtfs-rt/discover                               │   │
│  │  GET /api/gtfs-rt/static/:staticFeedId                   │   │
│  │  GET /api/gtfs-rt/feed/:realtimeFeedId                   │   │
│  │  GET /api/gtfs-rt/feed/:realtimeFeedId/urls              │   │
│  │  GET /api/gtfs-rt/feed/:realtimeFeedId/data              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ▲                                        │
│                          │                                        │
│  ┌──────────────────────┴──────────────────────────────────┐    │
│  │    GTFS-RT Controllers                                  │    │
│  │  - Handle HTTP requests                                │    │
│  │  - Validate parameters                                 │    │
│  │  - Format responses                                    │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                         │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Service Layer                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   gtfsRealtimeService.js                                 │   │
│  │                                                           │   │
│  │   Functions:                                             │   │
│  │   • discoverRealtimeFeeds()      - List all RT feeds      │   │
│  │   • findRealtimeFeedsForStaticFeed()  - Find by pair     │   │
│  │   • getRealtimeFeedById()        - Get feed details      │   │
│  │   • fetchRealtimeData()          - Fetch protobuf       │   │
│  │   • getRealtimeFeedUrls()        - Get download URLs    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ▼                                        │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          │ HTTP Requests
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│         MOBILITY DATABASE API                                    │
│   https://api.mobilitydatabase.org/v1                            │
│                                                                   │
│   Endpoints:                                                      │
│   • /gtfs_feeds/{id}           - Static feed details            │
│   • /gtfs_rt_feeds             - List realtime feeds            │
│   • /gtfs_rt_feeds/{id}        - Realtime feed details          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Returns feed metadata & URLs
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│    TRANSIT AGENCY REALTIME FEEDS                                │
│                                                                   │
│   Examples:                                                       │
│   • https://api.bart.gov/gtfsrt/vehicleposition.aspx            │
│   • https://api.bart.gov/gtfsrt/tripupdate.aspx                 │
│   • https://bustimes.org/api/gtfs-rt/vehiclepositions.pb        │
│                                                                   │
│   Returns: Protocol Buffer data (.pb files)                      │
│   Contains: VehiclePositions, TripUpdates, ServiceAlerts        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Raw protobuf bytes
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  [PHASE 2] PROTOBUF PARSER SERVICE                              │
│  services/gtfsRealtimeParser.js                                 │
│                                                                   │
│   • Parse Protocol Buffer format                                │
│   • Extract vehicle positions                                   │
│   • Extract trip updates (delays)                              │
│   • Extract service alerts                                     │
│   • Convert to JSON objects                                    │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Parsed JSON data
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              MONGODB DATABASE                                    │
│                                                                   │
│  Collections:                                                     │
│  • realtimefeedmetadatas     - Feed metadata                     │
│  • vehiclepositions          - Current vehicle locations (1h TTL)│
│  • tripupdates               - Trip delays/cancellations (1h TTL)│
│  • servicealerts             - Disruptions (7d retention)        │
│  • realtimefeedupdatelogs    - Audit trail (7d TTL)             │
│                                                                   │
│  Indexes:                                                         │
│  • vehiclepositions.location (2dsphere)  - Geospatial queries   │
│  • vehiclepositions.timestamp (TTL)      - Auto-expiration      │
│  • tripupdates.timestamp (TTL)           - Auto-expiration      │
└─────────────────────────────────────────────────────────────────┘
                          ▲
                          │
                          │
┌─────────────────────────┴─────────────────────────────────────────┐
│  [PHASE 3] REALTIME UPDATE SCHEDULER                             │
│  cronJobs/realtimeUpdateCron.js                                  │
│                                                                   │
│  Runs every 30 seconds:                                           │
│  1. Fetch realtime data from feed URLs                           │
│  2. Parse protobuf → JSON                                        │
│  3. Update database collections                                  │
│  4. Emit WebSocket updates                                       │
│                                                                   │
│  Flow:                                                            │
│  Fetch → Parse → Store → Broadcast                               │
└─────────────────────────────────────────────────────────────────┘
                          ▲
                          │
                          │ Updates every 30s
                          │
┌─────────────────────────┴─────────────────────────────────────────┐
│  [PHASE 4] WEBSOCKET STREAMING                                   │
│  middleware/realtimeSocket.js                                    │
│                                                                   │
│  Events:                                                          │
│  • vehicle-position-update    - New vehicle location             │
│  • trip-delay-update          - Delay changed                    │
│  • service-alert              - New disruption                   │
│                                                                   │
│  Filtering:                                                       │
│  • Only send data for subscribed routes                           │
│  • Only send data for requested area (geospatial)               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket events
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATION                            │
│   • Update vehicle markers on map                                │
│   • Show ETA predictions                                         │
│   • Display service alerts                                       │
│   • Stream live updates to user                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Static → Realtime Discovery

```
┌─────────────────────┐
│  Static Feed ID     │
│   (mdb-1247)        │
└────────────┬────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│ findRealtimeFeedsForStaticFeed()             │
│ Query: feed_references=["mdb-1247"]          │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Mobility Database API Response          │
│ [                                       │
│   {                                     │
│     id: "mdb-1248",                     │
│     provider: "LA Metro",               │
│     feed_references: ["mdb-1247"],      │
│     entity_types: ["vp", "tu", "sa"]    │
│   }                                     │
│ ]                                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ getRealtimeFeedUrls()              │
│ Extract download URLs              │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│ URLs Available:                                │
│ • https://...bus.metro.net/gtfsrt/vp.pb      │
│ • https://...bus.metro.net/gtfsrt/tu.pb      │
│ • https://...bus.metro.net/gtfsrt/sa.pb      │
└────────────┬─────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ fetchRealtimeData(url)             │
│ Download protobuf file             │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ [PHASE 2] parseProtobuf()          │
│ Convert to JSON objects            │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ [PHASE 3] Store in MongoDB         │
│ Update collections with fresh data │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ [PHASE 4] Broadcast via WebSocket  │
│ Send updates to clients            │
└────────────────────────────────────┘
```

## Current Implementation Status

### Implemented (Phase 1)

- [x] Service discovery via Mobility Database API
- [x] Finding feed pairs (static ↔ realtime)
- [x] Getting feed metadata and URLs
- [x] Fetching raw protobuf data
- [x] Error handling (401, 404, 429, 503, 504)
- [x] MongoDB models with TTL indexes
- [x] HTTP endpoints with validation
- [x] Comprehensive documentation

### ⏳ To Implement (Phase 2)

- [ ] Protobuf parser service
  - Parse `google.transit.realtime.FeedMessage`
  - Extract `vehicle_position`, `trip_update`, `alert`

### ⏳ To Implement (Phase 3)

- [ ] Cron job scheduler
  - Fetch every 30 seconds
  - Parse and store
  - Update timestamps

### ⏳ To Implement (Phase 4)

- [ ] WebSocket server
  - Real-time updates
  - Geospatial filtering
  - Route subscriptions

### ⏳ To Implement (Phase 5)

- [ ] Query APIs
  - GET `/api/gtfs-rt/vehicles/nearby`
  - GET `/api/gtfs-rt/trips/:id/eta`
  - GET `/api/gtfs-rt/routes/:id/active-vehicles`

## Key Points

1. **Not all static feeds have realtime** → Check first!
2. **Realtime feeds are separate** → Different IDs (mdb-36 static, mdb-35 realtime)
3. **Data expires** → Vehicles positions last 1 hour, alerts 7 days
4. **Geospatial queries ready** → Can find vehicles in area
5. **Protocol Buffer format** → Needs parser in Phase 2

## Database Schema Relationships

```
RealtimeFeedMetadata
├── id (mdb-35)
├── staticFeedReferences: ["mdb-36", ...]
├── realtimeUrls: [
│   ├── url
│   ├── type: "vehicle_position"
│   └── authentication
│   ]
└── isActive

VehiclePosition
├── realtimeFeedId: mdb-35
├── staticFeedId: mdb-36
├── vehicleId, tripId, routeId
├── location (geospatial)
└── timestamp (TTL: 1 hour)

TripUpdate
├── realtimeFeedId: mdb-35
├── staticFeedId: mdb-36
├── tripId, routeId
├── delay, status
├── stopTimeUpdates
└── timestamp (TTL: 1 hour)

ServiceAlert
├── realtimeFeedId: mdb-35
├── alertId
├── affectedRoutes, affectedStops
├── cause, effect, severity
└── activePeriods
```

This architecture separates concerns while allowing future enhancements like WebSocket streaming, predictive analytics, and real-time alerts!
