import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Track } from "../src/models/Track.js";

let server, base;
const SECRET = process.env.JWT_SECRET || "tp1-development-secret";

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test("health sans dépendre de MongoDB", async () => {
  const r = await fetch(base + "/api/health");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, "ok");
});

test("schémas Mongoose et relation", () => {
  const u = new User({
    name: "Test",
    email: "TEST@example.com",
    password: "12345678",
  });

  assert.equal(u.email, "test@example.com");
  const t = new Track({
    ownerId: new mongoose.Types.ObjectId(),
    title: "Blues",
    originalName: "b.mp3",
    storedName: "x.mp3",
    mimeType: "audio/mpeg",
    size: 42,
  });
  
  assert.equal(t.title, "Blues");
  assert.equal(Track.schema.path("ownerId").options.ref, "User");
});

test("sécurité : 401 sans JWT sur /api/tracks", async () => {
  const r = await fetch(base + "/api/tracks");
  assert.equal(r.status, 401);
  const data = await r.json();
  assert.equal(data.message, "Authentification requise");
});

test("sécurité : 401 avec un JWT invalide sur /api/tracks", async () => {
  const r = await fetch(base + "/api/tracks", {
    headers: { Authorization: "Bearer bad.token.here" },
  });
  assert.equal(r.status, 401);
  const data = await r.json();
  assert.equal(data.message, "Jeton invalide ou expiré");
});

test("contrat upload : 400 si aucun fichier audio n'est transmis", async () => {
  const fakeToken = jwt.sign(
    { sub: new mongoose.Types.ObjectId().toString(), email: "user@test.com" },
    SECRET,
  );
  const formData = new FormData();
  formData.append("title", "Track sans fichier");

  const r = await fetch(base + "/api/tracks", {
    method: "POST",
    headers: { Authorization: `Bearer ${fakeToken}` },
    body: formData,
  });

  assert.equal(r.status, 400);
  const data = await r.json();
  assert.match(data.message, /Fichier audio requis/);
});

test("contrat upload : 400 si le type MIME audio est refusé (ex: text/plain)", async () => {
  const fakeToken = jwt.sign(
    { sub: new mongoose.Types.ObjectId().toString(), email: "user@test.com" },
    SECRET,
  );
  const formData = new FormData();
  const badFile = new Blob(["texte simple non audio"], { type: "text/plain" });
  formData.append("audio", badFile, "document.txt");

  const r = await fetch(base + "/api/tracks", {
    method: "POST",
    headers: { Authorization: `Bearer ${fakeToken}` },
    body: formData,
  });

  assert.equal(r.status, 400);
  const data = await r.json();
  assert.match(data.message, /Format audio non accepté/);
});

