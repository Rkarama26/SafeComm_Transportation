# SafeComm Transportation Backend

## Storyline

SafeComm is a community-based safety app aimed at improving public transportation by tracking real-time locations of public transit vehicles and providing safety ratings for routes and areas. The app helps users make informed decisions about their daily commutes based on real-time data and community feedback.

## Project Goal

The goal is to build a backend system that manages real-time tracking of public transportation, user interactions for safety ratings, and data storage for transit and user safety reports.

## Overview

A comprehensive real-time transit tracking system that provides live vehicle positions, trip delays, and service alerts for US transit agencies.

## System Architecture

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER REQUESTS                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS API SERVER                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Static GTFS   │  │  Real-time     │  │   Real-time     │     │
│  │   Import API    │  │  Discovery API │  │   Query API     │     │
│  │                 │  │                 │  │                 │     │
│  │ GET /api/gtfs   │  │ GET /api/gtfs-rt│  │ GET /api/gtfs-rt│     │
│  │ POST /api/gtfs  │  │ /discover       │  │ /vehicles/nearby│     │
│  │                 │  │ /feed/:id       │  │ /vehicles/:id   │     │
│  │ Static routes,  │  │ /feed/:id/urls │  │ /routes/:id/veh │     │
│  │ stops, trips    │  │                 │  │ /trips/:id/upd  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA PROCESSING                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Static GTFS   │  │  Real-time      │  │  Real-time      │     │
│  │   Import        │  │  Feed Discovery │  │  Data Parser    │     │
│  │                 │  │                 │  │                 │     │
│  │ Download ZIP    │  │ Query Mobility  │  │ Parse Protobuf  │     │
│  │ Parse CSV       │  │ Database API    │  │ Extract Entities│     │
│  │ Save to MongoDB │  │ Get feed URLs   │  │ Store in DB     │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Static GTFS   │  │  Real-time      │  │  Real-time      │     │
│  │   Feeds         │  │  Feed Registry  │  │  Live Data      │     │
│  │                 │  │                 │  │                 │     │
│  │ Transit agency  │  │ Mobility DB API │  │ Binary protobuf │     │
│  │ ZIP files       │  │ (50+ US feeds)  │  │ Every 30s       │     │
│  │ Routes, stops   │  │ Public feeds    │  │ Vehicle pos.    │     │
│  │ Trip schedules  │  │ only            │  │ Trip delays     │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE STORAGE                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Static Data   │  │  Live Vehicle   │  │  Live Trip      │     │
│  │   Collections   │  │  Positions      │  │  Updates        │     │
│  │                 │  │                 │  │                 │     │
│  │ Agency, Routes  │  │ Current loc.    │  │ Delays, status  │     │
│  │ Stops, Trips    │  │ Bearing, speed  │  │ Stop updates    │     │
│  │ Calendars       │  │ Geospatial idx  │  │ 1-hour TTL      │     │
│  │                 │  │ 1-hour TTL      │  │                 │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│  ┌─────────────────┐  ┌─────────────────┐                         │
│  │  Service Alerts │  │  Audit Trail    │                         │
│  │                 │  │                 │                         │
│  │ Disruptions     │  │ Update logs     │                         │
│  │ Warnings        │  │ Success/fail    │                         │
│  │ 7-day TTL       │  │ 30-day TTL      │                         │
│  └─────────────────┘  └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

###  Static GTFS Import

- Download and parse GTFS ZIP files from transit agencies
- Extract routes, stops, trips, calendars, and schedules
- Store in MongoDB with proper relationships

###  Real-time Feed Discovery

- Discover 50+ US transit agencies with live data
- Query Mobility Database API for feed metadata
- Filter for public feeds (authentication_type=0)
- Extract download URLs and entity types

###  Real-time Data Processing

- Parse binary GTFS-RT Protocol Buffer format
- Extract vehicle positions, trip updates, service alerts
- Automatic updates every 30 seconds
- Batch processing for optimal performance

