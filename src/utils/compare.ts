// Normalize output before compare: trim trailing whitespace on each line and
// drop trailing blank lines, so harmless formatting differences don't fail a testcase.
export function normalize(output: string | null | undefined): string {
  return String(output ?? "")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export function outputsMatch(actual: string | null | undefined, expected: string | null | undefined): boolean {
  return normalize(actual) === normalize(expected);
}
