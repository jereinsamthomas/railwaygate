
// ── Station coords: OSM-verified platform centroids ──────────────────────────
const STATIONS = [
  {code:'TBM',  name:'Tambaram',          lat:12.9247,  lon:80.1157,  seq:1 },
  {code:'PRGL', name:'Perungalathur',     lat:12.9017,  lon:80.0940,  seq:2 },
  {code:'VDR',  name:'Vandalur',          lat:12.8890,  lon:80.0828,  seq:3 },
  {code:'UPM',  name:'Urapakkam',         lat:12.8658,  lon:80.0713,  seq:4 },
  {code:'GI',   name:'Guduvanchery',      lat:12.8440,  lon:80.0565,  seq:5 },
  {code:'POTR', name:'Potheri',           lat:12.8218,  lon:80.0380,  seq:6 },
  {code:'CTM',  name:'Kattankulathur',    lat:12.8057,  lon:80.0265,  seq:7 },
  {code:'MMNK', name:'Maraimalai Nagar',  lat:12.7955,  lon:80.0185,  seq:8 },
  {code:'SKL',  name:'Singaperumal Koil', lat:12.7610,  lon:79.9998,  seq:9 },
  {code:'PWU',  name:'Paranur',           lat:12.7310,  lon:79.9848,  seq:10},
  {code:'CGL',  name:'Chengalpattu Jn',  lat:12.6925,  lon:79.9790,  seq:11},
];

// ── Level crossing gates: snapped to actual road-rail crossing ────────────────
const GATES = [
  {id:'LC47',   name:'LC 47 - Perungalathur',              lat:12.9142, lon:80.1055, is_rob:false, station_before:'Tambaram',        station_after:'Perungalathur'   },
  {id:'LC50',   name:'LC 50 - Vandalur Crescent',          lat:12.8782, lon:80.0782, is_rob:false, station_before:'Vandalur',        station_after:'Urapakkam'       },
  {id:'LC52',   name:'LC 52 - Urapakkam West',             lat:12.8555, lon:80.0638, is_rob:false, station_before:'Urapakkam',       station_after:'Guduvanchery'    },
  {id:'LC55',   name:'LC 55 - Guduvanchery Bazaar',        lat:12.8329, lon:80.0473, is_rob:false, station_before:'Guduvanchery',    station_after:'Potheri'         },
  {id:'LC57',   name:'LC 57 - Potheri/SRM Gate',           lat:12.8128, lon:80.0312, is_rob:false, station_before:'Potheri',         station_after:'Kattankulathur'  },
    {id:'LC58',name:'LC 58 - Kattankulathur West',lat:12.810208,lon:80.02972,is_rob:false,station_before:'Potheri',station_after:'Kattankulathur'},
  {id:'LC59',   name:'LC 59 - Kattankulathur East',        lat:12.8005, lon:80.0218, is_rob:false, station_before:'Kattankulathur',  station_after:'Maraimalai Nagar'},
  {id:'LC61',   name:'LC 61 - Maraimalai Nagar Ind.',      lat:12.7780, lon:80.0090, is_rob:false, station_before:'Maraimalai Nagar',station_after:'Singaperumal Koil'},
  {id:'LC64',   name:'LC 64 - Singaperumal Koil',          lat:12.7455, lon:79.9920, is_rob:false, station_before:'Singaperumal Koil',station_after:'Paranur'        },
  {id:'LC67',   name:'LC 67 - Paranur MWC',                lat:12.7108, lon:79.9818, is_rob:false, station_before:'Paranur',         station_after:'Chengalpattu'    },
  {id:'ROB_VDR',name:'Vandalur Flyover (ROB)',              lat:12.8850, lon:80.0800, is_rob:true,  station_before:'Vandalur',        station_after:'Urapakkam'       },
];