###  Live Query APIs

- Find vehicles near a location (geospatial search)
- Get vehicle details and current status
- Query vehicles by route or trip
- Calculate estimated arrival times
- Retrieve active service alerts
- Monitor system health

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

```bash
# Clone repository
git clone 
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your MongoDB connection

# Start server
npm run dev
```

### Test the APIs

```bash
# Check server health
curl <localhost>/test

# Discover real-time feeds
curl <localhost>/api/gtfs-rt/discover

# Find nearby vehicles (Los Angeles example)
curl "<localhost>/api/gtfs-rt/vehicles/nearby?lat=34.0522&lon=-118.2437&radius=500"

# Check scheduler status
curl <localhost>/api/gtfs-rt/scheduler/status
```

## API Endpoints

### Static GTFS Import

```
POST /api/gtfs/import/:feedId    # Import static GTFS data
GET  /api/gtfs/agencies         # List imported agencies
GET  /api/gtfs/routes           # List routes
GET  /api/gtfs/stops            # List stops
GET  /api/gtfs/trips            # List trips
```

### Real-time Feed Discovery

```
GET  /api/gtfs-rt/discover                   # Discover all feeds
GET  /api/gtfs-rt/static/:staticFeedId       # Find RT feeds for static
GET  /api/gtfs-rt/feed/:realtimeFeedId       # Get feed details
GET  /api/gtfs-rt/feed/:realtimeFeedId/urls  # Get download URLs
GET  /api/gtfs-rt/feed/:realtimeFeedId/data  # Fetch raw protobuf
```

### Real-time Query APIs

```
GET  /api/gtfs-rt/vehicles/nearby?lat=X&lon=Y&radius=R  # Nearby vehicles
GET  /api/gtfs-rt/vehicles/:vehicleId                   # Vehicle details
GET  /api/gtfs-rt/routes/:routeId/vehicles              # Route vehicles
GET  /api/gtfs-rt/trips/:tripId/updates                 # Trip delays
GET  /api/gtfs-rt/trips/:tripId/eta?stopId=X            # ETA at stop
GET  /api/gtfs-rt/alerts                                # Service alerts
GET  /api/gtfs-rt/scheduler/status                      # System health
```

## Data Models

### Static GTFS Collections

- `Agency` - Transit agencies
- `Routes` - Bus/train routes
- `Stops` - Stop locations
- `Trips` - Scheduled trips
- `StopTimes` - Trip stop schedules
- `Calendar` - Service dates

### Real-time Collections

- `VehiclePosition` - Live vehicle locations (1-hour TTL)
- `TripUpdate` - Real-time delays (1-hour TTL)
- `ServiceAlert` - Disruptions (7-day TTL)
- `RealtimeFeedMetadata` - Feed registry
- `RealtimeFeedUpdateLog` - Audit trail

## Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Scheduling:** node-cron
- **Protobuf Parsing:** protobufjs
- **Geospatial:** MongoDB 2dsphere indexes
- **Data Sources:** Mobility Database API, GTFS-RT feeds

## Performance

- **Update Frequency:** Every 30 seconds
- **Feeds Monitored:** 50+ US agencies
- **Vehicles Tracked:** 2,000-3,000


## Development

### Scripts

```bash
npm run dev      # Development with nodemon
npm start        # Production
npm test         # Run tests
```

### Project Structure

```
backend/
├── config/           # Database, RabbitMQ config
├── controllers/      # HTTP request handlers
├── cronJobs/         # Scheduled tasks
├── middleware/       # Auth, validation, rate limiting
├── models/           # Mongoose schemas
├── routes/           # API route definitions
├── services/         # Business logic
├── static_gtfs_models/ # GTFS data models
├── tests/            # Test files
├── utils/            # Helper functions
├── app.js            # Express app setup
├── index.js          # Server startup
└── package.json      # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

'************************'

## Support

'************************'

