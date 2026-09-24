#!/usr/bin/env node

/**
 * Chronicle Mac v3 — Design Token Audit
 *
 * Scans the myOS dashboard codebase for design-system violations aligned
 * with the DS2-backed native-instrument design language. Plain Node.js, zero dependencies.
 *
 * Rules (default mode):
 *   1. fractional-spacing   — only 2.5 / 3.5 are violations (0.5 / 1.5 are editorial micro-spacing)
 *   2. hardcoded-color      — raw Tailwind color utilities instead of semantic variables
 *   3. legacy-utility       — dark variants, neutral palettes, and legacy shadows
 *
 * Rules (--strict adds):
 *   3. arbitrary-text-size  — text-[Npx] / text-[N.Nrem] — aspirational, use design scale tokens
 *   4. raw-input            — <input in .tsx — should use <Input> component
 *   5. missing-active-state — onClick + cursor-pointer without active: class
 *   6. raw-bg-white         — bg-white / text-black without semantic alternative
 *   7. gradient-color       — from/to/via hardcoded colors without dark: pair
 *
 * Usage:
 *   node scripts/audit-design-tokens.js [options]
 *
 * Options:
 *   --fix       Show suggested fixes per violation
 *   --json      Output as JSON (machine-readable)
 *   --quiet     Summary only (skip per-file listing)
 *   --strict    Include strict-only / aspirational rules
 *   --autofix   Apply mechanical fixes in-place (text tokens, bg-white, text-black)
 *   --dry-run   With --autofix, show what would change without writing
 *   --files F   Scan only the specified files (space-separated paths)
 *
 * Exit codes:
 *   0  — clean (no violations)
 *   1  — violations found
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────────────────

const SRC_DIR = path.join(__dirname, '..', 'src');

/** Paths to skip entirely (regex tested against the full resolved path). */
const SKIP_PATTERNS = [
  /node_modules/,
  /\/dist\//,
  /\.d\.ts$/,
  /status-colors\.ts$/,
  /tailwind\.config/,
  /\.css$/,
  /\/scripts\//,
];

/**
 * Files explicitly allowed to use py-2.5 for menu-item touch targets.
 * Matches are tested against the path relative to the project root.
 */
const PY_25_ALLOWLIST = [
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/context-menu.tsx',
  'src/components/ui/select.tsx',
];

/**
 * Raw <input> allowlist.
 *
 * Input types that cannot use the <Input> component because they are
 * fundamentally different controls (browser-native widgets):
 */
const RAW_INPUT_ALLOWED_TYPES = [
  'checkbox',   // Toggle controls — no <Input> equivalent
  'radio',      // Radio buttons — no <Input> equivalent
  'range',      // Sliders — browser-native range widget
  'color',      // Color picker — browser-native color widget
  'file',       // File selector — browser-native file dialog
  'hidden',     // Hidden fields — no visual representation
  'time',       // Time picker — browser-native time widget
  'date',       // Date picker — browser-native date widget
];

/**
 * Files whose raw <input> elements are intentionally unstyled or use
 * bespoke styling that is incompatible with the standard <Input> component.
 *
 * Each entry includes a comment explaining the exemption reason.
 * Organized by category for maintainability.
 */
