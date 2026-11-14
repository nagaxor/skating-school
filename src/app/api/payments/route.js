import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin, studentScope, requirePermission } from "@/lib/access";
import { json } from "@/lib/auth";
import { paymentCreateSchema } from "@/lib/validation";
import { audit } from "@/lib/security";


export async function GET(request) {
  const ctx=await getAuthContext(); { const denied = requirePermission(ctx, "payments.read"); if (denied) return denied; }
  const studentId=new URL(request.url).searchParams.get('studentId');
  // Scope first; a studentId filter can only narrow it, never widen it.
  const where={student:studentScope(ctx)};
  if (studentId) where.studentId=String(studentId);
  const payments=await db.payment.findMany({where,include:{student:{include:{user:{select:{name:true,phone:true}},club:{select:{name:true}}}}},orderBy:{date:'desc'},take:500});
  return json(payments.map(p=>({id:p.id,studentId:p.studentId,studentName:p.student.user.name,studentPhone:p.student.user.phone,club:p.student.club?.name||'',program:p.student.program,guardian:p.student.guardian,amount:p.amount,method:p.method,type:p.type,month:p.month,receiptNo:p.receiptNo,date:p.date.toISOString().slice(0,10)})));
}

export async function POST(request) {
  if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403);
  const ctx=await getAuthContext(); { const denied = requirePermission(ctx, "payments.create"); if (denied) return denied; }
  const parsed=paymentCreateSchema.safeParse(await request.json()); if(!parsed.success) return json({error:'Invalid payment data',details:parsed.error.flatten().fieldErrors},400);
  const d=parsed.data;
  const student=await db.student.findUnique({where:{id:d.studentId},include:{user:{select:{name:true}},club:true}});
  if(!student) return json({error:'Student not found'},404);
  if(ctx.user.role==='instructor' && student.clubId!==ctx.user.instructor?.clubId) return json({error:'Forbidden'},403);
  for(let attempt=0;attempt<3;attempt++){
    const receiptNo=`OSS-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    try {
      const p=await db.payment.create({data:{studentId:d.studentId,amount:d.amount,method:d.method,type:d.type,month:d.month,receiptNo}});
      await audit({actorId:ctx.user.id,action:'payment.create',target:p.id,meta:{receiptNo,amount:d.amount,method:d.method,type:d.type,month:d.month,student:student.user.name},request});
      return json({id:p.id,receiptNo},201);
    } catch(err){ if(err.code!=='P2002') {console.error(err);return json({error:'Failed to record payment'},500);} }
  }
  return json({error:'Could not generate a unique receipt number'},500);
}
