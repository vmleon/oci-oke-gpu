#!/usr/bin/env zx
import Configstore from "configstore";
import clear from "clear";

$.verbose = false;

clear();
console.log("Clean up config files, certs, ssh keys...");

const projectName = "kgpu";

const config = new Configstore(projectName, { projectName });

const privateKeyPath = config.get("privateKeyPath");
await $`rm -f ${privateKeyPath}`;
const publicKeyPath = config.get("publicKeyPath");
await $`rm -f ${publicKeyPath}`;

const filesToDelete = [
  "./tf/generated",
  "./tf/terraform.tfvars",
  "./k8s/ingress/.certs",
  "./.certs",
];

filesToDelete.forEach(async (filePath) => {
  await $`rm -rf ${filePath}`;
  console.log(`File ${chalk.green(filePath)} deleted`);
});

config.clear();
