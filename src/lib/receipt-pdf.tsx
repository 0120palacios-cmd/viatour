/* eslint-disable jsx-a11y/alt-text -- react-pdf Image is not an HTML image and has no alt prop. */
import "server-only";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {Document,Page,Text,View,Image,Font,renderToBuffer} from "@react-pdf/renderer";
import {formatMoney,paymentMethodLabel,type PaymentMethod} from "@/lib/reservation-types";
export type Receipt={id:string;number:string;reservation_id:string;created_at:string;snapshot:{customer:string;reservation:string;amount:number;currency:"USD"|"HNL";method:PaymentMethod;reference:string|null;date:string;balance:number}};
let registered=false;
export async function renderReceiptPdf(receipt:Receipt){
 if(!registered){Font.register({family:"ReceiptManrope",fonts:[400,700].map(weight=>({src:join(process.cwd(),"src/assets/fonts",`manrope-${weight}.woff`),fontWeight:weight}))});registered=true;}
 const r=receipt.snapshot;
 return renderToBuffer(<Document title={`Recibo ${receipt.number}`} author="viatour"><Page size="LETTER" style={{padding:48,fontFamily:"ReceiptManrope",fontSize:11,color:"#12161C"}}><Image src={readFileSync(join(process.cwd(),"public/logo-black.png"))} style={{width:150,height:48,objectFit:"contain"}}/><Text style={{fontSize:26,fontWeight:700,marginTop:32,color:"#1656D6"}}>Recibo de pago</Text><Text style={{marginTop:8}}>{receipt.number}</Text><View style={{marginTop:32,padding:20,backgroundColor:"#F5F7F8",borderRadius:10}}>{[['Cliente',r.customer],['Reservación',r.reservation],['Fecha del pago',r.date],['Método',paymentMethodLabel(r.method)],['Referencia',r.reference||'No registrada']].map(([label,value])=><View key={label} style={{marginBottom:12}}><Text style={{fontSize:9,color:"#5A6672"}}>{label}</Text><Text style={{marginTop:3}}>{value}</Text></View>)}</View><Text style={{marginTop:32,fontSize:12}}>Monto recibido</Text><Text style={{fontSize:26,fontWeight:700,color:"#1656D6",marginTop:8}}>{formatMoney(Number(r.amount),r.currency)}</Text><Text style={{marginTop:24}}>Saldo de la reserva al generar este recibo: {formatMoney(Number(r.balance),r.currency)}</Text><Text style={{marginTop:24,fontSize:10,color:"#5A6672"}}>Este documento corresponde al pago registrado y no sustituye la factura de servicios. Un depósito solicitado no constituye un pago recibido.</Text><Text style={{position:"absolute",bottom:40,left:48,right:48,fontSize:9,color:"#5A6672"}}>viatour · soporte@miviatour.com · WhatsApp +504 8866-8704</Text></Page></Document>);
}
