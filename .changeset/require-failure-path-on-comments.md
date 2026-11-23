---
"shippie": patch
---

`suggest_change` now requires a `failurePath` (the input or condition that triggers the problem and what goes wrong) and rejects a comment without one, so a comment with no stated failure is not posted. The field is validated and never posted.
