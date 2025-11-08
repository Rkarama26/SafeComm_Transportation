┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Request  │───▶│ Discovery API    │───▶│ Mobility DB API │
│ (Location Params)│    │ (getFeedById)   │    │ (Returns feeds)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐             │
│   Import Request│◀───│ Import Controller│◀────────────┘
│   (feedId only) │    │ (calls discovery)│
└─────────────────┘    └──────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Download ZIP    │───▶│ Parse CSV Files  │───▶│ Save to MongoDB │
│ from hosted_url │    │ (routes, stops,  │    │ (static_gtfs_   │
│                 │    │  trips, etc.)    │    │  models)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