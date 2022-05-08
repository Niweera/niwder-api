provider "google" {
  credentials = file("credentials.json")
  project     = var.project
  region      = "us-central1"
}

resource "google_compute_address" "static" {
  name = "niwder-vm-ip"
}

resource "google_compute_instance" "default" {
  name         = "niwder-vm"
  //server hostname (must be unique) "e2-standard-2"
  machine_type = var.vm_machine_type
  //2 vCPUs 8GB RAM
  zone         = var.vm_zone

  boot_disk {
    initialize_params {
      image = var.vm_image
      //image_project/image_family
      size  = var.vm_hdd_size
      type  = var.vm_hdd_type
    }
  }

  network_interface {
    network = "default"

    access_config {
      nat_ip = google_compute_address.static.address
    }
  }

  metadata = {
    ssh-keys = "gcp:${file("gcp.pub")}"
  }

  // Apply the firewall rule to allow external IPs to access this instance
  tags = [
    "http-server"
  ]

  provisioner "remote-exec" {
    inline = [
      "sudo apt update -y",
      "sudo apt upgrade -y"
    ]

    connection {
      type        = "ssh"
      port        = 22
      user        = "gcp"
      host        = self.network_interface[0].access_config[0].nat_ip
      private_key = file("${path.module}/ansible/gcp.key")
      timeout     = "10m"
    }
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/ansible"
    environment = {
      ANSIBLE_HOST_KEY_CHECKING = "false"
    }
    command = "ansible-playbook -i '${self.network_interface[0].access_config[0].nat_ip},' -u gcp playbook.yml"
  }
}

resource "google_compute_firewall" "niwder-firewall" {
  name    = "default-allow-http-niwder-firewall"
  network = "default"

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = [
      "22",
      "443",
      "80"
    ]
  }

  // Allow traffic from everywhere to instances with an http-server tag
  source_ranges = [
    "0.0.0.0/0"
  ]
  target_tags = [
    "http-server"
  ]
}

