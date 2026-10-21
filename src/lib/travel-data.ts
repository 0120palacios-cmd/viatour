import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicTravel, TravelOperations } from "@/lib/travel-operations";
import { openTravel } from "@/lib/travel-vault";
export async function getTravel(client: SupabaseClient,id:string,privateData=false) {
 const fields=privateData?"revision,public_data,encrypted_private,private_context,updated_at":"revision,public_data,updated_at";
 const result=await client.from("reservation_travel").select(fields).eq("reservation_id",id).maybeSingle();
 if(result.error) return {available:false,revision:0,data:null,privateData:null};
 const row=result.data as unknown as {revision:number;public_data:PublicTravel;encrypted_private?:string;private_context?:string;updated_at:string}|null;
 let decrypted:TravelOperations|null=null;
 try{if(privateData&&row?.encrypted_private)decrypted=openTravel(row.encrypted_private,row.private_context??id) as TravelOperations;}catch{return {available:false,revision:row?.revision??0,data:row?.public_data??null,privateData:null};}
 return {available:true,revision:row?.revision??0,data:row?.public_data??null,privateData:decrypted};
}
