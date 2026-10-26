/*
 * NEURON AI — Growing Brain Core
 * Version: 4.0.0
 *
 * This file is the brain's reusable knowledge engine:
 * - structured starter knowledge and metadata
 * - persistent local memory (per browser/device)
 * - duplicate-aware fact ingestion
 * - keyword/phrase retrieval with explainable scores
 * - concept/tag associations
 * - cloud-memory integration hooks (the app supplies fetched/saved rows)
 * - JSON and neuron.js snapshot export
 *
 * Important: this is a retrieval/memory system, not an LLM. Storing a fact does
 * not automatically train neural-network weights. A static website cannot
 * overwrite its own deployed JavaScript file; snapshots must be published by
 * the owner, while shared long-term memory belongs in a cloud database.
 */
(function (global) {
  "use strict";

  const VERSION = "4.0.0";
  const STORAGE_KEY = "neuron-ai-growing-brain-v3";
  const MAX_FACT_LENGTH = 1000;
  const MAX_TAGS = 20;

  const config = global.NEURON_CONFIG || {
    supabaseUrl: "YOUR_SUPABASE_PROJECT_URL",
    supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
  };

  const starter = {
    facts: [
      { id: "seed-photosynthesis", text: "Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to make sugars and release oxygen.", tags: ["photosynthesis", "plants", "biology"], source: "starter", confidence: 1 },
      { id: "seed-earth-orbit", text: "The Earth orbits the Sun once about every 365.25 days.", tags: ["earth", "sun", "orbit", "space"], source: "starter", confidence: 1 },
      { id: "seed-moon", text: "The Moon orbits Earth.", tags: ["moon", "earth", "space"], source: "starter", confidence: 1 },
      { id: "seed-water", text: "Water has the chemical formula H2O.", tags: ["water", "chemistry", "h2o"], source: "starter", confidence: 1 },
      { id: "seed-javascript", text: "JavaScript is a programming language commonly used to make websites interactive.", tags: ["javascript", "programming", "web development"], source: "starter", confidence: 1 },
      { id: "seed-html-css", text: "HTML structures web page content, while CSS controls presentation and layout.", tags: ["html", "css", "web development"], source: "starter", confidence: 1 },
      { id: "seed-neural-network", text: "A neural network is a computing model made of connected units whose numerical parameters can be trained from examples.", tags: ["neural network", "ai", "machine learning"], source: "starter", confidence: 1 },
      { id: "seed-brainjs", text: "Brain.js is a JavaScript library for building neural networks in JavaScript.", tags: ["brain.js", "javascript", "neural network"], source: "starter", confidence: 1 }
    ],
    qa: [
      { question: "What is photosynthesis?", answer: "Photosynthesis is how green plants use sunlight, water, and carbon dioxide to make sugars and release oxygen.", intent: "photosynthesis" },
      { question: "Does photosynthesis happen in plants?", answer: "Yes. Photosynthesis happens in plants, especially in green parts that contain chlorophyll.", intent: "photosynthesis" },
      { question: "What is the chemical formula of water?", answer: "Water's chemical formula is H2O.", intent: "water" }
    ]
  };

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(value) {
    return normalize(value).split(" ").filter(w => w.length > 1);
  }

  function uniqueStrings(items, max) {
    const seen = new Set();
    const result = [];
    for (const item of (Array.isArray(items) ? items : [])) {
      const s = String(item || "").trim().slice(0, 80);
      const k = normalize(s);
      if (s && !seen.has(k)) {
        seen.add(k);
        result.push(s);
        if (result.length >= (max || MAX_TAGS)) break;
      }
    }
    return result;
  }

  function safeReadLocal() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        facts: Array.isArray(parsed.facts) ? parsed.facts : [],
        savedAt: parsed.savedAt || null,
        schemaVersion: parsed.schemaVersion || 1
      };
    } catch (_) {
      return { facts: [], savedAt: null, schemaVersion: 1 };
    }
  }

  let localState = safeReadLocal();
  let cloudFacts = [];

  function saveLocal() {
    try {
      localState.savedAt = new Date().toISOString();
      localState.schemaVersion = 3;
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
      return { ok: true, savedAt: localState.savedAt };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : "Browser storage unavailable" };
    }
  }

  function cleanFact(input, source) {
    if (typeof input === "string") input = { text: input };
    if (!input || typeof input.text !== "string") throw new Error("A fact must contain text.");
    const text = input.text.trim();
    if (!text) throw new Error("A fact cannot be empty.");
    if (text.length > MAX_FACT_LENGTH) throw new Error("Keep each fact under 1,000 characters.");
    return {
      id: input.id || ("mem-" + makeId()),
      text,
      tags: uniqueStrings(input.tags, MAX_TAGS),
      source: source || input.source || "local",
      confidence: clamp(Number(input.confidence == null ? 0.7 : input.confidence), 0, 1),
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  }

  function allFacts() {
    return [...starter.facts, ...cloudFacts, ...localState.facts];
  }

  function fingerprint(text) {
    return normalize(text).replace(/\b(the|a|an|is|are|of|to|and|in|on)\b/g, "").replace(/\s+/g, " ").trim();
  }

  function addLocalFact(input, options) {
    const opts = options || {};
    const fact = cleanFact(input, opts.source || "local");
    const key = fingerprint(fact.text);
    const existing = allFacts().find(x => fingerprint(x.text || "") === key);
    if (existing) {
      // Improve an existing local fact's tags instead of creating duplicates.
      const localExisting = localState.facts.find(x => fingerprint(x.text || "") === key);
      if (localExisting) {
        localExisting.tags = uniqueStrings([...(localExisting.tags || []), ...fact.tags], MAX_TAGS);
        localExisting.updatedAt = new Date().toISOString();
        const saved = saveLocal();
        return { added: false, duplicate: true, fact: localExisting, saved };
      }
      return { added: false, duplicate: true, fact: existing, saved: { ok: true, starterOrCloud: true } };
    }
    localState.facts.push(fact);
    const saved = saveLocal();
    if (!saved.ok) {
      localState.facts.pop();
      throw new Error("Could not save memory: " + saved.error);
    }
    return { added: true, duplicate: false, fact, saved };
  }

  function replaceCloudFacts(items) {
    cloudFacts = (Array.isArray(items) ? items : []).map(item => {
      if (item && item.kind === "qa") {
        return {
          ...item,
          text: item.text || item.answer || "",
          tags: uniqueStrings(item.tags, MAX_TAGS),
          source: "cloud",
          confidence: clamp(Number(item.confidence == null ? 0.8 : item.confidence), 0, 1)
        };
      }
      return {
        ...item,
        id: item.id || ("cloud-" + makeId()),
        text: String(item.text || ""),
        tags: uniqueStrings(item.tags, MAX_TAGS),
        source: "cloud",
        confidence: clamp(Number(item.confidence == null ? 0.8 : item.confidence), 0, 1)
      };
    }).filter(x => x.text);
    return cloudFacts.length;
  }

  function wordSimilarity(a, b) {
    const A = new Set(tokens(a));
    const B = new Set(tokens(b));
    if (!A.size || !B.size) return 0;
    let overlap = 0;
    for (const word of A) if (B.has(word)) overlap++;
    const jaccard = overlap / (A.size + B.size - overlap);
    const coverage = overlap / A.size;
    return Math.max(jaccard, coverage * 0.72);
  }

  function rank(query, limit) {
    const q = normalize(query);
    if (!q) return [];
    const queryTokens = tokens(q);
    const scored = allFacts().map(fact => {
      const text = fact.text || "";
      const tagText = (fact.tags || []).join(" ");
      const full = normalize(text + " " + tagText);
      let score = wordSimilarity(q, full);
      if (normalize(text).includes(q)) score = Math.max(score, 0.96);
      if (normalize(tagText).includes(q)) score = Math.max(score, 0.78);
      // Small boost for a match in a short question-like phrase.
      const matched = queryTokens.filter(t => full.includes(t)).length;
      const coverage = queryTokens.length ? matched / queryTokens.length : 0;
      score = Math.max(score, coverage * 0.52);
      score = score * (0.8 + 0.2 * clamp(Number(fact.confidence == null ? 0.7 : fact.confidence), 0, 1));
      return { fact, score: Math.round(score * 1000) / 1000 };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, limit || 5));
  }

  function answer(query) {
    const q = normalize(query);
    const ranked = rank(query, 5);
    const best = ranked[0];
    if (best && best.score >= 0.17) {
      return {
        text: best.fact.kind === "qa" && best.fact.answer ? best.fact.answer : best.fact.text,
        confidence: best.score,
        fact: best.fact,
        alternatives: ranked.slice(1, 4)
      };
    }
    if (/^(hi|hello|hey|good morning|good evening)$/.test(q)) {
      return { text: "Hello! I am Neuron AI. Ask about something in my memory, or teach me a new fact.", confidence: 1, fact: null, alternatives: [] };
    }
    return {
      text: "I couldn't find a strong match in my current memory. Teach me a clear fact, or try a question with more specific keywords.",
      confidence: best ? best.score : 0,
      fact: null,
      alternatives: ranked.slice(0, 3)
    };
  }

  function getStats() {
    return {
      version: VERSION,
      starterFacts: starter.facts.length,
      cloudFacts: cloudFacts.length,
      localFacts: localState.facts.length,
      totalFacts: allFacts().length,
      lastLocalSave: localState.savedAt,
      storageKey: STORAGE_KEY,
      localStorageAvailable: (() => { try { return !!global.localStorage; } catch (_) { return false; } })()
    };
  }

  function exportKnowledge() {
    return {
      format: "neuron-ai-knowledge",
      schemaVersion: 3,
      brainVersion: VERSION,
      exportedAt: new Date().toISOString(),
      facts: allFacts().map(f => ({
        text: f.text,
        tags: uniqueStrings(f.tags, MAX_TAGS),
        source: f.source || "export",
        confidence: clamp(Number(f.confidence == null ? 0.7 : f.confidence), 0, 1),
        createdAt: f.createdAt || null
      })),
      qa: starter.qa.slice()
    };
  }

  function makeNeuronJsSnapshot() {
    const data = exportKnowledge();
    const knowledge = {
      facts: data.facts.map(f => ({ text: f.text, tags: f.tags, source: f.source, confidence: f.confidence })),
      qa: data.qa
    };
    return [
      "/* Neuron AI brain snapshot — generated " + data.exportedAt + " */",
      "/* This is a publishable knowledge snapshot, not trained neural weights. */",
      "window.NEURON_CONFIG = " + JSON.stringify(config, null, 2) + ";",
      "window.NEURON_KNOWLEDGE = " + JSON.stringify(knowledge, null, 2) + ";",
      ""
    ].join("\n");
  }

  function importLocalFacts(items) {
    let added = 0, duplicates = 0, errors = [];
    for (const item of (Array.isArray(items) ? items : [])) {
      try {
        const result = addLocalFact(item, { source: "import" });
        if (result.added) added++; else duplicates++;
      } catch (e) {
        errors.push(e.message);
      }
    }
    return { added, duplicates, errors };
  }

  global.NEURON_CONFIG = config;
  global.NEURON_KNOWLEDGE = starter;
  global.NEURON_BRAIN = Object.freeze({
    version: VERSION,
    config,
    starter,
    normalize,
    allFacts,
    rank,
    answer,
    addLocalFact,
    replaceCloudFacts,
    getStats,
    exportKnowledge,
    makeNeuronJsSnapshot,
    importLocalFacts,
    saveLocal
  });
})(window);
