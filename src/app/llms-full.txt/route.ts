import { buildLlmsFullTxt } from "@/lib/llms";
import { llmsResponse, loadLlmsContent } from "@/lib/llms-data";

export async function GET() {
  return llmsResponse(buildLlmsFullTxt(await loadLlmsContent()));
}
