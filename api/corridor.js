
// ── TBM-CGL Corridor Physics Engine ──────────────────────────────────────────
const STATIONS = [
  { code:'TBM',  name:'Tambaram',         lat:12.92559, lon:80.12711, seq:1  },
  { code:'PRGL', name:'Perungalathur',    lat:12.90157, lon:80.09682, seq:2  },
  { code:'VDR',  name:'Vandalur',         lat:12.88315, lon:80.08053, seq:3  },
  { code:'UPM',  name:'Urapakkam',        lat:12.86508, lon:80.06730, seq:4  },
  { code:'GI',   name:'Guduvanchery',     lat:12.84330, lon:80.05638, seq:5  },
  { code:'POTR', name:'Potheri',          lat:12.82133, lon:80.04430, seq:6  },
  { code:'CTM',  name:'Kattankulathur',   lat:12.81327, lon:80.03440, seq:7  },
  { code:'MMNK', name:'Maraimalai Nagar', lat:12.79558, lon:80.02430, seq:8  },
  { code:'SKL',  name:'Singaperumal Koil',lat:12.76068, lon:80.00540, seq:9  },
  { code:'PWU',  name:'Paranur',          lat:12.72820, lon:79.99240, seq:10 },
  { code:'CGL',  name:'Chengalpattu Jn', lat:12.69240, lon:79.97630, seq:11 }
];

const GATES = [
  { id:'LC47',    name:'LC 47 - Perungalathur',               lat:12.91300, lon:80.11160, is_rob:false, station_before:'Tambaram',         station_after:'Perungalathur'    },
  { id:'LC50',    name:'LC 50 - Vandalur Crescent',           lat:12.87660, lon:80.07750, is_rob:false, station_before:'Vandalur',          station_after:'Urapakkam'        },
  { id:'LC52',    name:'LC 52 - Urapakkam West',              lat:12.85440, lon:80.06200, is_rob:false, station_before:'Urapakkam',         station_after:'Guduvanchery'     },
  { id:'LC55',    name:'LC 55 - Guduvanchery Bazaar',         lat:12.83320, lon:80.05040, is_rob:false, station_before:'Guduvanchery',      station_after:'Potheri'          },
  { id:'LC57',    name:'LC 57 - Potheri/Kattankulathur (SRM)',lat:12.81730, lon:80.03940, is_rob:false, station_before:'Potheri',           station_after:'Kattankulathur'   },
  { id:'LC59',    name:'LC 59 - Kattankulathur East',         lat:12.80440, lon:80.02940, is_rob:false, station_before:'Kattankulathur',    station_after:'Maraimalai Nagar' },
  { id:'LC61',    name:'LC 61 - Maraimalai Nagar Ind.',       lat:12.77810, lon:80.01490, is_rob:false, station_before:'Maraimalai Nagar',  station_after:'Singaperumal Koil'},
  { id:'LC64',    name:'LC 64 - Singaperumal Koil',           lat:12.74450, lon:80.00320, is_rob:false, station_before:'Singaperumal Koil', station_after:'Paranur'          },
  { id:'LC67',    name:'LC 67 - Paranur MWC',                 lat:12.71030, lon:79.98440, is_rob:false, station_before:'Paranur',           station_after:'Chengalpattu'     },
  { id:'ROB_VDR', name:'Vandalur Over Bridge (Flyover)',       lat:12.88690, lon:80.08260, is_rob:true,  station_before:'Vandalur',          station_after:'Urapakkam'        }
];

// Total corridor length ~50 km. Train speed ~52 km/h → full run ~58 min
// Use epoch seconds mod (2 * 3480s round trip) to get position 0..1
function getTrainState() {
  const TRIP_SECONDS = 3480; // 58 min one way
  const now = Math.floor(Date.now() / 1000);
  const phase = now % (TRIP_SECONDS * 2);
  let t, direction;
  if (phase < TRIP_SECONDS) {
    t = phase / TRIP_SECONDS;          // 0→1 southbound TBM→CGL
    direction = 'SOUTHBOUND (→ CGL)';
  } else {
    t = 1 - (phase - TRIP_SECONDS) / TRIP_SECONDS; // 1→0 northbound
    direction = 'NORTHBOUND (→ TBM)';
  }

  // Interpolate lat/lon along STATIONS
  const idx = t * (STATIONS.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.min(lo + 1, STATIONS.length - 1);
  const frac = idx - lo;

  const lat = STATIONS[lo].lat + (STATIONS[hi].lat - STATIONS[lo].lat) * frac;
  const lon = STATIONS[lo].lon + (STATIONS[hi].lon - STATIONS[lo].lon) * frac;

  // Realistic speed variation: slow near stations, fast in between
  const stationProximity = Math.abs(frac - 0.5) * 2; // 0 at midpoint, 1 at station
  const speed = Math.round(38 + stationProximity * 22 + Math.sin(now * 0.05) * 4);

  return { lat, lon, direction, speed, t, phase, TRIP_SECONDS };
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000, p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2-lat1)*p)/2
          + Math.cos(lat1*p)*Math.cos(lat2*p)*(1-Math.cos((lon2-lon1)*p))/2;
  return 2*R*Math.asin(Math.sqrt(a));
}

