const Order       = require('../../models/SMM_Order.model');
const User        = require('../../models/User.model');
const { Service } = require('../../models/SMM_Service.model');
const { Transaction, OrderRefill } = require('../../models/SMM_Supporting.model');
const mongoose    = require('mongoose');
const { chargeUser, getBalance } = require('../../utils/smmWallet');

/* ── Price helper: per-user custom price or default ── */
async function getUserPrice(userId, service) {
  // Custom price tiers can be stored in User.priceTier - extend as needed
  return service.price;
}

/* ── POST /api/orders ── Place a new order ── */
exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      serviceId, link, quantity, runs, interval, isDripFeed,
      comments, hashtag, hashtags, usernames, media, username,
      subPosts, subMin, subMax, subDelay, subExpiry,
    } = req.body;

    if (!serviceId) return res.status(400).json({ error: 'Please choose a service' });

    const service = await Service.findById(serviceId).populate('apiProviderId');
    if (!service) return res.status(404).json({ error: 'Service does not exist' });

    const user = await User.findById(req.user._id).session(session);
    const price = await getUserPrice(user._id, service);

    // ── Subscription order path ──
    if (service.type === 'subscriptions') {
      const posts = parseInt(subPosts) || 0;
      const minQ  = parseInt(subMin)   || 0;
      const maxQ  = parseInt(subMax)   || 0;
      const delay = parseInt(subDelay) || 0;

      if (!username)  return res.status(400).json({ error: 'Username is required' });
      if (minQ < service.min) return res.status(400).json({ error: `Minimum quantity is ${service.min}` });
      if (maxQ < minQ)        return res.status(400).json({ error: 'Min cannot be higher than max' });
      if (maxQ > service.max) return res.status(400).json({ error: `Maximum quantity is ${service.max}` });
      if (posts <= 0)         return res.status(400).json({ error: 'New posts must be ≥ 1' });
      if (!link)              return res.status(400).json({ error: 'Link is required' });

      const charge = (price * maxQ * posts) / 1000;
      // Atomic debit + WalletLedger entry (Section B.5). Throws
      // INSUFFICIENT_FUNDS instead of a lost-update race.
      const balanceBefore = await getBalance(user._id, session);
      const newBalance = await chargeUser(user._id, charge, {
        reason: `Subscription order - ${service.name}`, refType: 'SMM_Order', session,
      });

      const order = await Order.create([{
        userId: user._id, categoryId: service.categoryId,
        serviceId, serviceType: 'subscriptions',
        mode: service.addType === 'api' ? 1 : 0,
        link, username, charge,
        subPosts: posts, subMin: minQ, subMax: maxQ, subDelay: delay,
        subExpiry: subExpiry || '',
        subStatus: 'active', status: 'awaiting',
        apiProviderId: service.apiProviderId?._id || null,
        apiServiceId: service.apiServiceId || '',
        apiOrderId: service.apiProviderId ? '-1' : '',
        orderSourceType: 'subscriptions',
      }], { session });

      await Transaction.create([{
        userId: user._id, type: 'order',
        amount: -charge, balanceBefore, balanceAfter: newBalance,
        note: `Order #${order[0]._id} - ${service.name}`,
      }], { session });

      await session.commitTransaction();
      return res.status(201).json({
        status: 'success',
        newBalance,
        order: { id: order[0]._id, serviceName: service.name, username, charge, posts },
      });
    }

    // ── Standard order ──
    if (!link) return res.status(400).json({ error: 'Link is required' });

    let qty = parseInt(quantity) || 0;

    // Quantity derived from line-count for these types
    if (['custom_comments','custom_comments_package'].includes(service.type)) {
      if (!comments) return res.status(400).json({ error: 'Comments field is required' });
      const lines = comments.split(/\r?\n/).filter(l => l.trim());
      qty = service.type === 'custom_comments_package' ? 1 : lines.length;
    }
    if (service.type === 'mentions_custom_list') {
      if (!usernames) return res.status(400).json({ error: 'Usernames field is required' });
      qty = usernames.split(/\r?\n/).filter(l => l.trim()).length;
    }
    if (service.type === 'package') qty = 1;

    const dripOn = !!isDripFeed && service.dripfeed;
    const totalQty = dripOn ? (parseInt(runs) * qty) : qty;

    if (totalQty < service.min) return res.status(400).json({ error: `Minimum quantity is ${service.min}` });
    if (totalQty > service.max) return res.status(400).json({ error: `Maximum quantity is ${service.max}` });

    // Duplicate check
    if (service.denyDuplicates) {
      const dup = await Order.findOne({ serviceId, link, userId: user._id, status: { $nin: ['canceled','refunded','fail'] } });
      if (dup) return res.status(400).json({ error: 'Duplicate order not allowed for this service' });
    }

    const charge = ['package','custom_comments_package'].includes(service.type)
      ? price
      : (price * totalQty) / 1000;

    // Atomic debit + WalletLedger entry (Section B.5).
    const balanceBefore = await getBalance(user._id, session);
    const newBalance = await chargeUser(user._id, charge, {
      reason: `Order - ${service.name}`, refType: 'SMM_Order', session,
    });

    const orderData = {
      userId: user._id, categoryId: service.categoryId,
      serviceId, serviceType: service.type,
      mode: service.addType === 'api' ? 1 : 0,
      link, quantity: totalQty, charge,
      status: dripOn ? 'active' : 'awaiting',
      apiProviderId: service.apiProviderId?._id || null,
      apiServiceId: service.apiServiceId || '',
      apiOrderId: service.apiProviderId ? '-1' : '',
      isDripFeed: dripOn,
      runs: dripOn ? parseInt(runs) : 0,
      interval: dripOn ? parseInt(interval) : 0,
      dripfeedQty: dripOn ? qty : 0,
      comments: comments || '',
      hashtag: hashtag || '',
      hashtags: hashtags || '',
      usernames: usernames || '',
      media: media || '',
      username: username || '',
      refill: service.refill ? 1 : 0,
      cancel: service.cancel ? 1 : 0,
      orderSourceType: 'default',
    };

    const [order] = await Order.create([orderData], { session });

    await Transaction.create([{
      userId: user._id, type: 'order',
      amount: -charge, balanceBefore, balanceAfter: newBalance,
      note: `Order #${order._id} - ${service.name}`,
    }], { session });

    await session.commitTransaction();
    res.status(201).json({
      status: 'success',
      newBalance,
      order: { id: order._id, serviceName: service.name, link, quantity: totalQty, charge },
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(err.statusCode || 500).json({ success: false, message: err.message, error: err.message });
  } finally {
    session.endSession();
  }
};