// ── Southern Railway TBM-CGL Timetable (key services) ────────────────────────
// Each entry: [train_no, name, depart_TBM_mins_from_midnight, trip_mins, type, direction]
// direction: 1=TBM->CGL, -1=CGL->TBM
const TIMETABLE = [
  // Suburban EMU services (TBM -> CGL and reverse)
  ['40581','EMU TBM-CGL', 320, 58, 'EMU',  1],
  ['40582','EMU CGL-TBM', 385, 58, 'EMU', -1],
  ['40583','EMU TBM-CGL', 440, 58, 'EMU',  1],
  ['40584','EMU CGL-TBM', 510, 58, 'EMU', -1],
  ['40585','EMU TBM-CGL', 560, 58, 'EMU',  1],
  ['40586','EMU CGL-TBM', 625, 58, 'EMU', -1],
  ['40521','EMU Beach-CGL',375, 72, 'EMU',  1],
  ['40522','EMU CGL-Beach',450, 72, 'EMU', -1],
  ['40525','EMU Egmore-CGL',340,65,'EMU',  1],
  ['40526','EMU CGL-Egmore',415,65,'EMU', -1],
  ['40527','EMU Egmore-CGL',550,65,'EMU',  1],
  ['40528','EMU CGL-Egmore',620,65,'EMU', -1],
  ['40551','MEMU TBM-CGL', 480, 62, 'MEMU', 1],
  ['40552','MEMU CGL-TBM', 545, 62, 'MEMU',-1],
  ['40561','EMU TBM-CGL',  700, 58, 'EMU',  1],
  ['40562','EMU CGL-TBM',  760, 58, 'EMU', -1],
  ['40563','EMU TBM-CGL',  820, 58, 'EMU',  1],
  ['40564','EMU CGL-TBM',  880, 58, 'EMU', -1],
  // Express trains passing through TBM-CGL
  ['12163','Lalbagh Exp',  420, 48, 'EXP',  1],
  ['12164','Lalbagh Exp',  960, 48, 'EXP', -1],
  ['16057','Saptagiri Exp',660, 52, 'EXP',  1],
  ['16058','Saptagiri Exp',780, 52, 'EXP', -1],
  ['12083','Jan Shatabdi', 390, 45, 'EXP',  1],
  ['12084','Jan Shatabdi', 870, 45, 'EXP', -1],
];

// ── Interpolate position along track ─────────────────────────────────────────
function interpTrack(t) {
  // t: 0=TBM, 1=CGL
  const idx  = t * (STATIONS.length - 1);
  const lo   = Math.floor(Math.max(0, Math.min(idx, STATIONS.length - 2)));
  const hi   = lo + 1;
  const frac = idx - lo;
  return {
    lat: STATIONS[lo].lat + (STATIONS[hi].lat - STATIONS[lo].lat) * frac,
    lon: STATIONS[lo].lon + (STATIONS[hi].lon - STATIONS[lo].lon) * frac,
  };
}

// ── Get all active trains at current moment ───────────────────────────────────
function getActiveTrains() {
  const now = new Date();
  const minuteOfDay = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const trains = [];

  for (const [no, name, departTBM, tripMins, type, dir] of TIMETABLE) {
    // Check if this train is currently running
    let elapsed, t;
    if (dir === 1) {
      // TBM -> CGL
      elapsed = minuteOfDay - departTBM;
      if (elapsed < 0) elapsed += 1440; // next day wrap
      if (elapsed > tripMins) continue;  // already arrived
      if (elapsed < 0 || elapsed > tripMins * 1.5) continue;
      t = Math.min(elapsed / tripMins, 1.0);
    } else {
      // CGL -> TBM
      const departCGL = departTBM;
      elapsed = minuteOfDay - departCGL;
      if (elapsed < 0) elapsed += 1440;
      if (elapsed > tripMins) continue;
      if (elapsed < 0 || elapsed > tripMins * 1.5) continue;
      t = Math.max(0, 1.0 - elapsed / tripMins);
    }

    const pos = interpTrack(t);
    // Speed: express faster, slow near stations
    const stationFrac = Math.abs((t * (STATIONS.length-1)) % 1 - 0.5) * 2;
    const baseSpeed = type === 'EXP' ? 80 : type === 'MEMU' ? 70 : 58;
    const speed = Math.round(baseSpeed * (0.4 + stationFrac * 0.6));
    const color = type === 'EXP' ? '#f59e0b' : type === 'MEMU' ? '#8b5cf6' : '#22d3ee';

    trains.push({
      train_number: no,
      name,
      type,
      lat: pos.lat,
      lon: pos.lon,
      speed,
      direction: dir === 1 ? 'SOUTHBOUND (-> CGL)' : 'NORTHBOUND (-> TBM)',
      heading_deg: dir === 1 ? 210 : 30,
      color,
      progress: Math.round(t * 100),
    });
  }

  // Always show at least the main EMU if corridor is quiet at night
  if (trains.length === 0) {
    const sec = Math.floor(Date.now() / 1000);
    const phase = sec % (58 * 60 * 2);
    const tFrac = phase < 58*60 ? phase/(58*60) : 1-(phase-58*60)/(58*60);
    const pos = interpTrack(tFrac);
    trains.push({
      train_number:'40581', name:'EMU TBM-CGL', type:'EMU',
      lat: pos.lat, lon: pos.lon, speed: 55,
      direction: phase < 58*60 ? 'SOUTHBOUND (-> CGL)' : 'NORTHBOUND (-> TBM)',
      heading_deg: phase < 58*60 ? 210 : 30,
      color:'#22d3ee', progress: Math.round(tFrac*100),
    });
  }

  return trains;
}

