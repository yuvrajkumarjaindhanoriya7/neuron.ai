/*
 * Neuron AI starter knowledge.
 * Keep this file beside index.html.
 * Add facts to "facts" and question-answer pairs to "qa".
 * This file is read by the browser; the website cannot rewrite this file itself.
 */
window.NEURON_KNOWLEDGE = {
  facts: [
    { text: "Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to make sugars and release oxygen.", tags: ["photosynthesis", "plants", "sunlight", "biology"] },
    { text: "The Earth orbits the Sun once about every 365.25 days.", tags: ["earth", "sun", "orbit", "space"] },
    { text: "The Moon orbits Earth.", tags: ["moon", "earth", "space"] },
    { text: "Water is made of hydrogen and oxygen; its chemical formula is H2O.", tags: ["water", "chemistry", "h2o"] },
    { text: "JavaScript is a programming language commonly used to make websites interactive.", tags: ["javascript", "programming", "web development"] },
    { text: "HTML structures content on web pages, while CSS controls presentation and layout.", tags: ["html", "css", "web development"] },
    { text: "A neural network is a computing model made of connected units that learn patterns from examples.", tags: ["neural network", "ai", "machine learning"] },
    { text: "Brain.js is a JavaScript library for building neural networks in JavaScript.", tags: ["brain.js", "javascript", "neural network"] }
  ],
  qa: [
    { question: "What is photosynthesis?", answer: "Photosynthesis is how green plants use sunlight, water, and carbon dioxide to make sugars and release oxygen.", intent: "photosynthesis" },
    { question: "Does photosynthesis happen in plants?", answer: "Yes. Photosynthesis occurs in plants, especially in their green parts where chlorophyll captures light.", intent: "photosynthesis" },
    { question: "What is the chemical formula of water?", answer: "Water's chemical formula is H2O: each molecule has two hydrogen atoms and one oxygen atom.", intent: "water" },
    { question: "What is JavaScript?", answer: "JavaScript is a programming language often used to add interactive behavior to websites.", intent: "javascript" },
    { question: "What is Brain.js?", answer: "Brain.js is a JavaScript library for creating neural networks. This demo uses it as an optional library; its fact lookup is separate.", intent: "brainjs" }
  ]
};
