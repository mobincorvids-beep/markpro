const router = require('express').Router();
const User        = require('../models/User.model');
const Order       = require('../models/SMM_Order.model');
const { Service } = require('../models/SMM_Service.model');
const { placeOrder } = require('../controllers/smm/order.controller');

// All requests to POST /api/v1 - mirrors the original SmartPanel API
router.post('/', async (req, res) => {
  try {
    const { key, action } = req.body;
    if (!key) return res.json({ error: 'API key is required' });

    const user = await User.findOne({ apiKey: key, status: 1 });
    if (!user) return res.json({ error: 'Invalid API key or account disabled' });

    switch (action) {

      case 'services': {
        const services = await Service.find({ status: 1 })
          .populate('categoryId', 'name')
          .sort('sort');
        return res.json(services.map(s => ({
          service:     s._id,
          name:        s.name,
          type:        s.type,
          category:    s.categoryId?.name || '',
          rate:        s.price,
          min:         s.min,
          max:         s.max,
          dripfeed:    s.dripfeed,
          refill:      s.refill,
          cancel:      s.cancel,
          description: s.description,
          avg_time:    s.avgTime,
        })));
      }

      case 'add': {
        // Inject user into a fake req-like object and reuse controller
        const fakeReq = { user, body: { ...req.body, serviceId: req.body.service } };
        const fakeRes = {
          status: () => fakeRes,
          json:   (data) => res.json(
            data.error ? { error: data.error } : { order: data.order?.id }
          ),
        };
        return placeOrder(fakeReq, fakeRes);
      }

      case 'status': {
        const order = await Order.findById(req.body.order).populate('serviceId', 'name');
        if (!order || order.userId.toString() !== user._id.toString())
          return res.json({ error: 'Order not found' });
        return res.json({
          charge:      order.charge,
          start_count: order.startCount,
          status:      order.status,
          remains:     order.remains,
          currency:    'USD',
        });
      }

      case 'status_multi': {
        const ids = String(req.body.orders || '').split(',').map(s => s.trim()).filter(Boolean);
        const orders = await Order.find({ _id: { $in: ids }, userId: user._id });
        const result = {};
        orders.forEach(o => {
          result[o._id] = { charge: o.charge, start_count: o.startCount, status: o.status, remains: o.remains };
        });
        return res.json(result);
      }

      case 'balance': {
        return res.json({ balance: user.balance.toFixed(4), currency: 'USD' });
      }

      case 'refill': {
        const order = await Order.findOne({ _id: req.body.order, userId: user._id });
        if (!order) return res.json({ error: 'Order not found' });
        if (!order.refill) return res.json({ error: 'Refill not available' });
        return res.json({ refill: order._id });
      }

      case 'cancel': {
        const ids = String(req.body.orders || '').split(',').map(s => s.trim()).filter(Boolean);
        const result = {};
        for (const id of ids) {
          const o = await Order.findOne({ _id: id, userId: user._id });
          if (!o || !o.cancel) { result[id] = { cancel: { error: 'Not cancellable' } }; continue; }
          if (['canceled','completed'].includes(o.status)) { result[id] = { cancel: { error: 'Already canceled/completed' } }; continue; }
          o.status = 'canceled'; o.updatedAt = Date.now();
          await o.save();
          result[id] = { cancel: 'success' };
        }
        return res.json(result);
      }

      default:
        return res.json({ error: 'Invalid action' });
    }
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
