import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ROM Hack Manager",
  description: "A modern desktop application for managing Super Mario World ROM hacks.",
  base: '/rh-mgr/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Roadmap', link: '/roadmap' },
      { text: 'Reference', link: '/api-examples' }
    ],

    sidebar: [
      {
        text: 'User Guide',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Library Management', link: '/guide/library' },
          { text: 'Discovery & Patching', link: '/guide/discovery' },
          { text: 'Auto-Tracking', link: '/guide/tracking' },
          { text: 'Troubleshooting', link: '/guide/troubleshooting' }
        ]
      },
      {
        text: 'Project Info',
        items: [
          { text: 'Roadmap', link: '/roadmap' }
        ]
      },
      {
        text: 'Developer Guide',
        items: [
          { text: 'Architecture', link: '/developer/architecture' },
          { text: 'Setup', link: '/developer/setup' },
          { text: 'Building', link: '/developer/building' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/SiliconFish42/rh-mgr' }
    ]
  }
})
