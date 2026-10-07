import { notFound } from "next/navigation";
import { Workspace } from "@/components/underwriting/workspace";

export default async function UnderwritingPage({ params }: PageProps<"/underwriting/[id]">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  return <Workspace id={numericId} />;
}
