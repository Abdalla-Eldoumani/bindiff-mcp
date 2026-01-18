/**
 * Represents a symbol from nm output
 */
export interface Symbol {
  address: string;
  size: number;
  type: string;  // T=text, D=data, B=bss, U=undefined, W=weak, etc.
  binding: 'local' | 'global' | 'weak' | 'unknown';
  name: string;
}

/**
 * Represents an ELF section from readelf output
 */
export interface Section {
  index: number;
  name: string;
  type: string;
  address: string;
  offset: string;
  size: number;
  flags: string;
}

/**
 * ELF file header information
 */
export interface ElfHeader {
  format: string;       // ELF32 or ELF64
  machine: string;      // Architecture (e.g., AArch64, x86-64)
  type: string;         // EXEC, DYN, REL, etc.
  entry: string;        // Entry point address
  endianness: string;   // little endian or big endian
}

/**
 * Modified symbol in a diff
 */
export interface ModifiedSymbol {
  name: string;
  oldSize: number;
  newSize: number;
  sizeChange: number;
  percentChange: number;
}

/**
 * Result of comparing symbols between two binaries
 */
export interface SymbolDiff {
  added: Symbol[];
  removed: Symbol[];
  modified: ModifiedSymbol[];
  summary: {
    totalAdded: number;
    totalRemoved: number;
    totalModified: number;
    netSizeChange: number;
  };
}

/**
 * Modified section in a diff
 */
export interface ModifiedSection {
  name: string;
  oldSize: number;
  newSize: number;
  sizeChange: number;
  percentChange: number;
}

/**
 * Result of comparing sections between two binaries
 */
export interface SectionDiff {
  added: Section[];
  removed: Section[];
  modified: ModifiedSection[];
  summary: {
    totalAdded: number;
    totalRemoved: number;
    totalModified: number;
    netSizeChange: number;
  };
}

/**
 * High-level binary comparison result
 */
export interface BinaryComparison {
  fileA: string;
  fileB: string;
  archA: string;
  archB: string;
  sizeA: number;
  sizeB: number;
  sizeChange: number;
  percentChange: number;
  functionCountA: number;
  functionCountB: number;
  symbolDiff: SymbolDiff;
  sectionDiff: SectionDiff;
}
