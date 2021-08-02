package main

deny_share_host_networking [msg] {
    some i, j

    name := input[i][j].metadata.name
    kind := input[i][j].kind
    input_share_hostnetwork(input[i][j])

    msg := sprintf("%v : %v/%v --- hostNetwork is not allowed", [i, kind, name])
}

input_share_hostnetwork(o) {
    o.kind == "Deployment"
    o.spec.template.spec.hostNetwork
}

input_share_hostnetwork(o) {
    o.kind == "Pod"
    o.spec.hostNetwork
}