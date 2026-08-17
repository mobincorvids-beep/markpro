const router = require('express').Router();
const multer = require('multer');
const csv    = require('csv-parser');
const fs     = require('fs');
const path   = require('path');
const { Contact, ContactNote, ContactStatus, ContactSource } = require('../../models/WhatsApp.models');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect);
const upload = multer({ dest: 'uploads/tmp/' });

// ── Statuses & Sources ────────────────────────────────────────
router.get('/statuses',          async (req, res) => res.json(await ContactStatus.find().sort('name')));
router.post('/statuses',         async (req, res) => { try { res.status(201).json(await ContactStatus.create(req.body)); } catch(e){ res.status(400).json({error:e.message}); }});
router.put('/statuses/:id',      async (req, res) => { try { res.json(await ContactStatus.findByIdAndUpdate(req.params.id,req.body,{new:true})); } catch(e){ res.status(400).json({error:e.message}); }});
router.delete('/statuses/:id',   async (req, res) => { try { await ContactStatus.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(400).json({error:e.message}); }});

router.get('/sources',           async (req, res) => res.json(await ContactSource.find().sort('name')));
router.post('/sources',          async (req, res) => { try { res.status(201).json(await ContactSource.create(req.body)); } catch(e){ res.status(400).json({error:e.message}); }});
router.put('/sources/:id',       async (req, res) => { try { res.json(await ContactSource.findByIdAndUpdate(req.params.id,req.body,{new:true})); } catch(e){ res.status(400).json({error:e.message}); }});
router.delete('/sources/:id',    async (req, res) => { try { await ContactSource.findByIdAndDelete(req.params.id); res.json({message:'Deleted'}); } catch(e){ res.status(400).json({error:e.message}); }});

// ── Contacts CRUD ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page=1, limit=25, search, type, statusId, sourceId } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { firstname: { $regex: search, $options: 'i' } },
      { lastname:  { $regex: search, $options: 'i' } },
      { phone:     { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
      { company:   { $regex: search, $options: 'i' } },
    ];
    if (type)     filter.type     = type;
    if (statusId) filter.statusId = statusId;
    if (sourceId) filter.sourceId = sourceId;

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .populate('statusId','name color')
        .populate('sourceId','name')
        .populate('assignedId','firstname lastname')
        .sort({ createdAt: -1 })
        .skip((page-1)*limit).limit(+limit),
      Contact.countDocuments(filter),
    ]);
    res.json({ contacts, total, page:+page, pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('statusId','name color')
      .populate('sourceId','name')
      .populate('assignedId','firstname lastname')
      .populate('addedFrom','firstname lastname');
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const notes = await ContactNote.find({ contactId: req.params.id })
      .populate('addedFrom','firstname lastname')
      .sort({ createdAt: -1 });

    res.json({ ...contact.toObject(), notes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const contact = await Contact.create({ ...req.body, addedFrom: req.user._id });
    res.status(201).json(contact);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const c = await Contact.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true });
    res.json(c);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    await ContactNote.deleteMany({ contactId: req.params.id });
    res.json({ message: 'Contact deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Notes ─────────────────────────────────────────────────────
router.post('/:id/notes', async (req, res) => {
  try {
    const note = await ContactNote.create({ contactId: req.params.id, addedFrom: req.user._id, note: req.body.note });
    res.status(201).json(await note.populate('addedFrom','firstname lastname'));
  } catch (err) { res.status(400).json({ error: err.message }); }
});
router.delete('/:contactId/notes/:noteId', async (req, res) => {
  try { await ContactNote.findByIdAndDelete(req.params.noteId); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CSV Import ────────────────────────────────────────────────
router.post('/import/csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });

  const { statusId, sourceId, type = 'lead' } = req.body;
  const contacts = [];
  const errors   = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        const phone = row.phone || row.Phone || row.mobile || row.Mobile;
        const firstname = row.firstname || row.first_name || row.name || row.Name || '';
        if (!phone) { errors.push({ row, reason: 'Phone number missing' }); return; }
        contacts.push({ firstname, lastname: row.lastname || row.last_name || '', phone: String(phone).replace(/\D/g,''),
          email: row.email || '', company: row.company || '', type, statusId: statusId||undefined, sourceId: sourceId||undefined, addedFrom: req.user._id });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  fs.unlinkSync(req.file.path);

  let imported = 0;
  for (const c of contacts) {
    try {
      await Contact.findOneAndUpdate({ phone: c.phone }, c, { upsert: true, new: true });
      imported++;
    } catch(e) { errors.push({ row: c.phone, reason: e.message }); }
  }

  res.json({ imported, errors, total: contacts.length });
});

module.exports = router;
