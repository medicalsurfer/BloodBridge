import {
  groupsMentioned,
  replyKeepsAnswer,
  systemAnswer,
  type AssistantFacts,
  type DonorFacts,
  type StaffFacts,
} from "@/src/lib/assistant-answers";

/*
  The system's half of the assistant. These answers are handed to the model
  as verified, so a wrong one here would be repeated with confidence — and a
  question routed to the wrong answer is as bad as a wrong figure.
*/

const today = new Date(2026, 8, 28);

const centres: AssistantFacts["centres"] = [
  { name: "Central Hospital", city: "Yaoundé", openGroups: ["A_POSITIVE"] },
  { name: "Laquintinie", city: "Douala", openGroups: ["AB_NEGATIVE"] },
];

function donor(overrides: Partial<DonorFacts> = {}): AssistantFacts {
  return {
    role: "DONOR",
    today,
    centres,
    donor: {
      bloodGroup: "O_POSITIVE",
      missingFields: [],
      donationCount: 4,
      consultationsEarned: 1,
      donationsPerConsultation: 3,
      lastDonation: new Date(2026, 8, 1),
      nextEligible: new Date(2026, 9, 27),
      latestCheck: null,
      markedEligible: true,
      nextAppointment: null,
      ...overrides,
    },
  };
}

function staff(overrides: Partial<StaffFacts> = {}): AssistantFacts {
  return {
    role: "LAB_TECHNICIAN",
    today,
    centres,
    staff: {
      totalDonors: 11,
      markedEligible: 7,
      readyNow: 5,
      intervalDays: 56,
      institute: {
        openRequests: [
          { group: "O_POSITIVE", units: 3, urgency: "HIGH" },
          { group: "A_NEGATIVE", units: 1, urgency: "LOW" },
        ],
        mostRequested: { group: "O_POSITIVE", units: 3 },
        lowestStock: { group: "AB_NEGATIVE", units: 2 },
        stock: [
          { group: "AB_NEGATIVE", units: 2 },
          { group: "O_POSITIVE", units: 9 },
        ],
        upcomingAppointments: 4,
        unrecorded: 2,
        priorities: ["AB- stock is down to 2 units", "2 completed appointments still need a donation record"],
      },
      ...overrides,
    },
  };
}

describe("groupsMentioned", () => {
  it("reads symbols and spelled-out groups, in order", () => {
    expect(groupsMentioned("Can o+ give to AB-?")).toEqual(["O_POSITIVE", "AB_NEGATIVE"]);
    expect(groupsMentioned("I am O negative")).toEqual(["O_NEGATIVE"]);
    expect(groupsMentioned("Is A positive compatible?")).toEqual(["A_POSITIVE"]);
  });

  it("does not take ordinary English for a blood group", () => {
    expect(groupsMentioned("I got a positive result")).toEqual([]);
    expect(groupsMentioned("choose a - b")).toEqual([]);
  });
});

describe("systemAnswer: compatibility", () => {
  it("answers a donor asking about their own blood", () => {
    const answer = systemAnswer("Can I give to AB-?", donor());
    expect(answer?.intent).toBe("compatibility-pair");
    expect(answer?.text).toMatch(/^\*\*No\*\*/);
  });

  it("answers a pair either way round", () => {
    expect(systemAnswer("Can O- give to AB+?", staff())?.text).toMatch(/^\*\*Yes\*\*/);
    // The patient is named first here.
    expect(systemAnswer("Can O- receive AB+ blood?", staff())?.text).toMatch(/^\*\*No\*\*/);
  });

  it("tells a patient's group from a donor's", () => {
    expect(systemAnswer("What can AB- receive?", staff())?.text).toContain("Patients with AB- can receive blood from **AB-, A-, B-, O-**");
    expect(systemAnswer("Who can receive O- blood?", staff())?.text).toContain("O- can be given to patients with");
  });

  it("keeps compatibility answers away from the model", () => {
    // Safety-critical: the model once added a false claim beside a correct "No".
    expect(systemAnswer("Can O- receive A+ blood?", staff())?.final).toBe(true);
    expect(systemAnswer("Who can receive O- blood?", staff())?.final).toBe(true);
    expect(systemAnswer("When can I donate again?", donor())?.final).toBeUndefined();
  });

  it("does not treat 'when can I donate' as a compatibility question", () => {
    expect(systemAnswer("When can I donate again?", donor())?.intent).toBe("next-donation");
  });
});

describe("systemAnswer: donor questions", () => {
  it("gives the date the interval ends", () => {
    const answer = systemAnswer("when can i donate again", donor());
    expect(answer?.text).toContain("27 Oct 2026");
  });

  it("says the interval is no barrier once it has passed", () => {
    const answer = systemAnswer("Can I donate today?", donor({ nextEligible: null }));
    expect(answer?.text).toContain("not a barrier");
  });

  it("reports the next appointment, or that there is none", () => {
    expect(systemAnswer("When is my appointment?", donor())?.text).toContain("no appointment booked");

    const booked = donor({
      nextAppointment: { date: new Date(2026, 9, 30), time: "09:00", centre: "Central Hospital", city: "Yaoundé" },
    });
    expect(systemAnswer("When is my next appointment?", booked)?.text).toContain("30 Oct 2026 at 09:00");
  });

  it("leaves how-to questions to the model", () => {
    expect(systemAnswer("How do I cancel my appointment?", donor())).toBeNull();
    expect(systemAnswer("What should I eat before donating?", donor())).toBeNull();
  });

  it("lists only centres whose requests the donor can meet", () => {
    const answer = systemAnswer("Where is my blood needed?", donor());
    expect(answer?.text).toContain("Central Hospital");
    expect(answer?.text).not.toContain("Laquintinie");
  });

  it("lists every centre when asked what is available, marking where the donor can help", () => {
    // The wording (and typo) a donor actually sent.
    const answer = systemAnswer("what are the availabledonation centers", donor());
    expect(answer?.intent).toBe("centre-list");
    expect(answer?.final).toBe(true);
    expect(answer?.text).toContain("**2 active donation centres**");
    expect(answer?.text).toContain("**Central Hospital**, Yaoundé — needs blood your O+ can give");
    expect(answer?.text).toContain("**Laquintinie**, Douala\n");
  });

  it("answers 'which centres need my blood' with the needing ones only", () => {
    expect(systemAnswer("Which centres need my blood?", donor())?.intent).toBe("centres");
  });

  it("counts donations and consultations", () => {
    expect(systemAnswer("How many donations have I made?", donor())?.text).toContain("**4 donations**");
  });
});

