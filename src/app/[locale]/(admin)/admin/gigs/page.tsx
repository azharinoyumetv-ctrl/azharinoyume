import { prisma } from "@/lib/prisma";
import GigDraftsClient from "./GigDraftsClient";
export default async function GigsPage() { const drafts = await prisma.gigDraft.findMany({ orderBy: { createdAt: "desc" } }); return <GigDraftsClient drafts={JSON.parse(JSON.stringify(drafts))}/>; }