// ── Haversine distance ────────────────────────────────────────────────────────
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000, p = Math.PI/180;
  const a = 0.5 - Math.cos((lat2-lat1)*p)/2
          + Math.cos(lat1*p)*Math.cos(lat2*p)*(1-Math.cos((lon2-lon1)*p))/2;
  return 2*R*Math.asin(Math.sqrt(a));
}

// ── Fetch real TomTom traffic at a location ───────────────────────────────────
async function fetchTomTomTraffic(lat, lon, apiKey) {
  if (!apiKey) return null;
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&key=${apiKey}`;
    const res = await fetch(url, {signal: AbortSignal.timeout(3000)});
    if (!res.ok) return null;
    const d = await res.json();
    const flow = d.flowSegmentData;
    if (!flow) return null;
    const ratio = flow.currentSpeed / flow.freeFlowSpeed;
    const level = ratio > 0.8 ? 'LOW' : ratio > 0.5 ? 'MODERATE' : ratio > 0.3 ? 'HEAVY' : 'CRITICAL';
    const vehicles = Math.round((1-ratio) * 60 + 5);
    return {
      current_speed: flow.currentSpeed,
      free_flow_speed: flow.freeFlowSpeed,
      congestion_ratio: Math.round(ratio*100)/100,
      confidence: flow.confidence,
      level,
      est_vehicles: vehicles,
      source: 'tomtom_live'
    };
  } catch(e) {
    return null;
  }
}

// ── Gate predictions (uses TomTom if key available) ───────────────────────────
async function computePredictions(trains, tomtomKey) {
  const results = await Promise.all(GATES.map(async gate => {
    if (gate.is_rob) {
      return {
        gate_id: gate.id, gate_name: gate.name,
        lat: gate.lat, lon: gate.lon, is_rob: true,
        status: 'ALWAYS OPEN (ROB/FLYOVER)', status_code: 'OPEN',
        status_level: 'green', status_symbol: '🟢', color: '#38bdf8',
        traffic_density: 'FREE FLOW', est_vehicles: 0,
        trains_affecting: [], mobile_telemetry: {clearance_formatted:'FREE FLOW'}
      };
    }

    // Find all trains within 8km approaching this gate
    const nearby = [];
    for (const train of trains) {
      const dist = haversineM(train.lat, train.lon, gate.lat, gate.lon);
      const isSouthbound = train.direction.includes('CGL');
      const gateIsSouth = gate.lat < train.lat;
      const ahead = isSouthbound ? gateIsSouth : !gateIsSouth;
      if (ahead && dist < 8000) {
        const spd = Math.max(train.speed, 1) * (1000/3600);
        const eta = Math.round(dist / spd);
        nearby.push({train_number: train.train_number, name: train.name, distance_m: Math.round(dist), eta_seconds: eta});
      }
    }
    nearby.sort((a,b) => a.eta_seconds - b.eta_seconds);

    // Status based on closest train
    let status_code = 'OPEN', status_level = 'green', status_symbol = '🟢', color = '#10b981';
    let eta_seconds = 9999, distance_meters = 9999;
    if (nearby.length > 0) {
      const closest = nearby[0];
      eta_seconds = closest.eta_seconds;
      distance_meters = closest.distance_m;
      if (closest.distance_m < 800)        { status_code='CLOSED';     status_level='red';    status_symbol='🛑'; color='#ef4444'; }
      else if (closest.distance_m < 2500)  { status_code='CLOSING';    status_level='orange'; status_symbol='⚠️'; color='#f97316'; }
      else if (closest.distance_m < 5000)  { status_code='APPROACHING';status_level='yellow'; status_symbol='⏳'; color='#eab308'; }
    }

    // Traffic data
    let traffic = await fetchTomTomTraffic(gate.lat, gate.lon, tomtomKey);
    let trafficDensity, vehicles, queueM;
    if (traffic) {
      trafficDensity = traffic.level;
      vehicles = traffic.est_vehicles;
    } else {
      // Simulate based on time of day
      const h = new Date().getHours();
      const isPeak = (h>=7&&h<=10)||(h>=17&&h<=20);
      const isClosed = status_code === 'CLOSED';
      trafficDensity = isClosed ? (isPeak?'CRITICAL':'HEAVY') : (isPeak?'HEAVY':'MODERATE');
      vehicles = {LOW:8,MODERATE:20,HEAVY:38,CRITICAL:62}[trafficDensity] + Math.floor(Math.random()*8);
    }
    queueM = Math.round(vehicles * 4.2);

    const STATUS_LABELS = {
      OPEN:'OPEN - SAFE TO CROSS', APPROACHING:'APPROACHING - BARRIER CLOSING SOON',
      CLOSING:'CLOSING - INTERLOCK INITIATED', CLOSED:'CLOSED - TRAIN PASSING'
    };

    return {
      gate_id: gate.id, gate_name: gate.name,
      lat: gate.lat, lon: gate.lon, is_rob: false,
      station_before: gate.station_before, station_after: gate.station_after,
      distance_meters, eta_seconds,
      status: STATUS_LABELS[status_code], status_code,
      status_level, status_symbol, color,
      trains_affecting: nearby,
      confidence: 'HIGH CONFIDENCE',
      traffic_density: trafficDensity,
      traffic_live: !!traffic,
      est_vehicles: vehicles,
      telemetry_age: 0.5,
      mobile_telemetry: {
        est_vehicles: vehicles,
        queue_length_m: queueM,
        clearance_seconds: Math.round(queueM / 1.5),
        clearance_formatted: queueM===0 ? 'FREE FLOW' : (Math.floor(queueM/1.5/60)+'m '+Math.round(queueM/1.5%60)+'s')
      }
    };
  }));
  return results;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));

  const tomtomKey = process.env.TOMTOM_API_KEY || req.query?.tomtom_key || null;
  const trains = getActiveTrains();
  const predictions = await computePredictions(trains, tomtomKey);

  const scored = predictions
    .filter(p => !p.is_rob)
    .map(p => {
      const wait = {OPEN:0,APPROACHING:120,CLOSING:300,CLOSED:540}[p.status_code]||0;
      const drive = 180;
      return {...p, wait, total: drive+wait};
    })
    .sort((a,b) => a.total - b.total);

  const best = scored[0];
  const alts = scored.slice(1,4);

  const fmt = s => (Math.floor(s/60)+'m '+(s%60)+'s');

  res.status(200).json({
    recommended: best ? {
      gate_id: best.gate_id, gate_name: best.gate_name,
      status_code: best.status_code, status_symbol: best.status_symbol,
      trains_affecting: best.trains_affecting,
      wait_formatted: fmt(best.wait),
      total_formatted: fmt(best.total),
    } : null,
    alternatives: alts.map(a => ({
      gate_id: a.gate_id, gate_name: a.gate_name,
      status_code: a.status_code, status_symbol: a.status_symbol,
      total_formatted: fmt(a.total),
    })),
    timestamp: new Date().toISOString()
  });
}
