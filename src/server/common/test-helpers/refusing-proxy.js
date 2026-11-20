import { createServer } from 'node:net'

/**
 * Starts an HTTP proxy on a free local port that records the first line of
 * each request it receives and answers every one with 502 Bad Gateway.
 *
 * @returns {Promise<{ proxy: import('node:net').Server, proxyUrl: string, requestLines: string[] }>}
 *   the listening proxy, its URL, and the request lines it has recorded so far
 */
export const listenAsRefusingProxy = async () => {
  const requestLines = []
  const proxy = createServer((socket) => {
    socket.once('data', (chunk) => {
      requestLines.push(chunk.toString().split('\r\n')[0])
      socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n')
    })
  })
  await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve))
  return {
    proxy,
    proxyUrl: `http://127.0.0.1:${proxy.address().port}`,
    requestLines
  }
}