const RAW_INPUT_ALLOWED_FILES = [
  // ── Transparent / inline editor inputs ────────────────────────────────
  // These inputs intentionally have no border/background to blend into
  // surrounding content (title editors, inline rename fields).
  'src/components/editor/InlineRoadmapBlockEditor.tsx',  // Inline cell edit — borderless, blends with table
  'src/features/shell/sidebar/SidebarProjectRow.tsx',    // Sidebar rename — .chronicle-sidebar-rename, blends into nav row
  'src/features/projects/ProjectOverview.tsx',           // Project overview title — .chronicle-project-title-input, serif display on the workbench page

  // ── Command palette / overlay search inputs ───────────────────────────
  // Search inputs inside command palettes and overlays that have their
  // own custom chrome and require transparent/borderless styling.
  'src/components/layout/CommandPalette.tsx',             // Command palette search — transparent, text-lg
  'src/components/editor/InsertCommandMenu.tsx',          // Block insert menu search — custom focus ring

  // ── Search inputs with icon positioning ───────────────────────────────
  // Search fields that position a search icon absolutely inside the input.
  // The <Input> component's fixed padding would conflict with icon layout.
  'src/components/settings/ColorPickerModal.tsx',         // Pantone search with left icon
  'src/components/research/BriefLibrary.tsx',             // Brief library search
  'src/features/library/LibrarySearchHero.tsx',           // Library Index search hero — Literata underline field, .chronicle-library-search
  'src/components/projects/LinkArtifactsToProjectModal.tsx', // Artifact link search
  'src/components/tasks/ArtifactLinkSection.tsx',         // Task artifact search
  'src/pages/SnippetLibrary.tsx',                         // Snippet library search

  // ── Compact inline text inputs ────────────────────────────────────────
  // Tight sidebar and inline inputs where the standard <Input> height/padding
  // would break the layout (metadata sidebars, tag editors, quick-add bars).
  'src/features/projects/ProjectQuickAdd.tsx',                     // Project quick-add ghost row — boxless, rule-underlined
  'src/features/projects/ProjectCreateRow.tsx',                    // New-project ghost row — boxless, stamp inset on focus
  'src/features/projects/ProjectInspectorTags.tsx',                // Inspector tag input — dashed chip-sized field, grows on focus
  'src/components/filters/TagCloud.tsx',                           // Tag filter search
  'src/components/tasks/InlineEditTags.tsx',                       // Inline tag editor
  'src/components/tasks/TaskChildren.tsx',                         // Inline subtask name
  'src/components/tasks/QuickAddBar.tsx',                          // Quick-add task bar
  'src/components/layout/QuickCapture.tsx',                        // Quick capture title

  // ── Research / specialized form inputs ────────────────────────────────
  // Inputs with custom styling for research workflow, model pickers,
  // or other domain-specific forms.
  'src/components/research/ContextualTopicInput.tsx',               // Topic input with suggestions
  'src/components/research/InlineModelPicker.tsx',                  // Model search filter
  'src/components/research/research-command/ModelSelectorDropdown.tsx', // Model dropdown search
  'src/components/research/research-command/TopicInputSection.tsx', // Research topic input
  'src/components/research/TopicEditor.tsx',                        // Topic editor field
  'src/components/research/research-command/ThinkingControls.tsx',  // Thinking tokens (type=number)
  'src/components/artifacts/RefineModal.tsx',                       // Refine modal fields

  // ── Settings / configuration inputs ───────────────────────────────────
  // Password and path inputs with custom styling (monospace, custom focus).
  'src/pages/Settings.tsx',                                        // API key (type=password, monospace)
  'src/components/settings/GeneralSettings.tsx',                   // Vault path text input

];

// ─── Tailwind color family names ────────────────────────────────────────────

const COLOR_FAMILIES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
].join('|');

// ─── Rule definitions ───────────────────────────────────────────────────────

