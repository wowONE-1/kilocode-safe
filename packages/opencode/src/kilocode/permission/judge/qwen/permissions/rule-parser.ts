/** Copyright 2025 Qwen Team. SPDX-License-Identifier: Apache-2.0
 * Copied from Qwen Code 80497a74d0e807f4640b60f7fe482bb97202408a. */


// ─────────────────────────────────────────────────────────────────────────────
// Shell command matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shell operator tokens that act as command boundaries.
 * Ordered by length (longest first) for correct multi-char operator detection.
 */
const SHELL_OPERATORS = ['&&', '||', ';;', '|&', '|', ';', '&', '\n'];


/**
 * Count the consecutive backslashes immediately before `index`.
 *
 * An odd count means the character at `index` is itself escaped, so it is a
 * literal rather than a shell metacharacter.
 */
function precedingBackslashCount(command: string, index: number): number {
  let count = 0;
  for (let k = index - 1; k >= 0 && command[k] === '\\'; k--) {
    count++;
  }
  return count;
}


/**
 * Whether the `&` at `index` is the async (background) operator rather than
 * part of a redirection.
 *
 * `&&` and `|&` never reach here — they are longer, so they match first — which
 * leaves three forms to exclude: `&>` and `&>>` redirect both streams, and
 * `>&` / `<&` duplicate a descriptor (`2>&1`, `>&2`). Confirmed against bash:
 * `echo hi &> out` writes the file and backgrounds nothing, while
 * `echo one & echo two` really does run two commands.
 *
 * The backward scan is escape-aware, and has to be: `\>` is a literal `>`
 * argument, not a redirection, so `echo a \> & rm -rf /` really does background
 * the `echo` and then run the `rm`. Reading that `\>` as a redirection would
 * keep both halves in one segment and let the `echo`'s allow rule cover the
 * `rm`.
 */
function isAsyncOperator(command: string, index: number): boolean {
  if (command[index + 1] === '>') {
    return false;
  }
  for (let j = index - 1; j >= 0; j--) {
    const ch = command[j]!;
    if (/\s/.test(ch)) {
      continue;
    }
    if (ch === '>' || ch === '<') {
      // Escaped, so a literal argument and the `&` still backgrounds.
      return precedingBackslashCount(command, j) % 2 === 1;
    }
    return true;
  }
  return true;
}


/**
 * One segment of a compound command, together with the operator that ended it.
 */
export interface CompoundCommandSegment {
  /** The trimmed simple command. */
  command: string;
  /**
   * The operator that terminated this segment, or `''` when the segment ran to
   * the end of the input. Lets callers tell a foreground segment from one the
   * shell runs in a subshell (`&`).
   */
  terminator: string;
}


/**
 * Split a compound shell command into its individual simple commands, keeping
 * the operator that terminated each one.
 *
 * See {@link splitCompoundCommand} for the string-only form and for examples;
 * this is the same split, and that function is a projection of this one.
 */
export function splitCompoundCommandSegments(
  command: string,
): CompoundCommandSegment[] {
  const segments: CompoundCommandSegment[] = [];
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  let lastSplit = 0;
  // Nesting depth of `$(( … ))` / `(( … ))`. Inside arithmetic a bare `&` is
  // bitwise AND, not the async operator, so `$(( FLAGS & MASK ))` is one word.
  let arithmeticDepth = 0;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) {
      continue;
    }

    if (ch === '(' && command[i + 1] === '(') {
      arithmeticDepth++;
      i++;
      continue;
    }
    if (arithmeticDepth > 0 && ch === ')' && command[i + 1] === ')') {
      arithmeticDepth--;
      i++;
      continue;
    }

    // Check for shell operators (longest match first)
    for (const op of SHELL_OPERATORS) {
      if (command.substring(i, i + op.length) !== op) {
        continue;
      }
      // A bare `&` bounds a command only when it is the async operator; its
      // other spellings belong to a redirection or to arithmetic, and stay in
      // the segment.
      if (op === '&' && (arithmeticDepth > 0 || !isAsyncOperator(command, i))) {
        continue;
      }
      const segment = command.substring(lastSplit, i).trim();
      if (segment) {
        segments.push({ command: segment, terminator: op });
      }
      lastSplit = i + op.length;
      i = lastSplit - 1; // -1 because the loop will i++
      break;
    }
  }

  // Add the last segment
  const lastSegment = command.substring(lastSplit).trim();
  if (lastSegment) {
    segments.push({ command: lastSegment, terminator: '' });
  }

  return segments;
}