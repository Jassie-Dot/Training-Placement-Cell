"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createStudentRecord, setStudentTrainingAssignments, setStudentStatus, updateStudentRecord } from "@/lib/faculty/student-service";

function getInput(form: FormData) {
  return {
    fullName: form.get("fullName"), rollNumber: form.get("rollNumber"), registrationNumber: form.get("registrationNumber"),
    email: form.get("email"), department: form.get("department"), semester: form.get("semester"), academicYear: form.get("academicYear"),
    cgpa: form.get("cgpa"), contactNumber: form.get("contactNumber"), trainingCodes: form.getAll("trainingCodes").map(String),
  };
}
export async function createStudentAction(_state: { error: string }, form: FormData): Promise<{ error: string }> {
  let studentId: string;
  try { ({ studentId } = await createStudentRecord(getInput(form))); }
  catch (error) { return { error: error instanceof Error ? error.message : "Student could not be created." }; }
  revalidatePath("/faculty/students"); redirect(`/faculty/students/${studentId}`);
}
export async function updateStudentAction(studentId: string, form: FormData) {
  await updateStudentRecord(studentId, getInput(form)); revalidatePath(`/faculty/students/${studentId}`); revalidatePath("/faculty/students");
}
export async function assignStudentAction(studentId: string, form: FormData) {
  await setStudentTrainingAssignments(studentId, form.getAll("trainingCodes").map(String)); revalidatePath(`/faculty/students/${studentId}`); revalidatePath("/faculty/trainings");
}
export async function studentStatusAction(studentId: string, form: FormData) {
  const status = form.get("status"); if (status !== "ACTIVE" && status !== "INACTIVE" && status !== "GRADUATED") throw new Error("Choose a valid account status.");
  await setStudentStatus(studentId, status); revalidatePath(`/faculty/students/${studentId}`); revalidatePath("/faculty/students");
}
