import { spawn } from "node:child_process";

const commands = [
  "npm --prefix apps/api run dev",
  "npm --prefix apps/admin run dev",
  "npm --prefix apps/web run dev",
];

const spawnCommand = (command) => {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", command], { stdio: "inherit" });
  }

  return spawn("sh", ["-c", command], { stdio: "inherit" });
};

const children = commands.map((command) => spawnCommand(command));

let shuttingDown = false;

const terminateAll = () => {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      child.kill("SIGTERM");
    }
  }
};

const shutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  terminateAll();

  setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGKILL");
      }
    }
  }, 4000).unref();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

let remaining = children.length;
let exitCode = 0;

for (const child of children) {
  child.on("exit", (code, signal) => {
    remaining -= 1;

    if (!shuttingDown && (code ?? 0) !== 0) {
      exitCode = code ?? 1;
      shutdown();
    }

    if (!shuttingDown && signal) {
      exitCode = 1;
      shutdown();
    }

    if (remaining === 0) {
      process.exit(exitCode);
    }
  });

  child.on("error", () => {
    exitCode = 1;
    shutdown();
  });
}
