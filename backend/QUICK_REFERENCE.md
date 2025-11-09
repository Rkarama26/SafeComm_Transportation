# GTFS-RT Quick Reference

## What's This Service?

Fetches **live** transit data (vehicle positions, delays, alerts) from transit agencies that provide GTFS-RT feeds.

## The Problem

You can't just use any static GTFS feed's ID for realtime data. They're separate:

- Static: `mdb-1247` (LA Metro schedule)
- Realtime: `mdb-1248` (LA Metro live vehicles)

## The Solution

Our API finds which static feeds have realtime counterparts.

---

## 5-Second Examples

### "Does [Agency] have live tracking?"

```bash
curl http://localhost:3000/api/gtfs-rt/static/mdb-1247
# Returns realtime feed if available, or empty if not
```

### "Show me all realtime feeds available"

```bash
curl http://localhost:3000/api/gtfs-rt/discover?country_code=US&limit=10
# Lists 10 US agencies with realtime feeds
```

### "Get feed info"

```bash
curl http://localhost:3000/api/gtfs-rt/feed/mdb-1248
# Returns: provider, entity types, feed references
```

### "Get download URLs"

```bash
curl http://localhost:3000/api/gtfs-rt/feed/mdb-1248/urls
# Returns: vehicle_position_url, trip_update_url, service_alert_url
```

### "Get the actual live data"

```bash
curl http://localhost:3000/api/gtfs-rt/feed/mdb-1248/data \
  -H "Accept: application/x-protobuf" \
  --output data.pb
# Downloads protobuf file with current vehicle positions
```

---

## File Structure

```
backend/
├── services/
│   └── gtfsRealtimeService.js          ← Discovery & fetching logic
├── controllers/
│   └── gtfsRealtimeController.js       ← HTTP handlers
├── routes/
│   └── gtfsRealtimeRoutes.js           ← API endpoints
├── static_gtfs_models/
│   └── RealtimeModels.js               ← Database schemas
└── Documentation/
    ├── GTFS_REALTIME_GUIDE.md          ← Full guide
    ├── ARCHITECTURE.md                 ← System design
    ├── REALTIME_IMPLEMENTATION.md      ← Implementation status
    └── QUICK_REFERENCE.md              ← This file
```

---

## Current Capabilities (Phase 1)

| Feature                        | Status |
| ------------------------------ | ------ |
| Find realtime feeds by country | Ready  |
| Find realtime for static feed  | Ready  |
| Get feed metadata              | Ready  |
| Get download URLs              | Ready  |
| Fetch raw protobuf             | Ready  |
| Error handling                 | Ready  |
| Database models                | Ready  |

---

## Coming Soon (Phase 2+)

| Feature               | Timeline    |
| --------------------- | ----------- |
| Parse protobuf data   | Next sprint |
| Auto-update scheduler | Next sprint |
| WebSocket streaming   | Sprint 3    |
| Nearby vehicles API   | Sprint 3    |
| ETA predictions       | Sprint 4    |

---

## Common Agencies with Realtime

| City            | Static   | Realtime | Status      |
| --------------- | -------- | -------- | ----------- |
| Bay Area (BART) | mdb-36   | mdb-35   | Active      |
| LA Metro        | mdb-1247 | mdb-1248 | Active      |
| Chicago CTA     | mdb-746  | mdb-747  | Active      |
| NYC MTA         | mdb-1303 | mdb-1304 | Active      |
| DC WMATA        | mdb-1160 | mdb-1161 | Active      |
| LA LADOT        | mdb-1210 | None     | Static only |

---

## Error Messages Explained

| Error                         | Meaning                     | Solution                       |
| ----------------------------- | --------------------------- | ------------------------------ |
| `"...not found"`              | Feed doesn't exist          | Check feed ID                  |
| `"No realtime feeds found"`   | Static feed has no realtime | Use static GTFS instead        |
| `"No realtime URLs found"`    | Feed exists but no URLs     | Feed is misconfigured          |
| `"timed out"`                 | Feed URL unreachable        | Agency may be down             |
| `"401 Authentication failed"` | Token expired               | System refreshes automatically |
| `"429 Rate limit exceeded"`   | Too many requests           | Wait before retrying           |

