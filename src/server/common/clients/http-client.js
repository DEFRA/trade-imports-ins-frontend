async function parseProblemBody(response) {
  return response.json().catch(() => ({}))
}

function errorMessageFromBody(body, response) {
  return (
    body.detail ||
    body.message ||
    body.title ||
    response.statusText ||
    `HTTP ${response.status}`
  )
}

async function throwOnError(response) {
  if (response.ok) {
    return response
  }

  const body = await parseProblemBody(response)
  const error = new Error(errorMessageFromBody(body, response))
  error.status = response.status
  error.statusText = response.statusText
  error.body = body
  throw error
}

export { parseProblemBody, errorMessageFromBody, throwOnError }
