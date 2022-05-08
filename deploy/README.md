# Terraform Commands

## `terraform init`
  This command sets up the environment.

## `terraform plan`
  This command reports configuration will be applied.

## `terraform apply -auto-approve`
  This command applies configuration defined on terraform files approving automatically changes.

## `terraform destroy -auto-approve`
  Against of command above, this remove everything created.

## `ansible-playbook playbook.yml --syntax-check`
  Check syntax

## `ansible-playbook -i '192.168.1.1,' -u gcp playbook.yml`
  Run the playbook