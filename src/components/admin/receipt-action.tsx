"use client";
import {useActionState} from "react";
import {createReceipt} from "@/app/admin/reservas/travel-actions";
import {Button} from "@/components/ui/button";
export function ReceiptAction({id}:{id:string}){const [state,action,pending]=useActionState(createReceipt,{});return <form action={action}><input type="hidden" name="payment_id" value={id}/><Button variant="ghost" disabled={pending}>{pending?"Generando":"Generar recibo"}</Button>{state.error?<p role="alert">{state.error}</p>:null}{state.success?<p role="status">{state.success}</p>:null}</form>;}
