# Quotations V5 — Supabase rollout guide (step by step)

This guide is for the owner. It takes about 30–45 minutes. Do it at a quiet time, when nobody is editing
quotations. Nothing here sends anything to customers.

You will use four SQL files, always in this order:

| Step | File | Changes data? |
|---|---|---|
| 1 | `docs/sql/quotations_v5_preflight.sql` | No (read-only checks) |
| 2 | `docs/sql/quotations_v5_backup.sql` | Only creates a private copy |
| 3 | `docs/sql/quotations_v5.sql` | **Yes — the migration** |
| 4 | `docs/sql/quotations_v5_verify.sql` | No (read-only checks) |
| 5 | `docs/sql/invoices_v5.sql` | **Yes — adds 3 invoice columns** |

Open each file in your code editor (VS Code or similar), copy its text, and paste it into Supabase as described below.

---

## How to run SQL in Supabase (read once)

1. Go to <https://supabase.com/dashboard> and open the **viatour** project.
2. In the left sidebar, click **SQL Editor**.
3. Click **+ New query** (top left). An empty editor opens.
4. Paste the SQL.
5. **Important:** the Supabase editor only shows the result of the *last* statement you run. For the
   read-only files (preflight, verify), run **one numbered block at a time**: select (highlight) the lines of
   that block with the mouse, then press **Run** (or `Ctrl` + `Enter`). The results table appears below.
6. If Supabase shows a warning such as "This query has destructive operations", that is expected **only**
   in step 3. In steps 1, 2 and 4 nothing is destructive.

---

## Step 0 — Before you start (5 minutes)

- [ ] Make sure you can log in to `/admin` on the live site with your admin account.
- [ ] Confirm a recent automatic backup exists: Supabase → **Database** → **Backups**. Note the date of the latest one.
- [ ] Optional but recommended: run a fresh full backup from GitHub: repository → **Actions** →
      **Supabase backup** → **Run workflow**. Wait for the green check. The `.dump` file is stored as an
      artifact for 14 days.

---

## Step 1 — Preflight checks (read-only)

Open `docs/sql/quotations_v5_preflight.sql`, paste it into a new query, and run **each block separately**.

| Block | What you should see | STOP if you see |
|---|---|---|
| 1. Columns of `quotations` | A list of columns such as `id`, `codigo`, `cliente_nombre`, `total`, `estado`… | Any column named `tipo`, `detalles`, `vence_en`, `version` or `version_aceptada` already exists |
| 2. Type of `id` | `uuid` | Anything else |
| 3. Existing names | **No rows** (both queries) | Any row |
| 4. `is_admin` | One row: `is_admin`, `args` empty | No rows, or `args` not empty |
| 5. RLS | `relrowsecurity = true` for both tables, and policies that mention `is_admin()` | `false`, or a policy whose `roles` includes `anon` for quotations, items, customers or reservations |
| 6. Storage policies without bucket filter | **No rows** | **Any row** — it could expose private photos |
| 7. Counts | Two numbers. **Write them down**: quotations = ____ items = ____ | — |
| 8. Existing table/bucket | `tabla_versiones` empty (null); bucket query: no rows | Already exists (tell me before continuing) |
| 9. Duplicate reservations | **No rows** | Any row — the migration would stop |
| 10. Columns used by new controls | 3 rows: `reservations.quotation_id`, `objects.created_at`, `objects.name` | Fewer than 3 |
| 11. Accepted quotations | A number (they will become read-only, by design) | — |
| 12. Existing triggers | Usually an `updated_at` trigger or nothing | Anything you do not recognise — send it to me first |
| 13. Invoices | Columns without `items`, `cliente_email`, `cliente_telefono` (that is the bug being fixed); constraints and policies listed | A status constraint that does not allow `borrador`, or a policy for `anon` |
| 14. Check constraints | The rules on `estado`, `moneda`, `cantidad` | Anything that would reject `ferry` in a column other than the new `tipo` — send it to me |

If **any** STOP condition appears, do not continue. Copy the result and send it to me.

---

## Step 2 — Backup of quotation data (safe)

Open `docs/sql/quotations_v5_backup.sql`, paste the **whole file**, and click **Run**.

- Expected: a small table with four rows (`quotations`, `quotation_items`, `customers`, `reservations`) and their counts.
- The `quotations` and `quotation_items` counts must match what you wrote down in Step 1, block 7.
- The copy is stored in a private schema called `backup_v5`. The website and its API cannot read it.

---

## Step 3 — Apply the migration (only after your approval)

Open `docs/sql/quotations_v5.sql`, paste the **whole file** into a new query, and click **Run** once.

- Expected: "Success. No rows returned" (it may take a few seconds).
- Supabase may ask you to confirm because of destructive-looking statements (`drop policy if exists`, etc.). Confirm.
- The file runs inside a single transaction: **if anything fails, nothing is applied**. In that case copy the
  full error message, do not retry, and send it to me.
- Running it twice by accident is safe.

---

## Step 4 — Verify nothing was lost (read-only)

Open `docs/sql/quotations_v5_verify.sql`, paste it, and run **each block separately**.

| Block | Expected |
|---|---|
| 1 | 5 rows: `tipo`, `detalles`, `vence_en`, `version`, `version_aceptada` |
| 2 | Every existing quotation as `general`, `sin_detalles` equal to its count, `version_max = 0`. `items_totales` equal to your Step 1 number |
| 3 | 3 constraint names; 3 trigger names; 4 function names; 3 index names |
| 4 | `relrowsecurity = true`; 5 policies (2 on `quotation_versions`, 3 on `objects`); the `anon` query returns **no rows** |
| 5 | One row: `quotation-media`, `public = false`, `5242880`, `{image/jpeg}` |
| 6 | Three zeros: no missing quotations, no changed quotations, no missing items |

