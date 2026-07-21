import { tutors } from "../../data";
import { TutorProfileClient } from "./TutorProfileClient";

export default async function TutorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TutorProfileClient slug={slug} fallbackTutor={tutors.find((item) => item.slug === slug)} />;
}
