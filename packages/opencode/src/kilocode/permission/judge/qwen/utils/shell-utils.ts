/** Copyright 2025 Qwen Team. SPDX-License-Identifier: Apache-2.0
 * Copied from Qwen Code 80497a74d0e807f4640b60f7fe482bb97202408a. */

const ENV_ASSIGNMENT_REGEX = /^[A-Za-z_][A-Za-z0-9_]*=/;


export function stripShellWrapper(command: string): string {
  const trimmed = command.trim();
  let rest = trimmed;

  // Skip leading env assignments (e.g. `FOO=bar bash -c '...'`)
  while (true) {
    const token = takeLeadingToken(rest);
    if (!token || !isEnvAssignmentToken(token.token)) break;
    rest = token.rest;
  }

  // Check for a known shell wrapper (bash, sh, zsh, cmd.exe — with or
  // without absolute path like /bin/bash or /usr/bin/zsh).
  const wrapperToken = takeLeadingToken(rest);
  if (!wrapperToken || !isKnownMonitorWrapperToken(wrapperToken.token)) {
    return trimmed;
  }
  rest = wrapperToken.rest;

  // Consume wrapper flags (e.g. -e, -x, -o pipefail, -lc) until we
  // hit the -c / /c command marker.
  while (true) {
    const token = takeLeadingToken(rest);
    if (!token) return trimmed;

    if (isMonitorCommandMarker(wrapperToken.token, token.token)) {
      const commandToken = takeLeadingToken(token.rest);
      if (!commandToken) return trimmed;
      const { value: innerCommand, quote } = stripSymmetricQuotes(
        commandToken.token,
      );
      if (!quote && shellWrapperCommandConsumesRest(wrapperToken.token)) {
        return token.rest.trimStart() || trimmed;
      }
      return innerCommand || trimmed;
    }

    // Non-wrapper-option token — not a wrapper.
    const normalized = getNormalizedShellToken(token.token);
    if (!isShellWrapperFlagToken(normalized)) {
      return trimmed;
    }

    rest = token.rest;
    if (shellWrapperFlagConsumesOperand(token.token)) {
      const operandToken = takeLeadingToken(rest);
      if (!operandToken) return trimmed;
      rest = operandToken.rest;
    }
  }
}


function optionHasInlineValue(token: string): boolean {
  return token.includes('=') || token.includes(':');
}


/**
 * Strip a single bare trailing `&` (bash background operator) from a
 * command string. Returns the input unchanged if the trailing form is
 * `&&` (logical AND), `\&` (escaped literal `&`), or there is no `&`
 * at the end at all.
 */
export function stripTrailingBackgroundAmp(command: string): string {
  const trimmed = command.trimEnd();
  if (!trimmed.endsWith('&')) return command;
  if (trimmed.endsWith('&&')) return command;
  if (trimmed.endsWith('\\&')) return command;
  return trimmed.slice(0, -1).trimEnd();
}


interface ParsedMonitorShellWrapper {
  wrapperTokens?: string[];
  innerCommand: string;
  innerQuote: '"' | "'" | '';
  innerArgsSuffix?: string;
}


export interface NormalizedMonitorCommand {
  analysisCommand: string;
  safetyCommand: string;
  spawnCommand: string;
  strippedTrailingAmp: boolean;
}


