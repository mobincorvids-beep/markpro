const router = require('express').Router();
const { Ticket } = require('../models/SMM_Supporting.model');
const { protect } = require('../middleware/auth.middleware');

// GET /api/tickets
router.get('/', protect, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tickets - open new ticket
router.post('/', protect, async (req, res) => {
  try {
    const { subject, message, priority } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });
    const ticket = await Ticket.create({
      userId: req.user._id, subject,
      priority: priority || 'medium',
      messages: [{ senderId: req.user._id, senderRole: req.user.role, message }],
    });
    res.status(201).json(ticket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tickets/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tickets/:id/reply
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'closed') return res.status(400).json({ error: 'Cannot reply to a closed ticket' });

    ticket.messages.push({ senderId: req.user._id, senderRole: req.user.role, message });
    ticket.status = 'pending';
    ticket.updatedAt = Date.now();
    await ticket.save();
    res.json(ticket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/tickets/:id/close
router.patch('/:id/close', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'closed', updatedAt: Date.now() },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
