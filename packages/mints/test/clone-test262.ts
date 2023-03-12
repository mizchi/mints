import fs from "fs";
import { spawn } from "child_process";

const TEST262_DIR = "./test262/test262-checkout";
const TEST262_REPO_URL = "https://github.com/tc39/test262.git";
const TEST262_REVISION = "157b18d16b5d52501c4d75ac422d3a80bfad1c17";

function run(command: string): Promise<void> {
	console.log(`> ${command}`);
	return new Promise((resolve, reject) => {
		const childProcess = spawn("/bin/bash", ["-c", command], {
			stdio: "inherit",
		});
		childProcess.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Command failed: ${command}`));
			}
		});
	});
}

/**
 * Run the test262 suite on some tests that we know are useful.
 */
async function main(): Promise<void> {
	if (!fs.existsSync(TEST262_DIR)) {
		console.log(`Directory ${TEST262_DIR} not found, cloning a new one.`);
		await run(`git clone ${TEST262_REPO_URL} ${TEST262_DIR} --depth 1`);
	}

	// Force a specific revision so we don't get a breakage from changes to the main branch.
	const originalCwd = process.cwd();
	try {
		process.chdir(TEST262_DIR);
		await run(`git reset --hard ${TEST262_REVISION}`);
		await run(`git clean -f`);
	} catch (e) {
		await run("git fetch");
		await run(`git reset --hard ${TEST262_REVISION}`);
		await run(`git clean -f`);
	} finally {
		process.chdir(originalCwd);
	}
}

main().catch((e) => {
	console.error("Unhandled error:");
	console.error(e);
	process.exitCode = 1;
});
