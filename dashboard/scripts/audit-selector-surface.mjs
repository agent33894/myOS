import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const dashboardRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const rendererRoot = resolve(dashboardRoot, 'src');
const selectorRoot = resolve(rendererRoot, 'store/selectors');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return ['.ts', '.tsx'].includes(extname(filePath)) ? [filePath] : [];
  });
}

function sourceFile(filePath) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
}

function isExported(statement) {
  if (!ts.canHaveModifiers(statement)) return false;
  return ts.getModifiers(statement)?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  ) ?? false;
}

function declarationNames(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : []
    );
  }
  if ('name' in statement && statement.name && ts.isIdentifier(statement.name)) {
    return [statement.name.text];
  }
  return [];
}

const exposedNames = new Set();
for (const filePath of sourceFiles(selectorRoot)) {
  const parsed = sourceFile(filePath);
  for (const statement of parsed.statements) {
    if (isExported(statement)) {
      for (const name of declarationNames(statement)) exposedNames.add(name);
    }
    if (
      filePath.endsWith('/index.ts') &&
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        exposedNames.add((element.propertyName ?? element.name).text);
      }
    }
  }
}

const importedNames = new Set();
const unsupportedImports = [];
for (const filePath of sourceFiles(rendererRoot)) {
  if (filePath.startsWith(`${selectorRoot}/`)) continue;
  const parsed = sourceFile(filePath);
  for (const statement of parsed.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.endsWith('store/selectors')
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) {
      unsupportedImports.push(filePath);
      continue;
    }
    for (const element of bindings.elements) {
      importedNames.add((element.propertyName ?? element.name).text);
    }
  }
}

const unusedNames = [...exposedNames]
  .filter((name) => !importedNames.has(name))
  .sort();
const missingNames = [...importedNames]
  .filter((name) => !exposedNames.has(name))
  .sort();

if (unusedNames.length > 0) {
  console.error('Selector exports without a consumer:');
  console.error(unusedNames.map((name) => `  - ${name}`).join('\n'));
}
if (missingNames.length > 0) {
  console.error('Selector imports missing from the selector surface:');
  console.error(missingNames.map((name) => `  - ${name}`).join('\n'));
}
if (unsupportedImports.length > 0) {
  console.error('Selector consumers must use named imports:');
  console.error(unsupportedImports.map((filePath) => `  - ${filePath}`).join('\n'));
}

if (unusedNames.length > 0 || missingNames.length > 0 || unsupportedImports.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`Selector surface is aligned: ${exposedNames.size} named exports.`);
}
