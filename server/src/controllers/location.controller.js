import { readFileSync } from 'fs';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const data = JSON.parse(
  readFileSync(new URL('../data/states-districts.json', import.meta.url), 'utf8')
);

export const getStates = asyncHandler(async (req, res) => {
  res.json({ success: true, states: Object.keys(data).sort() });
});

export const getDistricts = asyncHandler(async (req, res) => {
  const state = String(req.query.state || '').trim();
  const key = Object.keys(data).find((s) => s.toLowerCase() === state.toLowerCase());
  if (!key) throw ApiError.notFound('State not found');
  res.json({ success: true, state: key, districts: data[key] });
});