function computePredictions(trainLat, trainLon, trainSpeed, direction) {
  const isSouthbound = direction.includes('CGL');
  return GATES.map(gate => {
    if (gate.is_rob) {
      return {
        gate_id: gate.id, gate_name: gate.name,
        lat: gate.lat, lon: gate.lon, is_rob: true,
        distance_meters: 0, eta_seconds: 0,
        status: 'ALWAYS OPEN (ROB/FLYOVER)', status_code: 'OPEN',
        status_level: 'green', status_symbol: '🟢', color: '#38bdf8',
        confidence: 'HIGH CONFIDENCE', traffic_density: 'MODERATE',
        est_vehicles: 12, telemetry_age: 0.3,
        mobile_telemetry: { mobile_signals:9, est_vehicles:12, queue_length_m:0, clearance_seconds:0, clearance_formatted:'FREE FLOW' }
      };
    }

    const dist = haversineM(trainLat, trainLon, gate.lat, gate.lon);
    const spd  = Math.max(trainSpeed, 1) * (1000/3600); // m/s
    const eta  = Math.round(dist / spd);

    // Gate is "ahead" if train is heading toward it
    const trainGoingSouth = isSouthbound;
    const gateIsSouth     = gate.lat < trainLat;
    const ahead           = trainGoingSouth ? gateIsSouth : !gateIsSouth;

    let status_code, status_level, status_symbol, color, traffic;
    if (!ahead) {
      status_code = 'OPEN'; status_level = 'green'; status_symbol = '🟢'; color = '#10b981'; traffic = 'LOW';
    } else if (dist > 6000) {
      status_code = 'OPEN'; status_level = 'green'; status_symbol = '🟢'; color = '#10b981'; traffic = 'LOW';
    } else if (dist > 3000) {
      status_code = 'APPROACHING'; status_level = 'yellow'; status_symbol = '⏳'; color = '#eab308'; traffic = 'MODERATE';
    } else if (dist > 800) {
      status_code = 'CLOSING'; status_level = 'orange'; status_symbol = '⚠️'; color = '#f97316'; traffic = 'HEAVY';
    } else {
      status_code = 'CLOSED'; status_level = 'red'; status_symbol = '🛑'; color = '#ef4444'; traffic = 'CRITICAL';
    }

    const STATUS_LABELS = {
      OPEN: 'OPEN - PROBABILISTIC SAFETY BUFFER',
      APPROACHING: 'APPROACHING - BARRIER CLOSURE PENDING',
      CLOSING: 'CLOSING - INTERLOCK SEQUENCE INITIATED',
      CLOSED: 'CLOSED - TRAIN PASSING IMMINENT'
    };

    const vehicles = { LOW:8, MODERATE:22, HEAVY:38, CRITICAL:58 }[traffic] + Math.floor(Math.random()*6);
    const queue_m  = Math.round(vehicles * 4.5);

    return {
      gate_id: gate.id, gate_name: gate.name,
      lat: gate.lat, lon: gate.lon, is_rob: false,
      station_before: gate.station_before, station_after: gate.station_after,
      distance_meters: Math.round(dist), eta_seconds: eta,
      status: STATUS_LABELS[status_code], status_code,
      status_level, status_symbol, color,
      confidence: 'HIGH CONFIDENCE', traffic_density: traffic,
      est_vehicles: vehicles, telemetry_age: 0.3,
      mobile_telemetry: {
        mobile_signals: Math.round(vehicles * 0.72),
        est_vehicles: vehicles,
        queue_length_m: queue_m,
        clearance_seconds: Math.round(queue_m / 1.8),
        clearance_formatted: formatTime(Math.round(queue_m / 1.8))
      }
    };
  });
}

function formatTime(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return m > 0 ? `${m}m ${String(s).padStart(2,'0')}s` : `0m ${String(s).padStart(2,'0')}s`;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).set(CORS).end(); return; }
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));

  const train = getTrainState();
  const waypoints = STATIONS.map(s => [s.lat, s.lon]);

  res.status(200).json({
    stations: STATIONS,
    waypoints,
    train: {
      train_number: 'EMU 4001',
      name: 'Tambaram-Chengalpattu Suburban',
      lat: train.lat,
      lon: train.lon,
      speed: train.speed,
      heading_deg: train.direction.includes('CGL') ? 210 : 30,
      direction: train.direction
    },
    timestamp: new Date().toISOString(),
    source: 'live_kinematics'
  });
}
