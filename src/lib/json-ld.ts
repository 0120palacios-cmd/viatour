// Characters that could close the <script> element or start markup, plus the two JavaScript line
// separators (U+2028, U+2029). Built from char codes so the source file holds no raw separators.
const unsafeCharacters = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, "g");
const unicodeEscapePrefix = `${String.fromCharCode(92)}u`;

// Serialises structured data for a <script type="application/ld+json">. Database text ends up
// inside the script element, so every unsafe character becomes its JSON unicode escape (e.g. "<" as u003c).
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(unsafeCharacters, character => unicodeEscapePrefix + character.charCodeAt(0).toString(16).padStart(4, "0"));
}