/* ── POST /api/orders/mass ── Mass order (serviceId|quantity|link per line) ── */
exports.massOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { lines } = req.body; // array of "serviceId|qty|link"
    if (!lines?.length) return res.status(400).json({ error: 'No orders provided' });

    const user = await User.findById(req.user._id).session(session);
    if ((await getBalance(user._id, session)) <= 0) return res.status(400).json({ error: 'Insufficient balance' });

    const errors = [];
    const orders = [];
    let totalCharge = 0;

    for (const raw of lines) {
      const parts = raw.split('|');
      if (parts.length !== 3) { errors.push({ line: raw, reason: 'Invalid format (serviceId|qty|link)' }); continue; }
      const [sid, qty, link] = parts.map(p => p.trim());
      const service = await Service.findById(sid);
      if (!service) { errors.push({ line: raw, reason: 'Service not found' }); continue; }
      const q = parseInt(qty);
      if (q < service.min) { errors.push({ line: raw, reason: `Min quantity is ${service.min}` }); continue; }
      if (q > service.max) { errors.push({ line: raw, reason: `Max quantity is ${service.max}` }); continue; }
      const charge = parseFloat(((service.price * q) / 1000).toFixed(4));
      totalCharge += charge;
      orders.push({ userId: user._id, serviceId: sid, categoryId: service.categoryId,
        link, quantity: q, charge, status: 'awaiting', orderSourceType: 'mass',
        apiProviderId: service.apiProviderId || null, apiServiceId: service.apiServiceId || '',
        apiOrderId: service.apiProviderId ? '-1' : '', });
    }

    if (orders.length) {
      // Atomic debit first: if funds are insufficient the filter misses,
      // INSUFFICIENT_FUNDS is thrown and the transaction aborts (Section B.5).
      const balanceBefore = await getBalance(user._id, session);
      await Order.insertMany(orders, { session });
      const newBalance = await chargeUser(user._id, totalCharge, {
        reason: `Mass order - ${orders.length} orders`, refType: 'SMM_Order', session,
      });
      await Transaction.create([{
        userId: user._id, type: 'order',
        amount: -totalCharge, balanceBefore, balanceAfter: newBalance,
        note: `Mass order - ${orders.length} orders`,
      }], { session });
    }

    await session.commitTransaction();
    res.json({ status: 'success', placed: orders.length, errors, totalCharge });
  } catch (err) {
    await session.abortTransaction();
    res.status(err.statusCode || 500).json({ success: false, message: err.message, error: err.message });
  } finally {
    session.endSession();
  }
};

/* ── GET /api/orders/mine ── User's order list ── */
exports.myOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (search) filter.$or = [
      { link: { $regex: search, $options: 'i' } },
    ];

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('serviceId', 'name type')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── GET /api/orders/:id ── Single order ── */
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('serviceId', 'name type');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── POST /api/orders/:id/refill ── Request refill ── */
exports.refillOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.refill) return res.status(400).json({ error: 'Refill not available for this order' });
    if (!['completed','partial'].includes(order.status))
      return res.status(400).json({ error: 'Refill only available for completed/partial orders' });

    await OrderRefill.create({ orderId: order._id, userId: req.user._id, status: 'pending' });
    res.json({ message: 'Refill request submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
