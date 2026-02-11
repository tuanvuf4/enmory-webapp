import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const fixCalcPx = () => {
  return {
    postcssPlugin: 'fix-calc-px',
    Declaration(decl) {
      if (typeof decl.value !== 'string') {
        return
      }

      decl.value = decl.value.replace(
        /calc\(var\(--ant-(size|padding|margin)\) \* ([0-9.]+)px\)/g,
        'calc(var(--ant-$1) * $2)',
      )
    },
  }
}

fixCalcPx.postcss = true

export default {
  plugins: [tailwindcss, autoprefixer, fixCalcPx()],
}
