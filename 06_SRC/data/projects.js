/**
 * Centralized Projects Data Repository
 * 
 * Exactly 5 Featured Projects:
 * 01 — FBOOST AGRO
 * 02 — BugOff
 * 03 — SANSEC AI
 * 04 — Career Ledger
 * 05 — Aegis AI
 * 
 * URLs and GitHub repositories default to editable '#' placeholders.
 */

export const projects = [
  {
    number: "01",
    id: "fboost-agro",
    title: "FBOOST AGRO",
    category: "AgTech / Sustainable Agriculture",
    subtitle: "Agricultural Telemetry & Resource Intelligence",
    description: "Agricultural telemetry and crop optimization platform designed to improve farm yield and resource management through field data monitoring and automated irrigation workflows.",
    longDescription: "Engineered to empower modern agricultural operations with data-driven decision-making. FBOOST AGRO integrates environmental telemetry with soil sensing models to predict crop health, prevent resource waste, and optimize automated irrigation schedules across diversified farm plots.",
    technologies: ["React", "Node.js", "Express", "MongoDB", "Leaflet GIS", "REST APIs"],
    metrics: "Precision Crop Yield Telemetry · Soil Sensor Synthesis · Automated Resource Routing",
    accentColor: "#22c55e",
    accentRgb: "34, 197, 94",
    url: "https://fboost-agro.vercel.app/",
    github: "#",
    visualType: "agro"
  },
  {
    number: "02",
    id: "bugoff",
    title: "BugOff",
    category: "Developer Tool / Workflow Automation",
    subtitle: "Automated Error Telemetry & Issue Triage",
    description: "Automated bug tracking and issue remediation workflow system built for agile developer teams to streamline triage, isolate stack traces, and accelerate release cycles.",
    longDescription: "A developer-first diagnostic utility designed to bridge crash telemetry and pull-request verification. BugOff automatically captures unhandled exceptions, parses AST stack signatures, deduplicates anomaly reports, and generates reproduction scripts to minimize turnaround times.",
    technologies: ["JavaScript", "Python", "FastAPI", "SQLite", "Docker", "Git CI/CD"],
    metrics: "Automated Error Triage · AST Stack Signatures · Automated Reproduction Harness",
    accentColor: "#f43f5e",
    accentRgb: "244, 63, 94",
    url: "#",
    github: "#",
    visualType: "debugger"
  },
  {
    number: "03",
    id: "sansec-ai",
    title: "SANSEC AI",
    category: "AI / Cybersecurity",
    subtitle: "Deep Neural Malware Forensics & Binary Telemetry",
    description: "Secure AI-powered malware analysis platform performing automated binary dissection, behavioral anomaly detection, and real-time threat intelligence synthesis.",
    longDescription: "An advanced defensive platform built to counter sophisticated adversarial binaries. SANSEC AI inspects file structures, evaluates opcode sequence vectors with transformer-based embeddings, and generates automated threat classifications within an isolated sandbox environment.",
    technologies: ["Python", "PyTorch", "FastAPI", "Next.js", "Cyber Threat Intel", "Docker"],
    metrics: "Automated Binary Dissection · Neural Threat Heuristics · Dynamic Sandboxed Telemetry",
    accentColor: "#a855f7",
    accentRgb: "168, 85, 247",
    url: "https://sansec-ai.vercel.app/",
    github: "#",
    visualType: "cyber"
  },
  {
    number: "04",
    id: "career-ledger",
    title: "Career Ledger",
    category: "iOS / Student Productivity",
    subtitle: "Academic Portfolio & Achievement Ledger",
    description: "Digital student portfolio and academic achievement tracker designed for iOS, structuring academic milestones, verified skills, and career readiness metrics.",
    longDescription: "Crafted following Apple Human Interface Guidelines to give students a unified, tamper-evident record of their collegiate journey. Career Ledger aggregates coursework, project repos, verified credentials, and extracurricular leadership into an elegant, exportable resume package.",
    technologies: ["Swift", "SwiftUI", "CoreData", "Combine", "iOS SDK", "CloudKit"],
    metrics: "Native SwiftUI Architecture · Offline-First CoreData · CloudKit Cryptographic Sync",
    accentColor: "#38bdf8",
    accentRgb: "56, 189, 248",
    url: "#",
    github: "#",
    visualType: "ios"
  },
  {
    number: "05",
    id: "aegis-ai",
    title: "Aegis AI",
    category: "Artificial Intelligence",
    subtitle: "Synthetic Media Forensics & Deepfake Detection",
    description: "AI-powered deepfake detection project utilizing multi-stream spatio-temporal facial analysis and frequency-domain artifact inspection to expose synthetic media manipulation.",
    longDescription: "A multi-layered computer vision pipeline engineered to detect generative adversarial manipulations in video content. Aegis AI evaluates subtle temporal inconsistencies, eye-blink irregularities, and high-frequency spectral artifacts to detect synthetic face generation.",
    technologies: ["Python", "PyTorch", "Computer Vision", "OpenCV", "Flask", "WebSockets"],
    metrics: "Spatio-Temporal Frequency Analysis · Facial Landmark Tracking · Real-Time Video Scoring",
    accentColor: "#ff2b2b",
    accentRgb: "255, 43, 43",
    url: "#",
    github: "#",
    visualType: "vision"
  }
];

// Provide global fallback for vanilla scripts
if (typeof window !== "undefined") {
  window.PROJECTS_DATA = projects;
}
