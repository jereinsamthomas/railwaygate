
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).set(CORS).end(); return; }
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  res.status(200).json({
    ok: true,
    message: 'Report received. Thank you for contributing live data!',
    timestamp: new Date().toISOString()
  });
}
