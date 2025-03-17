output "deployment" {
  value = "${local.project_name}${local.deploy_id}"
}

output "kubeconfig" {
  value     = data.oci_containerengine_cluster_kube_config.kube_config.content
  sensitive = true
}

output "oke_cluster_ocid" {
  value = module.oke.cluster_id
}

output "user" {
  value = oci_identity_user.user.name
}

output "user_id" {
  value = oci_identity_user.user.id
}

output "user_token" {
  sensitive = true
  value     = oci_identity_auth_token.user_auth_token.token
}

output "user_email" {
  sensitive = false
  value     = oci_identity_user.user.email
}