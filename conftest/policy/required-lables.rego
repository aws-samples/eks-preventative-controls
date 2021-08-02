package main

import data.requiredlabels

deny_missing_required_lables [msg] {
    some i, j

    name := input[i][j].metadata.name
    kind := input[i][j].kind
    provided := {label | input[i][j].metadata.labels[label]}
    required := {key | key := requiredlabels[_]}

    missing := required - provided

    count(missing) > 0

    msg := sprintf("%v : %v/%v --- missing mandatory labels of %v", [i, kind, name, missing])
}