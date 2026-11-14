import { db } from "@/lib/db";
import { getAuthContext, assertSameOrigin, studentScope, requirePermission } from "@/lib/access";
import { json } from "@/lib/auth";
import { attendanceCreateSchema } from "@/lib/validation";
import { can } from "@/lib/rbac";
import { todayDhaka } from "@/lib/qr";
import { audit } from "@/lib/security";

function dayUtc(value){ const [y,m,d]=value.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }

export async function GET(request){
  const ctx=await getAuthContext(); { const denied = requirePermission(ctx, "attendance.read"); if (denied) return denied; }
  const sp=new URL(request.url).searchParams; const studentId=sp.get('studentId'); const date=sp.get('date'); const month=sp.get('month');
  const where={student:studentScope(ctx)};
  if(studentId) where.studentId=String(studentId);
  if(sp.get('today')==='1') where.date=todayDhaka().date;
  else if(date && /^\d{4}-\d{2}-\d{2}$/.test(date)) where.date=dayUtc(date);
  else if(month && /^\d{4}-\d{2}$/.test(month)){ const [y,m]=month.split('-').map(Number); where.date={gte:new Date(Date.UTC(y,m-1,1)),lt:new Date(Date.UTC(y,m,1))}; }
  const records=await db.attendance.findMany({where,include:{student:{include:{user:{select:{name:true}}}}},orderBy:{date:'desc'},take:2000});
  return json(records.map(r=>({id:r.id,date:r.date.toISOString().slice(0,10),studentId:r.studentId,studentName:r.student.user.name,status:r.status,source:r.source,scannedAt:r.scannedAt})));
}

export async function POST(request){
  if(!assertSameOrigin(request)) return json({error:'Invalid origin'},403);
  const ctx=await getAuthContext(); { const denied = requirePermission(ctx, "attendance.mark"); if (denied) return denied; }
  const parsed=attendanceCreateSchema.safeParse(await request.json()); if(!parsed.success) return json({error:'Invalid attendance data'},400);
  const d=parsed.data; const ids=[...new Set(d.records.map(r=>r.studentId))];
  // Scope: every student must be visible to the caller (instructor → own branch).
  const students=await db.student.findMany({where:{id:{in:ids},...studentScope(ctx)},select:{id:true}});
  if(students.length!==ids.length) return json({error:'One or more students were not found'},404);
  // Date: only "attendance.backdate" (admin) may mark a day other than today (Dhaka time).
  const today=todayDhaka();
  if(d.date!==today.ymd && !can(ctx.user.role,'attendance.backdate')) return json({error:`You can only mark attendance for today (${today.ymd})`},403);
  const date=dayUtc(d.date);
  await db.$transaction(d.records.map(r=>db.attendance.upsert({where:{date_studentId:{date,studentId:r.studentId}},update:{status:r.status,markedById:ctx.user.id},create:{date,studentId:r.studentId,status:r.status,markedById:ctx.user.id}})));
  await audit({actorId:ctx.user.id,action:'attendance.mark',target:d.date,meta:{count:d.records.length,date:d.date},request});
  return json({success:true,count:d.records.length});
}
