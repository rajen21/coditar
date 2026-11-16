export interface LanguageConfig {
  image: string;
  fileName: string;
}

// Language execution registry. Add a new language by adding an entry here
// and building/pushing the matching docker image - no other code changes needed.
const LANGUAGES: Record<string, LanguageConfig> = {
  javascript: {
    image: "exec-js:1.0",
    fileName: "main.js",
  },
  python: {
    image: "exec-python:1.0",
    fileName: "main.py",
  },
};

export function getLanguageConfig(language: string): LanguageConfig {
  const config = LANGUAGES[language];
  if (!config) {
    const supported = Object.keys(LANGUAGES).join(", ");
    throw new Error(`Unsupported language "${language}". Supported: ${supported}`);
  }
  return config;
}

export { LANGUAGES };
