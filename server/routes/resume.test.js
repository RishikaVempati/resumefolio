import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import express from "express";
import { buildPrompt, validateForm } from "./prompt.js";
import { createResumeRouter } from "./resume.js";
import { validateGenerated } from "./resumeSchema.js";

const FORM = {
  personal: {
    name: "Ananya Iyer",
    email: "ananya.iyer@example.in",
    phone: "+91 98450 12345",
    address: "Bengaluru, Karnataka",
    linkedin: "https://linkedin.com/in/ananyaiyer",
    github: "https://github.com/ananyaiyer",
  },
  education: [
    {
      institution: "PES University",
      degree: "B.Tech",
      field: "Computer Science",
      dates: "2018 – 2022",
      grade: "8.6 CGPA",
    },
  ],
  skills: ["React", "TypeScript", "Node.js"],
  projects: [
    {
      name: "Kirana Ledger",
      description: "Billing app for neighbourhood shops",
      tech: "React Native, SQLite",
      link: "",
    },
  ],
  experience: [
    {
      role: "Frontend Developer",
      company: "Zeta Systems",
      dates: "2022 – present",
      highlights: ["Rebuilt the payments dashboard", "Cut page load to under a second"],
    },
  ],
  certifications: [],
};

const GENERATED = {
  summary: "Frontend developer with three years building payment interfaces.",
  careerObjective: "Seeking a frontend role on a payments product.",
  about: "I build interfaces for payments products.",
  keyCompetencies: ["Payments interfaces", "Performance tuning"],
  technicalSkills: ["React", "TypeScript"],
  languages: [],
  tools: ["Git"],
  softSkills: [],
  experience: [
    {
      role: "Frontend Developer",
      company: "Zeta Systems",
      dates: "2022 – present",
      bullets: ["Rebuilt the payments dashboard"],
    },
  ],
  projects: [
    { name: "Kirana Ledger", description: "Billing for shops", tech: "React Native" },
  ],
  achievements: [],
};

describe("validateForm", () => {
  it("accepts a filled form", () => {
    assert.equal(validateForm(FORM), null);
  });

  it("requires a name", () => {
    const form = { ...FORM, personal: { ...FORM.personal, name: "  " } };
    assert.match(validateForm(form), /name is required/i);
  });

  it("rejects a form with nothing to write from", () => {
    // Spec TC06: a name alone cannot produce a resume, and should not spend quota.
    const form = {
      personal: FORM.personal,
      education: [],
      skills: [],
      projects: [],
      experience: [],
      certifications: [],
    };
    assert.match(validateForm(form), /at least one/i);
  });

  it("rejects a non-object body", () => {
    assert.match(validateForm(null), /form object/i);
  });
});

describe("buildPrompt", () => {
  it("includes what the candidate supplied", () => {
    const prompt = buildPrompt(FORM);

    for (const expected of [
      "Ananya Iyer",
      "Zeta Systems",
      "PES University",
      "Kirana Ledger",
      "Rebuilt the payments dashboard",
    ]) {
      assert.ok(prompt.includes(expected), `prompt is missing ${expected}`);
    }
  });

  it("leaves out empty sections so the model is not invited to fill them", () => {
    const prompt = buildPrompt(FORM);

    assert.ok(!prompt.includes("Certifications"));
  });

  it("leaves out blank personal fields", () => {
    const form = { ...FORM, personal: { ...FORM.personal, github: "   " } };

    assert.ok(!buildPrompt(form).includes("GitHub"));
  });
});

describe("validateGenerated", () => {
  it("accepts a well-formed response", () => {
    assert.equal(validateGenerated(GENERATED), null);
  });

  it("rejects a missing summary", () => {
    assert.match(validateGenerated({ ...GENERATED, summary: "" }), /no summary/i);
  });

  it("rejects an array field that came back as something else", () => {
    // Observed in practice: a schema-constrained response is not a guarantee.
    assert.match(
      validateGenerated({ ...GENERATED, technicalSkills: "React, TypeScript" }),
      /expected an array/i
    );
  });

  it("requires the career objective", () => {
    assert.match(validateGenerated({ ...GENERATED, careerObjective: "" }), /careerObjective/i);
  });

  it("accepts empty skill categories", () => {
    // Someone who listed no spoken languages must not be a validation failure.
    assert.equal(
      validateGenerated({ ...GENERATED, languages: [], softSkills: [], tools: [] }),
      null
    );
  });

  it("rejects a non-object", () => {
    assert.match(validateGenerated(null), /no JSON object/i);
  });
});

