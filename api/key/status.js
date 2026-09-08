const CORS = {"Access-Control-Allow-Origin":"*","Content-Type":"application/json"};
export default function handler(req,res){
  Object.entries(CORS).forEach(([k,v])=>res.setHeader(k,v));
  const hasTomTom = !!(process.env.TOMTOM_API_KEY);
  res.status(200).json({status:"live",active:true,tomtom_connected:hasTomTom,
    message:hasTomTom?"Live traffic via TomTom API":"Simulated traffic (add TOMTOM_API_KEY for live)",
    timestamp:new Date().toISOString()});
}