describe("systemAnswer: staff questions", () => {
  it("counts donors ready today", () => {
    expect(systemAnswer("How many donors can donate?", staff())?.text).toMatch(/^\*\*5\*\*/);
  });

  it("names the lowest stock and the most requested group separately", () => {
    expect(systemAnswer("Which blood group is running low?", staff())?.text).toContain("AB-");
    expect(systemAnswer("What is most needed?", staff())?.text).toContain("O+");
  });

  it("answers what to focus on from the priority list", () => {
    expect(systemAnswer("What should I focus on today?", staff())?.text).toContain("AB- stock is down to 2 units");
  });

  it("does not answer institute questions for accounts without an institute", () => {
    expect(systemAnswer("Which blood group is running low?", staff({ institute: undefined }))).toBeNull();
  });
});

describe("systemAnswer: health rules", () => {
  // The model once told a donor with a cold that donating was safe.
  it("defers a donor who is unwell, without asking the model", () => {
    const answer = systemAnswer("Is it safe to donate if I have a cold?", donor());
    expect(answer?.intent).toBe("health-illness");
    expect(answer?.final).toBe(true);
    expect(answer?.text).toMatch(/^\*\*Not while you are unwell/);
  });

  it("sends tattoos and medication to medical review", () => {
    expect(systemAnswer("Can I donate after getting a tattoo?", donor())?.intent).toBe("health-review");
    expect(systemAnswer("I take medication, can I give blood?", donor())?.intent).toBe("health-review");
  });

  it("gives the weight threshold", () => {
    expect(systemAnswer("How much do I need to weigh to donate?", donor())?.text).toContain("50 kg");
  });

  it("leaves health words alone when the question is not about donating", () => {
    expect(systemAnswer("What should I eat when I have a cold?", donor())).toBeNull();
  });
});

describe("systemAnswer: topic", () => {
  it("turns away questions that have nothing to do with blood donation", () => {
    for (const question of ["what is a cat", "who won the world cup?", "write me a poem about love"]) {
      expect(systemAnswer(question, donor())?.intent).toBe("off-topic");
    }
  });

  it("lets greetings and real questions through", () => {
    for (const question of ["hi", "thank you", "what can you do?", "What should I eat before donating?", "How do I reset my password?"]) {
      expect(systemAnswer(question, donor())?.intent).not.toBe("off-topic");
    }
    for (const question of ["What should I focus on today?", "What is most needed?", "How do I record a donation?"]) {
      expect(systemAnswer(question, staff())?.intent).not.toBe("off-topic");
    }
  });
});

describe("systemAnswer: centres for every role", () => {
  // A medical staff account once answered "I can't provide specific
  // information about donation centers": it had never been given the list.
  it("lists the platform's centres for staff, without donor booking steps", () => {
    const answer = systemAnswer("which donation centers are available in the platform", staff());
    expect(answer?.intent).toBe("centre-list");
    expect(answer?.text).toContain("**Central Hospital**, Yaoundé");
    expect(answer?.text).not.toContain("Book a donation");
  });

  it("answers where to get blood analysed with the centres", () => {
    for (const question of ["in whic hospital can i analyse my blood", "How can i know my blood type"]) {
      const answer = systemAnswer(question, staff());
      expect(answer?.intent).toBe("blood-test");
      expect(answer?.text).toContain("Laquintinie");
    }
  });

  it("treats a city with centres as on topic, accents or not", () => {
    const answer = systemAnswer("where is yaounde", staff());
    expect(answer?.intent).toBe("city");
    expect(answer?.text).toContain("Central Hospital");
    expect(answer?.text).not.toContain("Laquintinie");
  });

  it("still applies the health rules first", () => {
    expect(systemAnswer("I have a cold, can I donate in Yaounde?", donor())?.intent).toBe("health-illness");
  });

  it("still turns away cities with no centres and other off-topic questions", () => {
    expect(systemAnswer("where is Paris", staff())?.intent).toBe("off-topic");
  });
});

describe("replyKeepsAnswer", () => {
  const answer = systemAnswer("How many donors can donate?", staff())!;

  it("accepts a reply that keeps the figure, however it is phrased", () => {
    expect(replyKeepsAnswer("Right now **5** donors are ready to give.", answer)).toBe(true);
  });

  it("rejects a reply that changed the figure", () => {
    expect(replyKeepsAnswer("About 15 donors can give today.", answer)).toBe(false);
  });

  it("accepts a date written another way", () => {
    const next = systemAnswer("When can I donate again?", donor())!;
    expect(replyKeepsAnswer("You can give again from October 27.", next)).toBe(true);
    expect(replyKeepsAnswer("You can give again from October 20.", next)).toBe(false);
  });

  it("accepts a blood group written out in words", () => {
    const lowest = systemAnswer("Which group is running low?", staff())!;
    expect(replyKeepsAnswer("AB negative is lowest, at 2 units.", lowest)).toBe(true);
  });
});
