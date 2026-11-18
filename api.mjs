import * as C from "../lib/core.mjs";
import {randomBytes} from "node:crypto";
export const config={path:"/api/*"};
export default async (req)=>{
 const u=new URL(req.url),p=u.pathname.replace(/^\/api/,""),M=req.method;
 try{
  if(p==="/menu"&&M==="GET")return C.J(await C.readMenu(),200,{"cache-control":"public, max-age=0, must-revalidate","netlify-cdn-cache-control":"public, s-maxage=10, stale-while-revalidate=30"});
  const g=/^\/img\/([a-f0-9]{16})$/.exec(p);
  if(g&&M==="GET"){const r=await C.getImg(g[1]);if(!r)return C.J({error:"not_found"},404);return new Response(r.data,{headers:{"content-type":r.metadata.ct,"cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}
  if(!p.startsWith("/admin/"))return C.J({error:"not_found"},404);
  if(M!=="GET"){const o=req.headers.get("origin");let same=false;try{same=!!o&&new URL(o).host===u.host}catch{}if(!same||req.headers.get("x-requested-with")!=="tb")return C.J({error:"forbidden"},403)}
  if(p==="/admin/login"&&M==="POST"){
   if(!C.configured())return C.J({error:"not_configured"},503);
   if(await C.locked(req))return C.J({error:"locked"},429);
   const b=await req.json().catch(()=>({}));
   if(C.pwOk(b.password)){await C.okLogin(req);return C.J({ok:true},200,{"set-cookie":C.cookie(await C.newSession(),7200)})}
   await C.fail(req);await new Promise(r=>setTimeout(r,500));return C.J({error:"invalid"},401)}
  if(p==="/admin/logout"&&M==="POST"){await C.endSession(req);return C.J({ok:true},200,{"set-cookie":C.cookie("",0)})}
  if(!(await C.isAdmin(req)))return C.J({error:"unauthorized"},401);
  if(p==="/admin/session"&&M==="GET")return C.J({admin:true});
  if(p==="/admin/image"&&M==="POST"){const b=new Uint8Array(await req.arrayBuffer());if(b.length<12||b.length>2.5e6)return C.J({error:"size"},413);
   const ct=b[0]==255&&b[1]==216&&b[2]==255?"image/jpeg":b[0]==137&&b[1]==80&&b[2]==78&&b[3]==71?"image/png":String.fromCharCode(...b.slice(0,4))+String.fromCharCode(...b.slice(8,12))==="RIFFWEBP"?"image/webp":"";
   if(!ct)return C.J({error:"type"},415);const id=randomBytes(8).toString("hex");await C.putImg(id,b.buffer.slice(b.byteOffset,b.byteOffset+b.length),ct);return C.J({url:"/api/img/"+id})}
  if(p==="/admin/doc"||p==="/admin/batch"){
   const b=await req.json().catch(()=>null);if(!b)return C.J({error:"json"},400);
   const ops=p==="/admin/batch"?(M==="POST"&&Array.isArray(b.ops)&&b.ops.length<=100?b.ops:null):({PUT:[{op:"set",path:b.path,data:b.data}],PATCH:[{op:"update",path:b.path,data:b.data}],DELETE:[{op:"delete",path:b.path}]})[M];
   if(!ops)return C.J({error:"bad_request"},400);
   const menu=await C.readMenu();for(const o of ops){const e=C.applyOp(menu,o.op,o.path,o.data);if(e)return C.J({error:e},e==="missing"?404:400)}
   await C.writeMenu(menu);return C.J({ok:true})}
  return C.J({error:"not_found"},404);
 }catch(e){console.error(e);return C.J({error:"server"},500)}
};
