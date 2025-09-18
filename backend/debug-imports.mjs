(async () => {
  const modules = [
    'express',
    'cors',
    '@clerk/express',
    '@sentry/node',
    'path-to-regexp',
    'inngest',
    'inngest/express',
    'mongoose',
    './src/config/inngest.js'
  ];

  for (const mod of modules) {
    try {
      console.log('-> importing', mod);
      const imported = await import(mod);
      console.log('   OK', mod);
    } catch (e) {
      console.error('   FAILED importing', mod);
      console.error(e && e.stack ? e.stack : e);
      // stop after first failure to inspect stack
      process.exit(1);
    }
  }

  console.log('All imports succeeded');
})();
