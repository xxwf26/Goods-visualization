/**
 * JWT Token 工具
 */
const jwt = require('jsonwebtoken')
const config = require('../config')

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })
}

const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret)
}

const decodeToken = (token) => {
  return jwt.decode(token)
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
}
