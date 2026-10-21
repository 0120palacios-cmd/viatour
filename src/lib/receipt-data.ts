import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Receipt} from "@/lib/receipt-pdf";
export async function getReceipts(client:SupabaseClient,id:string){const result=await client.from("payment_receipts").select("id,number,reservation_id,snapshot,created_at").eq("reservation_id",id).order("created_at",{ascending:false});return (result.error?[]:result.data??[]) as Receipt[];}
