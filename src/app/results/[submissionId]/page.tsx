import { notFound } from "next/navigation";
import { ResultsView } from "@/components/results/results-view";

export default async function ResultsPage({ params }: PageProps<"/results/[submissionId]">) {
  const { submissionId } = await params;
  const id = Number(submissionId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ResultsView submissionId={id} />;
}
