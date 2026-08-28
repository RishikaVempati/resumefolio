# Demo script

A recorded walkthrough for mentor review. Target **3–4 minutes**. Anything longer and the
interesting parts get lost.

The rule for the whole recording: **show the thing working, then say why it was built that
way.** A mentor can see the screen; what they cannot see is the reasoning.

---

## Before you press record

| Step | Why |
|---|---|
| Open https://resumefolio-49oq.onrender.com/api/health and wait for JSON | Render's free tier sleeps after ~15 min. Cold start is 30–50s. Do this **five minutes** before recording, not five seconds |
| Open the site, **Sign out**, then clear site data | Otherwise you start signed in and skip the auth flow entirely |
| Close other tabs, silence notifications | — |
| Have your details ready to type | Dead air while you think reads as the app being slow |
| Check the quota | The free tier allows **20 generations per day**, shared across rehearsals and the take. Rehearse the *clicks* without generating |

Have these two open in tabs, ready to show:

- https://resumefolio-ruby.vercel.app
- https://github.com/RishikaVempati/resumefolio

---

## The script

### 0:00 — What it is (20s)

> "This is Resumefolio. You fill in a short form about yourself, and Google Gemini writes
> the resume content from your own details. You get two views out of it — a resume, and a
> portfolio page you can share."

Land on the home page. Do not narrate the design; let it be seen.

### 0:20 — Sign up (25s)

Click **Generate my resume**. The auth modal opens.

> "You are not signed in, so it asks you to. Accounts are stored in the browser using
> LocalStorage — that is what the spec asked for. It is a demonstration of a sign-in flow,
> not real authentication: there is no server holding accounts, and the README says that
> plainly rather than pretending otherwise."

Sign up. You land on the form with your name and email already filled.

> "It carries what it knows into the form, so you are not typing your name twice."

### 0:45 — The form (45s)

> "Six steps. Only name, email and phone are required — the rest is optional, but the more
> you give it, the less the AI has to work with."

Fill Personal, click **Next**. Add one education entry, some skills, one experience with two
bullet points. Move quickly.

Worth pausing on once:

> "The progress bar and the step validation are the browser's own — Next is a submit button,
> so it will not let you past a step with a required field empty. That is free, and it
> behaves correctly with keyboards and screen readers."

### 1:30 — Generate (30s)

Click **Generate Resume**. While it runs:

> "This is one call to Gemini. It comes back with the summary, a career objective, the key
> competencies, and the skills sorted into technical, tools, languages and soft skills."

When it appears, point at a bullet:

> "The important part is what it did *not* do. Every number here is one I typed. The system
> instruction's first rule is that it may never invent an employer, a date or a metric. If I
> give it thin input, it writes less rather than padding."

### 2:00 — Templates and portfolio (40s)

Click **Classic**, then **Modern**.

> "Switching templates does not regenerate anything. The content is held above both views,
> so there is no second wait and no second call against the quota."

Click **View portfolio**.

> "Same data, same single call, presented as a portfolio — About Me, Skills, Projects,
> Achievements. Something you would actually send to someone."

### 2:40 — Under the hood (45s)

Switch to the GitHub tab.

> "React and Vite on the front, Node and Express behind it. The backend exists for one
> reason: the Gemini key must never reach the browser, so it lives in a process the browser
> cannot see. I checked the shipped JavaScript bundle — the key appears zero times."

> "Frontend on Vercel, backend on Render. 98 tests, none of which need an API key
> or a network, because tests that need a live key fail on a rate limit rather than on a
> bug."

### 3:25 — What I would call out (30s)

Be the one to raise the limitations. It reads as judgement, not as gaps.

> "Three things I would flag. Passwords are stored in plain text in the browser — that is
> what LocalStorage auth means, and it is documented rather than hidden. The free tier
> allows twenty generations a day. And the backend sleeps after fifteen minutes idle, so
> the first request can take up to a minute."

> "The spec named `gemini-1.5-flash`. It returns a 404 on a current key, so I verified
> against the live API and used a model that works. That is in the README as a documented
> deviation."

### Close (10s)

> "The code, the build log for every slice, and the plan are all in the repository."

---

## If something goes wrong on camera

| Symptom | Say this, then carry on |
|---|---|
| Long pause on Generate | "This is the free tier waking up." Do **not** click again |
| "Gemini is rate limited" | "That is the twenty-a-day free tier cap." Cut and resume tomorrow |
| "Could not reach the server" | The backend is asleep. Stop recording, hit `/api/health`, start again |

Do not edit failures out silently if you narrate around them — explaining a real limit is
better than a cut that looks like a retake.

---

## What to submit

| Item | Where |
|---|---|
| Demo link | https://resumefolio-ruby.vercel.app |
| GitHub link | https://github.com/RishikaVempati/resumefolio |
| Demo video | The recording |
| Kanban | Move all 29 cards |
