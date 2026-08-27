import { describe, expect, it } from "vitest";
import {
  SOLDIER_BLOCK_SEPARATOR,
  formatSoldierBlock,
  formatSoldierBlocks,
  rosterEntryToCopyInput,
  type SoldierCopyInput,
} from "@/lib/roster/copy-format";
import type { Battalion, RosterEntry } from "@/lib/types";

/**
 * The pasted WhatsApp block. This suite exists because the format is a contract with
 * whoever receives the message, not an internal detail: a stray space or a dropped
 * invisible character is invisible in review and obvious to the recipient.
 */

const WORD_JOINER = String.fromCharCode(0x2060);

/** The sample supplied with the request, reproduced here as the expected output. */
const SAMPLE = [
  "*עטלף*",
  "מ.א: 8780046",
  "שם מלא: שליו בן צור",
  `${WORD_JOINER}מספר טלפון: 0549214985`,
  "ת״ז 322377888",
  "מילואים/ סדיר- מילואים",
  "פיקוד - פצן",
  "אוגדה- 146",
  "חטיבה- 228",
  "גדוד- 5030",
].join("\n");

const sampleInput: SoldierCopyInput = {
  certificationName: "עטלף",
  personalNumber: "8780046",
  fullName: "שליו בן צור",
  phone: "0549214985",
  // Neither of these is a column today; they are supplied here purely to prove the
  // formatter renders the sample exactly when values do exist.
  nationalId: "322377888",
  serviceType: "מילואים",
  battalionCode: "5030",
};

describe("formatSoldierBlock", () => {
  it("reproduces the supplied sample character-for-character", () => {
    expect(formatSoldierBlock(sampleInput)).toBe(SAMPLE);
  });

  it("keeps the invisible word joiner before the phone label", () => {
    // The one character nobody can see in a diff, so it gets its own assertion.
    const line = formatSoldierBlock(sampleInput).split("\n")[3];
    expect(line.codePointAt(0)).toBe(0x2060);
    expect(line).toBe(`${WORD_JOINER}מספר טלפון: 0549214985`);
  });

  it("uses a colon for מ.א and שם מלא but a bare space for ת״ז", () => {
    // Straight from the sample; the inconsistency is intentional and easy to "fix" by
    // accident.
    const lines = formatSoldierBlock(sampleInput).split("\n");
    expect(lines[1].startsWith("מ.א: ")).toBe(true);
    expect(lines[2].startsWith("שם מלא: ")).toBe(true);
    expect(lines[4].startsWith("ת״ז ")).toBe(true);
    expect(lines[4]).not.toContain(":");
  });

  it("emits the fixed chain-of-command lines verbatim", () => {
    const lines = formatSoldierBlock(sampleInput).split("\n");
    expect(lines[6]).toBe("פיקוד - פצן");
    expect(lines[7]).toBe("אוגדה- 146");
    expect(lines[8]).toBe("חטיבה- 228");
  });

  it("leaves the label in place with nothing after it when a value is missing", () => {
    // ת״ז and service type have no column in roster_entries, so this is the real-world
    // shape of every block the app produces today.
    const lines = formatSoldierBlock({
      certificationName: "עטלף",
      personalNumber: null,
      fullName: "שליו בן צור",
      phone: null,
      battalionCode: null,
    }).split("\n");
    expect(lines[1]).toBe("מ.א: ");
    expect(lines[3]).toBe(`${WORD_JOINER}מספר טלפון: `);
    expect(lines[4]).toBe("ת״ז ");
    expect(lines[5]).toBe("מילואים/ סדיר- ");
    expect(lines[9]).toBe("גדוד- ");
    // Still ten lines: a missing value must not collapse its line.
    expect(lines).toHaveLength(10);
  });

  it("wraps the certification name in literal asterisks for WhatsApp bold", () => {
    expect(formatSoldierBlock(sampleInput).split("\n")[0]).toBe("*עטלף*");
  });

  it("carries no separator on its own", () => {
    expect(formatSoldierBlock(sampleInput)).not.toContain("---");
  });
});

describe("formatSoldierBlocks", () => {
  const b = (name: string): SoldierCopyInput => ({ ...sampleInput, fullName: name });

  it("joins blocks with a blank line, --- and another blank line", () => {
    expect(SOLDIER_BLOCK_SEPARATOR).toBe("\n\n---\n\n");
    const text = formatSoldierBlocks([b("א"), b("ב"), b("ג")]);
    expect(text.split("\n\n---\n\n")).toHaveLength(3);
    // No leading or trailing rule — the separator goes strictly between soldiers.
    expect(text.startsWith("*עטלף*")).toBe(true);
    expect(text.endsWith("גדוד- 5030")).toBe(true);
  });

  it("produces exactly the single block when given one soldier", () => {
    // The per-row button and a one-row table must agree byte for byte.
    expect(formatSoldierBlocks([sampleInput])).toBe(formatSoldierBlock(sampleInput));
  });

  it("returns an empty string for no soldiers", () => {
    expect(formatSoldierBlocks([])).toBe("");
  });
});

describe("rosterEntryToCopyInput", () => {
  const entry = {
    id: 1,
    certification_id: 7,
    battalion_request_id: null,
    battalion_id: 3,
    full_name: "שליו בן צור",
    personal_number: "8780046",
    company_platoon: "א/2",
    phone: "0549214985",
    commander_name: null,
    commander_phone: null,
    has_prior_certification: 0,
    prior_certification_details: null,
    meets_prerequisite: null,
    notes: null,
    status: "registered",
    outcome_reason: null,
    is_reserve: 1,
    created_at: "",
    updated_at: "",
  } as RosterEntry;

  const battalion = { id: 3, code: "5030", name: "גדוד 5030", color_hex: "#000", is_active: 1 } as Battalion;

  it("maps the battalion CODE, not its name or id", () => {
    expect(rosterEntryToCopyInput(entry, "עטלף", battalion).battalionCode).toBe("5030");
  });

  it("never derives the service type from is_reserve", () => {
    // is_reserve means עתודה for this certification — a different concept from
    // מילואים/סדיר. Reading one as the other would put confident, wrong data in a message.
    const input = rosterEntryToCopyInput(entry, "עטלף", battalion);
    expect(input.serviceType).toBeUndefined();
    expect(formatSoldierBlock(input).split("\n")[5]).toBe("מילואים/ סדיר- ");
  });

  it("survives a battalion that is not in the map", () => {
    expect(rosterEntryToCopyInput(entry, "עטלף", undefined).battalionCode).toBeNull();
  });
});
