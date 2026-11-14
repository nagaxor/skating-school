import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin, requirePermission } from "@/lib/access";
import { json } from "@/lib/auth";
import { z } from "zod";
import { audit } from "@/lib/security";
const updateSchema=z.object({key:z.string().trim().min(1).max(100),value:z.string().max(1000)});
export async function GET(){ const ctx=await getAuthContext(); if(!ctx) return json({error:'Unauthorized'},401); const items=await db.setting.findMany({orderBy:{key:'asc'}}); return json(Object.fromEntries(items.map(x=>[x.key,x.value]))); }
export async function PUT(request){ if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403); const ctx=await getAuthContext(); { const denied = requirePermission(ctx, "settings.update"); if (denied) return denied; } const p=updateSchema.safeParse(await request.json()); if(!p.success) return json({error:'Invalid setting'},400); const before=await db.setting.findUnique({where:{key:p.data.key}}); await db.setting.upsert({where:{key:p.data.key},update:{value:p.data.value},create:p.data}); if(before?.value!==p.data.value) await audit({actorId:ctx.user.id,action:'settings.update',target:p.data.key,meta:{from:before?.value??null,to:p.data.value},request}); return json({success:true}); }
