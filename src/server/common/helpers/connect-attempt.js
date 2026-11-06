import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'

function allowOneSecondPerAddressWhenConnecting() {
  const connectAttemptPerAddressMs = 1000
  setDefaultAutoSelectFamilyAttemptTimeout(connectAttemptPerAddressMs)
}

export { allowOneSecondPerAddressWhenConnecting }
