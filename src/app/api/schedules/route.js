import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin, isStaff, visibleClubIds } from "@/lib/access";
import { json } from "@/lib/auth";
import { scheduleCreateSchema, idSchema } from "@/lib/validation";
import { audit } from "@/lib/security";

export async function GET(){
  const ctx=await getAuthContext(); if(!ctx) return json({error:'Unauthorized'},401);
  const clubIds=await visibleClubIds(ctx); const where= clubIds===null ? {} : {clubId:{in:clubIds}};
  const schedules=await db.schedule.findMany({where,include:{club:{select:{name:true}},instructor:{include:{user:{select:{name:true}}}}},orderBy:[{day:'asc'},{time:'asc'}]});
  return json(schedules.map(s=>({id:s.id,day:s.day,time:s.time,program:s.program,club:s.club.name,clubId:s.clubId,instructor:s.instructor.user.name,instructorId:s.instructorId})));
}

export async function POST(request){
  if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403);
  const ctx=await getAuthContext(); if(!ctx || !isStaff(ctx)) return json({error:'Forbidden'},403);
  const parsed=scheduleCreateSchema.safeParse(await request.json()); if(!parsed.success) return json({error:'Invalid schedule',details:parsed.error.flatten().fieldErrors},400);
  const d=parsed.data;
  if(ctx.user.role==='instructor' && d.clubId!==ctx.user.instructor?.clubId) return json({error:'Forbidden'},403);
  const instructor=await db.instructor.findUnique({where:{id:d.instructorId},select:{clubId:true}}); if(!instructor || instructor.clubId!==d.clubId) return json({error:'Instructor does not belong to this club'},400);
  const schedule=await db.schedule.create({data:d}); await audit({actorId:ctx.user.id,action:'schedule.create',target:schedule.id,meta:{day:d.day,time:d.time,program:d.program},request}); return json({id:schedule.id},201);
}

// Admins can delete any slot; instructors only slots in their own branch.
export async function DELETE(request){
  if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403);
  const ctx=await getAuthContext(); if(!ctx || !isStaff(ctx)) return json({error:'Forbidden'},403);
  const id=new URL(request.url).searchParams.get('id');
  if(!idSchema.safeParse(id).success) return json({error:'Invalid id'},400);
  const slot=await db.schedule.findUnique({where:{id}});
  if(!slot) return json({error:'Not found'},404);
  if(ctx.user.role==='instructor' && slot.clubId!==ctx.user.instructor?.clubId) return json({error:'Forbidden'},403);
  await db.schedule.delete({where:{id}});
  await audit({actorId:ctx.user.id,action:'schedule.delete',target:id,meta:{day:slot.day,time:slot.time,program:slot.program},request});
  return json({success:true});
}
