import TripDetailClient from "@/components/TripDetailClient";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <TripDetailClient tripId={tripId} />;
}
