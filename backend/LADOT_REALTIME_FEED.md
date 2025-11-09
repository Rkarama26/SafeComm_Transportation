# LADOT Realtime Feed Information

## LADOT (Los Angeles Department of Transportation) 

LADOT (mdb-1210) **DOES** have a realtime feed! It was showing as deprecated/old, but it's actually operational.

## Feed Details

```json
{
  "id": "mdb-1210",
  "provider": "Los Angeles Department of Transportation (LADOT, DASH, Commuter Express)",
  "feedName": "Bus",
  "dataType": "gtfs_rt",
  "entityTypes": ["vp"], // vp = vehicle positions only
  "staticFeedReferences": ["mdb-20"], // Links to static feed mdb-20
  "status": "deprecated", // Old but still working
  "isOfficial": true,
  "locations": [
    {
      "country_code": "US",
      "country": "United States",
      "subdivision_name": "California",
      "municipality": "Los Angeles"
    }
  ]
}
```

## Authentication Required 

This feed requires **API authentication**:

```json
{
  "authentication_type": 2, // Requires API key
  "authentication_info_url": "https://apidevelopers.ladottransit.com",
  "api_key_parameter_name": "Ocp-Apim-Subscription-Key"
}
```

**What this means:**

- You need to sign up at: https://apidevelopers.ladottransit.com
- Get an API key (subscription key)
- Pass it as header: `Ocp-Apim-Subscription-Key: YOUR_KEY`

## Producer URL

```
https://ladotbus.com/gtfs
```

This is the base URL. The actual realtime endpoints would be:

- Vehicle positions: `https://ladotbus.com/gtfs/vehiclepositions.pb`
- Trip updates: `https://ladotbus.com/gtfs/tripupdates.pb`
- Service alerts: `https://ladotbus.com/gtfs/alerts.pb`



## How to Use in SafeComm

### Step 1: Get LADOT API Key

Sign up at https://apidevelopers.ladottransit.com and get your subscription key.

### Step 2: Add to Environment Variables

```bash
LADOT_API_KEY=key_here
```

### Step 3: Fetch LADOT Realtime Feed

```bash
curl http://localhost:3000/api/gtfs-rt/feed/mdb-1210/urls
```

Response will include:

```json
{
  "id": "mdb-1210",
  "provider": "LADOT",
  "sourceInfo": {
    "producerUrl": "https://ladotbus.com/gtfs",
    "authenticationType": 2,
    "authenticationInfoUrl": "https://apidevelopers.ladottransit.com",
    "apiKeyParameterName": "Ocp-Apim-Subscription-Key"
  }
}
```

### Step 4: Add API Key Handling to Service

```javascript
// services/gtfsRealtimeService.js

async function fetchRealtimeDataWithAuth(feedUrl, feedId) {
  const headers = {
    "User-Agent": "SafeComm-Transit-Backend/1.0",
  };

  // Add API key if this is LADOT
  if (feedId === "mdb-1210" && process.env.LADOT_API_KEY) {
    headers["Ocp-Apim-Subscription-Key"] = process.env.LADOT_API_KEY;
  }

  const response = await axios.get(feedUrl, {
    headers,
    responseType: "arraybuffer",
    timeout: 15000,
  });

  return Buffer.from(response.data);
}
```

### Step 5: Update fetchRealtimeData

```javascript
// Instead of generic fetch, pass authentication header
const data = await fetchRealtimeDataWithAuth(url, feedId);
```

## Workflow for LADOT

```
1. API Key registered at LADOT Developer Portal
2. SafeComm backend configured with LADOT_API_KEY env var
3. Every 30 seconds:
   a. Fetch: https://ladotbus.com/gtfs/vehiclepositions.pb
   b. Add header: Ocp-Apim-Subscription-Key: [key]
   c. Parse protobuf
   d. Store vehicle positions in MongoDB
   e. Broadcast via WebSocket
4. Clients see live LADOT buses on map
```

## Current Status

-  LADOT realtime feed discovered
-  Feed metadata retrieved
-  API key registration needed
-  Authentication handling
-  Data fetching with auth
-  Protobuf parsing
-  Live vehicle updates

## Next Steps

1. **Get LADOT API Key**

   - Go to: https://apidevelopers.ladottransit.com
   - Register as developer
   - Request API key
   - Save to `.env`: `LADOT_API_KEY=...`

2. **Update Service to Handle Auth**

   - Modify `gtfsRealtimeService.js`
   - Add authentication header support
   - Pass API key with requests

3. **Test Feed Access**

   ```bash
   # Once you have the key, test:
   curl -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
     https://ladotbus.com/gtfs/vehiclepositions.pb \
     --output ladot_positions.pb

   file ladot_positions.pb  # Should show: data
   ```

4. **Parse & Store**
   - Use protobufjs to parse `.pb` file
   - Extract vehicle positions
   - Store in MongoDB
   - Query with geospatial indexes

## Feed References

- **Static Feed**: mdb-20 (LADOT static GTFS)
- **Realtime Feed**: mdb-1210 (This feed)
- **Entity Type**: vp (vehicle positions only)
- **License**: https://www.ladottransit.com/dla.html

## Documentation Links

- LADOT Developer Portal: https://apidevelopers.ladottransit.com
- LADOT Transit Info: https://www.ladottransit.com/
- GTFS-RT Specification: https://developers.google.com/transit/gtfs-realtime

## Good to Know

- LADOT's realtime feed is marked "deprecated" but still active
- Redirects to mdb-10 (older version reference)
- Only provides **vehicle positions** (vp), not trip updates
- Requires API authentication
- Part of LA's transit system (LADOT, DASH, Commuter Express)

---

## Integration Code Template

```javascript
// Add to services/gtfsRealtimeService.js

async function fetchLADOTRealtimeData() {
  try {
    const ladotApiKey = process.env.LADOT_API_KEY;
    if (!ladotApiKey) {
      throw new Error("LADOT_API_KEY not configured");
    }

    const url = "https://ladotbus.com/gtfs/vehiclepositions.pb";

    const response = await axios.get(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": ladotApiKey,
      },
      responseType: "arraybuffer",
      timeout: 15000,
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error fetching LADOT realtime data:", error.message);
    throw error;
  }
}

module.exports = {
  // ... existing exports
  fetchLADOTRealtimeData,
};
```

Ready to integrate!
