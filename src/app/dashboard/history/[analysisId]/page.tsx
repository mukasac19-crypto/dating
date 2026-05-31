import { redirect } from 'next/navigation';

export default function AnalysisDetailPage({
  params,
}: {
  params: { analysisId: string };
}) {
  redirect(`/dashboard/analysis/${params.analysisId}`);
}