const RULES = [

  // ── Rule 1: Fractional Spacing ──────────────────────────────────────────
  // Only 2.5 and 3.5 are violations.  0.5 and 1.5 are intentional
  // Editorial Dark micro-spacing (2 px / 6 px).
  {
    id: 'fractional-spacing',
    name: 'Prohibited fractional spacing',
    icon: '📏',
    severity: 'warning',
    strictOnly: false,
    suggestion: (match) => {
      const [, prefix, , frac] = match;
      const replacement = frac === '2.5' ? '3' : '4'; // 3.5 → 4
      return `${prefix}-${replacement}`;
    },
    test(line, ctx) {
      const re = /\b(p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|space-[xy])-((2\.5|3\.5))\b/g;
      const hits = [];
      let m;
      while ((m = re.exec(line)) !== null) {
        // Allow py-2.5 in the explicit allowlist files
        if (m[0].startsWith('py-2.5') && PY_25_ALLOWLIST.includes(ctx.relPath)) {
          continue;
        }
        hits.push({
          column: m.index + 1,
          value: m[0],
          suggestion: this.suggestion(m),
        });
      }
      return hits;
    },
  },

  // ── Rule 2: Hardcoded Colors ────────────────────────────────────────────
  // Catches bg-red-500, text-gray-600, border-green-300, etc.
  // Excludes gradient stops (from/to/via) — those are checked in strict mode.
  // Theme switching belongs in DS2 variables; dark: pairs are not an exception.
  {
    id: 'hardcoded-color',
    name: 'Hardcoded Tailwind color',
    icon: '🎨',
    severity: 'warning',
    strictOnly: false,
    test(line, _ctx) {
      // If the line references an editorial CSS variable, skip.
      if (/--ed-/.test(line)) return [];

      const re = new RegExp(
        `\\b(bg|text|border|ring|outline|divide)-(${COLOR_FAMILIES})-(\\d{2,3})\\b`,
        'g',
      );
      const hits = [];
      let m;
      while ((m = re.exec(line)) !== null) {
        hits.push({
          column: m.index + 1,
          value: m[0],
          suggestion: 'Use a DS2 semantic token (bg-background, text-foreground, ed-text-error, etc.)',
        });
      }
      return hits;
    },
  },

  // ── Rule 3: Removed v2 utilities ────────────────────────────────────────
  {
    id: 'legacy-utility',
    name: 'Removed Chronicle v2 utility',
    icon: '🧹',
    severity: 'warning',
    strictOnly: false,
    test(line, _ctx) {
      const re = /(?:\b(?:dark:[^\s"'`<>}]+|(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone)-\d{2,3}(?:\/\d+)?)\b|(?<!-)\bshadow-(?!chronicle-(?:lifted|overlay)\b|none\b)[^\s"'`<>}]+)/g;
      const hits = [];
      let m;
      while ((m = re.exec(line)) !== null) {
        hits.push({
          column: m.index + 1,
          value: m[0],
          suggestion: 'Use DS2 semantic colors and a Chronicle lifted or overlay shadow token',
        });
      }
      return hits;
    },
  },

  // ── Rule 4: Arbitrary Text Sizes (strict) ───────────────────────────────
  // Editorial Dark intentionally uses precise rem/px text sizes (text-[11px],
  // text-[0.625rem], etc.) for typographic control.  Flagged only in strict
  // mode as an aspirational migration target toward design-scale tokens.
  {
    id: 'arbitrary-text-size',
    name: 'Arbitrary text size',
    icon: '🔤',
    severity: 'info',
    strictOnly: true,
    test(line, _ctx) {
      const re = /\btext-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
      const hits = [];
      let m;
      while ((m = re.exec(line)) !== null) {
        hits.push({
          column: m.index + 1,
          value: m[0],
          suggestion: 'Use design scale (text-xs, text-sm, text-2xs, etc.)',
        });
      }
      return hits;
    },
  },

  // ── Rule 4: Raw <input> Elements (strict) ──────────────────────────────
  // Flags raw <input> elements that should use the <Input> component.
  // Skips:
  //   - Non-text input types (checkbox, radio, range, color, file, hidden,
  //     time, date) which have no <Input> equivalent.
  //   - Files in RAW_INPUT_ALLOWED_FILES that use intentionally bespoke
  //     styling (transparent title editors, command palette search,
  //     compact sidebar inputs, etc.).
  {
    id: 'raw-input',
    name: 'Raw <input> element',
    icon: '📝',
    severity: 'info',
    strictOnly: true,
    test(line, ctx) {
      // Only applies to .tsx files
      if (!ctx.filePath.endsWith('.tsx')) return [];
      // The component definition itself is fine
      if (ctx.relPath === 'src/components/ui/input.tsx') return [];
      // Files with intentionally raw inputs
      if (RAW_INPUT_ALLOWED_FILES.includes(ctx.relPath)) return [];

      const re = /<input\b/g;
      const hits = [];
      let m;
      while ((m = re.exec(line)) !== null) {
        // Look at the current line + next 3 lines to find type="..."
        const lookahead = [line];
        if (ctx.lines) {
          for (let j = 1; j <= 3; j++) {
            if (ctx.lineIndex + j < ctx.lines.length) {
              lookahead.push(ctx.lines[ctx.lineIndex + j]);
            }
          }
        }
        const snippet = lookahead.join(' ');
        const typeMatch = snippet.match(/type="([^"]*)"/);
        const inputType = typeMatch ? typeMatch[1] : null;

        // Skip non-text input types that have no <Input> equivalent
        if (inputType && RAW_INPUT_ALLOWED_TYPES.includes(inputType)) {
          continue;
        }

        hits.push({
          column: m.index + 1,
          value: '<input',
          suggestion: 'Use <Input> component from @/components/ui/input',
        });
      }
      return hits;
    },
  },

  // ── Rule 5: Missing Active State (strict) ──────────────────────────────
  // Clickable elements with onClick + cursor-pointer but no active: class.
  // Heuristic — will have false positives, so strict-only.
  {
    id: 'missing-active-state',
    name: 'Clickable element without active: state',
    icon: '👆',
    severity: 'info',
    strictOnly: true,
    test(line, ctx) {
      const hasClick = /\bonClick\b/.test(line) || /\bcursor-pointer\b/.test(line);
      if (!hasClick) return [];
      if (/\bactive:/.test(line)) return [];
      // Only flag if it looks like it has Tailwind classes (className=)
      if (!/className/.test(line)) return [];
      // Skip function/component signatures (onClick is a prop, not usage)
      if (/^\s*(export\s+)?(default\s+)?function\s/.test(line)) return [];
      if (/^\s*\}\s*\)\s*$/.test(line)) return [];
      // Skip <Button> components (they have built-in active states)
      if (/<Button\b/.test(line)) return [];
      // Skip lines where className references a variable (active state is in the variable)
      if (/className=\{[a-zA-Z]/.test(line) && !/className=\{`/.test(line) && !/className=\{cn\(/.test(line)) return [];
      // Check next few lines for active: class (handles cn() spread across lines)
      if (ctx.lines) {
        for (let j = 1; j <= 5; j++) {
          if (ctx.lineIndex + j < ctx.lines.length) {
            if (/\bactive:/.test(ctx.lines[ctx.lineIndex + j])) return [];
          }
        }
      }

      return [{
        column: 1,
        value: 'onClick/cursor-pointer without active: class',
        suggestion: 'Add active:scale-95 or active:opacity-75 for tactile feedback',
      }];
    },
  },

  // ── Rule 6: Raw bg-white / text-black (strict) ─────────────────────────
  {
    id: 'raw-bg-white',
    name: 'Raw bg-white or text-black',
    icon: '⬜',
    severity: 'info',
    strictOnly: true,
    test(line, _ctx) {
      const re = /\b(bg-white|text-black)\b/g;
      const hits = [];
      let m;
      while ((m = re.exec(line)) !== null) {
        const alt = m[1] === 'bg-white' ? 'bg-background or bg-card' : 'text-foreground';
        hits.push({
          column: m.index + 1,
          value: m[1],
          suggestion: `Use semantic token: ${alt}`,
        });
      }
      return hits;
    },
  },

  // ── Rule 7: Gradient Hardcoded Colors (strict) ─────────────────────────
  // from/to/via with raw color families, no dark: pair.
  {
    id: 'gradient-color',
    name: 'Hardcoded gradient color (missing dark: pair)',
    icon: '🌈',
    severity: 'info',
    strictOnly: true,
    test(line, _ctx) {
      if (/\bdark:/.test(line)) return [];
      if (/--ed-/.test(line)) return [];

      const re = new RegExp(
        `\\b(from|to|via)-(${COLOR_FAMILIES})-(\\d{2,3})\\b`,
        'g',
      );
      const hits = [];
      let m;
      while ((m = re.exec(line)) !== null) {
        hits.push({
          column: m.index + 1,
          value: m[0],
          suggestion: 'Add dark: variant or use semantic gradient tokens',
        });
      }
      return hits;
    },
  },
];

// ─── File discovery ─────────────────────────────────────────────────────────

function getSourceFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (SKIP_PATTERNS.some((re) => re.test(fullPath))) continue;

    if (entry.isDirectory()) {
      files.push(...getSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// ─── Audit engine ───────────────────────────────────────────────────────────

function auditFile(filePath, activeRules) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const projectRoot = path.join(__dirname, '..');
  const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ctx = { filePath, relPath, lineNumber: i + 1, lines, lineIndex: i };

    for (const rule of activeRules) {
      const hits = rule.test(line, ctx);
      for (const hit of hits) {
        issues.push({
          rule: rule.id,
          severity: rule.severity,
          line: i + 1,
          column: hit.column,
          value: hit.value,
          suggestion: hit.suggestion,
        });
      }
    }
  }

  return issues;
}

// ─── Output formatters ──────────────────────────────────────────────────────

function getIconForRule(ruleId) {
  const rule = RULES.find((r) => r.id === ruleId);
  return rule ? rule.icon : '❓';
}

function printConsole(results, { showFixes, quiet }) {
  const divider = '═'.repeat(64);

  console.log('');
  console.log(`  ✦  Chronicle Mac v3 — Design Token Audit`);
  console.log(`  ${divider}`);

  if (!quiet) {
    for (const file of results.files) {
      console.log('');
      console.log(`  📄 ${file.path}`);
      for (const issue of file.issues) {
        const icon = getIconForRule(issue.rule);
        const loc = `L${issue.line}:${issue.column}`;
        console.log(`     ${icon}  ${loc.padEnd(10)} ${issue.value}`);
        if (showFixes && issue.suggestion) {
          console.log(`         → ${issue.suggestion}`);
        }
      }
    }
  }

  // Summary
  console.log('');
  console.log(`  ${divider}`);
  console.log('');
  console.log('  📊 Summary');
  console.log(`     Files scanned:      ${results.summary.totalFiles}`);
  console.log(`     Files with issues:  ${results.summary.filesWithIssues}`);
  console.log('');

  // Per-rule breakdown
  const ruleIds = Object.keys(results.summary.byRule);
  if (ruleIds.length > 0) {
    for (const id of ruleIds) {
      const icon = getIconForRule(id);
      const rule = RULES.find((r) => r.id === id);
      const label = rule ? rule.name : id;
      console.log(`     ${icon}  ${label}: ${results.summary.byRule[id]}`);
    }
    console.log('');
  }

  const total = results.summary.totalIssues;
  if (total === 0) {
    console.log('  ✅ No violations — codebase is clean.');
  } else {
    console.log(`  ❌ ${total} violation${total !== 1 ? 's' : ''} found.`);
  }
  console.log('');
}

// ─── Autofix Mappings ────────────────────────────────────────────────────────

/**
 * Mechanical text-find/text-replace pairs for --autofix.
 * Only safe, unambiguous transformations are included.
 */
const AUTOFIX_REPLACEMENTS = [
  // Arbitrary text sizes → design tokens
  ['text-[0.5rem]', 'text-4xs'],
  ['text-[8px]', 'text-4xs'],
  ['text-[0.55rem]', 'text-3xs'],
  ['text-[0.5625rem]', 'text-3xs'],
  ['text-[0.58rem]', 'text-3xs'],
  ['text-[9px]', 'text-3xs'],
  ['text-[0.6rem]', 'text-3xs'],
  ['text-[0.62rem]', 'text-3xs'],
  ['text-[0.625rem]', 'text-3xs'],
  ['text-[10px]', 'text-3xs'],
  ['text-[0.68rem]', 'text-2xs'],
  ['text-[0.6875rem]', 'text-2xs'],
  ['text-[11px]', 'text-2xs'],
  ['text-[12px]', 'text-xs'],
  ['text-[0.72rem]', 'text-xs'],
  ['text-[0.76rem]', 'text-xs'],
  ['text-[13px]', 'text-xs'],
  ['text-[0.8rem]', 'text-xs'],
  ['text-[0.8125rem]', 'text-xs'],
  ['text-[0.94rem]', 'text-sm'],
  ['text-[0.98rem]', 'text-base'],
  ['text-[1.05rem]', 'text-base'],
  ['text-[1.1rem]', 'text-lg'],
  ['text-[1.28rem]', 'text-xl'],
  ['text-[1.35rem]', 'text-xl'],
  ['text-[1.5rem]', 'text-2xl'],
  // Semantic token replacements
  ['bg-white', 'bg-card'],
  ['text-black', 'text-foreground'],
];

function applyAutofix(filePath, dryRun) {
  const original = fs.readFileSync(filePath, 'utf-8');
  let content = original;
  let fixCount = 0;

  for (const [find, replace] of AUTOFIX_REPLACEMENTS) {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    const before = content;
    content = content.replace(re, replace);
    if (content !== before) {
      const matches = before.match(re);
      fixCount += matches ? matches.length : 0;
    }
  }

  if (fixCount > 0 && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return fixCount;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  const showFixes = args.includes('--fix');
  const jsonOutput = args.includes('--json');
  const quiet = args.includes('--quiet');
  const strict = args.includes('--strict');
  const autofix = args.includes('--autofix');
  const dryRun = args.includes('--dry-run');

  // --files: scan only specified files
  const filesIdx = args.indexOf('--files');
  let explicitFiles = null;
  if (filesIdx !== -1) {
    explicitFiles = [];
    for (let i = filesIdx + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      const resolved = path.resolve(args[i]);
      if (fs.existsSync(resolved) && /\.(tsx?|jsx?)$/.test(resolved)) {
        explicitFiles.push(resolved);
      }
    }
  }

  // Select active rules based on mode
  const activeRules = RULES.filter((r) => !r.strictOnly || strict);

  const files = explicitFiles || getSourceFiles(SRC_DIR);

  // Autofix pass (before audit)
  if (autofix) {
    let totalFixes = 0;
    let filesFixed = 0;
    for (const file of files) {
      const count = applyAutofix(file, dryRun);
      if (count > 0) {
        filesFixed++;
        totalFixes += count;
        const projectRoot = path.join(__dirname, '..');
        const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
        if (!quiet) {
          console.log(`  ${dryRun ? '(dry-run) ' : ''}Fixed ${count} in ${relPath}`);
        }
      }
    }
    console.log('');
    console.log(`  ${dryRun ? '[DRY RUN] Would fix' : 'Fixed'} ${totalFixes} replacements in ${filesFixed} files.`);
    if (dryRun) {
      console.log('  Re-run without --dry-run to apply changes.');
    }
    console.log('');
  }

  const results = {
    mode: strict ? 'strict' : 'default',
    files: [],
    summary: {
      totalFiles: files.length,
      filesWithIssues: 0,
      totalIssues: 0,
      byRule: {},
    },
  };

  for (const file of files) {
    const issues = auditFile(file, activeRules);

    if (issues.length > 0) {
      const projectRoot = path.join(__dirname, '..');
      const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');

      results.files.push({ path: relPath, issues });
      results.summary.filesWithIssues++;

      for (const issue of issues) {
        results.summary.totalIssues++;
        results.summary.byRule[issue.rule] = (results.summary.byRule[issue.rule] || 0) + 1;
      }
    }
  }

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printConsole(results, { showFixes, quiet });
  }

  // Exit code
  process.exit(results.summary.totalIssues > 0 ? 1 : 0);
}

main();
