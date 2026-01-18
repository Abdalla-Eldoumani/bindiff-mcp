import { describe, it, expect } from 'vitest';
import {
  diffSymbols,
  diffSections,
  filterSymbols,
  filterDefinedSymbols,
  filterUndefinedSymbols,
} from '../src/lib/differ.js';
import { Symbol, Section } from '../src/lib/types.js';

describe('diffSymbols', () => {
  const makeSymbol = (name: string, size: number, type = 'T'): Symbol => ({
    address: '0000000000001000',
    size,
    type,
    binding: 'global',
    name,
  });

  it('detects added symbols', () => {
    const oldSymbols = [makeSymbol('foo', 100)];
    const newSymbols = [makeSymbol('foo', 100), makeSymbol('bar', 50)];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].name).toBe('bar');
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.summary.totalAdded).toBe(1);
    expect(diff.summary.netSizeChange).toBe(50);
  });

  it('detects removed symbols', () => {
    const oldSymbols = [makeSymbol('foo', 100), makeSymbol('bar', 50)];
    const newSymbols = [makeSymbol('foo', 100)];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].name).toBe('bar');
    expect(diff.summary.totalRemoved).toBe(1);
    expect(diff.summary.netSizeChange).toBe(-50);
  });

  it('detects modified symbols', () => {
    const oldSymbols = [makeSymbol('foo', 100)];
    const newSymbols = [makeSymbol('foo', 150)];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]).toEqual({
      name: 'foo',
      oldSize: 100,
      newSize: 150,
      sizeChange: 50,
      percentChange: 50,
    });
    expect(diff.summary.netSizeChange).toBe(50);
  });

  it('handles unchanged symbols', () => {
    const oldSymbols = [makeSymbol('foo', 100)];
    const newSymbols = [makeSymbol('foo', 100)];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.summary.netSizeChange).toBe(0);
  });

  it('handles empty inputs', () => {
    const diff = diffSymbols([], []);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
  });

  it('handles complex diff scenario', () => {
    const oldSymbols = [
      makeSymbol('unchanged', 100),
      makeSymbol('modified', 200),
      makeSymbol('removed', 50),
    ];
    const newSymbols = [
      makeSymbol('unchanged', 100),
      makeSymbol('modified', 250),
      makeSymbol('added', 75),
    ];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
    expect(diff.modified).toHaveLength(1);
    expect(diff.summary.netSizeChange).toBe(75 - 50 + 50); // added - removed + modified change
  });

  it('sorts modified by absolute size change', () => {
    const oldSymbols = [
      makeSymbol('small_change', 100),
      makeSymbol('big_change', 100),
      makeSymbol('negative_change', 200),
    ];
    const newSymbols = [
      makeSymbol('small_change', 110),
      makeSymbol('big_change', 200),
      makeSymbol('negative_change', 50),
    ];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.modified[0].name).toBe('negative_change'); // -150 change
    expect(diff.modified[1].name).toBe('big_change'); // +100 change
    expect(diff.modified[2].name).toBe('small_change'); // +10 change
  });

  it('calculates percentage correctly', () => {
    const oldSymbols = [makeSymbol('doubled', 100)];
    const newSymbols = [makeSymbol('doubled', 200)];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.modified[0].percentChange).toBe(100);
  });

  it('handles zero-size old symbols', () => {
    const oldSymbols = [makeSymbol('zero', 0)];
    const newSymbols = [makeSymbol('zero', 100)];

    const diff = diffSymbols(oldSymbols, newSymbols);

    expect(diff.modified[0].percentChange).toBe(100);
  });
});

describe('diffSections', () => {
  const makeSection = (name: string, size: number): Section => ({
    index: 1,
    name,
    type: 'PROGBITS',
    address: '0000000000001000',
    offset: '001000',
    size,
    flags: 'AX',
  });

  it('detects added sections', () => {
    const oldSections = [makeSection('.text', 1000)];
    const newSections = [makeSection('.text', 1000), makeSection('.rodata', 500)];

    const diff = diffSections(oldSections, newSections);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].name).toBe('.rodata');
    expect(diff.summary.netSizeChange).toBe(500);
  });

  it('detects removed sections', () => {
    const oldSections = [makeSection('.text', 1000), makeSection('.debug', 2000)];
    const newSections = [makeSection('.text', 1000)];

    const diff = diffSections(oldSections, newSections);

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].name).toBe('.debug');
    expect(diff.summary.netSizeChange).toBe(-2000);
  });

  it('detects modified sections', () => {
    const oldSections = [makeSection('.text', 1000)];
    const newSections = [makeSection('.text', 1500)];

    const diff = diffSections(oldSections, newSections);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].sizeChange).toBe(500);
    expect(diff.modified[0].percentChange).toBe(50);
  });
});

describe('filterSymbols', () => {
  const symbols: Symbol[] = [
    { address: '1000', size: 100, type: 'T', binding: 'global', name: 'func1' },
    { address: '2000', size: 50, type: 't', binding: 'local', name: 'func2' },
    { address: '3000', size: 200, type: 'D', binding: 'global', name: 'data1' },
    { address: '4000', size: 80, type: 'B', binding: 'global', name: 'bss1' },
    { address: '0', size: 0, type: 'U', binding: 'unknown', name: 'undefined1' },
  ];

  it('filters functions', () => {
    const result = filterSymbols(symbols, 'function');
    expect(result).toHaveLength(2);
    expect(result.every(s => s.type === 'T' || s.type === 't')).toBe(true);
  });

  it('filters objects', () => {
    const result = filterSymbols(symbols, 'object');
    expect(result).toHaveLength(2);
    expect(result.map(s => s.name)).toEqual(['data1', 'bss1']);
  });

  it('returns all symbols when filter is all', () => {
    const result = filterSymbols(symbols, 'all');
    expect(result).toHaveLength(5);
  });
});

describe('filterDefinedSymbols', () => {
  const symbols: Symbol[] = [
    { address: '1000', size: 100, type: 'T', binding: 'global', name: 'defined1' },
    { address: '0', size: 0, type: 'U', binding: 'unknown', name: 'undefined1' },
    { address: '0', size: 0, type: 'w', binding: 'weak', name: 'weak_undef' },
    { address: '2000', size: 50, type: 'D', binding: 'global', name: 'defined2' },
  ];

  it('filters out undefined symbols', () => {
    const result = filterDefinedSymbols(symbols);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.name)).toEqual(['defined1', 'defined2']);
  });
});

describe('filterUndefinedSymbols', () => {
  const symbols: Symbol[] = [
    { address: '1000', size: 100, type: 'T', binding: 'global', name: 'defined1' },
    { address: '0', size: 0, type: 'U', binding: 'unknown', name: 'undefined1' },
    { address: '0', size: 0, type: 'w', binding: 'weak', name: 'weak_undef' },
  ];

  it('returns only undefined symbols', () => {
    const result = filterUndefinedSymbols(symbols);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.name)).toEqual(['undefined1', 'weak_undef']);
  });
});
