import { GoogleGenAI } from "@google/genai";
import express from "express";
import { buildPrompt, SYSTEM_INSTRUCTION, validateForm } from "./prompt.js";
import { GENERATED_SCHEMA, validateGenerated } from "./resumeSchema.js";

export function createResumeRouter({ client } = {}) {
  const router = express.Router();

  // Built once and reused: the client holds an HTTP agent that should outlive a
  // single request. Injectable so tests never touch the network.
  let genai = client;
  function getClient() {
    if (!genai) {
      genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return genai;
  }

  router.post("/resume", async (req, res, next) => {
    const invalid = validateForm(req.body);
    if (invalid) {
      return res.status(400).json({ error: invalid, details: null });
    }

    if (!process.env.GEMINI_API_KEY?.trim() && !client) {
      return res.status(503).json({
        error: "The server has no Gemini API key configured.",
        details: "Set GEMINI_API_KEY in the server environment and restart.",
      });
    }

    try {
      const response = await getClient().models.generateContent({
        model: process.env.GEMINI_MODEL,
        contents: buildPrompt(req.body),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: GENERATED_SCHEMA,
          temperature: 0.4,
          // Rewriting supplied facts needs no deliberation. Measured on this key:
          // default thinking cost 314 thinking tokens and 503'd after 34.9s under
          // load; LOW answered in 1.0s.
          thinkingConfig: { thinkingLevel: "LOW" },
        },
      });

      const generated = JSON.parse(response.text);
      const badShape = validateGenerated(generated);
      if (badShape) {
        return res.status(502).json({
          error: badShape,
          details: "Generating again may help.",
        });
      }

      return res.json({ generated });
    } catch (error) {
      return next(decorate(error));
    }
  });

  return router;
}

/**
 * Turn an SDK failure into something the user can act on. The status the frontend
 * sees should say whether trying again is worth it.
 */
function decorate(error) {
  const status = error?.status ?? error?.code;

  if (status === 429 || status === 503) {
    error.status = 503;
    error.message = "Gemini is rate limited or busy right now.";
    error.details = "Wait a few seconds and generate again.";
  } else if (status === 404) {
    error.status = 502;
    error.message = `The configured model (${process.env.GEMINI_MODEL}) is not available.`;
    error.details = "Model ids are retired over time. Update GEMINI_MODEL.";
  } else if (error instanceof SyntaxError) {
    error.status = 502;
    error.message = "Gemini returned something that was not JSON.";
    error.details = "Generating again may help.";
  } else {
    error.status = error.status ?? 502;
    error.details = error.details ?? "Generating again may help.";
  }
  return error;
}