---

## API Endpoint Reference

```
GET /api/gtfs-rt/discover
    ?country_code=US
    &provider=BART
    &limit=10

GET /api/gtfs-rt/static/:staticFeedId
    Returns realtime feeds for this static feed

GET /api/gtfs-rt/feed/:realtimeFeedId
    Get feed details (provider, entity types, etc)

GET /api/gtfs-rt/feed/:realtimeFeedId/urls
    Get download URLs for vehicle positions, trip updates, alerts

GET /api/gtfs-rt/feed/:realtimeFeedId/data
    Get raw protobuf data
    Header: Accept: application/x-protobuf
```

---

## Workflow: Step-by-Step

### Step 1: Find if an agency has realtime data

```bash
# I want to track LA Metro buses
curl http://localhost:3000/api/gtfs-rt/static/mdb-1247

# Response:
# [{id: "mdb-1248", provider: "LA Metro", ...}]
# Yes, realtime available!
```

### Step 2: Get the download URLs

```bash
curl http://localhost:3000/api/gtfs-rt/feed/mdb-1248/urls

# Response:
# {
#   id: "mdb-1248",
#   realtimeUrls: [
#     {url: "https://...vehicleposition.pb", type: "vehicle_position"},
#     {url: "https://...tripupdate.pb", type: "trip_update"},
#     {url: "https://...alerts.pb", type: "service_alert"}
#   ]
# }
```

### Step 3: Fetch live data

```bash
curl http://localhost:3000/api/gtfs-rt/feed/mdb-1248/data \
  --output current_positions.pb

# File contains: protobuf with all current vehicle positions
```

### Step 4: Parse & Store (Phase 2)

```
protobuf → Parse → Extract vehicles, trips, alerts
        → Store in MongoDB
        → Broadcast via WebSocket
```

### Step 5: Query (Phase 5)

```bash
# "Show me buses near me"
GET /api/gtfs-rt/vehicles/nearby?lat=34.05&lon=-118.25&radius=500

# "What's the ETA for this trip?"
GET /api/gtfs-rt/trips/trip-123/eta?stopId=stop-456
```

---

## Testing in Terminal

```bash
# Test 1: List realtime feeds
curl http://localhost:3000/api/gtfs-rt/discover?limit=5

# Test 2: Find BART realtime
curl http://localhost:3000/api/gtfs-rt/static/mdb-36

# Test 3: Get BART realtime feed info
curl http://localhost:3000/api/gtfs-rt/feed/mdb-35

# Test 4: Get BART feed URLs
curl http://localhost:3000/api/gtfs-rt/feed/mdb-35/urls

# Test 5: Download BART live data
curl http://localhost:3000/api/gtfs-rt/feed/mdb-35/data \
  -H "Accept: application/x-protobuf" \
  --output bart_live.pb && file bart_live.pb
```

---

## Key Takeaways

1. **Find First** - Check if agency has realtime data
2. **Get URLs** - Realtime feeds are at different URLs than static
3. 📥 **Fetch Data** - Downloads protobuf (binary format)
4. 🔀 **Parse** - Convert protobuf → JSON (Phase 2)
5. 💾 **Store** - Save in MongoDB with TTL (Phase 3)
6. 🔴 **Stream** - Send live updates to clients (Phase 4)
7. 📍 **Query** - Find nearby vehicles, ETAs, etc (Phase 5)

---

## Next Step

Once protobuf parser is ready:

```bash
npm install protobufjs
# Create: services/gtfsRealtimeParser.js
# Create: cronJobs/realtimeUpdateCron.js
```

Then vehicles will update in real-time every 30 seconds!

---

**Questions?** See full docs in `GTFS_REALTIME_GUIDE.md` and `ARCHITECTURE.md`
