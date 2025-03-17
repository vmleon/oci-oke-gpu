#!/usr/bin/env zx

import Configstore from "configstore";
import clear from "clear";
import {
  buildJarGradle,
  cleanGradle,
  getVersionGradle,
} from "./lib/gradle.mjs";
import { getNpmVersion } from "./lib/npm.mjs";
import {
  buildImage,
  tagImage,
  pushImage,
  checkPodmanMachineRunning,
  containerLogin,
} from "./lib/container.mjs";
import { getOutputValues } from "./lib/terraform.mjs";

$.verbose = false;

clear();
console.log("Release latest services and web...");

const projectName = "kgpu";

const config = new Configstore(projectName, { projectName });

const namespace = config.get("namespace");
const regionKey = config.get("regionKey");

const pwdOutput = (await $`pwd`).stdout.trim();
await cd(`${pwdOutput}/src/web`);
const webVersion = await getNpmVersion();
config.set("webVersion", webVersion);
await cd(`${pwdOutput}/src/hotels`);
const hotelsServiceVersion = await getVersionGradle();
config.set("hotelsServiceVersion", hotelsServiceVersion);
await cd(pwdOutput);

await checkPodmanMachineRunning();

const ocirUrl = `${regionKey}.ocir.io`;

// FIXME use OCI Vault for the token
const { user, user_token, user_email } = await getOutputValues("./tf");
config.set("user", user);
config.set("userEmail", user_email);
config.set("userToken", user_token);

await containerLogin(namespace, user, user_token, ocirUrl);
// await releaseWeb();
await releaseBackend();

async function releaseWeb() {
  const service = "web";
  await cd(`src/${service}`);
  const imageName = `${projectName}/${service}`;
  await buildImage(`localhost/${imageName}`, webVersion);
  const localImage = `localhost/${imageName}:${webVersion}`;
  const remoteImage = `${ocirUrl}/${namespace}/${imageName}:${webVersion}`;
  await tagImage(localImage, remoteImage);
  await pushImage(remoteImage);
  console.log(`${chalk.green(remoteImage)} pushed`);
  await cd("../..");
}

async function releaseBackend() {
  const service = "hotels";
  await cd(`src/${service}`);
  await cleanGradle();
  await buildJarGradle();
  const currentVersion = await getVersionGradle();
  const imageName = `${projectName}/${service}`;
  await buildImage(`localhost/${imageName}`, currentVersion);
  const localImage = `localhost/${imageName}:${currentVersion}`;
  const remoteImage = `${ocirUrl}/${namespace}/${imageName}:${currentVersion}`;
  await tagImage(localImage, remoteImage);
  await pushImage(remoteImage);
  console.log(`${chalk.green(remoteImage)} pushed`);
  await cd("../..");
}
