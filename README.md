# OCI Kubernetes Cluster with GPU

## Deploy Infrastructure

Clone the repository

```bash
git clone https://github.com/vmleon/oci-oke-gpu.git
```

Change directory to the cloned project

```bash
cd oci-oke-gpu
```

Install scripts dependencies

```bash
cd scripts/ && npm install && cd ..
```

Set environment (answer questions)

```bash
zx scripts/setenv.mjs
```

Create the `tfvars` file and follow the yellow steps to apply terraform deployment

```bash
zx scripts/tfvars.mjs
```

> Alternative: One liner for the yellow commands (for easy copy paste)
>
> ```bash
> cd tf && terraform init && terraform apply -auto-approve
> ```

Come back to root folder

```bash
cd ..
```

Create kustomize configuration

```bash
zx scripts/kustom.mjs
```

## Deploy Application

Export kubeconfig to get access to the Kubernetes Cluster

```bash
export KUBECONFIG="$(pwd)/tf/generated/kubeconfig"
```

Check everything works

```bash
kubectl cluster-info
```

```bash
kubectl apply -k k8s/overlays/prod
```

## Other notes

Untaint GPU nodes:

```bash
kubectl taint nodes -l node.kubernetes.io/instance-type=VM.GPU.A10.1 nvidia.com/gpu:NoSchedule-
```

Running NGINX:

```bash
kubectl run nginx --image=nginx
```

```bash
kubectl exec -it nginx -- bash
```

Then:

```bash
apt-get update && exit
```

Delete NGINX:

```bash
kubectl delete po nginx
```

Check LoadBalancer

```bash
echo $(kubectl get service \
  -o jsonpath='{.items[?(@.spec.type=="LoadBalancer")].status.loadBalancer.ingress[0].ip}')
```

## Clean up

Delete application

```bash
kubectl delete -k k8s/overlays/prod
```

Destroy infrastructure with Terraform.

```bash
cd tf
```

```bash
terraform destroy -auto-approve
```

```bash
cd ..
```

Clean up the artifacts and config files

```bash
zx scripts/clean.mjs
```
