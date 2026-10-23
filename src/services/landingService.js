const db = require('../data/db')
const templateService = require('./templateService')

function getAllLandings() {
  return db.landings.map(landing => ({
    ...landing,
    leadCount: 0
  }))
}

function getLandingById(id) {
  const landing = db.landings.find(l => l.id === Number(id))
  if (!landing) {
    const err = new Error(`Landing not found: ${id}`)
    err.statusCode = 404
    throw err
  }
  return landing
}

function createLanding(data) {
  const template = templateService.getTemplateById(data.templateId)

  const landing = {
    id: db.nextLandingId++,
    templateId: template.id,
    name: data.name,
    client: data.client,
    status: 'draft',
    fields: data.fields || {},
    createdAt: new Date().toISOString()
  }

  db.landings.push(landing)
  return landing
}

function getLandingPreview(id) {
  const landing = getLandingById(id)
  const template = templateService.getTemplateById(landing.templateId)

  let html = template.html

  Object.keys(landing.fields).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    html = html.replace(regex, landing.fields[key] || '')
  })

  html = html.replace(/\{\{clientName\}\}/g, landing.client || '')

  return html
}

function getLeadsByLanding(landingId) {
  getLandingById(landingId)
  return db.leads.filter(l => l.landingId === Number(landingId))
}

function createLead(landingId, data) {
  getLandingById(landingId)

  const lead = {
    id: db.nextLeadId++,
    landingId: Number(landingId),
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    message: data.message || null,
    createdAt: new Date().toISOString()
  }

  db.leads.push(lead)
  return lead
}

function getLandingsSummary() {
  const landings = db.landings.map(landing => {
    const leads = db.leads.filter(l => l.landingId === landing.id)
    const lastLeadAt = leads.length
      ? leads.map(l => l.createdAt).sort().pop()
      : null

    return {
      id: landing.id,
      name: landing.name,
      client: landing.client,
      status: landing.status,
      leadCount: leads.length,
      lastLeadAt
    }
  })

  const byStatus = { draft: 0, active: 0, inactive: 0 }
  landings.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1 })

  return {
    totalLandings: landings.length,
    totalLeads: landings.reduce((sum, l) => sum + l.leadCount, 0),
    byStatus,
    landings
  }
}

module.exports = { getAllLandings, getLandingById, createLanding, getLandingPreview, getLeadsByLanding, createLead, getLandingsSummary }
