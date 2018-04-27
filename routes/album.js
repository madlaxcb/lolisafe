const config = require('./../config')
const routes = require('express').Router()
const db = require('knex')(config.database)
const path = require('path')
const utils = require('./../controllers/utilsController')

const homeDomain = config.homeDomain || config.domain

routes.get('/a/:identifier', async (req, res, next) => {
  const identifier = req.params.identifier
  if (identifier === undefined) {
    return res.status(401).json({
      success: false,
      description: 'No identifier provided.'
    })
  }

  const album = await db.table('albums')
    .where({ identifier, enabled: 1 })
    .first()

  if (!album) {
    return res.status(404).sendFile('404.html', { root: './pages/error/' })
  }

  const files = await db.table('files')
    .select('name', 'size')
    .where('albumid', album.id)
    .orderBy('id', 'DESC')

  let thumb = ''
  const basedomain = config.domain

  for (const file of files) {
    file.file = `${basedomain}/${file.name}`
    file.size = utils.getPrettyBytes(parseInt(file.size))

    const extname = path.extname(file.name).toLowerCase()
    if ((config.uploads.generateThumbnails.image && utils.imageExtensions.includes(extname)) || (config.uploads.generateThumbnails.video && utils.videoExtensions.includes(extname))) {
      file.thumb = `${basedomain}/thumbs/${file.name.slice(0, -extname.length)}.png`

      /*
        If thumbnail for album is still not set, do it.
        A potential improvement would be to let the user upload a specific image as an album cover
        since embedding the first image could potentially result in nsfw content when pasting links.
      */

      if (thumb === '') {
        thumb = file.thumb
      }

      file.thumb = `<img alt="${file.name}" src="${file.thumb}"/>`
    } else {
      file.thumb = `<h1 class="title">${extname || 'N/A'}</h1>`
    }
  }

  return res.render('album', {
    title: album.name,
    count: files.length,
    thumb,
    files,
    identifier,
    enableDownload: Boolean(config.uploads.generateZips && config.uploads.generateZips.enabled),
    editedAt: album.editedAt,
    url: `${homeDomain}/a/${album.identifier}`
  })
})

module.exports = routes
