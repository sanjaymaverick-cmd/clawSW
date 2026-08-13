import { redirect } from "next/navigation";

/** Projects gallery lives at /gallery (scraped installation photos). */
export default function ProjectsPage() {
  redirect("/gallery");
}
