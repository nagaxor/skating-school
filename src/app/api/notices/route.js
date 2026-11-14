import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin } from "@/lib/access";
import { json } from "@/lib/auth";
import { noticeCreateSchema, idSchema } from "@/lib/validation";
import { audit } from "@/lib/security";

export async function GET(){
  const ctx=await getAuthContext(); if(!ctx) return json({error:'Unauthorized'},401);
  const where= ctx.user.role==='student' ? (ctx.user.student?.clubId ? {OR:[{audience:'All'},{audience:(await db.club.findUnique({where:{id:ctx.user.student.clubId},select:{name:true}}))?.name || '__none__'}]} : {audience:'__none__'})
    : ctx.user.role==='instructor' ? (ctx.user.instructor?.clubId ? {OR:[{audience:'All'},{audience:(await db.club.findUnique({where:{id:ctx.user.instructor.clubId},select:{name:true}}))?.name || '__none__'}]} : {audience:'__none__'})
    : {};
  const notices=await db.notice.findMany({where,include:{author:{select:{name:true}}},orderBy:{date:'desc'},take:300});
  return json(notices.map(n=>({id:n.id,title:n.title,body:n.body,audience:n.audience,urgent:n.urgent,author:n.author.name,date:n.date.toISOString().slice(0,10)})));
}

export async function POST(request){
  if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403);
  const ctx=await getAuthContext(); if(!ctx || ctx.user.role==='student') return json({error:'Forbidden'},403);
  const parsed=noticeCreateSchema.safeParse(await request.json()); if(!parsed.success) return json({error:'Invalid notice',details:parsed.error.flatten().fieldErrors},400);
  let audience=parsed.data.audience;
  if(ctx.user.role==='instructor'){
    const clubId=ctx.user.instructor?.clubId; if(!clubId) return json({error:'Instructor is not assigned to a club'},400);
    const club=await db.club.findUnique({where:{id:clubId},select:{name:true}}); audience=parsed.data.audience==='All'?'All':club?.name;
  } else if(audience!=='All'){
    const club=await db.club.findUnique({where:{name:audience},select:{name:true}}); if(!club) return json({error:'Unknown audience'},400);
  }
  const notice=await db.notice.create({data:{title:parsed.data.title,body:parsed.data.body,audience,urgent:parsed.data.urgent,authorId:ctx.user.id}});
  await audit({actorId:ctx.user.id,action:'notice.create',target:notice.id,meta:{title:notice.title,audience},request});
  return json({id:notice.id},201);
}

// Admins can delete any notice; instructors only notices they posted.
export async function DELETE(request){
  if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403);
  const ctx=await getAuthContext(); if(!ctx || ctx.user.role==='student') return json({error:'Forbidden'},403);
  const id=new URL(request.url).searchParams.get('id');
  if(!idSchema.safeParse(id).success) return json({error:'Invalid id'},400);
  const notice=await db.notice.findUnique({where:{id}});
  if(!notice) return json({error:'Not found'},404);
  if(ctx.user.role==='instructor' && notice.authorId!==ctx.user.id) return json({error:'You can only delete notices you posted'},403);
  await db.notice.delete({where:{id}});
  await audit({actorId:ctx.user.id,action:'notice.delete',target:id,meta:{title:notice.title},request});
  return json({success:true});
}
