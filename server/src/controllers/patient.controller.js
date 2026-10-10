import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, patient: req.user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, age, gender, bloodGroup, allergies, conditions } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (age !== undefined) user.age = age;
  if (gender !== undefined) user.gender = gender;
  if (bloodGroup !== undefined) user.set('medical.bloodGroup', bloodGroup === null ? undefined : bloodGroup);
  if (allergies !== undefined) user.set('medical.allergies', allergies);
  if (conditions !== undefined) user.set('medical.conditions', conditions);

  await user.save();
  res.json({ success: true, message: 'Profile updated', patient: user });
});

const LABELS = {
  VIEW_APPOINTMENT: 'Viewed your appointment details',
  VIEW_PRESCRIPTION: 'Viewed your prescription',
  VIEW_RECEIPT: 'Viewed your receipt',
};

export const accessLog = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const filter = { subject: req.user._id, actor: { $ne: req.user._id } };

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name role')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const entries = items.map((i) => ({
    id: i._id,
    who: i.actor?.name || 'Unknown',
    role: i.actor?.role,
    what: LABELS[i.action] || i.action,
    at: i.createdAt,
  }));

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), entries });
});