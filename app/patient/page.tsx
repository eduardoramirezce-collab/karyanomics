import type { Metadata } from "next";
import VcfUpload from "./VcfUpload";

export const metadata: Metadata = {
  title: "Patient · Karyanomics",
};

export default function PatientPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Your medications and your genes</h1>
      <VcfUpload />
    </main>
  );
}
