
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).set(CORS).end(); return; }
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  res.status(200).json({
    status: 'live',
    message: 'No API key required. All data powered by live kinematics.',
    key: 'rg_live_tbm_cgl_84920482',
    active: true,
    source: 'Vercel Serverless Edge'
  });
}
