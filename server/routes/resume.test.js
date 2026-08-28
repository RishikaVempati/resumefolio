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
    location: "Bengaluru, Karnataka",
    title: "Frontend Developer",
    links: "github.com/ananyaiyer",
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
  about: "I build interfaces for payments products.",
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
  skills: ["React", "TypeScript"],
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
    const form = { ...FORM, personal: { ...FORM.personal, phone: "   " } };

    assert.ok(!buildPrompt(form).includes("phone"));
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
      validateGenerated({ ...GENERATED, skills: "React, TypeScript" }),
      /expected an array/i
    );
  });

  it("rejects a non-object", () => {
    assert.match(validateGenerated(null), /no JSON object/i);
  });
});

/** A stand-in for GoogleGenAI that records the request and returns a canned reply. */
function fakeClient(result) {
  const calls = [];
  return {
    calls,
    models: {
      generateContent: async (request) => {
        calls.push(request);
        if (result instanceof Error) throw result;
        return { text: JSON.stringify(result) };
      },
    },
  };
}

function serverWith(client) {
  const app = express();
  app.use(express.json());
  app.use("/api", createResumeRouter({ client }));
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: err.message,
      details: err.details ?? null,
    });
  });
  return app.listen(0);
}

async function post(server, body) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe("POST /api/resume", () => {
  let server;
  let client;

  before(() => {
    process.env.GEMINI_MODEL = "gemini-3.6-flash";
  });

  after(() => server?.close());

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

  it("reports a rate limit as retryable", async () => {
    const rateLimited = Object.assign(new Error("quota"), { status: 429 });
    server = serverWith(fakeClient(rateLimited));

    const { status, body } = await post(server, FORM);

    assert.equal(status, 503);
    assert.match(body.details, /again/i);

    server.close();
  });

  it("reports a retired model as not worth retrying", async () => {
    const notFound = Object.assign(new Error("not found"), { status: 404 });
    server = serverWith(fakeClient(notFound));

    const { status, body } = await post(server, FORM);

    assert.equal(status, 502);
    assert.match(body.error, /not available/i);
    assert.match(body.details, /GEMINI_MODEL/);

    server.close();
  });

  it("rejects a response whose shape is wrong", async () => {
    server = serverWith(fakeClient({ ...GENERATED, skills: "React" }));

    const { status, body } = await post(server, FORM);

    assert.equal(status, 502);
    assert.match(body.error, /expected an array/i);

    server.close();
  });
});
