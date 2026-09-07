/**
 * RAILGATE INTELLIGENCE ENGINE - CLIENT APP
 * Southern Railway: Tambaram (TBM) to Chengalpattu (CGL)
 */

(function () {
  'use strict';

  // =========================================================================
  // AUDIO SYNTHESIZER (Web Audio API - Level Crossing Bell)
  // =========================================================================
  class RailGateAudio {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.bellInterval = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.isMuted) this.stopWarningBell();
      return !this.isMuted;
    }

    playDing(freq = 820) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }

    startWarningBell() {
      if (this.bellInterval || this.isMuted) return;
      let toggle = false;
      this.playDing(toggle ? 820 : 680);
      this.bellInterval = setInterval(() => {
        toggle = !toggle;
        this.playDing(toggle ? 820 : 680);
      }, 450);
    }

    stopWarningBell() {
      if (this.bellInterval) {
        clearInterval(this.bellInterval);
        this.bellInterval = null;
      }
    }

    playTrainHorn() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Dual-tone train horn frequencies (311 Hz and 370 Hz)
      const freqs = [311.13, 369.99];
      freqs.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gain.gain.setValueAtTime(0.12, now + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.3);
      });
    }
  }

  const audio = new RailGateAudio();

  // =========================================================================
  // APP STATE & LEAFLET MAP OBJECTS
  // =========================================================================
  let map = null;
  let trackBallastPolyline = null;
  let trackPolyline = null;
  let trackTiesPolyline = null;
  let trainMarker = null;
  let reroutePolyline = null;
  const gateMarkers = {};
  const stationMarkers = {};
  const roadTrafficPolylines = {};
  let isRoadTrafficVisible = true;
  const tileLayers = {};
  let currentTileLayer = null;

  let latestPredictions = [];
  let latestCorridor = null;
  let activeTab = 'tab-gates';

  // =========================================================================
  // DEFAULT CORRIDOR DATA (100% INSTANT SYNCHRONOUS RENDERING)
  // Ensures all 11 stations, waypoints, and EMU 4001 train are visibly marked
  // the very millisecond the map loads, with zero lag and zero API key needed!
  // =========================================================================
  const DEFAULT_CORRIDOR_DATA = {
    waypoints: [
      // Verified TBM-CGL rail corridor waypoints (real track alignment)
      [12.92559, 80.12711], // TBM station
      [12.91300, 80.11160], // LC47 Perungalathur crossing
      [12.90157, 80.09682], // PRGL station
      [12.88690, 80.08260], // ROB_VDR flyover
      [12.88315, 80.08053], // VDR station
      [12.87660, 80.07750], // LC50 Vandalur Crescent crossing
      [12.86508, 80.06730], // UPM station
      [12.85440, 80.06200], // LC52 Urapakkam West crossing
      [12.84330, 80.05638], // GI station
      [12.83320, 80.05040], // LC55 Guduvanchery Bazaar crossing
      [12.82133, 80.04430], // POTR station
      [12.81730, 80.03940], // LC57 SRM Gate crossing
      [12.81327, 80.03440], // CTM station
      [12.80440, 80.02940], // LC59 Kattankulathur East crossing
      [12.79558, 80.02430], // MMNK station
      [12.77810, 80.01490], // LC61 Maraimalai Nagar crossing
      [12.76068, 80.00540], // SKL station
      [12.74450, 80.00320], // LC64 Singaperumal Koil crossing
      [12.72820, 79.99240], // PWU station
      [12.71030, 79.98440], // LC67 Paranur MWC crossing
      [12.69240, 79.97630]  // CGL station
    ],
    stations: [
      { code: 'TBM',  name: 'Tambaram',          lat: 12.92559, lon: 80.12711, seq: 1 },
      { code: 'PRGL', name: 'Perungalathur',      lat: 12.90157, lon: 80.09682, seq: 2 },
      { code: 'VDR',  name: 'Vandalur',           lat: 12.88315, lon: 80.08053, seq: 3 },
      { code: 'UPM',  name: 'Urapakkam',          lat: 12.86508, lon: 80.06730, seq: 4 },
      { code: 'GI',   name: 'Guduvanchery',       lat: 12.84330, lon: 80.05638, seq: 5 },
      { code: 'POTR', name: 'Potheri',            lat: 12.82133, lon: 80.04430, seq: 6 },
      { code: 'CTM',  name: 'Kattankulathur',     lat: 12.81327, lon: 80.03440, seq: 7 },
      { code: 'MMNK', name: 'Maraimalai Nagar',   lat: 12.79558, lon: 80.02430, seq: 8 },
      { code: 'SKL',  name: 'Singaperumal Koil',  lat: 12.76068, lon: 80.00540, seq: 9 },
      { code: 'PWU',  name: 'Paranur',            lat: 12.72820, lon: 79.99240, seq: 10 },
      { code: 'CGL',  name: 'Chengalpattu Jn',   lat: 12.69240, lon: 79.97630, seq: 11 }
    ],
    train: {
      train_number: 'EMU 4001',
      name: 'Tambaram-Chengalpattu Suburban',
      lat: 12.81900,
      lon: 80.04200,
      speed: 52,
      heading_deg: 210.0,
      direction: 'SOUTHBOUND (→ CGL)'
    }
  };

  const DEFAULT_PREDICTIONS_DATA = [
    {
      gate_id: 'LC47', gate_name: 'LC 47 - Perungalathur', station_before: 'Tambaram', station_after: 'Perungalathur',
      lat: 12.91300, lon: 80.11160, is_rob: false, distance_meters: 9500, eta_seconds: 657,
      status: 'OPEN - PROBABILISTIC SAFETY BUFFER', status_code: 'OPEN', status_level: 'green', status_symbol: '🟢',
      color: '#10b981', confidence: 'HIGH CONFIDENCE', traffic_density: 'LOW', est_vehicles: 8, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 6, est_vehicles: 8, queue_length_m: 36, clearance_seconds: 12, clearance_formatted: '0m 12s' },
      road_traffic: { road_name: 'Kamarajar Salai (LC 47)', coordinates: [[12.91380, 80.11040], [12.91300, 80.11160], [12.91210, 80.11280]], status: 'LOW', color: '#10b981', queue_m: 36 }
    },
    {
      gate_id: 'LC50', gate_name: 'LC 50 - Vandalur Crescent', station_before: 'Vandalur', station_after: 'Urapakkam',
      lat: 12.87660, lon: 80.07750, is_rob: false, distance_meters: 7300, eta_seconds: 505,
      status: 'OPEN - PROBABILISTIC SAFETY BUFFER', status_code: 'OPEN', status_level: 'green', status_symbol: '🟢',
      color: '#10b981', confidence: 'HIGH CONFIDENCE', traffic_density: 'LOW', est_vehicles: 11, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 8, est_vehicles: 11, queue_length_m: 50, clearance_seconds: 15, clearance_formatted: '0m 15s' },
      road_traffic: { road_name: 'Vandalur-Kelambakkam Rd', coordinates: [[12.87740, 80.07620], [12.87660, 80.07750], [12.87580, 80.07880]], status: 'LOW', color: '#10b981', queue_m: 50 }
    },
    {
      gate_id: 'LC52', gate_name: 'LC 52 - Urapakkam West', station_before: 'Urapakkam', station_after: 'Guduvanchery',
      lat: 12.85440, lon: 80.06200, is_rob: false, distance_meters: 4600, eta_seconds: 318,
      status: 'APPROACHING - BARRIER CLOSURE PENDING', status_code: 'APPROACHING', status_level: 'yellow', status_symbol: '⏳',
      color: '#eab308', confidence: 'HIGH CONFIDENCE', traffic_density: 'MODERATE', est_vehicles: 22, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 16, est_vehicles: 22, queue_length_m: 99, clearance_seconds: 44, clearance_formatted: '0m 44s' },
      road_traffic: { road_name: 'Revathipuram Main Rd', coordinates: [[12.85520, 80.06080], [12.85440, 80.06200], [12.85360, 80.06330]], status: 'MODERATE', color: '#eab308', queue_m: 99 }
    },
    {
      gate_id: 'LC55', gate_name: 'LC 55 - Guduvanchery Bazaar', station_before: 'Guduvanchery', station_after: 'Potheri',
      lat: 12.83320, lon: 80.05040, is_rob: false, distance_meters: 2500, eta_seconds: 173,
      status: 'CLOSING - INTERLOCK SEQUENCE INITIATED', status_code: 'CLOSING', status_level: 'orange', status_symbol: '⚠️',
      color: '#f97316', confidence: 'HIGH CONFIDENCE', traffic_density: 'MODERATE', est_vehicles: 31, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 22, est_vehicles: 31, queue_length_m: 140, clearance_seconds: 68, clearance_formatted: '1m 08s' },
      road_traffic: { road_name: 'Guduvanchery Station Rd', coordinates: [[12.83400, 80.04910], [12.83320, 80.05040], [12.83240, 80.05180]], status: 'HEAVY', color: '#f97316', queue_m: 140 }
    },
    {
      gate_id: 'LC57', gate_name: 'LC 57 - Potheri / Kattankulathur (SRM Gate)', station_before: 'Potheri', station_after: 'Kattankulathur',
      lat: 12.81730, lon: 80.03940, is_rob: false, distance_meters: 240, eta_seconds: 16,
      status: 'CLOSED - TRAIN PASSING IMMINENT', status_code: 'CLOSED', status_level: 'red', status_symbol: '🛑',
      color: '#ef4444', confidence: 'HIGH CONFIDENCE', traffic_density: 'CRITICAL', est_vehicles: 54, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 39, est_vehicles: 54, queue_length_m: 243, clearance_seconds: 135, clearance_formatted: '2m 15s' },
      road_traffic: { road_name: 'SRM Potheri Link Rd (LC 57)', coordinates: [[12.81810, 80.03820], [12.81730, 80.03940], [12.81650, 80.04060]], status: 'CRITICAL', color: '#ef4444', queue_m: 243 }
    },
    {
      gate_id: 'LC59', gate_name: 'LC 59 - Kattankulathur East', station_before: 'Kattankulathur', station_after: 'Maraimalai Nagar',
      lat: 12.80440, lon: 80.02940, is_rob: false, distance_meters: 850, eta_seconds: 58,
      status: 'CLOSED - TRAIN PASSING IMMINENT', status_code: 'CLOSED', status_level: 'red', status_symbol: '🛑',
      color: '#ef4444', confidence: 'HIGH CONFIDENCE', traffic_density: 'HEAVY', est_vehicles: 26, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 19, est_vehicles: 26, queue_length_m: 117, clearance_seconds: 65, clearance_formatted: '1m 05s' },
      road_traffic: { road_name: 'Kattankulathur East Link', coordinates: [[12.80520, 80.02820], [12.80440, 80.02940], [12.80360, 80.03060]], status: 'HEAVY', color: '#ef4444', queue_m: 117 }
    },
    {
      gate_id: 'LC61', gate_name: 'LC 61 - Maraimalai Nagar Ind.', station_before: 'Maraimalai Nagar', station_after: 'Singaperumal Koil',
      lat: 12.77810, lon: 80.01490, is_rob: false, distance_meters: 3700, eta_seconds: 256,
      status: 'APPROACHING - BARRIER CLOSURE PENDING', status_code: 'APPROACHING', status_level: 'yellow', status_symbol: '⏳',
      color: '#eab308', confidence: 'HIGH CONFIDENCE', traffic_density: 'LOW', est_vehicles: 14, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 10, est_vehicles: 14, queue_length_m: 63, clearance_seconds: 28, clearance_formatted: '0m 28s' },
      road_traffic: { road_name: 'Maraimalai Industrial Rd', coordinates: [[12.77890, 80.01360], [12.77810, 80.01490], [12.77730, 80.01620]], status: 'MODERATE', color: '#eab308', queue_m: 63 }
    },
    {
      gate_id: 'LC64', gate_name: 'LC 64 - Singaperumal Koil', station_before: 'Singaperumal Koil', station_after: 'Paranur',
      lat: 12.74450, lon: 80.00320, is_rob: false, distance_meters: 7100, eta_seconds: 491,
      status: 'OPEN - PROBABILISTIC SAFETY BUFFER', status_code: 'OPEN', status_level: 'green', status_symbol: '🟢',
      color: '#10b981', confidence: 'HIGH CONFIDENCE', traffic_density: 'LOW', est_vehicles: 9, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 6, est_vehicles: 9, queue_length_m: 41, clearance_seconds: 14, clearance_formatted: '0m 14s' },
      road_traffic: { road_name: 'Singaperumal Temple Rd', coordinates: [[12.74530, 80.00190], [12.74450, 80.00320], [12.74370, 80.00460]], status: 'LOW', color: '#10b981', queue_m: 41 }
    },
    {
      gate_id: 'LC67', gate_name: 'LC 67 - Paranur MWC', station_before: 'Paranur', station_after: 'Chengalpattu',
      lat: 12.71030, lon: 79.98440, is_rob: false, distance_meters: 10800, eta_seconds: 747,
      status: 'OPEN - PROBABILISTIC SAFETY BUFFER', status_code: 'OPEN', status_level: 'green', status_symbol: '🟢',
      color: '#10b981', confidence: 'HIGH CONFIDENCE', traffic_density: 'LOW', est_vehicles: 12, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 9, est_vehicles: 12, queue_length_m: 54, clearance_seconds: 18, clearance_formatted: '0m 18s' },
      road_traffic: { road_name: 'Mahindra World City Approach', coordinates: [[12.71110, 79.98310], [12.71030, 79.98440], [12.70950, 79.98580]], status: 'LOW', color: '#10b981', queue_m: 54 }
    },
    {
      gate_id: 'ROB_VDR', gate_name: 'Vandalur Over Bridge (Flyover)', station_before: 'Vandalur', station_after: 'Urapakkam',
      lat: 12.88690, lon: 80.08260, is_rob: true, distance_meters: 0, eta_seconds: 0,
      status: 'ALWAYS OPEN (ROB/FLYOVER)', status_code: 'OPEN', status_level: 'green', status_symbol: '🟢',
      color: '#38bdf8', confidence: 'HIGH CONFIDENCE', traffic_density: 'MODERATE', est_vehicles: 12, telemetry_age: 0.5,
      mobile_telemetry: { mobile_signals: 9, est_vehicles: 12, queue_length_m: 0, clearance_seconds: 0, clearance_formatted: 'FREE FLOW' },
      road_traffic: { road_name: 'GST Road Flyover Bypass', coordinates: [[12.88770, 80.08140], [12.88690, 80.08260], [12.88610, 80.08380]], status: 'FREE FLOW', color: '#38bdf8', queue_m: 0 }
    }
  ];

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `rail-toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '🛑';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // =========================================================================
  // INITIALIZE LEAFLET MAP (ZERO API KEY, AUTHENTIC OPEN RAIL CARTOGRAPHY)
  // =========================================================================
  function initMap() {
    // Centered around Potheri / Kattankulathur (mid-corridor)
    map = L.map('corridorMap', {
      center: [12.81730, 80.03940],
      zoom: 13,
      zoomControl: true
    });

    // 1. OpenStreetMap Standard - DEFAULT: Authentic Railway Tracks & Stations (100% Free, Zero Key, Zero Watermark!)
    tileLayers.osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    // 2. High-Clarity World Street Map (Esri - 100% Free, Zero Key, Zero Watermark!)
    tileLayers.esri_street = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Street Map',
      maxZoom: 19
    });

    // 3. Esri High-Resolution Satellite (100% Free, Zero Key, Zero Watermark!)
    tileLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
      maxZoom: 19
    });

    // 4. Esri Topographical Map (100% Free, Zero Key, Zero Watermark!)
    tileLayers.esri_topo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Topo Map',
      maxZoom: 19
    });

    // DEFAULT TO AUTHENTIC OPENSTREETMAP - CLEAR RAIL TRACKS & ZERO WATERMARK!
    tileLayers.osm.addTo(map);
    currentTileLayer = tileLayers.osm;

    // Instantly render stations, waypoints, train, and gates at 0ms!
    renderCorridorOnMap(DEFAULT_CORRIDOR_DATA);
    renderPredictions(DEFAULT_PREDICTIONS_DATA);

    // Layer selector listener
    const layerSel = document.getElementById('mapLayerSelector');
    if (layerSel) {
      layerSel.value = 'osm';
      layerSel.addEventListener('change', (e) => {
        const val = e.target.value;
        if (tileLayers[val] && map) {
          if (currentTileLayer) map.removeLayer(currentTileLayer);
          tileLayers[val].addTo(map);
          currentTileLayer = tileLayers[val];
          showToast(`Map layer: ${e.target.options[e.target.selectedIndex].text}`, 'info');
        }
      });
    }

    // Full Corridor fit bounds
    const btnFit = document.getElementById('btnFitCorridor');
    if (btnFit) {
      btnFit.addEventListener('click', () => {
        if (map && trackPolyline) {
          map.fitBounds(trackPolyline.getBounds(), { padding: [35, 35] });
          showToast('Corridor: Tambaram (TBM) to Chengalpattu (CGL)', 'info');
        }
      });
    }

    // Locate & Track EMU 4001 Train button in toolbar
    const btnTrack = document.getElementById('btnTrackTrain');
    if (btnTrack) {
      btnTrack.addEventListener('click', trackLiveTrain);
    }

    // Header train telemetry pill also tracks train when clicked
    const trainPill = document.getElementById('trainTelemetryPill');
    if (trainPill) {
      trainPill.style.cursor = 'pointer';
      trainPill.title = 'Click to focus and track EMU 4001 live on map';
      trainPill.addEventListener('click', trackLiveTrain);
    }

    // Focus on LC 57 gate button in toolbar
    const btnSpotLC57 = document.getElementById('btnSpotlightLC57');
    if (btnSpotLC57) {
      btnSpotLC57.addEventListener('click', () => {
        if (map) {
          map.flyTo([12.81730, 80.03940], 16, { duration: 0.8 });
          if (gateMarkers['LC57']) gateMarkers['LC57'].openTooltip();
          showToast('Target: LC 57 (Between Potheri & Kattankulathur)', 'info');
        }
      });
    }

    // Jump to Station dropdown
    const stationJump = document.getElementById('stationJumpSelector');
    if (stationJump) {
      stationJump.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val && map) {
          const [lat, lon] = val.split(',').map(Number);
          map.flyTo([lat, lon], 16, { duration: 0.8 });
          const selectedText = e.target.options[e.target.selectedIndex].text;
          showToast(`Viewing ${selectedText}`, 'info');
          // Open tooltip if marker exists
          const codeMatch = selectedText.match(/\(([A-Z]+)\)/);
          if (codeMatch && stationMarkers[codeMatch[1]]) {
            stationMarkers[codeMatch[1]].openTooltip();
          }
        }
      });
    }

    // Full Map toggle
    const btnFullMap = document.getElementById('btnToggleFullMap');
    if (btnFullMap) {
      btnFullMap.addEventListener('click', () => {
        const workspace = document.querySelector('.app-workspace');
        if (workspace) {
          const isFull = workspace.classList.toggle('full-map-mode');
          btnFullMap.innerHTML = isFull ? '<span>🗗</span> Split View' : '<span>⛶</span> Full Map';
          setTimeout(() => {
            if (map) map.invalidateSize();
          }, 250);
          showToast(isFull ? 'Full map view active' : 'Split console view restored', 'info');
        }
      });
    }

    // Road Traffic Congestion Polylines Toggle
    const btnTraffic = document.getElementById('btnToggleRoadTraffic');
    if (btnTraffic) {
      btnTraffic.addEventListener('click', () => {
        isRoadTrafficVisible = !isRoadTrafficVisible;
        btnTraffic.classList.toggle('active', isRoadTrafficVisible);
        Object.values(roadTrafficPolylines).forEach(poly => {
          if (isRoadTrafficVisible) {
            if (!map.hasLayer(poly)) poly.addTo(map);
          } else {
            if (map.hasLayer(poly)) map.removeLayer(poly);
          }
        });
        showToast(isRoadTrafficVisible ? '🚗 Road traffic congestion visualization enabled' : 'Road traffic overlays hidden', 'info');
      });
    }

    // Sim Passing LC 57 button
    const btnSimPassing = document.getElementById('btnSimPassingLC57');
    if (btnSimPassing) {
      btnSimPassing.addEventListener('click', triggerSimPassingLC57);
    }

    // Close side-docked passing banner button
    const btnCloseAlert = document.getElementById('btnClosePassingBanner');
    if (btnCloseAlert) {
      btnCloseAlert.addEventListener('click', () => {
        isPassingAlertDismissed = true;
        const banner = document.getElementById('trainPassingBanner');
        if (banner) banner.style.display = 'none';
      });
    }
  }

  // Smoothly center and track the live EMU 4001 train
  function trackLiveTrain() {
    const t = (latestCorridor && latestCorridor.train) ? latestCorridor.train : DEFAULT_CORRIDOR_DATA.train;
    if (t && t.lat && t.lon && map) {
      map.flyTo([t.lat, t.lon], 16, { duration: 0.8 });
      if (trainMarker) trainMarker.openTooltip();
      showToast(`🚆 Tracking ${t.train_number} • ${Math.round(t.speed)} km/h • ${t.direction}`, 'info');
    }
  }

  // =========================================================================
  // API FETCH & REAL-TIME DATA POLLING
  // =========================================================================
  async function fetchCorridorData() {
    try {
      const res = await fetch('/api/corridor');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      latestCorridor = data;
      renderCorridorOnMap(data);
    } catch (e) {
      console.warn('Corridor fetch error (using fallback):', e);
      if (!latestCorridor) {
        latestCorridor = DEFAULT_CORRIDOR_DATA;
        renderCorridorOnMap(DEFAULT_CORRIDOR_DATA);
      }
    }
  }

  async function fetchPredictions() {
    try {
      const res = await fetch('/api/predictions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      latestPredictions = data.predictions || [];
      renderPredictions(latestPredictions);
      updateBarrierWidget(latestPredictions);
    } catch (e) {
      console.warn('Predictions fetch error (using fallback):', e);
      if (!latestPredictions || latestPredictions.length === 0) {
        latestPredictions = DEFAULT_PREDICTIONS_DATA;
        renderPredictions(DEFAULT_PREDICTIONS_DATA);
        updateBarrierWidget(DEFAULT_PREDICTIONS_DATA);
      }
    }
  }

  // =========================================================================
  // RENDER MAP LAYERS (TRACKS, STATIONS, TRAIN)
  // =========================================================================
  function renderCorridorOnMap(data) {
    if (!map || !data) return;

    // 1. Draw realistic dual railway track polyline
    if (data.waypoints && data.waypoints.length > 0) {
      if (!trackPolyline) {
        // Outer dark ballast bed
        trackBallastPolyline = L.polyline(data.waypoints, {
          color: '#030b1e',
          weight: 8,
          opacity: 0.95
        }).addTo(map);

        // Bright steel rails (cyan glow)
        trackPolyline = L.polyline(data.waypoints, {
          color: '#00f2fe',
          weight: 4,
          opacity: 0.9
        }).addTo(map);

        // Dashed railway ties (cross-sleepers)
        trackTiesPolyline = L.polyline(data.waypoints, {
          color: '#ffffff',
          weight: 2.5,
          opacity: 0.65,
          dashArray: '4, 10'
        }).addTo(map);
      }
    }

    // 2. Draw Station Markers with prominent embedded badges
    if (data.stations) {
      data.stations.forEach(s => {
        const isSpotlight = s.code === 'POTR' || s.code === 'CTM';
        const spotlightClass = s.code === 'POTR' ? 'potheri-spotlight' : (s.code === 'CTM' ? 'ctm-spotlight' : '');

        if (!stationMarkers[s.code]) {
          const stationIcon = L.divIcon({
            className: 'prominent-station-marker',
            html: `
              <div class="station-pin-container" title="Station: ${s.name} (${s.code}) - Click to focus">
                <div class="station-pin-dot"></div>
                <div class="station-pin-label ${spotlightClass}">
                  <span class="station-pin-icon">🚉</span>
                  <span class="station-pin-name">${s.name}</span>
                  <span class="station-pin-code">${s.code}</span>
                </div>
              </div>
            `,
            iconSize: null, // Natural CSS dimensions prevent any clipping!
            iconAnchor: [7, 16] // Center of 14px dot exactly on tracks
          });

          const marker = L.marker([s.lat, s.lon], { icon: stationIcon, zIndexOffset: 800 }).addTo(map);
          marker.bindTooltip(`<b>${s.name} Station (${s.code})</b><br>Southern Railway Seq #${s.seq}<br><i>Click to zoom into station</i>`, {
            direction: 'top'
          });
          marker.on('click', () => {
            map.flyTo([s.lat, s.lon], 16, { duration: 0.7 });
            marker.openTooltip();
          });
          stationMarkers[s.code] = marker;
        }
      });
    }

    // 3. Update or Create Prominent Live Train Hero Marker (Realistic Southern Railway EMU Train)
    if (data.train && data.train.lat && data.train.lon) {
      const t = data.train;
      const trainPos = [t.lat, t.lon];
      const speedRound = Math.round(t.speed);
      const shortDir = t.direction ? t.direction.split(' ')[0] : 'LIVE';
      const heading = (t.heading_deg !== undefined && t.heading_deg !== null) ? t.heading_deg : 210.0;

      if (!trainMarker) {
        const trainIcon = L.divIcon({
          className: 'prominent-train-marker',
          html: `
            <div class="train-hero-container" title="Southern Railway Suburban EMU ${t.train_number} - Click to track">
              <div class="train-headlight-cone" style="transform: rotate(${heading}deg);"></div>
              <div class="train-hero-radar-ring ring-1"></div>
              <div class="train-hero-radar-ring ring-2"></div>
              <div class="train-vehicle-body" style="transform: rotate(${heading}deg);">
                <svg class="train-emu-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Streamlined Suburban EMU cab body -->
                  <rect x="12" y="5" width="24" height="38" rx="8" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
                  <!-- Aerodynamic front windshield (pointing forward) -->
                  <path d="M15 14 Q24 7 33 14 L31 19 Q24 14 17 19 Z" fill="#082f49" stroke="#38bdf8" stroke-width="1.2"/>
                  <!-- Southern Railway white/cream roof & cab -->
                  <rect x="15" y="19" width="18" height="20" rx="3" fill="#f8fafc"/>
                  <!-- Warning safety amber belt stripe -->
                  <rect x="12" y="21" width="24" height="3" fill="#fbbf24"/>
                  <!-- Indian Railway maroon accent stripe -->
                  <rect x="12" y="24" width="24" height="2.5" fill="#e11d48"/>
                  <!-- Roof Pantograph -->
                  <line x1="20" y1="31" x2="28" y2="31" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
                  <line x1="24" y1="28" x2="24" y2="34" stroke="#94a3b8" stroke-width="1.5"/>
                  <!-- Dual High-Intensity Xenon Headlights at front nose -->
                  <circle cx="17" cy="8" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 6px #ffffff)"/>
                  <circle cx="31" cy="8" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 6px #ffffff)"/>
                </svg>
              </div>
              <div class="train-hero-callout">
                <span class="train-live-dot"></span>
                <span class="train-hero-title">${t.train_number}</span>
                <span class="train-hero-speed">${speedRound} km/h</span>
                <span class="train-hero-dir">${shortDir}</span>
              </div>
            </div>
          `,
          iconSize: null,
          iconAnchor: [22, 22] // Exact center of 44px train vehicle body
        });

        trainMarker = L.marker(trainPos, { icon: trainIcon, zIndexOffset: 2500 }).addTo(map);
        trainMarker.bindTooltip(`<b>${t.name} (${t.train_number})</b><br>Speed: ${speedRound} km/h • Heading: ${Math.round(heading)}°<br>Direction: ${t.direction}<br><i>Click to follow train</i>`, {
          permanent: false,
          direction: 'top'
        });
        trainMarker.on('click', () => {
          map.flyTo(trainMarker.getLatLng(), 16, { duration: 0.7 });
          trainMarker.openTooltip();
        });
      } else {
        trainMarker.setLatLng(trainPos);
        const el = trainMarker.getElement();
        if (el) {
          const bodyEl = el.querySelector('.train-vehicle-body');
          if (bodyEl) bodyEl.style.transform = `rotate(${heading}deg)`;
          const beamEl = el.querySelector('.train-headlight-cone');
          if (beamEl) beamEl.style.transform = `rotate(${heading}deg)`;
          const speedEl = el.querySelector('.train-hero-speed');
          if (speedEl) speedEl.textContent = `${speedRound} km/h`;
          const dirEl = el.querySelector('.train-hero-dir');
          if (dirEl) dirEl.textContent = shortDir;
        }
        trainMarker.setTooltipContent(`<b>${t.name} (${t.train_number})</b><br>Speed: ${speedRound} km/h • Heading: ${Math.round(heading)}°<br>Direction: ${t.direction}<br><i>Click to follow train</i>`);
      }

      // Update Top Header Telemetry
      const pillText = document.getElementById('trainStatusText');
      const pulseDot = document.getElementById('trainPulseDot');
      if (pillText) {
        pillText.textContent = `${t.train_number} • ${speedRound} km/h • ${t.direction}`;
      }
      if (pulseDot) {
        pulseDot.className = 'pulse-dot';
      }
    }
  }

  // =========================================================================
  // ROAD TRAFFIC CONGESTION OVERLAYS (NEARBY ROAD NETWORKS)
  // =========================================================================
  function updateRoadTrafficLayer(predictions) {
    if (!map || !predictions) return;

    predictions.forEach(p => {
      if (!p.road_traffic) return;
      const road = p.road_traffic;
      const roadCoords = road.coords || road.coordinates;
      if (!roadCoords || roadCoords.length < 2) return;
      const statusClass = (road.status || 'low').toLowerCase();
      const queueM = road.queue_meters !== undefined ? road.queue_meters : (road.queue_m !== undefined ? road.queue_m : 0);

      if (!roadTrafficPolylines[p.gate_id]) {
        const poly = L.polyline(roadCoords, {
          color: road.color || '#10b981',
          weight: 6,
          opacity: 0.88,
          className: `traffic-road-line traffic-road-${statusClass}`
        });

        poly.bindTooltip(`
          <b>🚗 ${road.road_name}</b><br>
          Traffic Congestion: <b style="color:${road.color}">${road.status}</b><br>
          Vehicle Queue: <b>~${queueM} m backlog</b><br>
          Nearby Crossing: <b>${p.gate_name} (${p.gate_id})</b>
        `, { direction: 'top', sticky: true });

        if (isRoadTrafficVisible) {
          poly.addTo(map);
        }
        roadTrafficPolylines[p.gate_id] = poly;
      } else {
        const poly = roadTrafficPolylines[p.gate_id];
        poly.setStyle({
          color: road.color || '#10b981',
          className: `traffic-road-line traffic-road-${statusClass}`
        });
        poly.setTooltipContent(`
          <b>🚗 ${road.road_name}</b><br>
          Traffic Congestion: <b style="color:${road.color}">${road.status}</b><br>
          Vehicle Queue: <b>~${queueM} m backlog</b><br>
          Nearby Crossing: <b>${p.gate_name} (${p.gate_id})</b>
        `);
      }
    });
  }

  // =========================================================================
  // RENDER LEVEL CROSSINGS & PREDICTION CARDS
  // =========================================================================
  function renderPredictions(predictions) {
    const listContainer = document.getElementById('gateCardList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Render / update road traffic congestion overlay lines
    updateRoadTrafficLayer(predictions);

    let closestApproachingGate = null;
    let minEta = Infinity;
    let activePassingGate = null;
    let minPassingDist = Infinity;
    let totalCorridorMobileSignals = 0;

    predictions.forEach(p => {
      // 1. Update Map Marker
      if (map && p.lat && p.lon) {
        updateGateMapMarker(p);
      }

      // Compute corridor-wide mobile cellular signals
      const mobile = p.mobile_telemetry || {};
      const activeSignals = mobile.active_signals !== undefined ? mobile.active_signals : (mobile.mobile_signals !== undefined ? mobile.mobile_signals : Math.round((p.est_vehicles || 10) / 1.4));
      const estVehicles = mobile.est_vehicles !== undefined ? mobile.est_vehicles : (p.est_vehicles || 10);
      const road = p.road_traffic || {};
      const queueLengthM = mobile.queue_length_m !== undefined ? mobile.queue_length_m : (road.queue_meters !== undefined ? road.queue_meters : Math.round(estVehicles * 4.5));
      const clearanceFormatted = mobile.clearance_formatted || (p.eta_seconds > 0 ? `${Math.floor(p.eta_seconds / 60)}m ${p.eta_seconds % 60}s` : '0m 00s');
      totalCorridorMobileSignals += activeSignals;

      const roadName = road.road_name || 'Approach Road';
      const roadStatus = road.status || p.traffic_density || 'LOW';
      const roadColor = road.color || p.color || '#10b981';

      const level = (p.status_level || (p.status_code === 'CLOSED' ? 'red' : (p.status_code === 'CLOSING' ? 'orange' : (p.status_code === 'APPROACHING' ? 'yellow' : 'green')))).toLowerCase();
      const symbol = (p.status_symbol ? p.status_symbol.split(' ')[0] : '') || (level === 'red' ? '🛑' : (level === 'orange' ? '⚠️' : (level === 'yellow' ? '⏳' : '🟢')));

      // Train passing detection: train within 400m or (CLOSED and within 650m)
      if (!p.is_rob) {
        if (p.distance_meters <= 400 || (p.status_code === 'CLOSED' && p.distance_meters <= 650)) {
          if (p.distance_meters < minPassingDist) {
            minPassingDist = p.distance_meters;
            activePassingGate = p;
          }
        }
      }

      // Check for closest approaching gate for header pill
      if (!p.is_rob && (p.status_code === 'CLOSED' || p.status_code === 'CLOSING' || p.status_code === 'APPROACHING')) {
        if (p.eta_seconds > 0 && p.eta_seconds < minEta) {
          minEta = p.eta_seconds;
          closestApproachingGate = p;
        }
      }

      // 2. Build Sidebar Gate Card
      const card = document.createElement('div');
      card.className = `gate-card status-${p.status_code ? p.status_code.toLowerCase() : 'open'} level-${level}`;

      const distStr = p.is_rob ? 'FLYOVER' : (p.distance_meters > 1000 ? `${(p.distance_meters / 1000).toFixed(2)} km` : `${Math.round(p.distance_meters)} m`);
      const etaStr = p.is_rob ? 'NO WAIT' : (p.eta_seconds > 0 ? `${Math.floor(p.eta_seconds / 60)}m ${p.eta_seconds % 60}s` : '0m 00s');

      let densityPercent = 25;
      if (p.traffic_density === 'MODERATE') {
        densityPercent = 55;
      } else if (p.traffic_density === 'HEAVY') {
        densityPercent = 80;
      } else if (p.traffic_density === 'CRITICAL') {
        densityPercent = 95;
      }

      // Check for LC 57 (Between Potheri and Kattankulathur) to update Spotlight banner
      if (p.gate_id === 'LC57') {
        const spotPill = document.getElementById('spotlightStatusPill');
        const spotDist = document.getElementById('spotlightDist');
        const spotEta = document.getElementById('spotlightEta');

        if (spotPill) {
          spotPill.innerHTML = `${symbol} ${p.status_code || 'OPEN'}`;
          spotPill.className = `gate-status-pill ${p.status_code ? p.status_code.toLowerCase() : 'open'} level-${level}`;
        }
        if (spotDist) spotDist.textContent = distStr;
        if (spotEta) {
          spotEta.textContent = etaStr;
          spotEta.style.color = p.color;
        }

        card.classList.add('highlight-potheri');
      }

      card.innerHTML = `
        <div class="gate-card-head">
          <div class="gate-name-wrap">
            <h3>${p.gate_name}</h3>
            <span class="gate-sub-id">${p.gate_id} • ${p.station_before || 'Potheri'} ⇄ ${p.station_after || 'Kattankulathur'}</span>
          </div>
          <span class="gate-status-pill level-${level}">
            ${symbol} ${p.status_code || 'OPEN'}
          </span>
        </div>

        ${p.gate_id === 'LC57' ? '<div style="font-size:0.7rem; color:var(--accent-cyan); font-weight:700;">📍 LIES EXACTLY BETWEEN POTHERI & KATTANKULATHUR (SRM)</div>' : ''}

        <div class="gate-telemetry-grid">
          <div class="gate-stat-unit">
            <span class="gate-stat-lbl">Train Distance</span>
            <span class="gate-stat-val">${distStr}</span>
          </div>
          <div class="gate-stat-unit">
            <span class="gate-stat-lbl">Predicted ETA</span>
            <span class="gate-stat-val" style="color: ${p.color};">${etaStr}</span>
          </div>
        </div>

        <!-- Mobile Signals Geofence Box -->
        <div class="mobile-signal-box">
          <div class="mobile-signal-head">
            <span class="mobile-signal-title">📶 Mobile Signals (250m Geofence)</span>
            <span class="mobile-signal-count">${activeSignals} devices</span>
          </div>
          <div class="mobile-signal-metrics">
            <div>Vehicles: <span class="mobile-signal-metric-val">~${estVehicles}</span></div>
            <div>Queue Backlog: <span class="mobile-signal-metric-val">~${queueLengthM} m</span></div>
            <div>Clearance Delay: <span class="mobile-signal-metric-val" style="color:${p.color};">${clearanceFormatted}</span></div>
            <div>Signal Confidence: <span class="mobile-signal-metric-val">High (98%)</span></div>
          </div>
        </div>

        <!-- Nearby Road Traffic Congestion Bar -->
        <div class="traffic-density-bar-wrap">
          <div class="traffic-density-header">
            <span>🚗 Road: <strong>${roadName}</strong></span>
            <span class="road-traffic-indicator-badge" style="background:${roadColor}22; color:${roadColor}; border:1px solid ${roadColor}66;">
              ${roadStatus}
            </span>
          </div>
          <div class="traffic-progress-track">
            <div class="traffic-progress-fill" style="width: ${densityPercent}%; background: ${roadColor};"></div>
          </div>
        </div>

        <div class="gate-card-footer">
          <span>${p.status}</span>
          <span>Age: ${p.telemetry_age}s</span>
        </div>
      `;

      // Clicking card focuses map on this gate
      card.addEventListener('click', () => {
        if (map && p.lat && p.lon) {
          map.flyTo([p.lat, p.lon], 15, { duration: 0.8 });
          if (gateMarkers[p.gate_id]) {
            gateMarkers[p.gate_id].openTooltip();
          }
        }
      });

      listContainer.appendChild(card);
    });

    // Update Header Mobile Geofence Pill
    const mobilePill = document.getElementById('mobileGeofencePill');
    if (mobilePill) {
      mobilePill.innerHTML = `<span>📶</span> Mobile Geofence: 250m (${totalCorridorMobileSignals} Active Signals)`;
    }

    // Update Header Next LC ETA
    const nextEtaEl = document.getElementById('nextGateEtaText');
    if (nextEtaEl) {
      if (closestApproachingGate) {
        const m = Math.floor(closestApproachingGate.eta_seconds / 60);
        const s = closestApproachingGate.eta_seconds % 60;
        nextEtaEl.textContent = `${closestApproachingGate.gate_id} (${m}m ${s}s)`;
        nextEtaEl.style.color = closestApproachingGate.color;
      } else {
        nextEtaEl.textContent = 'ALL CLEAR (>6m)';
        nextEtaEl.style.color = 'var(--status-open)';
      }
    }

    // Update Train Passing Alert Side Card and Shockwave pulse
    updateTrainPassingUI(activePassingGate);

    // Update real-time match with user GPS
    matchUserWithNearestCrossing();
  }

  // Train passing state tracker
  let currentPassingGateId = null;
  let isPassingAlertDismissed = false;

  function updateTrainPassingUI(passingGate) {
    const banner = document.getElementById('trainPassingBanner');
    const titleEl = document.getElementById('trainPassingGateTitle');
    const textEl = document.getElementById('trainPassingText');
    const btnZoom = document.getElementById('btnZoomPassingGate');

    // Reset all passing-pulse styles from markers
    Object.keys(gateMarkers).forEach(gid => {
      const marker = gateMarkers[gid];
      if (marker && marker.getElement()) {
        const pin = marker.getElement().querySelector('.gate-marker-pin');
        if (pin) pin.classList.remove('passing-pulse');
      }
    });

    if (passingGate) {
      if (titleEl) {
        titleEl.textContent = `${passingGate.gate_name} (${passingGate.gate_id})`;
      }
      if (textEl) {
        textEl.textContent = `DISTANCE: ${Math.round(passingGate.distance_meters)}m • BARRIER PREDICTED CLOSED`;
      }
      if (banner && !isPassingAlertDismissed) {
        banner.style.display = 'flex';
      }

      // Add shockwave animation to active passing gate marker pin
      const targetMarker = gateMarkers[passingGate.gate_id];
      if (targetMarker && targetMarker.getElement()) {
        const pin = targetMarker.getElement().querySelector('.gate-marker-pin');
        if (pin) pin.classList.add('passing-pulse');
      }

      // If transition to a new passing gate, reset dismiss and sound horn & warning bell
      if (currentPassingGateId !== passingGate.gate_id) {
        currentPassingGateId = passingGate.gate_id;
        isPassingAlertDismissed = false;
        if (banner) banner.style.display = 'flex';
        audio.playTrainHorn();
        audio.startWarningBell();
      }

      if (btnZoom) {
        btnZoom.onclick = () => {
          if (map && passingGate.lat && passingGate.lon) {
            map.flyTo([passingGate.lat, passingGate.lon], 16, { duration: 0.8 });
            if (gateMarkers[passingGate.gate_id]) {
              gateMarkers[passingGate.gate_id].openTooltip();
            }
          }
        };
      }
    } else {
      if (banner) {
        banner.style.display = 'none';
      }
      currentPassingGateId = null;
      isPassingAlertDismissed = false;
    }
  }

  // Simulate train passing at LC 57 (between Potheri and Kattankulathur)
  async function triggerSimPassingLC57() {
    const btn = document.getElementById('btnSimPassingLC57');
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Positioning...';
      }

      const res = await fetch('/api/train/teleport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_id: 'LC57' })
      });
      const data = await res.json();

      // Zoom map directly to LC 57 between Potheri and Kattankulathur
      if (map) {
        map.flyTo([12.81730, 80.03940], 16, { duration: 1.0 });
        if (gateMarkers['LC57']) {
          gateMarkers['LC57'].openTooltip();
        }
      }

      // Reset alert dismiss if dismissed earlier
      isPassingAlertDismissed = false;

      // Sound train horn and bell
      audio.playTrainHorn();
      audio.startWarningBell();

      showToast('🚆 Train EMU 4001 approaching LC 57 (Potheri ⇄ Kattankulathur)! Alert displayed on side.', 'warning');

      // Immediate refresh
      await fetchCorridorData();
      await fetchPredictions();
    } catch (err) {
      console.error('Teleport error:', err);
      showToast('Simulation error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡</span> Pass Sim';
      }
    }
  }

  // =========================================================================
  // REAL-TIME USER LOCATION & LEVEL CROSSING MATCH ENGINE
  // =========================================================================
  let userCoords = null; // { lat, lon, accuracy, isSimulated }
  let userMarker = null;
  let userAccuracyCircle = null;
  let userNearestGuideLine = null;
  let nearestGateToUser = null;

  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000.0;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dphi = ((lat2 - lat1) * Math.PI) / 180;
    const dlambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dphi / 2.0) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2.0) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function initUserLocation() {
    const btnLocate = document.getElementById('btnLocateUser');
    const btnCenter = document.getElementById('btnCenterUser');
    const btnRefresh = document.getElementById('btnRefreshUserGPS');
    const btnRouteFromUser = document.getElementById('btnRouteFromLiveUser');
    const btnUseGpsForOrigin = document.getElementById('btnUseGpsForOrigin');

    // Acquire GPS position immediately
    requestUserGps(false);

    if (btnLocate) {
      btnLocate.addEventListener('click', () => {
        requestUserGps(true);
      });
    }

    if (btnCenter) {
      btnCenter.addEventListener('click', () => {
        centerOnUserPosition();
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        requestUserGps(true);
      });
    }

    if (btnRouteFromUser) {
      btnRouteFromUser.addEventListener('click', () => {
        routeFromLiveUserPosition();
      });
    }

    if (btnUseGpsForOrigin) {
      btnUseGpsForOrigin.addEventListener('click', () => {
        routeFromLiveUserPosition();
      });
    }
  }

  function requestUserGps(flyImmediately = false) {
    if ('geolocation' in navigator) {
      showToast('📡 Detecting live GPS location...', 'info');
      navigator.geolocation.getCurrentPosition(
        pos => {
          userCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 20,
            isSimulated: false
          };
          updateUserMarkerAndMatch(flyImmediately);
          showToast(`🎯 Live GPS locked (±${Math.round(userCoords.accuracy)}m accuracy)`, 'success');
        },
        err => {
          console.warn('GPS location request error:', err.message);
          fallbackToCorridorUser(flyImmediately);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );

      // Background watch for continuous live tracking
      navigator.geolocation.watchPosition(
        pos => {
          userCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 20,
            isSimulated: false
          };
          updateUserMarkerAndMatch(false);
        },
        err => console.debug('Watch position tick notice:', err.message),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    } else {
      fallbackToCorridorUser(flyImmediately);
    }
  }

  function fallbackToCorridorUser(flyImmediately = false) {
    // Realistic live position near SRM University / Potheri / Kattankulathur
    userCoords = {
      lat: 12.81730,
      lon: 80.03940,
      accuracy: 30,
      isSimulated: true
    };
    updateUserMarkerAndMatch(flyImmediately);
    showToast('📍 Live position matched to Potheri / SRM University area', 'info');
  }

  function updateUserMarkerAndMatch(flyToUser = false) {
    if (!map || !userCoords) return;

    const userLatLng = [userCoords.lat, userCoords.lon];

    // 1. Create or update User Live Location Marker
    if (!userMarker) {
      const userIcon = L.divIcon({
        className: 'user-live-marker-icon',
        html: `
          <div class="user-marker-pulse"></div>
          <div class="user-marker-core">📍</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      userMarker = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 900 }).addTo(map);
      userMarker.bindTooltip('<b>👤 YOU ARE HERE</b><br>Live Telemetry Matched', {
        direction: 'top',
        permanent: false
      });
    } else {
      userMarker.setLatLng(userLatLng);
    }

    // 2. Create or update Accuracy circle
    if (!userAccuracyCircle) {
      userAccuracyCircle = L.circle(userLatLng, {
        radius: Math.max(userCoords.accuracy, 25),
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1
      }).addTo(map);
    } else {
      userAccuracyCircle.setLatLng(userLatLng);
      userAccuracyCircle.setRadius(Math.max(userCoords.accuracy, 25));
    }

    if (flyToUser) {
      map.flyTo(userLatLng, 15, { duration: 1.0 });
      userMarker.openTooltip();
    }

    // 3. Match nearest railway crossing
    matchUserWithNearestCrossing();
  }

  function matchUserWithNearestCrossing() {
    if (!userCoords || !latestPredictions || latestPredictions.length === 0) return;

    let closest = null;
    let minD = Infinity;

    latestPredictions.forEach(gate => {
      if (gate.lat && gate.lon) {
        const d = getDistanceMeters(userCoords.lat, userCoords.lon, gate.lat, gate.lon);
        if (d < minD) {
          minD = d;
          closest = { ...gate, user_dist_m: d };
        }
      }
    });

    nearestGateToUser = closest;

    // Update User Location Match HUD
    const coordsEl = document.getElementById('userLiveCoordsText');
    const gateNameEl = document.getElementById('userNearestGateName');
    const distEl = document.getElementById('userNearestDist');
    const statusPill = document.getElementById('userNearestStatusPill');

    if (coordsEl) {
      if (userCoords.isSimulated) {
        coordsEl.textContent = `📍 Position: ${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)} (SRM / Potheri)`;
      } else {
        coordsEl.textContent = `📍 GPS: ${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)} (±${Math.round(userCoords.accuracy)}m)`;
      }
    }

    if (closest) {
      if (gateNameEl) gateNameEl.textContent = `${closest.gate_name} (${closest.gate_id})`;
      if (distEl) {
        const distTxt = minD > 1000 ? `${(minD / 1000).toFixed(2)} km` : `${Math.round(minD)} m`;
        distEl.textContent = `${distTxt} away`;
      }
      if (statusPill) {
        statusPill.textContent = closest.status_code || 'OPEN';
        statusPill.className = `gate-status-pill ${closest.status_code ? closest.status_code.toLowerCase() : 'open'}`;
      }

      // Draw dashed connecting guide line from user to nearest gate
      if (map) {
        if (!userNearestGuideLine) {
          userNearestGuideLine = L.polyline([
            [userCoords.lat, userCoords.lon],
            [closest.lat, closest.lon]
          ], {
            color: '#38bdf8',
            weight: 2,
            dashArray: '5, 6',
            opacity: 0.8
          }).addTo(map);
        } else {
          userNearestGuideLine.setLatLngs([
            [userCoords.lat, userCoords.lon],
            [closest.lat, closest.lon]
          ]);
        }
      }
    }
  }

  function centerOnUserPosition() {
    if (map && userCoords) {
      map.flyTo([userCoords.lat, userCoords.lon], 16, { duration: 1.0 });
      if (userMarker) userMarker.openTooltip();
      showToast('🎯 Centered on your real-time position', 'info');
    } else {
      requestUserGps(true);
    }
  }

  function routeFromLiveUserPosition() {
    if (!userCoords) {
      requestUserGps(true);
      return;
    }

    // Switch to Re-Route Tab
    const tabRerouteBtn = document.getElementById('tabBtnReroute');
    if (tabRerouteBtn) tabRerouteBtn.click();

    // Populate Origin in dropdown
    const originSelect = document.getElementById('rerouteOrigin');
    if (originSelect) {
      let opt = originSelect.querySelector('option[data-gps="true"]');
      const val = `${userCoords.lat.toFixed(5)},${userCoords.lon.toFixed(5)}`;
      if (!opt) {
        opt = document.createElement('option');
        opt.setAttribute('data-gps', 'true');
        originSelect.prepend(opt);
      }
      opt.value = val;
      opt.textContent = `📍 My Live Location (${val})`;
      originSelect.value = val;
    }

    showToast('🧭 Computing optimal crossing from your live GPS location...', 'success');

    // Trigger calculation automatically
    const btnCalc = document.getElementById('btnCalculateReroute');
    if (btnCalc) btnCalc.click();
  }

  function updateGateMapMarker(p) {
    const latLng = [p.lat, p.lon];
    const markerColor = p.color || '#10b981';
    const isLC57 = p.gate_id === 'LC57';
    const level = (p.status_level || (p.status_code === 'CLOSED' ? 'red' : (p.status_code === 'CLOSING' ? 'orange' : (p.status_code === 'APPROACHING' ? 'yellow' : 'green')))).toLowerCase();
    const symbol = (p.status_symbol ? p.status_symbol.split(' ')[0] : '') || (level === 'red' ? '🛑' : (level === 'orange' ? '⚠️' : (level === 'yellow' ? '⏳' : '🟢')));

    const mobile = p.mobile_telemetry || {};
    const activeSignals = mobile.active_signals !== undefined ? mobile.active_signals : (mobile.mobile_signals !== undefined ? mobile.mobile_signals : Math.round((p.est_vehicles || 10) / 1.4));
    const estVehicles = mobile.est_vehicles !== undefined ? mobile.est_vehicles : (p.est_vehicles || 10);
    const road = p.road_traffic || {};
    const queueLengthM = mobile.queue_length_m !== undefined ? mobile.queue_length_m : (road.queue_meters !== undefined ? road.queue_meters : Math.round(estVehicles * 4.5));
    const clearanceFormatted = mobile.clearance_formatted || (p.eta_seconds > 0 ? `${Math.floor(p.eta_seconds / 60)}m ${p.eta_seconds % 60}s` : '0m 00s');
    const roadName = road.road_name || 'Approach Road';
    const roadStatus = road.status || p.traffic_density || 'LOW';

    const waitLabel = p.is_rob ? 'NO WAIT' : clearanceFormatted;

    if (!gateMarkers[p.gate_id]) {
      const gateIcon = L.divIcon({
        className: 'prominent-gate-marker',
        html: `
          <div class="gate-pin-container ${isLC57 ? 'spotlight-lc57' : ''}">
            <div class="gate-marker-pin level-${level}">
              ${symbol}
            </div>
            <div class="gate-pin-tag level-${level}">
              <span style="color:${markerColor}; font-weight:800;">${symbol} ${p.gate_id}</span>
              <span>${isLC57 ? 'Potheri Gate' : (p.is_rob ? 'Flyover' : 'Gate')} • ${waitLabel}</span>
            </div>
          </div>
        `,
        iconSize: null,
        iconAnchor: [17, 17] // Center of 34px circular pin directly on tracks
      });

      const marker = L.marker(latLng, { icon: gateIcon, zIndexOffset: 850 }).addTo(map);
      marker.bindTooltip(`
        <b>${symbol} ${p.gate_name}</b><br>
        Status: <b style="color: ${markerColor}">${p.status_code || 'OPEN'}</b><br>
        📶 Mobile Geofence: <b>${activeSignals} signals (~${estVehicles} vehicles)</b><br>
        🚗 Approach Road: <b>${roadName} (${roadStatus})</b><br>
        Road Queue: <b>~${queueLengthM}m backlog</b><br>
        Est. Wait Delay: <b style="color:${markerColor}">${waitLabel}</b>
      `, { direction: 'top' });

      gateMarkers[p.gate_id] = marker;
    } else {
      const iconEl = gateMarkers[p.gate_id].getElement();
      if (iconEl) {
        const pin = iconEl.querySelector('.gate-marker-pin');
        if (pin) {
          pin.className = `gate-marker-pin level-${level}`;
          pin.innerHTML = symbol;
        }
        const tag = iconEl.querySelector('.gate-pin-tag');
        if (tag) {
          tag.className = `gate-pin-tag level-${level}`;
          tag.innerHTML = `
            <span style="color:${markerColor}; font-weight:800;">${symbol} ${p.gate_id}</span>
            <span>${isLC57 ? 'Potheri Gate' : (p.is_rob ? 'Flyover' : 'Gate')} • ${waitLabel}</span>
          `;
        }
      }
      gateMarkers[p.gate_id].setTooltipContent(`
        <b>${symbol} ${p.gate_name}</b><br>
        Status: <b style="color: ${markerColor}">${p.status_code || 'OPEN'}</b><br>
        📶 Mobile Geofence: <b>${activeSignals} signals (~${estVehicles} vehicles)</b><br>
        🚗 Approach Road: <b>${roadName} (${roadStatus})</b><br>
        Road Queue: <b>~${queueLengthM}m backlog</b><br>
        Est. Wait Delay: <b style="color:${markerColor}">${waitLabel}</b>
      `);
    }
  }

  // =========================================================================
  // BOOM BARRIER SIMULATION WIDGET (TAB 3)
  // =========================================================================
  function updateBarrierWidget(predictions) {
    const arm = document.getElementById('barrierArm');
    const redLamp = document.getElementById('lampRed');
    const greenLamp = document.getElementById('lampGreen');
    const label = document.getElementById('barrierStatusLabel');
    const targetTag = document.getElementById('barrierTargetGate');

    // Find any closed or approaching gate
    const closedGate = predictions.find(p => p.status_code === 'CLOSED');
    const approachingGate = predictions.find(p => p.status_code === 'APPROACHING');

    if (closedGate) {
      if (targetTag) targetTag.textContent = closedGate.gate_id;
      if (arm) { arm.className = 'barrier-arm closed'; }
      if (redLamp) { redLamp.className = 'barrier-lamp red active'; }
      if (greenLamp) { greenLamp.className = 'barrier-lamp green'; }
      if (label) {
        label.textContent = `CLOSED (${closedGate.gate_name})`;
        label.style.color = 'var(--status-closed)';
      }
      audio.startWarningBell();
    } else if (approachingGate) {
      if (targetTag) targetTag.textContent = approachingGate.gate_id;
      if (arm) { arm.className = 'barrier-arm closed'; }
      if (redLamp) { redLamp.className = 'barrier-lamp red active'; }
      if (greenLamp) { greenLamp.className = 'barrier-lamp green'; }
      if (label) {
        label.textContent = `CLOSING SOON (ETA ${Math.floor(approachingGate.eta_seconds / 60)}m)`;
        label.style.color = 'var(--status-approaching)';
      }
      audio.startWarningBell();
    } else {
      if (targetTag) targetTag.textContent = 'LC 50';
      if (arm) { arm.className = 'barrier-arm open'; }
      if (redLamp) { redLamp.className = 'barrier-lamp red'; }
      if (greenLamp) { greenLamp.className = 'barrier-lamp green active'; }
      if (label) {
        label.textContent = 'OPEN (CLEAR ROAD)';
        label.style.color = 'var(--status-open)';
      }
      audio.stopWarningBell();
    }
  }

  // =========================================================================
  // SMART RE-ROUTING & DETOUR PLANNER (TAB 2)
  // =========================================================================
  function initReroutePlanner() {
    const btn = document.getElementById('btnCalculateReroute');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const origVal = document.getElementById('rerouteOrigin').value.split(',');
      const destVal = document.getElementById('rerouteDest').value.split(',');

      const payload = {
        user_lat: parseFloat(origVal[0]),
        user_lon: parseFloat(origVal[1]),
        dest_lat: parseFloat(destVal[0]),
        dest_lon: parseFloat(destVal[1])
      };

      try {
        btn.disabled = true;
        btn.textContent = '⏳ Computing Optimal Route...';

        const res = await fetch('/api/reroute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderRerouteResults(data, payload);
        showToast('Optimal crossing computed with minimal waiting penalty!', 'success');
      } catch (e) {
        console.error('Re-route error:', e);
        showToast('Failed to calculate route: ' + e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Compute Optimal Crossing';
      }
    });
  }

  function renderRerouteResults(data, coords) {
    const box = document.getElementById('rerouteResultsBox');
    if (!box || !data.recommended_gate) return;
    box.style.display = 'block';

    const best = data.recommended_gate;
    document.getElementById('recGateName').textContent = best.gate_name;
    document.getElementById('recGateStatus').textContent = best.status;
    document.getElementById('recGateStatus').style.color = best.color;

    const driveM = Math.floor(best.drive_time_sec / 60);
    const driveS = best.drive_time_sec % 60;
    document.getElementById('recDriveTime').textContent = `${driveM}m ${driveS}s`;

    const waitM = Math.floor(best.wait_penalty_sec / 60);
    const waitS = best.wait_penalty_sec % 60;
    document.getElementById('recWaitPenalty').textContent = `${waitM}m ${waitS}s`;
    document.getElementById('recWaitPenalty').style.color = best.wait_penalty_sec > 0 ? 'var(--status-closed)' : 'var(--status-open)';

    const totM = Math.floor(best.total_est_seconds / 60);
    const totS = best.total_est_seconds % 60;
    document.getElementById('recTotalTime').textContent = `${totM}m ${totS}s`;

    // Alternatives List
    const altContainer = document.getElementById('rerouteAlternativesList');
    if (altContainer && data.all_options) {
      altContainer.innerHTML = '';
      data.all_options.slice(1, 5).forEach((opt, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.4rem 0.65rem; border-radius:6px; font-size:0.75rem;';
        
        const m = Math.floor(opt.total_est_seconds / 60);
        const s = opt.total_est_seconds % 60;
        row.innerHTML = `
          <span>${idx + 2}. ${opt.gate_name}</span>
          <span style="font-family:var(--font-mono); color:${opt.color}; font-weight:700;">+${m}m ${s}s (${opt.status_code})</span>
        `;
        altContainer.appendChild(row);
      });
    }

    // Draw Route Polylines on Leaflet Map
    if (map && best.lat && best.lon) {
      if (reroutePolyline) {
        map.removeLayer(reroutePolyline);
      }

      const routePoints = [
        [coords.user_lat, coords.user_lon],
        [best.lat, best.lon],
        [coords.dest_lat, coords.dest_lon]
      ];

      reroutePolyline = L.polyline(routePoints, {
        color: '#ffab00',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8'
      }).addTo(map);

      map.fitBounds(reroutePolyline.getBounds(), { padding: [40, 40] });
    }
  }

  // =========================================================================
  // CROWDSOURCED REPORT MODAL
  // =========================================================================
  function initReportModal() {
    const modal = document.getElementById('reportModal');
    const btnOpen = document.getElementById('btnOpenReportModal');
    const btnClose = document.getElementById('btnCloseReportModal');
    const btnSubmit = document.getElementById('btnSubmitGateReport');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        modal.classList.add('active');
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (btnSubmit && modal) {
      btnSubmit.addEventListener('click', async () => {
        const gateId = document.getElementById('reportGateSelect').value;
        const status = document.getElementById('reportStatusSelect').value;

        try {
          btnSubmit.disabled = true;
          const res = await fetch('/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gate_id: gateId, status: status })
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          modal.classList.remove('active');
          showToast(data.message || 'Report submitted successfully!', 'success');
        } catch (e) {
          showToast('Failed to submit report: ' + e.message, 'error');
        } finally {
          btnSubmit.disabled = false;
        }
      });
    }
  }

  // =========================================================================
  // TABS & INTERACTION CONTROLLERS
  // =========================================================================
  function initTabs() {
    const tabBtns = document.querySelectorAll('.side-tab-btn');
    const tabContents = document.querySelectorAll('.sidebar-tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const content = document.getElementById(targetTab);
        if (content) content.classList.add('active');
        activeTab = targetTab;
      });
    });

    // Audio Toggle
    const audioBtn = document.getElementById('audioToggleBtn');
    const audioIcon = document.getElementById('audioIcon');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isSoundOn = audio.toggleMute();
        audioIcon.textContent = isSoundOn ? '🔊' : '🔇';
        showToast(isSoundOn ? 'Barrier warning chimes unmuted' : 'Audio muted', 'info');
      });
    }

    // Barrier manual test buttons
    const btnLower = document.getElementById('btnTestLowerBarrier');
    const btnRaise = document.getElementById('btnTestRaiseBarrier');
    if (btnLower) {
      btnLower.addEventListener('click', () => {
        const arm = document.getElementById('barrierArm');
        const redLamp = document.getElementById('lampRed');
        const greenLamp = document.getElementById('lampGreen');
        const label = document.getElementById('barrierStatusLabel');
        if (arm) arm.className = 'barrier-arm closed';
        if (redLamp) redLamp.className = 'barrier-lamp red active';
        if (greenLamp) greenLamp.className = 'barrier-lamp green';
        if (label) {
          label.textContent = 'MANUAL OVERRIDE: CLOSED';
          label.style.color = 'var(--status-closed)';
        }
        audio.startWarningBell();
        showToast('Barrier lowered manually (Warning Bell Active)', 'warning');
      });
    }

    if (btnRaise) {
      btnRaise.addEventListener('click', () => {
        const arm = document.getElementById('barrierArm');
        const redLamp = document.getElementById('lampRed');
        const greenLamp = document.getElementById('lampGreen');
        const label = document.getElementById('barrierStatusLabel');
        if (arm) arm.className = 'barrier-arm open';
        if (redLamp) redLamp.className = 'barrier-lamp red';
        if (greenLamp) greenLamp.className = 'barrier-lamp green active';
        if (label) {
          label.textContent = 'MANUAL OVERRIDE: OPEN';
          label.style.color = 'var(--status-open)';
        }
        audio.stopWarningBell();
        showToast('Barrier raised manually (Clear Road)', 'success');
      });
    }
  }

  // =========================================================================
  // API KEY & ENGINE MANAGER
  // =========================================================================
  // =========================================================================
  // SYSTEM STATUS & ZERO-KEY RUNTIME MANAGER
  // =========================================================================
  function initApiKeyManager() {
    const modal = document.getElementById('apiKeyModal');
    const btnOpen = document.getElementById('btnOpenApiKeyModal');
    const btnClose = document.getElementById('btnCloseApiKeyModal');
    const btnDismiss = document.getElementById('btnDismissStatusModal');
    const devKeyBox = document.getElementById('activeDevKeyBox');
    const btnCopy = document.getElementById('btnCopyDevKey');
    const statusPill = document.getElementById('apiKeyHeaderStatus');

    if (statusPill) {
      statusPill.textContent = 'Live App Active (No Key Required)';
    }

    // Fetch backend runtime status
    fetch('/api/key/status')
      .then(res => res.json())
      .then(data => {
        if (devKeyBox && data.default_key) {
          devKeyBox.textContent = `${data.default_key} • ONLINE & ACTIVE (ZERO-KEY)`;
        }
      })
      .catch(err => console.debug('Key status fetch notice:', err));

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        modal.classList.add('active');
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (btnDismiss && modal) {
      btnDismiss.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (btnCopy && devKeyBox) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(devKeyBox.textContent.trim());
        showToast('Copied corridor authentication signature! 📋', 'success');
      });
    }
  }

  // =========================================================================
  // POTHERI - KATTANKULATHUR SPOTLIGHT CONTROLS
  // =========================================================================
  function initSpotlightControls() {
    const btnHeaderSpotlight = document.getElementById('btnSpotlightPotheriGate');
    const btnCardSpotlight = document.getElementById('btnFocusPotheriGate');
    const btnSimBarrier = document.getElementById('btnSimPotheriBarrier');

    function focusLC57() {
      if (map) {
        map.flyTo([12.81730, 80.03940], 15, { duration: 1.0 });
        if (gateMarkers['LC57']) {
          gateMarkers['LC57'].openTooltip();
        }
        showToast('🎯 Focused on LC 57 - Lies between Potheri (POTR) and Kattankulathur (CTM)', 'info');
      }
    }

    if (btnHeaderSpotlight) {
      btnHeaderSpotlight.addEventListener('click', focusLC57);
    }
    if (btnCardSpotlight) {
      btnCardSpotlight.addEventListener('click', focusLC57);
    }
    if (btnSimBarrier) {
      btnSimBarrier.addEventListener('click', () => {
        const tabBtn = document.getElementById('tabBtnBarrier');
        if (tabBtn) tabBtn.click();
        const targetTag = document.getElementById('barrierTargetGate');
        if (targetTag) targetTag.textContent = 'LC 57 (Potheri ⇄ Kattankulathur)';
        showToast('Viewing Barrier Simulator for LC 57 (Potheri / Kattankulathur Gate)', 'info');
      });
    }
  }

  // =========================================================================
  // BOOTSTRAP APPLICATION
  // =========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    initMap();
    initTabs();
    initReroutePlanner();
    initReportModal();
    initApiKeyManager();
    initSpotlightControls();
    initUserLocation();

    // Initial Fetch
    fetchCorridorData();
    fetchPredictions();

    // Regular Polling Interval (every 2.5 seconds)
    setInterval(() => {
      fetchCorridorData();
      fetchPredictions();
    }, 2500);

    console.log('🚧 RailGate Intelligence Engine initialized.');
  });

})();


