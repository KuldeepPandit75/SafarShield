// In-memory demo datastore that mirrors production repository interfaces.
// Swap these implementations with real DB/ORM later without changing services.

import { randomUUID } from 'crypto';

// ---------- Core Entities (Demo Data) ----------

const routes = [
  { id: 'r1', code: '1', name: 'City Center — Airport', active: true },
  { id: 'r21', code: '21', name: 'Ring Road Loop', active: true },
];

const stops = [
  // Route r1
  { id: 's1', route_id: 'r1', name: 'City Center', lat: -1.283, lng: 36.817, sequence: 1 },
  { id: 's2', route_id: 'r1', name: 'Museum', lat: -1.291, lng: 36.815, sequence: 2 },
  { id: 's3', route_id: 'r1', name: 'Highway Junction', lat: -1.321, lng: 36.843, sequence: 3 },
  { id: 's4', route_id: 'r1', name: 'Airport Terminal', lat: -1.319, lng: 36.927, sequence: 4 },
  // Route r21
  { id: 's21a', route_id: 'r21', name: 'North Gate', lat: -1.250, lng: 36.850, sequence: 1 },
  { id: 's21b', route_id: 'r21', name: 'East Gate', lat: -1.280, lng: 36.910, sequence: 2 },
  { id: 's21c', route_id: 'r21', name: 'South Gate', lat: -1.330, lng: 36.870, sequence: 3 },
  { id: 's21d', route_id: 'r21', name: 'West Gate', lat: -1.290, lng: 36.800, sequence: 4 },
];

const buses = [
  { id: 'b1', route_id: 'r1', plate: 'KAA-123A', seat_count: 40, status: 'active', last_seen_at: new Date().toISOString() },
  { id: 'b21', route_id: 'r21', plate: 'KBB-221B', seat_count: 30, status: 'active', last_seen_at: new Date().toISOString() },
];

// Bus live locations (cache-like). In production, this lives in Redis.
export const busLocations = new Map([
  [
    'b1',
    {
      bus_id: 'b1',
      lat: -1.305,
      lng: 36.860,
      speed: 38,
      heading: 105,
      updated_at: new Date(Date.now() - 15_000).toISOString(),
    },
  ],
  [
    'b21',
    {
      bus_id: 'b21',
      lat: -1.285,
      lng: 36.885,
      speed: 25,
      heading: 45,
      updated_at: new Date(Date.now() - 20_000).toISOString(),
    },
  ],
]);

// Seat ledger: holds and reservations. In production, this would be a table with row locks.
// status: 'hold' | 'reserved' | 'cancelled'
const seatLedger = [
  // Example: 2 seats held on b1 (expires in ~2 minutes)
  {
    id: randomUUID(),
    bus_id: 'b1',
    seat_count: 2,
    status: 'hold',
    hold_expires_at: new Date(Date.now() + 120_000).toISOString(),
    created_at: new Date().toISOString(),
  },
  // Example: 1 seat reserved on b21
  {
    id: randomUUID(),
    bus_id: 'b21',
    seat_count: 1,
    status: 'reserved',
    hold_expires_at: null,
    created_at: new Date().toISOString(),
  },
];

// Bookings (demo). In production, persisted in DB with payment status.
const bookings = [
  {
    id: 'bk1',
    bus_id: 'b21',
    user_id: null,
    from_stop_id: 's21a',
    to_stop_id: 's21c',
    seats: 1,
    channel: 'sms',
    status: 'confirmed',
    created_at: new Date().toISOString(),
    price: 150,
  },
];

// Idempotency cache: key -> response snapshot (TTL-like behavior not implemented in demo)
const idempotencyStore = new Map();

// ---------- Helper Functions ----------

function nowIso() {
  return new Date().toISOString();
}

function pruneExpiredHoldsForBus(busId) {
  const now = Date.now();
  for (const entry of seatLedger) {
    if (entry.bus_id !== busId) continue;
    if (entry.status === 'hold' && entry.hold_expires_at && Date.parse(entry.hold_expires_at) < now) {
      entry.status = 'cancelled';
    }
  }
}

// ---------- Repository-like Accessors ----------

export const routeRepo = {
  listActive() {
    return routes.filter(r => r.active);
  },
  getById(routeId) {
    return routes.find(r => r.id === routeId) || null;
  },
};

export const stopRepo = {
  listByRouteId(routeId) {
    return stops
      .filter(s => s.route_id === routeId)
      .sort((a, b) => a.sequence - b.sequence);
  },
};

export const busRepo = {
  getById(busId) {
    return buses.find(b => b.id === busId) || null;
  },
  listByRouteId(routeId) {
    return buses.filter(b => b.route_id === routeId);
  },
  listAll() {
    return buses.slice();
  },
};

