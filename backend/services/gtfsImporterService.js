const axios = require("axios");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");
const mongoose = require("mongoose");
const RoutesModel = require("../gtfs_models/Routes.js");
const StopModel = require("../gtfs_models/Stop.js");
const TripModel = require("../gtfs_models/Trip.js");
const StopTimeModel = require("../gtfs_models/StopTime.js");
const ShapeModel = require("../gtfs_models/Shape.js.js");
const CalendarModel = require("../gtfs_models/Calendar.js");
const CalendarDateModel = require("../gtfs_models/CalendarDate.js");
const FareAttributeModel = require("../gtfs_models/FareAttribute.js");
const FareRuleModel = require("../gtfs_models/FareRule.js");
const AgencyModel = require("../gtfs_models/Agency.js");
const FeedInfoModel = require("../gtfs_models/FeedInfo.js");
const { getAccessToken } = require("./tokenService.js");
const RealtimeRouteModel = require("../gtfs_models/RealtimeRoute.js");
const DirectionModel = require("../gtfs_models/DirectionModel.js");
const {
  discoverGTFSFeeds,
  getGTFSFeedById,
} = require("./gtfsDiscoveryService.js");

let token = getAccessToken();

async function importGTFS(locationParams, preferredFeedId = null) {
  try {
    console.log("Discovering GTFS feeds for import...");

    let selectedFeed;
    let feedUrl;

    if (preferredFeedId) {
      // If feed ID is provided directly, fetch it specifically
      console.log(`Fetching specific GTFS feed: ${preferredFeedId}`);
      selectedFeed = await getGTFSFeedById(preferredFeedId);
      feedUrl = selectedFeed.latest_dataset?.hosted_url;
    } else {
      // Otherwise, discover feeds based on location parameters
      const feeds = await discoverGTFSFeeds(locationParams);

      if (feeds.length === 0) {
        throw new Error("No GTFS feeds found for the specified location");
      }

      selectedFeed = feeds[0];
      feedUrl = selectedFeed.latest_dataset?.hosted_url;
    }

    if (!feedUrl) {
      throw new Error(`No download URL available for feed ${selectedFeed.id}`);
    }

    console.log(
      `Selected GTFS feed: ${selectedFeed.id} - ${selectedFeed.feed_name}`
    );
    console.log(`Feed URL: ${feedUrl}`);

    // Proceed with the existing import logic
    console.log(` Downloading GTFS feed from ${feedUrl}`);

    const response = await axios.get(feedUrl, {
      responseType: "arraybuffer",
    });
    const zipBuffer = Buffer.from(response.data);

    const tempDir = path.join(__dirname, "../tmp", selectedFeed.id);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const zipPath = path.join(tempDir, "feed.zip");
    fs.writeFileSync(zipPath, zipBuffer);

    console.log(" Extracting GTFS zip...");
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    console.log(" Parsing and inserting data...");
    await parseAndInsert(tempDir, selectedFeed.id, feedUrl);

    console.log(" GTFS feed imported successfully!");

    return {
      success: true,
      feed: {
        id: selectedFeed.id,
        name: selectedFeed.feed_name,
        provider: selectedFeed.provider,
        url: feedUrl,
        locations: selectedFeed.locations,
        bounding_box: selectedFeed.bounding_box,
      },
      message: `Successfully imported GTFS data for ${selectedFeed.feed_name}`,
    };
  } catch (err) {
    console.error(" Error importing GTFS:", err.message);
    return {
      success: false,
      error: err.message,
      message: "Failed to import GTFS data",
    };
  }
}

async function parseAndInsert(folder, feedId, feedUrl) {
  const txtFiles = fs.readdirSync(folder).filter((f) => f.endsWith(".txt"));
  console.log(" Found GTFS files:", txtFiles.join(", "));

  for (const fileName of txtFiles) {
    const filePath = path.join(folder, fileName);
    switch (fileName) {
      case "agency.txt":
        await insertAgency(filePath, feedId);
        break;
      case "routes.txt":
        await insertRoutes(filePath, feedId);
        break;
      case "stops.txt":
        await insertStops(filePath, feedId);
        break;
      case "trips.txt":
        await insertTrips(filePath, feedId);
        break;
      case "stop_times.txt":
        await insertStopTimes(filePath, feedId);
        break;
      case "shapes.txt":
        await insertShapes(filePath, feedId);
        break;
      case "calendar.txt":
        await insertCalendar(filePath, feedId);
        break;
      case "calendar_dates.txt":
        await insertCalendarDates(filePath, feedId);
        break;
      case "fare_attributes.txt":
        await insertFareAttributes(filePath, feedId);
        break;
      case "fare_rules.txt":
        await insertFareRules(filePath, feedId);
        break;
      case "feed_info.txt":
        await insertFeedInfo(filePath, feedId, feedUrl);
        break;
      case "directions.txt":
        await insertDirections(filePath, feedId);
        break;
      case "realtime_routes.txt":
        await insertRealtimeRoutes(filePath, feedId);
        break;

      default:
        console.log(` Skipping optional file: ${fileName}`);
    }
  }

  console.log(` Completed import for feed ${feedId}`);
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", (row) => data.push(row))
      .on("end", () => resolve(data))
      .on("error", reject);
  });
}

