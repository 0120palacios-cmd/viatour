import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeFreeze, manifestPath } from "../scripts/customer-freeze.mjs";

// The approved customer experience must not change as a side effect of admin work. A failure lists the
// files that changed; if the change is intended and the owner approved it, regenerate the manifest with
// `node scripts/customer-freeze.mjs --update` in the same commit.
test("customer experience: files and messages match the approved fingerprint", () => {
  const approved = JSON.parse(readFileSync(manifestPath, "utf8"));
  const current = computeFreeze();
  const changed = [];
  for (const [file, entry] of Object.entries(approved.files)) {
    if (!current.files[file]) changed.push(`removed or no longer imported: ${file}`);
    else if (current.files[file].sha256 !== entry.sha256) changed.push(`changed (${entry.owner}): ${file}`);
  }
  for (const file of Object.keys(current.files)) if (!approved.files[file]) changed.push(`new dependency (${current.files[file].owner}): ${file}`);
  for (const [namespace, hash] of Object.entries(approved.messages)) if (current.messages[namespace] !== hash) changed.push(`messages changed: ${namespace}`);
  assert.deepEqual(changed, [], `The frozen customer experience changed:\n${changed.join("\n")}`);
});
