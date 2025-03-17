#!/usr/bin/env zx
import Configstore from "configstore";
import clear from "clear";
import Mustache from "mustache";
import { parse, stringify } from "yaml";
import { readFile, writeFile } from "node:fs/promises";
import { getOutputValues } from "./lib/terraform.mjs";
import { exitWithError } from "./lib/utils.mjs";

$.verbose = false;

clear();
console.log("Create kustomization configuration...");

const projectName = "kgpu";

const config = new Configstore(projectName, { projectName });

const tenancyId = config.get("tenancyId");
const compartmentId = config.get("compartmentId");
const namespace = config.get("namespace");
const profile = config.get("profile");
const regionName = config.get("regionName");
const regionKey = config.get("regionKey");
const certFullchain = config.get("certFullchain");
const certPrivateKey = config.get("certPrivateKey");

const { user_id, user_api_key_fingerprint } = await getOutputValues("./tf");

await addProfileToKubeconfig(profile);

await createRegistrySecret();
await createOciCredentialsConfigMap();
await copyCerts();

async function copyCerts() {
  const ingressCertsPath = "k8s/ingress/.certs";
  await $`mkdir -p ${ingressCertsPath}`;
  await $`cp ${certFullchain} ${ingressCertsPath}/`;
  console.log(`File ${chalk.green(certFullchain)} copied`);
  await $`cp ${certPrivateKey} ${ingressCertsPath}/`;
  console.log(`File ${chalk.green(certPrivateKey)} copied`);
}

async function createRegistrySecret() {
  const user = config.get("ocir_user");
  const email = config.get("ocir_user_email");
  const token = config.get("ocir_user_token");
  try {
    const { exitCode, stdout } =
      await $`KUBECONFIG="tf/generated/kubeconfig" kubectl \
        create secret docker-registry ocir-secret \
          --save-config \
          --dry-run=client \
          --docker-server=${regionKey}.ocir.io \
          --docker-username=${namespace}/${user} \
          --docker-password=${token} \
          --docker-email=${email} \
          -o yaml --save-config | \
          KUBECONFIG="tf/generated/kubeconfig" kubectl apply -f -`;
    if (exitCode !== 0) {
      exitWithError("docker-registry ocir-secret secret not created");
    } else {
      console.log(chalk.green(stdout));
    }
  } catch (error) {
    exitWithError(error.stderr);
  }
}

async function createOciCredentialsConfigMap() {
  try {
    const { exitCode, stdout } =
      await $`KUBECONFIG="tf/generated/kubeconfig" kubectl \
        create configmap oci-cred \
          --from-literal=tenancy=${tenancyId} \
          --from-literal=user=${user_id} \
          --from-literal=fingerprint=${user_api_key_fingerprint} \
          --from-literal=region=${regionName} \
          -o yaml --dry-run=client --save-config | \
          KUBECONFIG="tf/generated/kubeconfig" kubectl apply -f -`;
    if (exitCode !== 0) {
      exitWithError("oci-cred configmap not created");
    } else {
      console.log(chalk.green(stdout));
    }
  } catch (error) {
    exitWithError(error.stderr);
  }
}

async function addProfileToKubeconfig(profile = "DEFAULT") {
  if (profile === "DEFAULT") return;

  const kubeconfigPath = "./tf/generated/kubeconfig";

  let yamlContent = await readFile(kubeconfigPath, {
    encoding: "utf-8",
  });

  const profileFlag = "--profile";
  const profileValue = profile;

  const kubeconfig = parse(yamlContent);
  const execArgs = kubeconfig.users[0].user.exec.args;
  kubeconfig.users[0].user.exec.args = [...execArgs, profileFlag, profileValue];
  const newKubeconfigContent = stringify(kubeconfig);

  await writeFile(kubeconfigPath, newKubeconfigContent, {
    encoding: "utf-8",
  });
}
