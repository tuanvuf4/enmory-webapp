const fs = require('fs')
const path = require('path')

const ROOT = path.resolve('C:/Users/R40373/projects/enmory-webapp/src')

// Thứ tự quan trọng: specific trước, generic sau
const VAR_MAP = [
  ['var(--ant-color-text-secondary)', '$color-text-secondary'],
  ['var(--ant-color-text-heading)',   '$color-text-heading'],
  ['var(--ant-color-text-base)',      '$color-text-base'],
  ['var(--ant-color-text)',           '$color-text'],
  ['var(--ant-color-primary)',        '$color-primary'],
  ['var(--ant-color-white)',          '$color-white'],
  ['var(--ant-color-bg-base)',        '$color-bg-base'],
  ['var(--ant-color-bg-layout)',      '$color-bg-layout'],
  ['var(--ant-font-size-heading-2)',  '$font-size-heading-2'],
  ['var(--ant-font-size-heading-3)',  '$font-size-heading-3'],
  ['var(--ant-font-size-heading-4)',  '$font-size-heading-4'],
  ['var(--ant-font-size-heading-5)',  '$font-size-heading-5'],
  ['var(--ant-font-size)',            '$font-size'],
  ['var(--ant-line-height)',          '$line-height'],
  ['var(--ant-control-height)',       '$control-height'],
  ['var(--ant-border-radius)',        '$border-radius'],
  ['var(--ant-red-3)',                '$color-red-3'],
  ['var(--ant-padding)',              '$padding'],
  ['var(--ant-margin)',               '$margin'],
]

function getImportPath(filePath) {
  // filePath is absolute. Get relative path from its dir to src/style/variable
  const rel = path.relative(path.dirname(filePath), path.join(ROOT, 'style', 'variable'))
  // normalize slashes
  return rel.replace(/\\/g, '/')
}

function convertCalcSize(content) {
  // calc(var(--ant-size) * N + env(...))  → keep calc, replace var part
  // calc(var(--ant-size) * N) → $size * N  (pure calc, remove wrapper)
  // calc(var(--ant-size))     → $size

  // 1. Mixed calc with env() - keep calc, replace var
  content = content.replace(
    /calc\(var\(--ant-size\)\s*\*\s*(\d+\.?\d*)\s*\+\s*(env\([^)]+\))\)/g,
    (_, n, env) => `calc(#{$size * ${n}} + ${env})`
  )

  // 2. calc(var(--ant-size) / N * M) → $size * M/N
  content = content.replace(
    /calc\(var\(--ant-size\)\s*\/\s*(\d+\.?\d*)\s*\*\s*(\d+\.?\d*)\)/g,
    (_, d, m) => `$size * ${m / d}`
  )

  // 3. calc(var(--ant-size) / N) → $size * (1/N)  = static value
  content = content.replace(
    /calc\(var\(--ant-size\)\s*\/\s*(\d+\.?\d*)\)/g,
    (_, d) => `$size * ${(1 / parseFloat(d)).toFixed(4).replace(/\.?0+$/, '')}`
  )

  // 4. calc(var(--ant-size) * N) → $size * N
  content = content.replace(
    /calc\(var\(--ant-size\)\s*\*\s*(\d+\.?\d*(?:px)?)\)/g,
    (_, n) => `$size * ${n}`
  )

  // 5. calc(var(--ant-size)) alone
  content = content.replace(/calc\(var\(--ant-size\)\)/g, '$size')

  // 6. remaining bare var(--ant-size)
  content = content.replace(/var\(--ant-size\)/g, '$size')

  return content
}

function convertCalcPadding(content) {
  content = content.replace(/calc\(var\(--ant-padding\)\s*\*\s*(\d+\.?\d*)\)/g, (_, n) => `$padding * ${n}`)
  content = content.replace(/calc\(var\(--ant-padding\)\s*\/\s*(\d+\.?\d*)\)/g, (_, d) => `$padding * ${1/d}`)
  content = content.replace(/calc\(var\(--ant-padding\)\)/g, '$padding')
  return content
}

function convertCalcMargin(content) {
  content = content.replace(/calc\(var\(--ant-margin\)\s*\*\s*(\d+\.?\d*)\)/g, (_, n) => `$margin * ${n}`)
  content = content.replace(/calc\(var\(--ant-margin\)\)/g, '$margin')
  return content
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  // Step 1: convert calc expressions first (before simple var replacements)
  content = convertCalcSize(content)
  content = convertCalcPadding(content)
  content = convertCalcMargin(content)

  // Step 2: replace remaining var(--ant-*) with SCSS vars
  for (const [cssVar, scssVar] of VAR_MAP) {
    content = content.split(cssVar).join(scssVar)
  }

  // Step 3: check if any ant var remains
  const hasAntVar = /var\(--ant-/.test(content)

  // Step 4: add @use import if file was changed and doesn't already have it
  const useStatement = `@use '${getImportPath(filePath)}' as *;`
  const hasAnyAntVar = /\$color-|\$font-size|\$size|\$padding|\$margin|\$line-height|\$control-height|\$border-radius/.test(content)
  const alreadyImported = content.includes("@use '") && content.includes("variable")

  if (hasAnyAntVar && !alreadyImported) {
    content = useStatement + '\n' + content
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ ${path.relative(ROOT, filePath)}${hasAntVar ? '  ⚠️  còn var(--ant-)' : ''}`)
  } else {
    console.log(`⬜ ${path.relative(ROOT, filePath)} (no change)`)
  }
}

// Find all scss files with var(--ant-*)
const { execSync } = require('child_process')
const output = execSync(
  'grep -rl "var(--ant-" ' + ROOT + ' --include="*.scss"',
  { encoding: 'utf8' }
).trim()

const files = output.split('\n').filter(f => !f.includes('_variable.scss') && f.trim())

console.log(`\nProcessing ${files.length} files...\n`)
for (const f of files) {
  processFile(f.trim())
}
console.log('\nDone.')
