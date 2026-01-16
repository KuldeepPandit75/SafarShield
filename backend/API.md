## SafarMate Backend API

This document describes all public API endpoints exposed under the base path `/api` for frontend integration.

### Base
- **Base path**: `/api`
- **CORS**: `*`
- **Auth**: none
- **Content types**:
  - JSON for core endpoints
  - `text/plain` for USSD/SMS responses
  - JSON for WhatsApp responses

### Response envelope
- **Success (ApiResponse)**:
```json
{
  "data": {"...": "..."},
  "statusCode": 200,
  "message": "success",
  "success": true
}
```
- **Error (ApiError)**:
```json
{
  "data": null,
  "statusCode": 400,
  "message": "reason",
  "success": false,
  "error": []
}
```

---

## Core: Buses

### Create bus
- **Method**: POST
- **Path**: `/api/buses`
- **Body (JSON)**:
```json
{
  "id": "b21",
  "route_id": "r21",
  "plate": "KAA-123A",
  "seat_count": 40,
  "status": "active"
}
```
- **201 Response**:
```json
{
  "data": {"id":"b21","route_id":"r21","plate":"KAA-123A","seat_count":40,"status":"active","_id":"..."},
  "statusCode": 201,
  "message": "Bus created",
  "success": true
}
```
- **Errors**: 400 (missing fields), 404 (route not found), 409 (duplicate)

### Update bus location
- **Method**: POST
- **Path**: `/api/buses/:busId/location`
- **Query params**:
  - `lat`: string/number
  - `longitude`: string/number
  - `s`: speed
  - `heading`: degrees
- **200 Response**:
```json
{ "status": "created" }
```
or
```json
{ "status": "updated" }
```
- **Notes**: Writes to Redis; no strict validation on presence/types of query params.

### Get bus location
- **Method**: GET
- **Path**: `/api/buses/:busId/location`
- **200 Response**:
```json
{
  "data": {
    "busId": "b21",
    "lat": "-1.2921",
    "lng": "36.8219",
    "speed": "12.3",
    "heading": "90",
    "updated_at": "2025-09-11T12:34:56.000Z"
  },
  "statusCode": 200,
  "message": "Location fetched",
  "success": true
}
```
- **Errors**: 400 (missing id), 404 (not found in Redis)

### Get ETA from bus to stop
- **Method**: GET
- **Path**: `/api/buses/:busId/:stopId`
- **200 Response**:
```json
{
  "data": {
    "distance_meters": 4321.5,
    "duration_seconds": 610.2,
    "provider_status": "OK"
  },
  "statusCode": 200,
  "message": "ETA computed",
  "success": true
}
```
- **Errors**: 400 (invalid coords), 404 (bus location or stop not found), 502 (OSRM failure)
- **Notes**: OSRM returns duration in seconds; convert to minutes client-side if needed.

### List buses on a stop’s route
- **Method**: GET
- **Path**: `/api/buses/:stopId`
- **200 Response**:
```json
{
  "data": { "route_id": "r21", "buses": ["b21","b31"] },
  "statusCode": 200,
  "message": "Buses on route",
  "success": true
}
```
- **Errors**: 404 (no route for provided stopId)

---

## Core: Routes

### Create route
- **Method**: POST
- **Path**: `/api/routes`
- **Body (JSON)**:
```json
{
  "id": "r21",
  "code": "21",
  "name": "CBD → Westlands",
  "active": true,
  "stops": [
    { "id": "s21a", "name": "CBD", "lat": -1.286389, "lng": 36.817223, "sequence": 1 },
    { "id": "s21b", "name": "Museum", "lat": -1.270, "lng": 36.812, "sequence": 2 }
  ]
}
```
- **201 Response**:
```json
{
  "data": { "...persisted route doc..." },
  "statusCode": 201,
  "message": "Route created",
  "success": true
}
```
- **Errors**: 400 (missing id/code/name or invalid stops), 409 (duplicate)

### Get route id for a stop
- **Method**: GET
- **Path**: `/api/routes/stops/:stopId`
- **200 Response**:
```json
{
  "data": { "stop_id": "s21a", "route_id": "r21" },
  "statusCode": 200,
  "message": "Route for stop",
  "success": true
}
```
- **Errors**: 400, 404

### List all stops with route ids
- **Method**: GET
- **Path**: `/api/routes/stops`
- **200 Response**:
```json
{
  "data": {
    "stops": [
      { "stop_id": "s21a", "route_id": "r21", "name": "CBD", "lat": -1.286389, "lng": 36.817223, "sequence": 1 }
    ]
  },
  "statusCode": 200,
  "message": "All stops with route ids",
  "success": true
}
```

### Compute ETA between two points
- **Method**: GET
- **Preferred usage (matches controller)**: `/api/routes?orig_lat=-1.29&orig_lng=36.82&dest_lat=-1.27&dest_lng=36.81`
- **Note**: Current router is wired as `/api/routes/:orig_lat/:orig_lng/:dest_lat/:dest_lng` but the controller reads query params. Use the query form above or update backend to read path params.
- **200 Response**: same as bus ETA
```json
{
  "data": {
    "distance_meters": 4321.5,
    "duration_seconds": 610.2,
    "provider_status": "OK"
  },
  "statusCode": 200,
  "message": "ETA computed",
  "success": true
}
```

---

## Channel adapters

These are primarily for telco/chat integrations; they can be invoked from the frontend for demos/testing.

### USSD
- **Method**: POST
- **Path**: `/api/ussd`
- **Body**:
```json
{ "sessionId": "abc", "phoneNumber": "+2547...", "text": "1*s21a" }
```
- **Response**: `text/plain`, content starts with `CON` (continue) or `END` (final)
```
CON Select Option:
1. Track Bus
2. Seat Availability
```

### SMS
- **Method**: POST
- **Path**: `/api/sms`
- **Body**:
```json
{ "phoneNumber": "+2547...", "text": "TRACK s21a", "sessionId": "abc" }
```
- **Response**: `text/plain`
```
Next bus for 21 arriving in 8 mins. 40 seats available.
```

### WhatsApp
- **Method**: POST
- **Path**: `/api/whatsapp`
- **Body**:
```json
{ "from": "+2547...", "text": "SEATS b1", "sessionId": "abc" }
```
- **200 Response**:
```json
{ "reply": "Bus b1: 40 seats available." }
```

---

## cURL examples

```bash
# Create bus
curl -X POST http://localhost:3000/api/buses \
  -H "Content-Type: application/json" \
  -d '{"id":"b21","route_id":"r21","plate":"KAA-123A"}'

# Update bus location
curl -X POST "http://localhost:3000/api/buses/b21/location?lat=-1.29&longitude=36.82&s=10.5&heading=90"

# Get bus location
curl http://localhost:3000/api/buses/b21/location

# Get ETA bus→stop
curl http://localhost:3000/api/buses/b21/s21a

# Get buses on stop’s route
curl http://localhost:3000/api/buses/s21a

# Create route
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{"id":"r21","code":"21","name":"CBD → Westlands"}'

# List stops
curl http://localhost:3000/api/routes/stops

# Route for stop
curl http://localhost:3000/api/routes/stops/s21a

# ETA between two points (query form)
curl "http://localhost:3000/api/routes?orig_lat=-1.29&orig_lng=36.82&dest_lat=-1.27&dest_lng=36.81"
```

---

## Notes for frontend
- Numeric fields from Redis may be strings; coerce as needed.
- OSRM durations are seconds; convert to minutes for display.
- USSD/SMS return raw text; no JSON envelope.


