import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin, isStaff, visibleClubIds } from "@/lib/access";
import { json } from "@/lib/auth";
import { noticeCreateSchema, idSchema } from "@/lib/validation";
import { audit } from "@/lib/security";

export async function GET(){
  const ctx=await getAuthContext(); if(!ctx) return json({error:'Unauthorized'},401);
  // Everyone sees "All"; branch notices only for branches in the caller's scope.
  const clubIds=await visibleClubIds(ctx);
  const names= clubIds===null ? null : (await db.club.findMany({where:{id:{in:clubIds}},select:{name:true}})).map(c=>c.name);
  const where= names===null ? {} : {audience:{in:['All',...names]}};
  const notices=await db.notice.findMany({where,include:{author:{select:{name:true}}},orderBy:{date:'desc'},take:300});
  return json(notices.map(n=>({id:n.id,title:n.title,body:n.body,audience:n.audience,urgent:n.urgent,author:n.author.name,mine:n.authorId===ctx.user.id,date:n.date.toISOString().slice(0,10)})));
}

export async function POST(request){
  if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403);
  const ctx=await getAuthContext(); if(!ctx || !isStaff(ctx)) return json({error:'Forbidden'},403);
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
  const ctx=await getAuthContext(); if(!ctx || !isStaff(ctx)) return json({error:'Forbidden'},403);
  const id=new URL(request.url).searchParams.get('id');
  if(!idSchema.safeParse(id).success) return json({error:'Invalid id'},400);
  const notice=await db.notice.findUnique({where:{id}});
  if(!notice) return json({error:'Not found'},404);
  if(ctx.user.role==='instructor' && notice.authorId!==ctx.user.id) return json({error:'You can only delete notices you posted'},403);
  await db.notice.delete({where:{id}});
  await audit({actorId:ctx.user.id,action:'notice.delete',target:id,meta:{title:notice.title},request});
  return json({success:true});
}
