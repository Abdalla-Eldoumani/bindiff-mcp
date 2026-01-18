import { Symbol, Section, SymbolDiff, SectionDiff, ModifiedSymbol, ModifiedSection } from './types.js';

/**
 * Compare symbols between two binaries and compute the diff
 */
export function diffSymbols(oldSymbols: Symbol[], newSymbols: Symbol[]): SymbolDiff {
  const oldMap = new Map(oldSymbols.map(s => [s.name, s]));
  const newMap = new Map(newSymbols.map(s => [s.name, s]));

  const added: Symbol[] = [];
  const removed: Symbol[] = [];
  const modified: ModifiedSymbol[] = [];

  let netSizeChange = 0;

  // Find added and modified symbols
  for (const [name, newSym] of newMap) {
    const oldSym = oldMap.get(name);
    if (!oldSym) {
      added.push(newSym);
      netSizeChange += newSym.size;
    } else if (oldSym.size !== newSym.size) {
      const change = newSym.size - oldSym.size;
      modified.push({
        name,
        oldSize: oldSym.size,
        newSize: newSym.size,
        sizeChange: change,
        percentChange: oldSym.size > 0 ? (change / oldSym.size) * 100 : (newSym.size > 0 ? 100 : 0),
      });
      netSizeChange += change;
    }
  }

  // Find removed symbols
  for (const [name, oldSym] of oldMap) {
    if (!newMap.has(name)) {
      removed.push(oldSym);
      netSizeChange -= oldSym.size;
    }
  }

  // Sort modified by absolute size change (largest first)
  modified.sort((a, b) => Math.abs(b.sizeChange) - Math.abs(a.sizeChange));

  return {
    added,
    removed,
    modified,
    summary: {
      totalAdded: added.length,
      totalRemoved: removed.length,
      totalModified: modified.length,
      netSizeChange,
    },
  };
}

/**
 * Compare sections between two binaries and compute the diff
 */
export function diffSections(oldSections: Section[], newSections: Section[]): SectionDiff {
  const oldMap = new Map(oldSections.map(s => [s.name, s]));
  const newMap = new Map(newSections.map(s => [s.name, s]));

  const added: Section[] = [];
  const removed: Section[] = [];
  const modified: ModifiedSection[] = [];

  let netSizeChange = 0;

  // Find added and modified sections
  for (const [name, newSec] of newMap) {
    const oldSec = oldMap.get(name);
    if (!oldSec) {
      added.push(newSec);
      netSizeChange += newSec.size;
    } else if (oldSec.size !== newSec.size) {
      const change = newSec.size - oldSec.size;
      modified.push({
        name,
        oldSize: oldSec.size,
        newSize: newSec.size,
        sizeChange: change,
        percentChange: oldSec.size > 0 ? (change / oldSec.size) * 100 : (newSec.size > 0 ? 100 : 0),
      });
      netSizeChange += change;
    }
  }

  // Find removed sections
  for (const [name, oldSec] of oldMap) {
    if (!newMap.has(name)) {
      removed.push(oldSec);
      netSizeChange -= oldSec.size;
    }
  }

  // Sort modified by absolute size change
  modified.sort((a, b) => Math.abs(b.sizeChange) - Math.abs(a.sizeChange));

  return {
    added,
    removed,
    modified,
    summary: {
      totalAdded: added.length,
      totalRemoved: removed.length,
      totalModified: modified.length,
      netSizeChange,
    },
  };
}

/**
 * Filter symbols by type
 */
export function filterSymbols(
  symbols: Symbol[],
  filter: 'function' | 'object' | 'all'
): Symbol[] {
  if (filter === 'all') {
    return symbols;
  }

  if (filter === 'function') {
    // T, t = text (code), W, w = weak symbol (often functions)
    return symbols.filter(s => ['T', 't', 'W', 'w'].includes(s.type));
  }

  if (filter === 'object') {
    // D, d = initialized data, B, b = BSS, R, r = read-only data
    return symbols.filter(s => ['D', 'd', 'B', 'b', 'R', 'r'].includes(s.type));
  }

  return symbols;
}

/**
 * Filter symbols to only defined (not undefined)
 */
export function filterDefinedSymbols(symbols: Symbol[]): Symbol[] {
  return symbols.filter(s => s.type !== 'U' && s.type !== 'w');
}

/**
 * Filter symbols to only undefined
 */
export function filterUndefinedSymbols(symbols: Symbol[]): Symbol[] {
  return symbols.filter(s => s.type === 'U' || s.type === 'w');
}
