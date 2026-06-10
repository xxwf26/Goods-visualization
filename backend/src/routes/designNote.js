const express = require('express')
const router = express.Router()
const controller = require('../controllers/DesignNoteController')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)
router.get('/', controller.list)
router.get('/:id', controller.detail)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.delete)

module.exports = router