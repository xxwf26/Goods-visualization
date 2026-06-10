/**
 * 生产/设计注意事项 API
 */
import request from './request'

export function getDesignNotes(params) { return request.get('/design-notes', { params }) }
export function getDesignNoteDetail(id) { return request.get(`/design-notes/${id}`) }
export function createDesignNote(data) { return request.post('/design-notes', data) }
export function updateDesignNote(id, data) { return request.put(`/design-notes/${id}`, data) }
export function deleteDesignNote(id) { return request.delete(`/design-notes/${id}`) }

export default { getDesignNotes, getDesignNoteDetail, createDesignNote, updateDesignNote, deleteDesignNote }