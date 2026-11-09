const SESSION_KEY = 'transporterAddInProgress'

export const storeChosenTransporterType = (request, transporterType) =>
  request.yar.set(SESSION_KEY, {
    ...request.yar.get(SESSION_KEY),
    transporterType
  })

export const storedChosenTransporterType = (request) =>
  request.yar.get(SESSION_KEY)?.transporterType

export const storeEnteredTransporter = (request, formValues) =>
  request.yar.set(SESSION_KEY, {
    ...request.yar.get(SESSION_KEY),
    formValues
  })

export const storedEnteredTransporter = (request) =>
  request.yar.get(SESSION_KEY)?.formValues

export const clearTransporterAddInProgress = (request) =>
  request.yar.clear(SESSION_KEY)
