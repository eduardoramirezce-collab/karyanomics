import { redirect } from "next/navigation";

/** The old intake page now lives in the sign-in flow. */
export default function PatientPage() {
  redirect("/login");
}
