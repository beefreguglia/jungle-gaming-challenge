// Lighthouse CI config. Profile is chosen via LH_PROFILE=mobile|desktop (not LHCI_*: lhci
// reads every LHCI_* variable as one of its own CLI options and LHCI_PRESET broke `assert`).
// Target: the optimized build served locally (`pnpm build`), or the published app when
// LH_URL is set (`pnpm lighthouse:production`). Both run the default mock scenario.
const { chromium } = require('@playwright/test')

const preset = process.env.LH_PROFILE === 'desktop' ? 'desktop' : 'mobile'
const published = process.env.LH_URL?.replace(/\/$/, '')
const base = published ?? 'http://localhost:4174'
const target = published ? 'production' : 'local'

module.exports = {
  ci: {
    collect: {
      // The published app is already served (HTTP/2, compression, CDN); locally, vite preview
      ...(published
        ? {}
        : {
            startServerCommand: 'pnpm preview --port 4174 --strictPort',
            startServerReadyPattern: 'Local',
          }),
      // Home and NFT detail; keep the detail id in sync with the mock fixtures
      url: [`${base}/`, `${base}/nfts/sage-nomad-009`],
      numberOfRuns: 3,
      chromePath: chromium.executablePath(),
      settings: {
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      // Assertions run on the median of the 3 runs
      aggregationMethod: 'median-run',
      assertions: {
        // Mobile (4x CPU, slow 4G) is bound by the in-browser mock backend: MSW (~470 KB)
        // is parsed before the first render and does not exist with a real API, so it only
        // warns below 0.9. Desktop fails below 0.8: on a busy machine the median of the same
        // build dropped to 0.82, and a gate that flips on noise catches nothing. See ARCHITECTURE.md
        'categories:performance':
          preset === 'mobile' ? ['warn', { minScore: 0.9 }] : ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `reports/lighthouse/${target}/${preset}`,
      reportFilenamePattern: 'lh-%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
}
