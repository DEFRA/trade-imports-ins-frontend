import { Agent } from 'node:http'
import { connect } from 'node:net'
import Wreck from '@hapi/wreck'
import { HttpsProxyAgent } from 'https-proxy-agent'

import { config } from '../config/config.js'

const connectWithOneRetry = (options, logger, oncreate) => {
  const neverOpenedCodes = new Set(['ETIMEDOUT', 'ECONNREFUSED'])
  const attempt = (retrying) => {
    const socket = connect(options)
    const onConnect = () => {
      socket.off('error', onError)
      oncreate(null, socket)
    }
    const onError = (error) => {
      socket.off('connect', onConnect)
      if (retrying || !neverOpenedCodes.has(error.code)) {
        oncreate(error)
        return
      }
      logger.warn(
        { err: error, host: options.host, port: options.port },
        'Connection did not open, retrying once'
      )
      attempt(true)
    }
    socket.once('connect', onConnect)
    socket.once('error', onError)
  }
  attempt(false)
}

class RetryingKeepAliveAgent extends Agent {
  constructor(logger) {
    super({ keepAlive: true })
    this.logger = logger
  }

  createConnection(options, oncreate) {
    connectWithOneRetry(options, this.logger, oncreate)
  }
}

/**
 * An HTTP agent that keeps connections open for the next call, and tries a
 * connection that timed out or was refused before it opened once more, logging
 * the retry at warn. Nothing is written to a connection before it opens.
 *
 * @param {import('pino').Logger} logger - where the retry warning is written
 * @returns {import('node:http').Agent} the agent
 */
export const createRetryingKeepAliveAgent = (logger) =>
  new RetryingKeepAliveAgent(logger)

/**
 * Sends every plain-HTTP Wreck call in the process, Bell's included, through a
 * retrying keep-alive agent.
 *
 * @param {import('pino').Logger} logger - where the retry warning is written
 */
export const useRetryingKeepAliveAgentForWreck = (logger) => {
  Wreck.agents.http = createRetryingKeepAliveAgent(logger)
}

const directHttpsAgent = Wreck.agents.https

class HostScopedProxyAgent extends HttpsProxyAgent {
  constructor(proxyUrl, hostnames) {
    super(proxyUrl)
    this.hostnames = new Set(hostnames)
  }

  connect(request, options) {
    return this.hostnames.has(options.host)
      ? super.connect(request, options)
      : directHttpsAgent
  }
}

/**
 * When an HTTP proxy is configured (`httpProxy`), sends every HTTPS Wreck call
 * in the process to the given hostnames, Bell's included, through that proxy,
 * and logs the hostnames at info. HTTPS calls to every other host go direct.
 * Each call replaces the hostnames the last call set. With no proxy configured
 * it changes nothing.
 *
 * @param {string[]} hostnames - the hostnames whose calls go through the proxy
 * @param {import('pino').Logger} logger - where the proxied hostnames are written
 */
export const proxyWreckHttpsCallsTo = (hostnames, logger) => {
  const proxyUrl = config.get('httpProxy')
  if (!proxyUrl) {
    return
  }
  Wreck.agents.https = new HostScopedProxyAgent(proxyUrl, hostnames)
  logger.info(
    { hostnames },
    'Wreck HTTPS calls to these hostnames go through the HTTP proxy'
  )
}
