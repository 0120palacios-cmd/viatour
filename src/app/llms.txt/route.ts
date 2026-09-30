import { buildLlmsTxt } from "@/lib/llms";
import { llmsResponse, loadLlmsContent } from "@/lib/llms-data";

export async function GET() {
  return llmsResponse(buildLlmsTxt(await loadLlmsContent()));
}
