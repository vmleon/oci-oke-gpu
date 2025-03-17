
locals {
  group_name  = "${local.project_name}${local.deploy_id}group"
}

resource "oci_identity_user" "user" {
  provider       = oci.home
  compartment_id = var.tenancy_ocid
  description    = "User for ${local.project_name}-${local.deploy_id}"
  name           = "${local.project_name}-${local.deploy_id}-user"

  email = "${local.project_name}-${local.deploy_id}-user@example.com"
}

resource "oci_identity_group" "group" {
  provider       = oci.home
  compartment_id = var.tenancy_ocid
  description    = "Group for ${local.project_name}${local.deploy_id} app"
  name           = local.group_name
}

resource "oci_identity_user_group_membership" "user_group_membership" {
  provider = oci.home
  group_id = oci_identity_group.group.id
  user_id  = oci_identity_user.user.id
}

resource "oci_identity_auth_token" "user_auth_token" {
  provider    = oci.home
  description = "User Auth Token to publish images to OCIR"
  user_id     = oci_identity_user.user.id
}

resource "oci_identity_policy" "user_policy" {
  provider       = oci.home
  compartment_id = var.tenancy_ocid
  name           = "${local.project_name}${random_string.deploy_id.result}policy"
  description    = "Allow group to manage ocir at compartment level for ${local.project_name} ${random_string.deploy_id.result}"
  statements = [
    "Allow group ${local.group_name} to manage repos in tenancy",
  ]
}