If block 6 shows anything other than 0, stop and send me the result. Your data is still in `backup_v5`.

---

## Step 4b — Invoice columns (after Step 4 passes)

Open `docs/sql/invoices_v5.sql`, paste the whole file and click **Run**. Expected: a table with 3 rows
(`items`, `cliente_email`, `cliente_telefono`). It only adds columns; existing invoices are untouched.
Until this runs, the admin can open reservations and invoices again (the new code no longer fails on the
missing columns) but cannot create invoices.

## Step 5 — Publish the new code

The database change alone does not change the website. The new admin panel goes live only when the code is
committed and deployed, which needs your explicit authorization. From reading the old code, it should keep
working after the migration (I reviewed it; I could not run it against your database). Two old-code
behaviours change on purpose: editing an accepted quotation fails with "No se pudo guardar", and a second
conversion of the same quotation fails. Still, publish the new code soon after Step 3.

---

## Step 6 — Test with your admin account (after Step 5)

Use your own name and **your own e-mail address** as the customer. Never use a real customer.

1. **Flight quotation:** Cotizaciones → **Nueva de vuelo**. Paste the Aeromexico itinerary from the brief → **Interpretar itinerario** → **Usar este itinerario**. Change one time, confirm the itinerary, fill baggage and confirm it, add prices (include a "Descuento" line), choose **24 horas**, and tick **Revisé estas condiciones y las apruebo**. Press **Guardar borrador**. Expected: "Guardado" and a live PDF preview on the right.
2. **Autosave and Ctrl+S:** change the destination and wait 3 seconds. Expected: "Guardado hh:mm". Change it again and press `Ctrl` + `S`. Expected: saved immediately.
3. **Two tabs:** open the same quotation in a second tab and save a change there. Then change something in the first tab. Expected: "Conflicto de edición" and nothing overwritten.
4. **Terms approval:** edit one condition. Expected: the approval tick clears and the checklist says "Revise y apruebe las condiciones". Approve again.
5. **Send:** press **Enviar al cliente**. Expected: an e-mail arrives at your address with the PDF, and **Versiones enviadas** shows *Versión 1*. Open it and check the PDF.
6. **Version history is frozen:** change a price, save, and open *Versión 1* again. Expected: the old price.
7. **Hotel with photos:** **Hotel** → upload 3 photos from your phone (include one taken vertically), reorder them, mark one as **Principal**, add a caption, download the PDF. Expected: photos upright and in order.
8. **Accept and lock:** set the status to **Aceptada**. Expected: "Aceptada: se registró la versión N", the editor becomes read-only, and only **Crear enmienda** is offered.
9. **Amendment:** press **Crear enmienda**. Expected: a new draft that says "Enmienda de la cotización COT-…". The original quotation is unchanged.
10. **Convert:** on the accepted original, press **Convertir en reserva** twice quickly. Expected: one reservation only, with the same total (discount included). Create an invoice and check that its total matches.
11. **Expired:** in a test draft, set the validity in the past. Expected: "Vencida" in the list and sending blocked.
12. **Shared e-mail:** create a draft with a *different* name but an e-mail that already belongs to a customer. Expected: a notice offering to link the existing customer. It is not linked unless you click.
13. **Advisor:** open a quotation created by another admin and save a change. Expected: "Asignada a otro asesor" stays. Press **Asignarme esta cotización** to take it.
14. **Expired session:** sign out in another tab, edit something, and press **Guardar**. Expected: a red "Su sesión venció…" notice, and your text is still on screen.
15. **Not an admin:** in a private window, open `/admin/cotizaciones` and a PDF link. Expected: the login page, never data.
16. **Photo cleanup (optional):** at the bottom of the list, **Buscar fotos sin uso**. Right after launch it should find 0 photos: only photos older than 7 days that nothing uses are ever deleted.

17. **Ferry:** Cotizaciones → **Ferry**. Fill one trip (naviera, ports, date and time), press **Agregar regreso**, add "Equipaje" and "Comidas" in *¿Qué incluye el viaje en ferry?*, choose a state for each and confirm, confirm with the naviera, add **Pasaje ferry por adulto**, choose 24 horas and approve the conditions. Expected: "Lista para enviar" and a PDF with both trips.
18. **Hotel inclusions:** in a hotel quotation add *Desayuno* (Incluido) and *Spa* (Con cargo adicional, with a price). Expected: the PDF shows them under "Incluido" and "No incluido o con cargo".
19. **Invoice:** open the reservation from test 10 and create an invoice. Expected: it is created (after Step 4b) and its total matches.

When all tests pass, tell me.

---

## If something goes wrong after Step 3 (rollback)

The bottom of `docs/sql/quotations_v5.sql` contains a commented **Reversión** block. To use it:

1. Copy only the lines that start with `--   ` and remove those first five characters from each line.
2. Paste the result into a new query and run it.

This restores the previous tables. It discards V5 data created after the migration (structured details and
sent versions). Old quotation data is untouched, and the `backup_v5` copy remains available. Hotel photos are
removed separately in **Storage** → `quotation-media`, and only if no longer needed.

When everything has worked for a few weeks, you can delete the private copy with `drop schema backup_v5 cascade;`.
