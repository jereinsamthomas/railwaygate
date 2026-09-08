const CORS = {"Access-Control-Allow-Origin":"*","Content-Type":"application/json"};
export default function handler(req,res){
  Object.entries(CORS).forEach(([k,v])=>res.setHeader(k,v));
  res.status(200).json({ok:true,message:"Report received. Thank you!",timestamp:new Date().toISOString()});
}