function takeLeadingToken(
  input: string,
): { token: string; rest: string } | null {
  const trimmed = input.trimStart();
  if (!trimmed) {
    return null;
  }

  let quote: '"' | "'" | '' = '';
  let escaped = false;
  let inBackticks = false;
  let commandSubstitutionDepth = 0;
  let idx = 0;

  while (idx < trimmed.length) {
    const char = trimmed[idx];
    if (!char) {
      break;
    }

    if (quote === "'") {
      if (char === "'") {
        quote = '';
      }
      idx++;
      continue;
    }

    if (quote === '"') {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        quote = '';
      }
      idx++;
      continue;
    }

    if (inBackticks) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '`') {
        inBackticks = false;
      }
      idx++;
      continue;
    }

    if (escaped) {
      escaped = false;
      idx++;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      idx++;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      idx++;
      continue;
    }

    if (char === '`') {
      inBackticks = true;
      idx++;
      continue;
    }

    if (
      (char === '$' || char === '<' || char === '>') &&
      trimmed[idx + 1] === '('
    ) {
      commandSubstitutionDepth++;
      idx += 2;
      continue;
    }

    if (char === ')' && commandSubstitutionDepth > 0) {
      commandSubstitutionDepth--;
      idx++;
      continue;
    }

    if (/\s/.test(char) && commandSubstitutionDepth === 0) {
      break;
    }

    idx++;
  }

  if (
    idx === 0 ||
    quote ||
    escaped ||
    inBackticks ||
    commandSubstitutionDepth
  ) {
    return null;
  }

  return {
    token: trimmed.slice(0, idx),
    rest: trimmed.slice(idx),
  };
}


function stripSymmetricQuotes(command: string): {
  value: string;
  quote: '"' | "'" | '';
} {
  const trimmed = command.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return {
      value: trimmed.substring(1, trimmed.length - 1),
      quote: trimmed[0] as '"' | "'",
    };
  }

  return { value: trimmed, quote: '' };
}


function getNormalizedShellToken(token: string): string {
  return stripSymmetricQuotes(token).value.replace(/\\/g, '/').toLowerCase();
}


function isEnvAssignmentToken(token: string): boolean {
  return ENV_ASSIGNMENT_REGEX.test(stripSymmetricQuotes(token).value);
}


function getShellWrapperBase(token: string): string | undefined {
  return getNormalizedShellToken(token).split('/').pop();
}


function isKnownMonitorWrapperToken(token: string): boolean {
  const base = getShellWrapperBase(token);
  return (
    base === 'sh' ||
    base === 'sh.exe' ||
    base === 'bash' ||
    base === 'bash.exe' ||
    base === 'zsh' ||
    base === 'zsh.exe' ||
    base === 'cmd' ||
    base === 'cmd.exe' ||
    base === 'powershell' ||
    base === 'powershell.exe' ||
    base === 'pwsh' ||
    base === 'pwsh.exe'
  );
}


function isShellWrapperFlagToken(normalizedToken: string): boolean {
  return (
    normalizedToken.startsWith('-') ||
    normalizedToken.startsWith('/') ||
    normalizedToken === '+o'
  );
}


function shellWrapperFlagConsumesOperand(token: string): boolean {
  const normalized = getNormalizedShellToken(token);
  if (optionHasInlineValue(token)) {
    return false;
  }
  return (
    normalized === '-o' ||
    normalized === '+o' ||
    normalized === '-executionpolicy' ||
    normalized === '-file' ||
    normalized === '-encodedcommand'
  );
}


function shellWrapperCommandConsumesRest(wrapperToken: string): boolean {
  const base = getShellWrapperBase(wrapperToken);
  // POSIX shells pass exactly one argument after -c as the command string.
  // cmd.exe and PowerShell treat the remaining tokens after /c or -Command as
  // the command, so unquoted inner commands need the full rest of the line.
  return (
    base === 'cmd' ||
    base === 'cmd.exe' ||
    base === 'powershell' ||
    base === 'powershell.exe' ||
    base === 'pwsh' ||
    base === 'pwsh.exe'
  );
}


function isMonitorCommandMarker(wrapperToken: string, token: string): boolean {
  const base = getShellWrapperBase(wrapperToken);
  const normalized = getNormalizedShellToken(token);

  if (base === 'cmd' || base === 'cmd.exe') {
    return normalized === '/c';
  }

  if (
    base === 'powershell' ||
    base === 'powershell.exe' ||
    base === 'pwsh' ||
    base === 'pwsh.exe'
  ) {
    return normalized === '-command' || normalized === '-c';
  }

  return normalized === '-c' || /^-[a-z]*c[a-z]*$/i.test(normalized);
}


