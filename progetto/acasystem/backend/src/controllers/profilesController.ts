import type { Request, Response } from 'express';
import { sendFailure } from '../middlewares/errors.ts';
import type { ProfileService } from '../services/profileService.ts';
import {
  validateCreateProfileBody,
  validateListProfilesQuery,
  validateUpdateProfileBody,
} from '../validators/profileValidators.ts';
import { requireRequestUserId } from './requestUser.ts';

/** Gestori HTTP di /api/profiles. */

export interface ProfilesController {
  list(req: Request, res: Response): void;
  get(req: Request<{ id: string }>, res: Response): void;
  create(req: Request, res: Response): void;
  update(req: Request<{ id: string }>, res: Response): void;
  remove(req: Request<{ id: string }>, res: Response): void;
}

export const createProfilesController = (service: ProfileService): ProfilesController => ({
  // List profiles for a HA user
  list: (req, res) => {
    const requestUserId = requireRequestUserId(req, res);
    if (!requestUserId) return;

    const query = validateListProfilesQuery(req.query, requestUserId);
    if (!query.ok) {
      sendFailure(res, query.failure);
      return;
    }

    res.json(service.list(query.value.haUserId));
  },

  // Get a single profile
  get: (req, res) => {
    const requestUserId = requireRequestUserId(req, res);
    if (!requestUserId) return;

    const result = service.get(requestUserId, req.params.id);
    if (!result.ok) {
      sendFailure(res, result.failure);
      return;
    }
    res.json(result.value);
  },

  // Create a new profile
  create: (req, res) => {
    const requestUserId = requireRequestUserId(req, res);
    if (!requestUserId) return;

    const input = validateCreateProfileBody(req.body, requestUserId);
    if (!input.ok) {
      sendFailure(res, input.failure);
      return;
    }

    const result = service.create(input.value);
    if (!result.ok) {
      sendFailure(res, result.failure);
      return;
    }
    res.status(201).json(result.value);
  },

  // Update a profile
  update: (req, res) => {
    const requestUserId = requireRequestUserId(req, res);
    if (!requestUserId) return;

    const input = validateUpdateProfileBody(req.body, requestUserId);
    if (!input.ok) {
      sendFailure(res, input.failure);
      return;
    }

    const result = service.update(requestUserId, req.params.id, input.value);
    if (!result.ok) {
      sendFailure(res, result.failure);
      return;
    }
    res.json(result.value);
  },

  // Delete a profile
  remove: (req, res) => {
    const requestUserId = requireRequestUserId(req, res);
    if (!requestUserId) return;

    const result = service.remove(requestUserId, req.params.id);
    if (!result.ok) {
      sendFailure(res, result.failure);
      return;
    }
    res.json(result.value);
  },
});
