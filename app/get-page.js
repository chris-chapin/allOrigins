const { got } = require('./http-client')

module.exports = getPage

function getPage({ url, format, requestMethod }) {
  if (format === 'info' || requestMethod === 'HEAD') {
    return getPageInfo(url)
  } else if (format === 'raw') {
    return getRawPage(`${url}&APIKey=${process.env.SmugMugApiKey}&_accept=application%2Fjson`, requestMethod)
  }

  return getPageContents(url, requestMethod)
}

async function getPageInfo(url) {
  const { response, error } = await request(url, 'HEAD')
  if (error) return processError(error)

  return {
    url: url,
    content_type: response.headers['content-type'],
    content_length: +response.headers['content-length'] || -1,
    http_code: response.statusCode,
  }
}

async function getRawPage(url, requestMethod) {
  const { content, response, error } = await request(url, requestMethod, true)
  if (error) return processError(error)

  const contentLength = Buffer.byteLength(content)
  return {
    content,
    contentType: response.headers['content-type'],
    contentLength,
  }
}

async function getPageContents(url, requestMethod) {
  const { content, response, error } = await request(url, requestMethod)
  if (error) return processError(error)

  const contentLength = Buffer.byteLength(content)
  return {
    contents: content.toString(),
    status: {
      url: url,
      content_type: response.headers['content-type'],
      content_length: contentLength,
      http_code: response.statusCode,
    },
  }
}

async function request(url, requestMethod, raw = false) {
  try {
    const options = {
      method: requestMethod,
      decompress: !raw,
    }

    const response = await got(url, options)
    if (options.method === 'HEAD') return { response }

    return processContent(response)
  } catch (error) {
    return { error }
  }
}

async function processContent(response) {
  const res = { response: response, content: response.body }
  return res
}

async function processError(e) {
  const { response } = e
  if (!response) return { contents: null, status: { error: e } }

  const { url, statusCode: http_code, headers, body } = response
  const contentLength = Buffer.byteLength(body)

  return {
    contents: body.toString(),
    status: {
      url,
      http_code,
      content_type: headers['content-type'],
      content_length: contentLength,
    },
  }
}