/**
 * A stand-in for GoogleGenAI. `results` is played back one per call, so a test
 * can say "fail, fail, then succeed" and assert the route retried.
 */
function fakeClient(...results) {
  const calls = [];
  return {
    calls,
    models: {
      generateContent: async (request) => {
        calls.push(request);
        const result = results[Math.min(calls.length - 1, results.length - 1)];
        if (result instanceof Error) throw result;
        return { text: JSON.stringify(result) };
      },
    },
  };
}

// Retries with no real waiting, so the suite stays instant.
const INSTANT_RETRY = { sleep: async () => {}, now: () => 0 };

// Every server made by a test, closed in after(). A test that fails before its
// own close() would otherwise leave a listening handle and hang the runner —
// which is exactly what happened while writing these.
const servers = [];

function serverWith(client, retryOptions = INSTANT_RETRY) {
  const app = express();
  app.use(express.json());
  app.use("/api", createResumeRouter({ client, retryOptions }));
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: err.message,
      details: err.details ?? null,
    });
  });
  const server = app.listen(0);
  servers.push(server);
  return server;
}

async function post(server, body) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/generate-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe("POST /api/generate-resume", () => {
  let server;
  let client;

  before(() => {
    process.env.GEMINI_MODEL = "gemini-3.6-flash";
  });

  after(() => servers.forEach((s) => s.close()));

  it("returns generated content and calls the model correctly", async () => {
    client = fakeClient(GENERATED);
    server = serverWith(client);

    const { status, body } = await post(server, FORM);

    assert.equal(status, 200);
    assert.equal(body.generated.summary, GENERATED.summary);

    const request = client.calls[0];
    assert.equal(request.model, "gemini-3.6-flash");
    assert.equal(request.config.responseMimeType, "application/json");
    assert.equal(request.config.thinkingConfig.thinkingLevel, "LOW");
    assert.ok(request.contents.includes("Ananya Iyer"));

    server.close();
  });

  it("rejects an invalid form without calling the model", async () => {
    client = fakeClient(GENERATED);
    server = serverWith(client);

    const { status } = await post(server, { personal: { name: "" } });

    assert.equal(status, 400);
    assert.equal(client.calls.length, 0, "no quota should be spent on an invalid form");

    server.close();
  });

  it("retries a transient 503 and succeeds", async () => {
    const busy = Object.assign(new Error("high demand"), { status: 503 });
    client = fakeClient(busy, busy, GENERATED);
    server = serverWith(client);

    const { status, body } = await post(server, FORM);

    assert.equal(status, 200);
    assert.equal(body.generated.summary, GENERATED.summary);
    assert.equal(client.calls.length, 3, "should have retried twice");

    server.close();
  });

  it("gives up after the attempt limit and says how many it tried", async () => {
    const busy = Object.assign(new Error("high demand"), { status: 503 });
    client = fakeClient(busy);
    server = serverWith(client);

    const { status, body } = await post(server, FORM);

    assert.equal(status, 503);
    assert.equal(client.calls.length, 3, "default is three attempts");
    assert.match(body.error, /after 3 attempts/);
    assert.match(body.details, /again/i);

    server.close();
  });

  it("explains the daily cap when the quota is exhausted", async () => {
    const exhausted = Object.assign(
      new Error("Quota exceeded for metric: generate_content_free_tier_requests"),
      { status: 429 }
    );
    client = fakeClient(exhausted);
    server = serverWith(client);

    const { status, body } = await post(server, FORM);

    assert.equal(status, 503);
    assert.match(body.details, /20 requests per day/);
    assert.equal(
      client.calls.length,
      1,
      "an exhausted daily quota will not recover, so it must not be retried"
    );
  });

  it("reports a retired model as not worth retrying", async () => {
    const notFound = Object.assign(new Error("not found"), { status: 404 });
    client = fakeClient(notFound);
    server = serverWith(client);

    const { status, body } = await post(server, FORM);

    assert.equal(client.calls.length, 1, "a 404 must not be retried");
    assert.equal(status, 502);
    assert.match(body.error, /not available/i);
    assert.match(body.details, /GEMINI_MODEL/);

    server.close();
  });

  it("rejects a response whose shape is wrong", async () => {
    server = serverWith(fakeClient({ ...GENERATED, technicalSkills: "React" }));

    const { status, body } = await post(server, FORM);

    assert.equal(status, 502);
    assert.match(body.error, /expected an array/i);

    server.close();
  });
});
