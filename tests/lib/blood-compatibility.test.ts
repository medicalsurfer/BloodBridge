import {
  BLOOD_GROUPS,
  canDonateTo,
  compatibleDonorGroups,
  isBloodGroup,
  type BloodGroupValue,
} from "@/src/lib/blood-compatibility";

/*
  FR-23 red-cell compatibility. The table is safety-critical: a wrong entry
  here would let staff match an incompatible donor to a patient. So rather
  than restating the same table the source declares (which would pass even if
  both copies were wrong), these tests derive compatibility from the ABO/Rh
  rules themselves and check the module agrees.
*/

/** Antigens a donor of this group carries. A recipient must have them all. */
function antigens(group: BloodGroupValue) {
  const [abo, rh] = group.split("_");
  return {
    a: abo === "A" || abo === "AB",
    b: abo === "B" || abo === "AB",
    rhD: rh === "POSITIVE",
  };
}

/** Safe when the donor carries no antigen the recipient lacks. */
function expectedCompatible(donor: BloodGroupValue, recipient: BloodGroupValue) {
  const d = antigens(donor);
  const r = antigens(recipient);
  return (!d.a || r.a) && (!d.b || r.b) && (!d.rhD || r.rhD);
}

describe("blood group compatibility (FR-23)", () => {
  it("matches the ABO/Rh antigen rules for all 64 donor/recipient pairs", () => {
    for (const donor of BLOOD_GROUPS) {
      for (const recipient of BLOOD_GROUPS) {
        expect({ donor, recipient, compatible: canDonateTo(donor, recipient) }).toEqual({
          donor,
          recipient,
          compatible: expectedCompatible(donor, recipient),
        });
      }
    }
  });

  it("treats O- as the universal donor", () => {
    for (const recipient of BLOOD_GROUPS) {
      expect(canDonateTo("O_NEGATIVE", recipient)).toBe(true);
    }
  });

  it("treats AB+ as the universal recipient", () => {
    expect(compatibleDonorGroups("AB_POSITIVE")).toEqual(expect.arrayContaining([...BLOOD_GROUPS]));
    expect(compatibleDonorGroups("AB_POSITIVE")).toHaveLength(BLOOD_GROUPS.length);
  });

  it("only accepts O- for an O- recipient", () => {
    expect(compatibleDonorGroups("O_NEGATIVE")).toEqual(["O_NEGATIVE"]);
  });

  it("never lets a Rh-positive donor give to a Rh-negative recipient", () => {
    const positives = BLOOD_GROUPS.filter((group) => group.endsWith("_POSITIVE"));
    const negatives = BLOOD_GROUPS.filter((group) => group.endsWith("_NEGATIVE"));

    for (const donor of positives) {
      for (const recipient of negatives) {
        expect(canDonateTo(donor, recipient)).toBe(false);
      }
    }
  });

  it("always allows a same-group transfusion", () => {
    for (const group of BLOOD_GROUPS) {
      expect(canDonateTo(group, group)).toBe(true);
    }
  });

  describe("isBloodGroup", () => {
    it("accepts every declared group", () => {
      for (const group of BLOOD_GROUPS) {
        expect(isBloodGroup(group)).toBe(true);
      }
    });

    it.each([
      ["lowercase", "o_negative"],
      ["display form", "O-"],
      ["unknown group", "C_POSITIVE"],
      ["empty string", ""],
      ["number", 1],
      ["null", null],
      ["undefined", undefined],
      ["object", { group: "O_NEGATIVE" }],
    ])("rejects %s", (_label, value) => {
      expect(isBloodGroup(value)).toBe(false);
    });
  });
});