function parseMonitorShellWrapper(command: string): ParsedMonitorShellWrapper {
  const trimmed = command.trim();
  let rest = trimmed;
  const leadingEnvTokens: string[] = [];

  while (true) {
    const token = takeLeadingToken(rest);
    if (!token || !isEnvAssignmentToken(token.token)) {
      break;
    }
    leadingEnvTokens.push(token.token);
    rest = token.rest;
  }

  const wrapperToken = takeLeadingToken(rest);
  if (!wrapperToken || !isKnownMonitorWrapperToken(wrapperToken.token)) {
    return {
      innerCommand: trimmed,
      innerQuote: '',
    };
  }

  rest = wrapperToken.rest;
  const wrapperTokens = [...leadingEnvTokens, wrapperToken.token];

  while (true) {
    const token = takeLeadingToken(rest);
    if (!token) {
      return {
        innerCommand: trimmed,
        innerQuote: '',
      };
    }

    if (isMonitorCommandMarker(wrapperToken.token, token.token)) {
      wrapperTokens.push(token.token);
      const commandToken = takeLeadingToken(token.rest);
      if (!commandToken) {
        return {
          innerCommand: trimmed,
          innerQuote: '',
        };
      }
      const { value: innerCommand, quote: innerQuote } = stripSymmetricQuotes(
        commandToken.token,
      );
      return {
        wrapperTokens,
        innerCommand,
        innerQuote,
        innerArgsSuffix: commandToken.rest.trimStart(),
      };
    }

    const normalized = getNormalizedShellToken(token.token);
    if (!isShellWrapperFlagToken(normalized)) {
      return {
        innerCommand: trimmed,
        innerQuote: '',
      };
    }

    wrapperTokens.push(token.token);
    rest = token.rest;
    if (shellWrapperFlagConsumesOperand(token.token)) {
      const operandToken = takeLeadingToken(rest);
      if (!operandToken) {
        return {
          innerCommand: trimmed,
          innerQuote: '',
        };
      }
      wrapperTokens.push(operandToken.token);
      rest = operandToken.rest;
    }
  }
}


export function normalizeMonitorCommand(
  command: string,
): NormalizedMonitorCommand {
  const { wrapperTokens, innerCommand, innerQuote, innerArgsSuffix } =
    parseMonitorShellWrapper(command);
  const leadingEnvTokens =
    wrapperTokens?.filter((token) => isEnvAssignmentToken(token)) ?? [];
  const analysisCommand = stripTrailingBackgroundAmp(innerCommand);
  const rawInnerArgsSuffix = innerArgsSuffix?.trim() ?? '';
  const normalizedInnerArgsSuffix =
    stripTrailingBackgroundAmp(rawInnerArgsSuffix);
  // Permission safety focuses on command text that the shell may expand or
  // execute: leading env assignments, the -c script, and argv suffixes. Wrapper
  // flags are preserved in spawnCommand, but are not converted into Bash(...)
  // command-rule surface.
  const safetyParts = [
    ...(wrapperTokens ? leadingEnvTokens : []),
    analysisCommand,
    ...(normalizedInnerArgsSuffix ? [normalizedInnerArgsSuffix] : []),
  ];
  const safetyCommand =
    wrapperTokens && safetyParts.length > 0
      ? safetyParts.join(' ').trim()
      : analysisCommand;
  const strippedTrailingAmp =
    analysisCommand !== innerCommand ||
    normalizedInnerArgsSuffix !== rawInnerArgsSuffix;
  const spawnCommand = wrapperTokens
    ? [
        wrapperTokens.join(' '),
        innerQuote
          ? `${innerQuote}${analysisCommand}${innerQuote}`
          : analysisCommand,
        normalizedInnerArgsSuffix,
      ]
        .filter(Boolean)
        .join(' ')
    : analysisCommand;

  return {
    analysisCommand,
    safetyCommand,
    spawnCommand,
    strippedTrailingAmp,
  };
}