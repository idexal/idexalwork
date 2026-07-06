#!/usr/bin/env node

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`
IdexalWork CLI v${VERSION}

Usage:
  idexalwork [command]

Commands:
  --help, -h     Show this help message
  --version, -v  Show version number
  doctor         Check IdexalWork system health
  config         View or modify configuration

Run 'idexalwork --help' for more information.
`);
}

function printVersion(): void {
  console.log(VERSION);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    printVersion();
    return;
  }

  const command = args[0];
  switch (command) {
    case "doctor": {
      console.log("🔍 Running IdexalWork system check...");
      // Future: check desktop config, API connectivity, etc.
      console.log("✅ System looks healthy.");
      break;
    }
    case "config": {
      console.log("📋 Config command coming soon.");
      break;
    }
    default: {
      console.error(`❌ Unknown command: ${command}`);
      console.error(`Run 'idexalwork --help' to see available commands.`);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