export const busLocationRepo = {
  getByBusId(busId) {
    return busLocations.get(busId) || null;
  },
  upsert(busId, { lat, lng, speed = null, heading = null, timestamp = null }) {
    const record = {
      bus_id: busId,
      lat,
      lng,
      speed,
      heading,
      updated_at: timestamp ? new Date(timestamp).toISOString() : nowIso(),
    };
    busLocations.set(busId, record);
    const bus = buses.find(b => b.id === busId);
    if (bus) bus.last_seen_at = record.updated_at;
    return record;
  },
};

export const seatService = {
  getAvailability(busId) {
    pruneExpiredHoldsForBus(busId);
    const bus = buses.find(b => b.id === busId);
    if (!bus) return null;
    let reserved = 0;
    let held = 0;
    const now = Date.now();
    for (const entry of seatLedger) {
      if (entry.bus_id !== busId) continue;
      if (entry.status === 'reserved') reserved += entry.seat_count;
      if (entry.status === 'hold' && (!entry.hold_expires_at || Date.parse(entry.hold_expires_at) > now)) {
        held += entry.seat_count;
      }
    }
    const available = Math.max(0, bus.seat_count - reserved - held);
    return {
      total: bus.seat_count,
      reserved,
      held,
      available,
    };
  },
  holdSeats(busId, seatCount, ttlMs = 120_000) {
    pruneExpiredHoldsForBus(busId);
    const availability = this.getAvailability(busId);
    if (!availability) return { ok: false, reason: 'BUS_NOT_FOUND' };
    if (availability.available < seatCount) return { ok: false, reason: 'INSUFFICIENT_SEATS' };
    const hold = {
      id: randomUUID(),
      bus_id: busId,
      seat_count: seatCount,
      status: 'hold',
      hold_expires_at: new Date(Date.now() + ttlMs).toISOString(),
      created_at: nowIso(),
    };
    seatLedger.push(hold);
    return { ok: true, hold };
  },
  confirmHold(holdId) {
    const entry = seatLedger.find(s => s.id === holdId);
    if (!entry) return { ok: false, reason: 'HOLD_NOT_FOUND' };
    if (entry.status !== 'hold') return { ok: false, reason: 'INVALID_STATE' };
    if (entry.hold_expires_at && Date.parse(entry.hold_expires_at) < Date.now()) {
      entry.status = 'cancelled';
      return { ok: false, reason: 'HOLD_EXPIRED' };
    }
    entry.status = 'reserved';
    entry.hold_expires_at = null;
    return { ok: true };
  },
};

export const bookingRepo = {
  list() {
    return bookings.slice();
  },
  getById(bookingId) {
    return bookings.find(b => b.id === bookingId) || null;
  },
  create({ busId, userId = null, fromStopId = null, toStopId = null, seats = 1, channel = 'app', idempotencyKey = null }) {
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      return idempotencyStore.get(idempotencyKey);
    }
    const bus = buses.find(b => b.id === busId);
    if (!bus) return { ok: false, reason: 'BUS_NOT_FOUND' };
    const holdRes = seatService.holdSeats(busId, seats);
    if (!holdRes.ok) return holdRes;
    const booking = {
      id: randomUUID(),
      bus_id: busId,
      user_id: userId,
      from_stop_id: fromStopId,
      to_stop_id: toStopId,
      seats,
      channel,
      status: 'pending',
      created_at: nowIso(),
      price: null,
      hold_id: holdRes.hold.id,
    };
    bookings.push(booking);
    const response = { ok: true, booking };
    if (idempotencyKey) idempotencyStore.set(idempotencyKey, response);
    return response;
  },
  confirm(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { ok: false, reason: 'BOOKING_NOT_FOUND' };
    if (booking.status !== 'pending') return { ok: false, reason: 'INVALID_STATE' };
    const conf = seatService.confirmHold(booking.hold_id);
    if (!conf.ok) return conf;
    booking.status = 'confirmed';
    booking.hold_id = null;
    return { ok: true, booking };
  },
};

// ---------- Simple ETA demo (static per-segment speed model) ----------

export const etaService = {
  getEtaMinutesToStops(busId) {
    // Simple heuristic: assume 30 km/h average, distance -> time.
    // In production, replace with map-matching + historical speeds.
    const loc = busLocationRepo.getByBusId(busId);
    const bus = busRepo.getById(busId);
    if (!loc || !bus) return {};
    const routeStops = stopRepo.listByRouteId(bus.route_id);
    const R = 6371; // Earth radius km
    const toRad = d => (d * Math.PI) / 180;
    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    const avgSpeedKmh = 28; // conservative urban average
    const eta = {};
    for (const stop of routeStops) {
      const km = haversineKm(loc.lat, loc.lng, stop.lat, stop.lng);
      const minutes = Math.round((km / avgSpeedKmh) * 60);
      eta[stop.id] = Math.max(0, minutes);
    }
    return eta;
  },
};

// ---------- Export raw data for testing/fixtures if needed ----------

export const demoData = {
  routes,
  stops,
  buses,
  busLocations,
  seatLedger,
  bookings,
};


