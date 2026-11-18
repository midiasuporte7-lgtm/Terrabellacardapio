import {getStore} from "@netlify/blobs";
import {createHmac,createHash,timingSafeEqual,randomBytes} from "node:crypto";
const st=()=>getStore({name:"terrabella",consistency:"strong"});
const h=s=>createHash("sha256").update(String(s)).digest();
const eq=(a,b)=>timingSafeEqual(h(a),h(b));
export const J=(o,s=200,x={})=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...x}});
// ---- autenticação (senha e segredo ficam SOMENTE em variáveis de ambiente do servidor)
export const configured=()=>!!process.env.ADMIN_PASSWORD&&(process.env.SESSION_SECRET||"").length>=32;
export const pwOk=p=>typeof p==="string"&&p.length<200&&eq(p,process.env.ADMIN_PASSWORD);
const sig=s=>createHmac("sha256",process.env.SESSION_SECRET).update(s).digest("base64url");
export const cookie=(v,age)=>`tb_admin=${v}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`;
const tok=r=>(/(?:^|;\s*)tb_admin=([\w.-]+)/.exec(r.headers.get("cookie")||"")||[])[1];
export async function newSession(){const id=randomBytes(18).toString("base64url"),exp=Date.now()+72e5,b=id+"."+exp;await st().setJSON("sess/"+id,{exp});return b+"."+sig(b)}
export async function isAdmin(r){const t=tok(r);if(!t||!configured())return false;const[id,exp,s]=t.split(".");if(!s||!eq(sig(id+"."+exp),s)||+exp<Date.now())return false;const x=await st().get("sess/"+id,{type:"json"});return !!x&&x.exp>Date.now()}
export async function endSession(r){const t=tok(r);if(t)await st().delete("sess/"+t.split(".")[0])}
const ipKey=r=>"rl/"+h(r.headers.get("x-nf-client-connection-ip")||r.headers.get("x-forwarded-for")||"?").toString("hex").slice(0,24);
export async function locked(r){const x=await st().get(ipKey(r),{type:"json"});return !!x&&x.u>Date.now()}
export async function fail(r){const k=ipKey(r),x=(await st().get(k,{type:"json"}))||{n:0};x.n++;if(x.n>=5){x.u=Date.now()+9e5;x.n=0}await st().setJSON(k,x)}
export const okLogin=r=>st().delete(ipKey(r));
// ---- dados
export const readMenu=async()=>({m2:{},c2:{},cfg:{},...((await st().get("menu",{type:"json"}))||{})});
export const writeMenu=m=>st().setJSON("menu",m);
export const getImg=id=>st().getWithMetadata("img/"+id,{type:"arrayBuffer"});
export const putImg=(id,buf,ct)=>st().set("img/"+id,buf,{metadata:{ct}});
// ---- validação (o servidor nunca confia no navegador)
const GR=["Arroz","Farofa","Feijão","Outros acompanhamentos"],CT=["carn","beb","fei","sob"];
const S=(v,n)=>typeof v==="string"&&v.length<=n,N=(v,a,b)=>typeof v==="number"&&isFinite(v)&&v>=a&&v<=b;
const SCH={m2:{i:v=>N(v,1,1e13),n:v=>S(v,80)&&!!v.trim(),d:v=>S(v,200),p:v=>N(v,0,999),c:v=>CT.includes(v),b:v=>S(v,30),f:v=>v===0||v===1,x:v=>typeof v==="boolean",img:v=>S(v,300)&&(v===""||/^(\/api\/img\/[a-f0-9]{16}|img\/[\w.-]+)$/.test(v)),o:v=>N(v,0,1e6)},
c2:{n:v=>S(v,60)&&!!v.trim(),g:v=>GR.includes(v),x:v=>typeof v==="boolean",o:v=>N(v,0,1e6)},cfg:{v:v=>["auto","fei","normal"].includes(v)}};
const REQ={m2:["n","p","c"],c2:["n","g"],cfg:["v"]};
export function parsePath(p){const m=/^(m2|c2|cfg)\/([\w-]{1,40})$/.exec(p||"");if(!m)return null;const[,c,id]=m;if(c==="cfg"?id!=="mode":!(c==="m2"?/^p\d+$/:/^c\d+$/).test(id))return null;return{c,id}}
export function clean(c,d,full){if(!d||typeof d!=="object"||Array.isArray(d))return null;for(const k of Object.keys(d))if(!SCH[c][k]||!SCH[c][k](d[k]))return null;if(full&&!REQ[c].every(k=>k in d))return null;return d}
export function applyOp(menu,op,path,data){const q=parsePath(path);if(!q)return "path";const cur=menu[q.c][q.id];if(op==="delete"){delete menu[q.c][q.id];return ""}if(op==="set"||op==="update"){const d=clean(q.c,data,op==="set");if(!d)return "data";if(op==="update"&&!cur)return "missing";menu[q.c][q.id]=op==="set"?d:{...cur,...d};return ""}return "op"}