async function insertRoutes(file, feedId) {
  const rows = await readCSV(file);
  const validRows = rows.filter((r) => r.route_id.trim() !== "");

  const docs = validRows.map((r) => ({
    feedId,
    route_id: r.route_id,
    agency_id: r.agency_id || null,
    route_short_name: r.route_short_name || "",
    route_long_name: r.route_long_name || "",
    route_desc: r.route_desc || "",
    route_type: r.route_type ? Number(r.route_type) : null,
    route_color: r.route_color || null,
    route_text_color: r.route_text_color || null,
  }));

  await RoutesModel.deleteMany({ feedId });
  if (docs.length) await RoutesModel.insertMany(docs);
  console.log(` Inserted ${docs.length} routes`);
}

async function insertStops(file, feedId) {
  const rows = await readCSV(file);
  const docs = rows
    .filter((r) => r.stop_lat && r.stop_lon)
    .map((r) => ({
      feedId,
      stop_id: r.stop_id,
      stop_code: r.stop_code || "",
      stop_name: r.stop_name || "",
      stop_desc: r.stop_desc || "",
      location: {
        type: "Point",
        coordinates: [parseFloat(r.stop_lon), parseFloat(r.stop_lat)],
      },
      zone_id: r.zone_id || "",
      stop_url: r.stop_url || "",
      location_type: r.location_type ? Number(r.location_type) : 0,
      parent_station: r.parent_station || "",
      wheelchair_boarding: r.wheelchair_boarding
        ? Number(r.wheelchair_boarding)
        : 0,
    }));

  await StopModel.deleteMany({ feedId });
  if (docs.length) await StopModel.insertMany(docs);
  console.log(` Inserted ${docs.length} stops`);
}

async function insertTrips(file, feedId) {
  const rows = await readCSV(file);
  const docs = rows.map((r) => ({
    feedId,
    route_id: r.route_id,
    service_id: r.service_id,
    trip_id: r.trip_id,
    trip_headsign: r.trip_headsign || "",
    trip_short_name: r.trip_short_name || "",
    direction_id: r.direction_id ? Number(r.direction_id) : 0,
    block_id: r.block_id || "",
    shape_id: r.shape_id || "",
    wheelchair_accessible: r.wheelchair_accessible
      ? Number(r.wheelchair_accessible)
      : 0,
  }));

  await TripModel.deleteMany({ feedId });
  if (docs.length) await TripModel.insertMany(docs);
  console.log(` Inserted ${docs.length} trips`);
}

async function insertStopTimes(file, feedId) {
  const rows = await readCSV(file);
  const docs = rows.map((r) => ({
    feedId,
    trip_id: r.trip_id,
    stop_id: r.stop_id,
    arrival_time: r.arrival_time || "",
    departure_time: r.departure_time || "",
    stop_sequence: r.stop_sequence ? Number(r.stop_sequence) : 0,
    stop_headsign: r.stop_headsign || "",
    pickup_type: r.pickup_type ? Number(r.pickup_type) : 0,
    drop_off_type: r.drop_off_type ? Number(r.drop_off_type) : 0,
    shape_dist_traveled: r.shape_dist_traveled
      ? parseFloat(r.shape_dist_traveled)
      : 0,
    timepoint: r.timepoint ? Number(r.timepoint) : 0,
  }));

  await StopTimeModel.deleteMany({ feedId });
  if (docs.length) await StopTimeModel.insertMany(docs);
  console.log(` Inserted ${docs.length} stop_times`);
}

async function insertShapes(file, feedId) {
  const rows = await readCSV(file);

  // Group points by shape_id
  const grouped = {};
  for (const row of rows) {
    const shapeId = row.shape_id;
    if (!grouped[shapeId]) grouped[shapeId] = [];
    grouped[shapeId].push([
      parseFloat(row.shape_pt_lon),
      parseFloat(row.shape_pt_lat),
    ]);
  }

  const docs = Object.entries(grouped).map(([shape_id, coordinates]) => ({
    feedId,
    shape_id,
    geometry: { type: "LineString", coordinates },
  }));

  await ShapeModel.deleteMany({ feedId });
  if (docs.length) await ShapeModel.insertMany(docs);
  console.log(` Inserted ${docs.length} shapes`);
}

async function insertCalendar(file, feedId) {
  const rows = await readCSV(file);
  const docs = rows.map((r) => ({
    feedId,
    service_id: r.service_id,
    monday: Number(r.monday || 0),
    tuesday: Number(r.tuesday || 0),
    wednesday: Number(r.wednesday || 0),
    thursday: Number(r.thursday || 0),
    friday: Number(r.friday || 0),
    saturday: Number(r.saturday || 0),
    sunday: Number(r.sunday || 0),
    start_date: parseDate(r.start_date),
    end_date: parseDate(r.end_date),
  }));

  await CalendarModel.deleteMany({ feedId });
  if (docs.length) await CalendarModel.insertMany(docs);
  console.log(` Inserted ${docs.length} calendar entries`);
}

async function insertCalendarDates(file, feedId) {
  const rows = await readCSV(file);
  const docs = rows.map((r) => ({
    feedId,
    service_id: r.service_id,
    date: parseDate(r.date),
    exception_type: Number(r.exception_type || 0),
  }));

  await CalendarDateModel.deleteMany({ feedId });
  if (docs.length) await CalendarDateModel.insertMany(docs);
  console.log(` Inserted ${docs.length} calendar_dates`);
}

async function insertFareAttributes(file, feedId) {
  const rows = await readCSV(file);
  const docs = rows.map((r) => ({
    feedId,
    fare_id: r.fare_id,
    price: parseFloat(r.price || 0),
    currency_type: r.currency_type || "",
    payment_method: Number(r.payment_method || 0),
    transfers: Number(r.transfers || 0),
    agency_id: r.agency_id || "",
  }));

  await FareAttributeModel.deleteMany({ feedId });
  if (docs.length) await FareAttributeModel.insertMany(docs);
  console.log(` Inserted ${docs.length} fare_attributes`);
}

async function insertFareRules(file, feedId) {
  const rows = await readCSV(file);
  const docs = rows.map((r) => ({
    feedId,
    fare_id: r.fare_id,
    route_id: r.route_id || "",
    origin_id: r.origin_id || "",
    destination_id: r.destination_id || "",
    contains_id: r.contains_id || "",
  }));

  await FareRuleModel.deleteMany({ feedId });
  if (docs.length) await FareRuleModel.insertMany(docs);
  console.log(` Inserted ${docs.length} fare_rules`);
}

async function insertAgency(file, feedId) {
  const rows = await readCSV(file);

  const docs = rows.map((r) => ({
    feedId,
    agency_id: r.agency_id || null,
    agency_name: r.agency_name || "",
    agency_url: r.agency_url || "",
    agency_timezone: r.agency_timezone || "",
    agency_lang: r.agency_lang || "",
    agency_phone: r.agency_phone || "",
    agency_fare_url: r.agency_fare_url || "",
    agency_email: r.agency_email || "",
  }));

  await AgencyModel.deleteMany({ feedId });
  if (docs.length) await AgencyModel.insertMany(docs);
  console.log(` Inserted ${docs.length} agencies`);
}

async function insertFeedInfo(file, feedId, feedUrl) {
  const rows = await readCSV(file);
  if (!rows.length) return;

  const r = rows[0]; // usually only one record
  const doc = {
    feedId,
    feed_publisher_name: r.feed_publisher_name || "",
    feed_publisher_url: r.feed_publisher_url || "",
    feed_lang: r.feed_lang || "",
    default_lang: r.default_lang || "",
    feed_start_date: r.feed_start_date ? parseDate(r.feed_start_date) : null,
    feed_end_date: r.feed_end_date ? parseDate(r.feed_end_date) : null,
    feed_version: r.feed_version || "",
    feed_contact_email: r.feed_contact_email || "",
    feed_contact_url: r.feed_contact_url || "",
    sourceUrl: feedUrl,
    downloadedAt: new Date(),
  };

  await FeedInfoModel.findOneAndUpdate({ feedId }, doc, { upsert: true });
  console.log(` Feed info imported for ${feedId}`);
}

async function insertDirections(file, feedId) {
  const rows = await readCSV(file);

  const docs = rows.map((r) => ({
    feedId,
    route_id: r.route_id || "",
    direction_id: r.direction_id ? Number(r.direction_id) : null,
    direction: r.direction || "",
  }));

  await DirectionModel.deleteMany({ feedId }); // Clear old data for same feed

  if (docs.length) await DirectionModel.insertMany(docs);

  console.log(` Inserted ${docs.length} directions`);
}

async function insertRealtimeRoutes(file, feedId) {
  const rows = await readCSV(file);

  const docs = rows.map((r) => ({
    feedId,
    route_id: r.route_id || "",
    realtime_enabled: r.realtime_enabled === "1" || r.realtime_enabled === 1,
  }));

  await RealtimeRouteModel.deleteMany({ feedId });
  if (docs.length) await RealtimeRouteModel.insertMany(docs);

  console.log(` Inserted ${docs.length} realtime_routes`);
}

function parseDate(str) {
  if (!str || str.length < 8) return null;
  const year = +str.slice(0, 4);
  const month = +str.slice(4, 6) - 1;
  const day = +str.slice(6, 8);
  return new Date(year, month, day);
}

module.exports = { importGTFS };
